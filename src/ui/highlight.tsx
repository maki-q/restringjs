import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRestringContext } from '../react/context';
import type { FieldPath } from '../core/types';

interface RestringHighlightProps {
  /** Enable visual highlight overlays */
  enabled?: boolean;
}

/**
 * Match interpolation template fragments across adjacent sibling DOM nodes.
 * For a template like "Follow {handle} for more." with fragments ["Follow ", " for more."],
 * walks the DOM looking for a parent whose direct inline children contain the fragments
 * in order with any content (elements or text) filling the gaps between them.
 * Returns bounding rects that span from the first fragment to the last.
 */
function matchTemplateInDom(fragments: string[]): DOMRect[] {
  // Filter to non-empty fragments - require at least 2 for reliable cross-sibling matching.
  // Single-fragment templates (e.g. "Back to {name}") are too ambiguous and would match
  // overly broad ranges. They fall back to exact text-node matching only.
  const nonEmpty = fragments.filter((f) => f.trim().length > 0);
  if (nonEmpty.length < 2) return [];

  const results: DOMRect[] = [];
  // Use Set to avoid checking the same parent multiple times
  const checkedParents = new Set<Node>();

  // Find all text nodes that contain the first non-empty fragment
  const firstFrag = nonEmpty[0]!.trim();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (parent?.closest('.restringjs-sidebar, .restringjs-toggle, .restringjs-highlight-overlay')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? '';
    if (!text.includes(firstFrag)) continue;

    // Walk up to find the common container - the immediate parent element
    const container = node.parentElement;
    if (!container || checkedParents.has(container)) continue;
    checkedParents.add(container);

    // Collect all inline text content from the container's subtree in order
    const inlineWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textParts: { node: Node; text: string }[] = [];
    let inlineNode: Node | null;
    while ((inlineNode = inlineWalker.nextNode())) {
      const t = inlineNode.textContent ?? '';
      if (t.length > 0) textParts.push({ node: inlineNode, text: t });
    }

    // Try to match all non-empty fragments in sequence across the collected text parts
    const fullText = textParts.map((p) => p.text).join('');
    let allFound = true;
    let searchFrom = 0;

    for (const frag of nonEmpty) {
      const trimmed = frag.trim();
      const idx = fullText.indexOf(trimmed, searchFrom);
      if (idx === -1) {
        allFound = false;
        break;
      }
      searchFrom = idx + trimmed.length;
    }

    if (!allFound) continue;

    // All fragments found in order. Create a bounding rect spanning the container's
    // inline content. Use a range from the first text node to the last.
    try {
      const range = document.createRange();
      range.setStartBefore(textParts[0]!.node);
      range.setEndAfter(textParts[textParts.length - 1]!.node);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        results.push(rect);
      }
    } catch {
      // Range creation can fail in edge cases, safe to skip
    }
  }

  return results;
}

/**
 * Visual highlight mode: overlays DOM elements that contain registered
 * field values, allowing click-to-jump to the sidebar editor.
 * Only active when highlight mode is toggled on in the sidebar.
 *
 * Known limitations (documented, not bugs):
 * - Shadow DOM: TreeWalker cannot pierce shadow roots. Web component internals are invisible.
 * - CSS `content`: Text from ::before/::after pseudo-elements is not in the DOM tree.
 * - Non-interpolated split text: "HAIR" in one element + "STYLIST" in another won't match
 *   "HAIR STYLIST" unless the value uses `{placeholder}` interpolation syntax.
 * - JS-driven animation: requestAnimationFrame-based motion without CSS transitions has no
 *   completion event. Overlays reposition on the next debounce trigger (scroll, mutation, etc).
 */
