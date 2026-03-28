import { describe, it, expect } from 'vitest';
import {
  detectFormat,
  extractIcuVariables,
  extractI18nextVariables,
  validateIcu,
  getPluralCategories,
} from './index';

describe('detectFormat', () => {
  it('detects ICU plural patterns', () => {
    expect(detectFormat('{count, plural, one {# item} other {# items}}')).toBe('icu');
  });

  it('detects ICU select patterns', () => {
    expect(detectFormat('{gender, select, male {He} female {She} other {They}}')).toBe('icu');
  });

  it('detects ICU simple variables', () => {
    expect(detectFormat('Hello {name}!')).toBe('icu');
  });

  it('detects i18next double-brace variables', () => {
    expect(detectFormat('Hello {{name}}!')).toBe('i18next');
  });

  it('detects i18next $t references', () => {
    expect(detectFormat('See $t(other.key) for details')).toBe('i18next');
  });

  it('returns plain for simple text', () => {
    expect(detectFormat('Hello world')).toBe('plain');
  });

  it('returns plain for empty string', () => {
    expect(detectFormat('')).toBe('plain');
  });
});

describe('extractIcuVariables', () => {
  it('extracts simple variables', () => {
    expect(extractIcuVariables('Hello {name}, you have {count} items')).toEqual(['name', 'count']);
  });

  it('extracts from plural patterns', () => {
    const vars = extractIcuVariables('{count, plural, one {# item} other {# items}}');
    expect(vars).toContain('count');
  });

  it('returns empty array for plain text', () => {
    expect(extractIcuVariables('Hello world')).toEqual([]);
  });

  it('deduplicates variables', () => {
    expect(extractIcuVariables('{name} says hi to {name}')).toEqual(['name']);
  });
});

describe('extractI18nextVariables', () => {
  it('extracts double-brace variables', () => {
    expect(extractI18nextVariables('Hello {{name}}, count: {{count}}')).toEqual(['name', 'count']);
  });

  it('returns empty for plain text', () => {
    expect(extractI18nextVariables('Hello world')).toEqual([]);
  });
});

describe('validateIcu', () => {
  it('validates correct ICU syntax', () => {
    expect(validateIcu('Hello {name}')).toEqual({ valid: true });
  });

  it('detects unmatched opening brace', () => {
    const result = validateIcu('Hello {name');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unmatched opening brace');
  });

  it('detects unmatched closing brace', () => {
    const result = validateIcu('Hello name}');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unmatched closing brace');
  });

  it('validates nested braces', () => {
    expect(validateIcu('{count, plural, one {# item} other {# items}}')).toEqual({ valid: true });
  });
});

describe('getPluralCategories', () => {
  it('returns categories for English', () => {
    const cats = getPluralCategories('en');
    expect(cats).toContain('one');
    expect(cats).toContain('other');
  });

  it('returns fallback for invalid locale', () => {
    const cats = getPluralCategories('xx-invalid');
    expect(cats.length).toBeGreaterThan(0);
  });
});
