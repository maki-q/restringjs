import { describe, it, expect } from 'vitest';
import { diff } from './diff';
import { validate } from './validate';
import { exportOverrides, importOverrides } from './io';

describe('diff', () => {
  it('finds changed fields', () => {
    const result = diff(
      { hero: { title: 'Hello', sub: 'World' } },
      { 'hero.title': 'Hola' },
    );
    expect(result).toEqual([
      { path: 'hero.title', original: 'Hello', override: 'Hola' },
    ]);
  });

  it('ignores unchanged overrides', () => {
    const result = diff(
      { title: 'Hello' },
      { title: 'Hello' },
    );
    expect(result).toEqual([]);
  });

  it('ignores overrides for non-existent paths', () => {
    const result = diff(
      { title: 'Hello' },
      { missing: 'Nope' },
    );
    expect(result).toEqual([]);
  });

  it('sorts results by path', () => {
    const result = diff(
      { b: 'B', a: 'A' },
      { b: 'X', a: 'Y' },
    );
    expect(result[0]!.path).toBe('a');
    expect(result[1]!.path).toBe('b');
  });
});

describe('validate', () => {
  it('flags stale overrides', () => {
    const results = validate(
      { title: 'Hello' },
      { missing: 'Gone' },
    );
    expect(results[0]!.warnings).toContain('Stale override: "missing" does not exist in source');
  });

  it('flags empty overrides', () => {
    const results = validate(
      { title: 'Hello' },
      { title: '   ' },
    );
    expect(results[0]!.warnings).toContain('Empty override for "title"');
  });

  it('returns clean results for valid overrides', () => {
    const results = validate(
      { title: 'Hello' },
      { title: 'Hola' },
    );
    expect(results[0]!.valid).toBe(true);
    expect(results[0]!.warnings).toEqual([]);
    expect(results[0]!.errors).toEqual([]);
  });
});

describe('exportOverrides', () => {
  it('exports as formatted JSON', () => {
    const json = exportOverrides({ a: 'x', b: 'y' });
    expect(JSON.parse(json)).toEqual({ a: 'x', b: 'y' });
    expect(json).toContain('\n'); // Pretty-printed
  });
});

describe('importOverrides', () => {
  it('imports valid JSON', () => {
    const result = importOverrides('{"a":"x"}');
    expect(result).toEqual({ a: 'x' });
  });

  it('throws on non-object JSON', () => {
    expect(() => importOverrides('"hello"')).toThrow('expected a JSON object');
    expect(() => importOverrides('[1,2]')).toThrow('expected a JSON object');
  });

  it('throws on non-string values', () => {
    expect(() => importOverrides('{"a":123}')).toThrow('expected string');
  });

  it('roundtrips with exportOverrides', () => {
    const original = { 'hero.title': 'Hola', 'footer.text': 'Fin' };
    const exported = exportOverrides(original);
    const imported = importOverrides(exported);
    expect(imported).toEqual(original);
  });
});
