import { describe, it, expect } from 'vitest';
import { validate } from './validate';

describe('validate', () => {
  it('validates clean overrides (all keys exist)', () => {
    const results = validate(
      { title: 'Hello', sub: 'World' },
      { title: 'Hola' },
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.valid).toBe(true);
    expect(results[0]!.warnings).toEqual([]);
    expect(results[0]!.errors).toEqual([]);
  });

  it('flags stale keys', () => {
    const results = validate(
      { title: 'Hello' },
      { missing: 'Gone', 'also.missing': 'Gone too' },
    );
    expect(results).toHaveLength(2);
    expect(results[0]!.warnings).toContain('Stale override: "missing" does not exist in source');
    expect(results[1]!.warnings).toContain('Stale override: "also.missing" does not exist in source');
  });

  it('flags empty values', () => {
    const results = validate(
      { title: 'Hello' },
      { title: '' },
    );
    expect(results[0]!.warnings).toContain('Empty override for "title"');
  });

  it('flags whitespace-only values as empty', () => {
    const results = validate(
      { title: 'Hello' },
      { title: '   ' },
    );
    expect(results[0]!.warnings).toContain('Empty override for "title"');
  });

  it('handles mix of valid and invalid', () => {
    const results = validate(
      { hero: { title: 'Hello', sub: 'World' } },
      { 'hero.title': 'Hola', stale: 'Gone', 'hero.sub': '' },
    );
    expect(results).toHaveLength(3);
    // hero.title: valid
    const titleResult = results.find(r => r.path === 'hero.title')!;
    expect(titleResult.warnings).toEqual([]);
    // stale: stale key
    const staleResult = results.find(r => r.path === 'stale')!;
    expect(staleResult.warnings.length).toBeGreaterThan(0);
    // hero.sub: empty value
    const subResult = results.find(r => r.path === 'hero.sub')!;
    expect(subResult.warnings.length).toBeGreaterThan(0);
  });

  it('returns empty results for empty overrides', () => {
    const results = validate({ title: 'Hello' }, {});
    expect(results).toEqual([]);
  });
});
