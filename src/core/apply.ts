import type { FieldPath, OverrideMap } from './types';

/** Keys that must never be used as property path segments. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafePath(path: string): boolean {
  return !path.split('.').some((seg) => FORBIDDEN_KEYS.has(seg));
}

/**
 * Apply overrides to a plain object, returning a new object.
 * Never mutates the original. Supports nested dot-path keys.
 * Rejects paths containing __proto__, constructor, or prototype segments.
 */
export function applyOverrides<T extends Record<string, unknown>>(
  original: T,
  overrides: OverrideMap,
  prefix = '',
): T {
  const result = { ...original };

  for (const [key, value] of Object.entries(overrides)) {
    if (!isSafePath(key)) continue;
    // Direct match: this key maps into the current level
    if (!key.includes('.')) {
      if (key in result) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }

  // Handle dot-path overrides by recursing into nested objects
  for (const [path, value] of Object.entries(overrides)) {
    if (!isSafePath(path)) continue;
    const targetPath = prefix ? path.slice(prefix.length + 1) : path;
    if (prefix && !path.startsWith(prefix + '.')) continue;
    if (!prefix && path.includes('.')) {
      const [firstKey, ...rest] = path.split('.');
      if (firstKey && firstKey in result) {
        const nested = result[firstKey as keyof T];
        if (nested !== null && typeof nested === 'object' && !Array.isArray(nested)) {
          (result as Record<string, unknown>)[firstKey] = applyOverrides(
            nested as Record<string, unknown>,
            { [rest.join('.')]: value },
          );
        }
      }
    } else if (prefix && targetPath && !targetPath.includes('.')) {
      if (targetPath in result) {
        (result as Record<string, unknown>)[targetPath] = value;
      }
    }
  }

  return result;
}

/**
 * Flatten a nested object into dot-path keys.
 * Skips keys that would create unsafe path segments.
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
): Record<FieldPath, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, path));
    }
  }

  return result;
}

/**
 * Unflatten dot-path keys back into a nested object.
 * Rejects paths containing __proto__, constructor, or prototype segments.
 */
export function unflattenObject(flat: Record<FieldPath, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [path, value] of Object.entries(flat)) {
    if (!isSafePath(path)) continue;
    const keys = path.split('.');
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    const lastKey = keys[keys.length - 1]!;
    current[lastKey] = value;
  }

  return result;
}