export function RestringHighlight({ enabled = true }: RestringHighlightProps) {
  const ctx = useRestringContext();
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [overlays, setOverlays] = useState<OverlayData[]>([]);
  const color = ctx.highlightColor;

  const highlightMode = useSyncExternalStore(
    ctx.subscribe,
    () => ctx.getSnapshot().highlightMode,
    () => false,
  );

  const active = enabled && highlightMode;

  const scanDom = useCallback((): void => {
    if (!active) {
      setOverlays([]);
      return;
    }
    const snapshot = ctxRef.current.getSnapshot();

    // Build a reverse index: text value -> list of field paths.
    // Multiple fields can share the same value (e.g. two "Submit" buttons),
    // so we collect all matches instead of overwriting.
    const fieldValues = new Map<string, FieldPath[]>();

    for (const [path, config] of snapshot.fields) {
      // Skip fields whose highlights are hidden by the user
      if (snapshot.hiddenHighlights.has(path)) continue;
      const currentValue = snapshot.overrides[path] ?? config.defaultValue;
      if (currentValue) {
        const existing = fieldValues.get(currentValue);
        if (existing) {
          existing.push(path);
        } else {
          fieldValues.set(currentValue, [path]);
        }
      }
    }

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (parent?.closest('.restringjs-sidebar, .restringjs-toggle, .restringjs-highlight-overlay')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const found: OverlayData[] = [];
    // Track which paths have been matched so duplicates get assigned
    // to different field registrations in order of DOM appearance
    const pathUsageCount = new Map<string, number>();

    // Separate exact-match values from interpolation templates
    const exactValues = new Map<string, FieldPath[]>();
    const templateValues: { fragments: string[]; paths: FieldPath[] }[] = [];

    for (const [value, paths] of fieldValues) {
      if (/\{[^}]+\}/.test(value)) {
        // Split "prefix {var} suffix" into ["prefix ", " suffix"]
        const fragments = value.split(/\{[^}]+\}/).map((f) => f);
        if (fragments.some((f) => f.trim().length > 0)) {
          templateValues.push({ fragments, paths });
        }
      } else {
        exactValues.set(value, paths);
      }
    }

    // Phase 1: Exact text-node matching
    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const text = textNode.textContent?.trim();
      if (text && exactValues.has(text)) {
        const paths = exactValues.get(text)!;
        const key = text;
        const usedCount = pathUsageCount.get(key) ?? 0;
        const path = paths[usedCount % paths.length]!;
        pathUsageCount.set(key, usedCount + 1);

        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          found.push({ path, rect });
        }
      }
    }

    // Phase 2: Interpolation template matching across sibling nodes
    // For values like "Follow {handle} for more.", match literal fragments
    // across adjacent DOM siblings (text nodes + element textContent),
    // then create one overlay spanning the full range.
    for (const { fragments, paths } of templateValues) {
      const key = fragments.join('{...}');
      const matches = matchTemplateInDom(fragments);
      for (const match of matches) {
        const usedCount = pathUsageCount.get(key) ?? 0;
        const path = paths[usedCount % paths.length]!;
        pathUsageCount.set(key, usedCount + 1);
        if (match.width > 0 && match.height > 0) {
          found.push({ path, rect: match });
        }
      }
    }

    setOverlays(found);
  }, [active]);

  // Debounced scan to avoid excessive recalculations from rapid events
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedScan = useCallback((): void => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => scanDom(), 50);
  }, [scanDom]);

  // Subscribe to store changes, DOM mutations, scroll, image loads, and layout shifts
  useEffect(() => {
    if (!active) {
      setOverlays([]);
      return;
    }
    // Wait for in-flight CSS animations to finish before the first scan.
    // Scanning mid-animation captures stale bounding rects that produce
    // ghost overlays at pre-animation positions. We use getAnimations()
    // when available, with a 2s timeout fallback for older browsers or
    // long-running infinite animations.
    let cancelled = false;
    const unsub = ctxRef.current.subscribe(() => scanDom());
    const waitForAnimations = async () => {
      try {
        if (typeof document.getAnimations === 'function') {
          const animations = document.getAnimations();
          if (animations.length > 0) {
            // Race: wait for all animations OR bail after 2s
            await Promise.race([
              Promise.allSettled(animations.map((a) => a.finished)),
              new Promise((r) => setTimeout(r, 2000)),
            ]);
          }
        } else {
          // Fallback: simple delay for browsers without getAnimations
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch {
        // getAnimations or .finished can throw on cancelled animations - safe to ignore
      }
      // Always yield at least one microtask so the subscription above
      // has a chance to capture field registrations that fire synchronously
      // in sibling effects before this effect ran.
      await Promise.resolve();
      if (!cancelled) scanDom();
    };
    waitForAnimations();

    // Watch DOM changes including attribute mutations (class/style toggles
    // that show/hide content or change layout, <details> open/close, etc.)
    const observer = new MutationObserver(() => debouncedScan());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'open'],
    });

    const onScroll = () => debouncedScan();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    // Capture-phase load listener catches image/iframe/video load events
    // that cause layout shifts without DOM mutations
    document.addEventListener('load', debouncedScan, true);

    // CSS animations/transitions move elements without triggering mutations
    document.addEventListener('animationend', debouncedScan, true);
    document.addEventListener('transitionend', debouncedScan, true);

    // Web font loading causes text reflow without any DOM event
    if (typeof document.fonts?.ready?.then === 'function') {
      document.fonts.ready.then(() => debouncedScan());
    }

    // ResizeObserver on body catches any child element size changes
    // (e.g. lazy images expanding from 0x0, font loading, async content)
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => debouncedScan());
      resizeObserver.observe(document.body);
    }

    return () => {
      cancelled = true;
      unsub();
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('load', debouncedScan, true);
      document.removeEventListener('animationend', debouncedScan, true);
      document.removeEventListener('transitionend', debouncedScan, true);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [active, scanDom, debouncedScan]);

  const handleClick = useCallback((path: FieldPath) => {
    ctxRef.current.setHighlightedField(path);
    // Scroll the sidebar field into view
    requestAnimationFrame(() => {
      const sidebar = document.querySelector('.restringjs-sidebar');
      if (!sidebar) return;
      // Find the field editor by its label text
      const labels = sidebar.querySelectorAll('label');
      for (const label of labels) {
        if (label.textContent?.trim().replace(/●$/, '').trim() === path) {
          label.closest('div[style]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    });
  }, []);

  if (!active || overlays.length === 0) return null;

  return (
    <div
      ref={overlayRef}
      className="restringjs-highlight-overlay"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 99998 }}
    >
      {overlays.map((overlay, i) => (
        <div
          key={`${overlay.path}-${i}`}
          onClick={() => handleClick(overlay.path)}
          style={{
            position: 'fixed',
            top: overlay.rect.top - 2,
            left: overlay.rect.left - 2,
            width: overlay.rect.width + 4,
            height: overlay.rect.height + 4,
            border: `2px solid ${color}`,
            borderRadius: '2px',
            pointerEvents: 'auto',
            cursor: 'pointer',
            background: `${color}14`,
          }}
          title={`Edit: ${overlay.path}`}
        />
      ))}
    </div>
  );
}

interface OverlayData {
  path: FieldPath;
  rect: DOMRect;
}
