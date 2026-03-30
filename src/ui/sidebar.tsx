import React, { useCallback, useMemo, useState } from 'react';
import { useRestringContext } from '../react/context';
import type { FieldConfig, FieldPath } from '../core/types';
import { useSyncExternalStore } from 'react';

interface RestringSidebarProps {
  /** Position of the sidebar */
  position?: 'left' | 'right';
  /** Default width in px */
  width?: number;
  /** Whether the sidebar is open */
  defaultOpen?: boolean;
}

export function RestringSidebar({
  position = 'right',
  width = 360,
  defaultOpen = false,
}: RestringSidebarProps) {
  const ctx = useRestringContext();
  const [open, setOpenState] = useState(defaultOpen);
  const [search, setSearch] = useState('');

  const setOpen = useCallback((val: boolean) => {
    setOpenState(val);
    ctx.setSidebarOpen(val);
  }, [ctx]);

  // Sync initial state
  React.useEffect(() => {
    ctx.setSidebarOpen(defaultOpen);
  }, [ctx, defaultOpen]);

  const snapshot = useSyncExternalStore(
    ctx.subscribe,
    () => ctx.getSnapshot(),
    () => ctx.getSnapshot(),
  );

  const highlightMode = snapshot.highlightMode;

  const filteredFields = useMemo(() => {
    const entries = Array.from(snapshot.fields.entries());
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      ([path, config]) =>
        path.toLowerCase().includes(q) ||
        config.defaultValue.toLowerCase().includes(q) ||
        (config.description ?? '').toLowerCase().includes(q),
    );
  }, [snapshot.fields, search]);

  const groupedFields = useMemo(() => {
    const groups = new Map<string, [FieldPath, FieldConfig][]>();
    for (const entry of filteredFields) {
      const section = entry[1].section ?? '__default__';
      const group = groups.get(section) ?? [];
      group.push(entry);
      groups.set(section, group);
    }
    return groups;
  }, [filteredFields]);

  const handleSave = useCallback(async () => {
    await ctx.save();
  }, [ctx]);

  if (!open) {
    return (
      <button
        type="button"
        className="restringjs-toggle"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          [position]: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 99999,
          padding: '8px 4px',
          background: '#1a1a2e',
          color: '#fff',
          border: 'none',
          borderRadius: position === 'right' ? '4px 0 0 4px' : '0 4px 4px 0',
          cursor: 'pointer',
          writingMode: 'vertical-rl',
          fontSize: '12px',
          fontFamily: 'system-ui, sans-serif',
        }}
        aria-label="Open Restring editor"
      >
        ✏️ Restring
      </button>
    );
  }

  return (
    <div
      className="restringjs-sidebar"
      role="complementary"
      aria-label="Restring string editor"
      style={{
        position: 'fixed',
        [position]: 0,
        top: 0,
        bottom: 0,
        width: `${width}px`,
        zIndex: 99999,
        background: '#fafafa',
        borderLeft: position === 'right' ? '1px solid #e0e0e0' : 'none',
        borderRight: position === 'left' ? '1px solid #e0e0e0' : 'none',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        color: '#1a1a1a',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a2e', color: '#fff' }}>
        <span style={{ fontWeight: 600, fontSize: '15px' }}>✏️ Restring</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {ctx.isDirty() && (
            <button type="button" onClick={() => void handleSave()} style={headerBtnStyle}>
              Save
            </button>
          )}
          <button type="button" onClick={() => ctx.resetAll()} style={headerBtnStyle}>
            Reset
          </button>
          <button
            type="button"
            onClick={() => ctx.setHighlightMode(!highlightMode)}
            style={{
              ...headerBtnStyle,
              background: highlightMode ? 'rgba(74, 108, 247, 0.6)' : 'rgba(255,255,255,0.15)',
            }}
            aria-label={highlightMode ? 'Turn off highlights' : 'Turn on highlights'}
          >
            {highlightMode ? 'Highlights off' : 'Highlights on'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{ ...headerBtnStyle, padding: '2px 6px' }}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #e0e0e0' }}>
        <input
          type="search"
          placeholder="Search fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
            boxSizing: 'border-box',
          }}
          aria-label="Search fields"
        />
      </div>

      {/* Field List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {Array.from(groupedFields.entries()).map(([sectionId, fields]) => {
          const section = snapshot.sections.get(sectionId);
          return (
            <div key={sectionId} style={{ marginBottom: '8px' }}>
              {sectionId !== '__default__' && (
                <div style={{
                  padding: '4px 16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#666',
                }}>
                  {section?.label ?? sectionId}
                </div>
              )}
              {fields.map(([path, config]) => (
                <FieldEditor
                  key={path}
                  path={path}
                  config={config}
                  value={snapshot.overrides[path] ?? config.defaultValue}
                  isDirty={snapshot.dirty.has(path)}
                  isHighlighted={ctx.highlightedField === path}
                  onFocus={() => ctx.setHighlightedField(path)}
                  onBlur={() => ctx.setHighlightedField(null)}
                  onChange={(val) => ctx.setOverride(path, val)}
                  onReset={() => ctx.resetField(path)}
                />
              ))}
            </div>
          );
        })}
        {filteredFields.length === 0 && (
          <div style={{ padding: '16px', color: '#999', textAlign: 'center' }}>
            {search ? 'No fields match your search.' : 'No fields registered.'}
          </div>
        )}
      </div>
    </div>
  );
}

const headerBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: '3px',
  padding: '2px 10px',
  fontSize: '12px',
  cursor: 'pointer',
};

interface FieldEditorProps {
  path: FieldPath;
  config: FieldConfig;
  value: string;
  isDirty: boolean;
  isHighlighted: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  onReset: () => void;
}

function FieldEditor({ path, config, value, isDirty, isHighlighted, onFocus, onBlur, onChange, onReset }: FieldEditorProps) {
  const isRtl = detectRtl(value);

  return (
    <div
      style={{
        padding: '6px 16px',
        borderLeft: isHighlighted ? '3px solid #4a6cf7' : '3px solid transparent',
        background: isHighlighted ? '#f0f4ff' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
        <label
          style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace', cursor: 'pointer' }}
          title={config.description}
        >
          {path}
          {isDirty && <span style={{ color: '#e67e22', marginLeft: '4px' }}>●</span>}
        </label>
        {isDirty && (
          <button
            type="button"
            onClick={onReset}
            style={{
              fontSize: '10px',
              color: '#999',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            reset
          </button>
        )}
      </div>
      {config.richText ? (
        <div
          contentEditable
          suppressContentEditableWarning
          dir={isRtl ? 'rtl' : 'ltr'}
          onFocus={onFocus}
          onBlur={(e) => {
            onChange(e.currentTarget.innerHTML);
            onBlur();
          }}
          style={editorInputStyle}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <textarea
          value={value}
          dir={isRtl ? 'rtl' : 'ltr'}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          rows={value.length > 80 ? 3 : 1}
          style={{
            ...editorInputStyle,
            resize: 'vertical',
          }}
          aria-label={`Edit ${path}`}
        />
      )}
    </div>
  );
}

const editorInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid #ddd',
  borderRadius: '3px',
  fontSize: '13px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  lineHeight: '1.4',
};

/** Detect RTL text using Unicode bidi ranges. */
function detectRtl(text: string): boolean {
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0780-\u07BF\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
  return rtlRegex.test(text.slice(0, 30));
}
