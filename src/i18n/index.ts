import type { FormatHint } from '../core/types';

/**
 * Detect the format of a string by inspecting its syntax.
 */
export function detectFormat(value: string): FormatHint {
  // ICU MessageFormat patterns: {name}, {count, plural, ...}, {gender, select, ...}
  if (/\{[a-zA-Z_]\w*\s*,\s*(plural|select|selectordinal)\s*,/.test(value)) {
    return 'icu';
  }
  // i18next patterns: {{variable}}, $t(key)
  if (/\{\{[a-zA-Z_]\w*\}\}/.test(value) || /\$t\(/.test(value)) {
    return 'i18next';
  }
  // ICU simple variables: {name}
  if (/\{[a-zA-Z_]\w*\}/.test(value)) {
    return 'icu';
  }
  return 'plain';
}

/**
 * Extract variable names from an ICU MessageFormat string.
 */
export function extractIcuVariables(value: string): string[] {
  const vars = new Set<string>();
  const regex = /\{([a-zA-Z_]\w*)(?:\s*,|\s*\})/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    if (match[1]) {
      vars.add(match[1]);
    }
  }
  return Array.from(vars);
}

/**
 * Extract variable names from an i18next string.
 */
export function extractI18nextVariables(value: string): string[] {
  const vars = new Set<string>();
  const regex = /\{\{([a-zA-Z_]\w*)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    if (match[1]) {
      vars.add(match[1]);
    }
  }
  return Array.from(vars);
}

/**
 * Validate an ICU MessageFormat string for syntax errors.
 */
export function validateIcu(value: string): { valid: boolean; error?: string } {
  try {
    // Simple brace matching validation
    let depth = 0;
    for (const char of value) {
      if (char === '{') depth++;
      if (char === '}') depth--;
      if (depth < 0) return { valid: false, error: 'Unmatched closing brace' };
    }
    if (depth !== 0) return { valid: false, error: 'Unmatched opening brace' };
    return { valid: true };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}

/**
 * Get plural category labels for a locale.
 */
export function getPluralCategories(locale: string): string[] {
  try {
    const pr = new Intl.PluralRules(locale);
    return pr.resolvedOptions().pluralCategories;
  } catch {
    return ['one', 'other'];
  }
}
