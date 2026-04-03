import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FieldConfig, FieldPath, RestringAdapter, RestringContextValue, SectionConfig } from '../core/types';
import { createStore, type StateStorage } from '../core/store';
import { RestringContext } from './context';

/**
 * Callback fired when an override is set or reset.
 * @param path - The field path that changed
 * @param value - The new override value, or `null` if the field was reset to its default
 * @param overrides - The full current override map after the change
 */
export type OverrideChangeCallback = (path: FieldPath, value: string | null, overrides: Record<string, string>) => void;

interface RestringProviderProps {
  enabled: boolean;
  adapter?: RestringAdapter;
  /** Whether highlight mode starts enabled. Defaults to `true`. */
  defaultHighlightMode?: boolean;
  /** CSS color for highlight overlays. Defaults to `'#4a6cf7'`. */
  highlightColor?: string;
  /** Custom persistence for UI state (highlight mode, sidebar). Defaults to localStorage. */
  storage?: StateStorage;
  /**
   * Called whenever an override is set or a field is reset.
   * Useful for retrofit integrations where the host app manages its own
   * string data layer outside of restringjs hooks.
   */
  onOverrideChange?: OverrideChangeCallback;
  children: React.ReactNode;
}

export function RestringProvider({ enabled, adapter, defaultHighlightMode, highlightColor, storage, onOverrideChange, children }: RestringProviderProps) {
  const storeRef = useRef(createStore({ defaultHighlightMode, highlightColor, storage }));
  const [highlightedField, setHighlightedField] = useState<FieldPath | null>(null);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  const onOverrideChangeRef = useRef(onOverrideChange);
  onOverrideChangeRef.current = onOverrideChange;

  // Load overrides from adapter on mount
  useEffect(() => {
    if (!enabled || !adapterRef.current) return;
    void adapterRef.current.load().then((loaded) => {
      storeRef.current.setOverrides(loaded);
    });
  }, [enabled]);

  const save = useCallback(async () => {
    if (!adapterRef.current) return;
    await adapterRef.current.save(storeRef.current.getOverrides());
  }, []);

  const loadOverrides = useCallback(async () => {
    if (!adapterRef.current) return;
    const loaded = await adapterRef.current.load();
    storeRef.current.setOverrides(loaded);
  }, []);

  const value = useMemo<RestringContextValue>(() => ({
    enabled,
    getValue: (path: FieldPath) => storeRef.current.getValue(path),
    setOverride: (path: FieldPath, val: string) => {
      storeRef.current.setOverride(path, val);
      onOverrideChangeRef.current?.(path, val, storeRef.current.getOverrides());
    },
    resetField: (path: FieldPath) => {
      storeRef.current.resetField(path);
      onOverrideChangeRef.current?.(path, null, storeRef.current.getOverrides());
    },
    resetAll: () => storeRef.current.resetAll(),
    save,
    registerField: (config: FieldConfig) => storeRef.current.registerField(config),
    registerSection: (config: SectionConfig) => storeRef.current.registerSection(config),
    subscribe: (listener: () => void) => storeRef.current.subscribe(listener),
    getSnapshot: () => storeRef.current.getSnapshot(),
    isDirty: () => storeRef.current.isDirty(),
    getOverrides: () => storeRef.current.getOverrides(),
    loadOverrides,
    highlightedField,
    setHighlightedField,
    sidebarOpen: storeRef.current.getSidebarOpen(),
    setSidebarOpen: (open: boolean) => storeRef.current.setSidebarOpen(open),
    highlightMode: storeRef.current.getHighlightMode(),
    setHighlightMode: (on: boolean) => storeRef.current.setHighlightMode(on),
    highlightColor: storeRef.current.getHighlightColor(),
    toggleHighlightHidden: (path: FieldPath) => storeRef.current.toggleHighlightHidden(path),
    isHighlightHidden: (path: FieldPath) => storeRef.current.isHighlightHidden(path),
  }), [enabled, save, loadOverrides, highlightedField]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <RestringContext.Provider value={value}>
      {children}
    </RestringContext.Provider>
  );
}
