import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRestringContext } from '../react/context';
import type { FieldPath } from '../core/types';

interface RestringHighlightProps {
  /** Enable visual highlight overlays */
  enabled?: boolean;
}

/** Block-level elements whose textContent is worth comparing against field values */
const BLOCK_SELECTORS = 'div, section, article, main, aside, p, li, td, th, blockquote, details, figcaption, header, footer, nav, dd, dt';

/**
 * Strip common markup (markdown, basic HTML tags) from a string to produce
 * normalized plain text for comparison against DOM textContent.
 */
function stripMarkup(value: string): string {
  let s = value;
  // Markdown links: [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Markdown images: ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  // HTML tags
  s = s.replace(/<[^>]+>/g, '');
  // Headings: ## text -> text
  s = s.replace(/^#{1,6}\s+/gm, '');
  // Bold/italic: **text**, *text*, __text__, _text_
  s = s.replace(/(\*{1,3}|_{1,3})(.+?)\1/g, '$2');
  // Inline code: `text`
  s = s.replace(/`([^`]+)`/g, '$1');
  // Strikethrough: ~~text~~
  s = s.replace(/~~(.+?)~~/g, '$1');
  // Horizontal rules
  s = s.replace(/^[-*_]{3,}\s*$/gm, '');
  // Blockquotes: > text -> text
  s = s.replace(/^>\s?/gm, '');
  // Unordered list markers
  s = s.replace(/^[\s]*[-*+]\s+/gm, '');
  // Ordered list markers
  s = s.replace(/^[\s]*\d+\.\s+/gm, '');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Normalize DOM textContent for comparison: collapse whitespace sequences.
 */
function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Aggressive normalization for fuzzy comparison: remove ALL whitespace.
 * Used when rich content renderers insert empty spacer elements between
 * paragraphs, causing textContent to join text without separators.
 */
function stripAllWhitespace(text: string): string {
  return text.replace(/\s+/g, '');
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

    // Phase 3: Container textContent fallback for rich content (markdown, HTML).
    // Fields whose values contain markup syntax that gets rendered into multiple
    // DOM elements won't match via text-node or template phases. We strip markup
    // from the field value and compare against the normalized textContent of
    // block-level containers. Only runs for unmatched fields to avoid double-highlighting.
    const matchedPaths = new Set(found.map((o) => o.path));
    const unmatchedRich: { path: FieldPath; strippedText: string; minLen: number }[] = [];

    for (const [value, paths] of fieldValues) {
      for (const path of paths) {
        if (matchedPaths.has(path)) continue;
        // Only attempt rich matching if the value looks like it has markup
        const stripped = stripMarkup(value);
        if (stripped !== value.replace(/\s+/g, ' ').trim() && stripped.length > 10) {
          // Pre-compute whitespace-stripped text and minimum length threshold
          // once per field rather than per block element
          const fieldStripped = stripAllWhitespace(stripped);
          unmatchedRich.push({ path, strippedText: fieldStripped, minLen: fieldStripped.length });
        }
      }
    }

    if (unmatchedRich.length > 0) {
      // Find the shortest field to quickly skip blocks that are too small
      const globalMinLen = Math.min(...unmatchedRich.map((f) => f.minLen));

      const blocks = document.querySelectorAll<HTMLElement>(BLOCK_SELECTORS);
      for (const el of blocks) {
        if (el.closest('.restringjs-sidebar, .restringjs-toggle, .restringjs-highlight-overlay')) continue;
        const rawText = el.textContent ?? '';
        if (rawText.length === 0) continue;

        // Strip whitespace once per block element, skip if too short for any field
        const elStripped = stripAllWhitespace(rawText);
        if (elStripped.length < globalMinLen) continue;

        for (let i = unmatchedRich.length - 1; i >= 0; i--) {
          const { path, strippedText, minLen } = unmatchedRich[i]!;
          if (matchedPaths.has(path)) continue;

          // Length gate: block must be at least as long as field and within 20%
          if (elStripped.length < minLen || elStripped.length > minLen * 1.2) continue;

          if (elStripped === strippedText || elStripped.includes(strippedText)) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              found.push({ path, rect });
              matchedPaths.add(path);
              unmatchedRich.splice(i, 1);
            }
          }
        }

        if (unmatchedRich.length === 0) break;
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
    //
    // During this wait period, suppress scans from MutationObserver and
    // other events - they'd just waste cycles on unstable layout.
    let cancelled = false;
    let ready = false;
    // Store changes (field registration, overrides) always trigger a scan
    // since they indicate data changes, not layout instability.
    const unsub = ctxRef.current.subscribe(() => debouncedScan());
    // Layout events (scroll, resize, mutations) are gated behind the
    // animation wait to avoid wasting cycles on unstable layout.
    const gatedScan = () => { if (ready) debouncedScan(); };

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
        }
        // No else/fallback: if getAnimations is unavailable (jsdom, old
        // browsers), skip the wait entirely - there are no animations to
        // interfere with layout measurement.
      } catch {
        // getAnimations or .finished can throw on cancelled animations - safe to ignore
      }
      // Always yield at least one microtask so the subscription above
      // has a chance to capture field registrations that fire synchronously
      // in sibling effects before this effect ran.
      await Promise.resolve();
      if (!cancelled) {
        ready = true;
        scanDom();
      }
    };
    waitForAnimations();

    // Watch DOM changes including attribute mutations (class/style toggles
    // that show/hide content or change layout, <details> open/close, etc.)
    const observer = new MutationObserver(() => gatedScan());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'open'],
    });

    const onScroll = () => gatedScan();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    // Capture-phase load listener catches image/iframe/video load events
    // that cause layout shifts without DOM mutations
    document.addEventListener('load', gatedScan, true);

    // CSS animations/transitions move elements without triggering mutations
    document.addEventListener('animationend', gatedScan, true);
    document.addEventListener('transitionend', gatedScan, true);

    // Web font loading causes text reflow without any DOM event
    if (typeof document.fonts?.ready?.then === 'function') {
      document.fonts.ready.then(() => gatedScan());
    }

    // ResizeObserver on body catches any child element size changes
    // (e.g. lazy images expanding from 0x0, font loading, async content)
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => gatedScan());
      resizeObserver.observe(document.body);
    }

    return () => {
      cancelled = true;
      unsub();
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('load', gatedScan, true);
      document.removeEventListener('animationend', gatedScan, true);
      document.removeEventListener('transitionend', gatedScan, true);
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
