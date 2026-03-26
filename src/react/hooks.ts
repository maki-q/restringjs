import { useEffect, useSyncExternalStore } from 'react';
import type { FieldConfig, FieldPath, SectionConfig } from '../core/types';
import { useRestringContext } from './context';

/**
 * Register a field and return its current value (override or default).
 * Uses useSyncExternalStore for fine-grained reactivity.
 */
export function useRestring(config: FieldConfig): string {
  const ctx = useRestringContext();

  useEffect(() => {
    return ctx.registerField(config);
  }, [ctx, config.path, config.defaultValue, config.section, config.format]);

  const value = useSyncExternalStore(
    ctx.subscribe,
    () => ctx.getValue(config.path),
    () => config.defaultValue,
  );

  return value;
}

/**
 * Register a field and get both value and setter.
 */
export function useRegister(config: FieldConfig): [string, (value: string) => void] {
  const ctx = useRestringContext();
  const value = useRestring(config);

  return [value, (newValue: string) => ctx.setOverride(config.path, newValue)];
}

/**
 * Register a section for grouping in the sidebar.
 */
export function useRegisterSection(config: SectionConfig): void {
  const ctx = useRestringContext();

  useEffect(() => {
    return ctx.registerSection(config);
  }, [ctx, config.id, config.label, config.order]);
}

/**
 * Get a field value by path without registering.
 * Useful for reading already-registered fields.
 */
export function useFieldValue(path: FieldPath): string {
  const ctx = useRestringContext();

  return useSyncExternalStore(
    ctx.subscribe,
    () => ctx.getValue(path),
    () => '',
  );
}

/**
 * Get the full snapshot of the store.
 */
export function useSnapshot() {
  const ctx = useRestringContext();

  return useSyncExternalStore(
    ctx.subscribe,
    () => ctx.getSnapshot(),
    () => ctx.getSnapshot(),
  );
}
