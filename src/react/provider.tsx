import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FieldConfig, FieldPath, RestringAdapter, RestringContextValue, SectionConfig } from '../core/types';
import { createStore } from '../core/store';
import { RestringContext } from './context';

interface RestringProviderProps {
  enabled: boolean;
  adapter?: RestringAdapter;
  /** Whether highlight mode starts enabled. Defaults to `true`. */
  defaultHighlightMode?: boolean;
  children: React.ReactNode;
}

export function RestringProvider({ enabled, adapter, defaultHighlightMode, children }: RestringProviderProps) {
  const storeRef = useRef(createStore({ defaultHighlightMode }));
  const [highlightedField, setHighlightedField] = useState<FieldPath | null>(null);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

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
    setOverride: (path: FieldPath, val: string) => storeRef.current.setOverride(path, val),
    resetField: (path: FieldPath) => storeRef.current.resetField(path),
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
