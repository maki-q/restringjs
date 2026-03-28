import type { OverrideMap, DiffEntry } from '../core/types';
import { flattenObject } from '../core/apply';

/**
 * Compute diff between original strings and overrides.
 */
export function diff(
  original: Record<string, unknown>,
  overrides: OverrideMap,
): DiffEntry[] {
  const flat = flattenObject(original);
  const entries: DiffEntry[] = [];

  for (const [path, overrideValue] of Object.entries(overrides)) {
    const originalValue = flat[path];
    if (originalValue !== undefined && originalValue !== overrideValue) {
      entries.push({ path, original: originalValue, override: overrideValue });
    }
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}
