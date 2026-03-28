import type { OverrideMap } from '../core/types';

/**
 * Export overrides to a JSON string.
 */
export function exportOverrides(overrides: OverrideMap): string {
  return JSON.stringify(overrides, null, 2);
}

/**
 * Import overrides from a JSON string.
 */
export function importOverrides(json: string): OverrideMap {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid override format: expected a JSON object');
  }
  const result: OverrideMap = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string') {
      throw new Error(`Invalid value for key "${key}": expected string, got ${typeof value}`);
    }
    result[key] = value;
  }
  return result;
}
