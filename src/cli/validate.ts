import type { OverrideMap, ValidationResult } from '../core/types';
import { flattenObject } from '../core/apply';

/**
 * Validate overrides against a source object.
 * Flags stale keys (overrides that no longer exist in source).
 */
export function validate(
  original: Record<string, unknown>,
  overrides: OverrideMap,
): ValidationResult[] {
  const flat = flattenObject(original);
  const results: ValidationResult[] = [];

  for (const [path, value] of Object.entries(overrides)) {
    const result: ValidationResult = {
      path,
      valid: true,
      errors: [],
      warnings: [],
    };

    // Check stale keys
    if (!(path in flat)) {
      result.warnings.push(`Stale override: "${path}" does not exist in source`);
    }

    // Check empty values
    if (value.trim() === '') {
      result.warnings.push(`Empty override for "${path}"`);
    }

    results.push(result);
  }

  return results;
}
