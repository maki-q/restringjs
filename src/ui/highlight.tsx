import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRestringContext } from '../react/context';
import type { FieldPath } from '../core/types';

interface RestringHighlightProps {
  /** Enable visual highlight overlays */
  enabled?: boolean;
}

/**
 * Visual highlight mode: overlays DOM elements that contain registered
 * field values, allowing click-to-jump to the sidebar editor.
 * Only active when the sidebar is open.
 */
export function RestringHighlight({ enabled = true }: RestringHighlightProps) {
  const ctx = useRestringContext();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [overlays, setOverlays] = useState<OverlayData[]>([]);

  const sidebarOpen = useSyncExternalStore(
    ctx.subscribe,
    () => ctx.getSnapshot().sidebarOpen,
    () => false,
  );

  const active = enabled && sidebarOpen;

  const scanDom = useCallback(() => {
    if (!active) {
      setOverlays([]);
      return;
    }
    const snapshot = ctx.getSnapshot();
    const fieldValues = new Map<string, FieldPath>();

    for (const [path, config] of snapshot.fields) {
      const currentValue = snapshot.overrides[path] ?? config.defaultValue;
      if (currentValue) {
        fieldValues.set(currentValue, path);
      }
    }

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Skip our own sidebar
          const parent = node.parentElement;
          if (parent?.closest('.restringjs-sidebar, .restringjs-toggle')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const found: OverlayData[] = [];
    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const text = textNode.textContent?.trim();
      if (text && fieldValues.has(text)) {
        const path = fieldValues.get(text)!;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          found.push({ path, rect });
        }
      }
    }

    setOverlays(found);
  }, [ctx, active]);

  useEffect(() => {
    if (!active) return;
    scanDom();
    const unsub = ctx.subscribe(scanDom);
    const observer = new MutationObserver(scanDom);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      unsub();
      observer.disconnect();
    };
  }, [ctx, active, scanDom]);

  if (!active || overlays.length === 0) return null;

  return (
    <div
      ref={overlayRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 99998 }}
    >
      {overlays.map((overlay) => (
        <div
          key={overlay.path}
          onClick={() => ctx.setHighlightedField(overlay.path)}
          style={{
            position: 'fixed',
            top: overlay.rect.top - 2,
            left: overlay.rect.left - 2,
            width: overlay.rect.width + 4,
            height: overlay.rect.height + 4,
            border: '2px solid #4a6cf7',
            borderRadius: '2px',
            pointerEvents: 'auto',
            cursor: 'pointer',
            background: 'rgba(74, 108, 247, 0.08)',
            transition: 'all 0.15s',
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
