import { describe, it, expect } from 'vitest';
import { diff } from './diff';

describe('diff', () => {
  it('finds changed fields with matching overrides', () => {
    const result = diff(
      { hero: { title: 'Hello', sub: 'World' } },
      { 'hero.title': 'Hola' },
    );
    expect(result).toEqual([
      { path: 'hero.title', original: 'Hello', override: 'Hola' },
    ]);
  });

  it('returns empty when no changes', () => {
    const result = diff(
      { title: 'Hello' },
      { title: 'Hello' },
    );
    expect(result).toEqual([]);
  });

  it('ignores stale override keys (not in source)', () => {
    const result = diff(
      { title: 'Hello' },
      { missing: 'Nope' },
    );
    expect(result).toEqual([]);
  });

  it('works with prefix-like paths', () => {
    // Simulates the case where prefix has been stripped from source before calling diff
    const result = diff(
      { title: 'Hello', sub: 'World' },
      { title: 'Hola' },
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.path).toBe('title');
    expect(result[0]!.original).toBe('Hello');
    expect(result[0]!.override).toBe('Hola');
  });

  it('sorts results by path', () => {
    const result = diff(
      { b: 'B', a: 'A' },
      { b: 'X', a: 'Y' },
    );
    expect(result[0]!.path).toBe('a');
    expect(result[1]!.path).toBe('b');
  });

  it('handles multiple nested overrides', () => {
    const result = diff(
      { page: { header: { title: 'Hi', desc: 'Desc' }, footer: { text: 'Bye' } } },
      { 'page.header.title': 'New Hi', 'page.footer.text': 'New Bye' },
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.path).toBe('page.footer.text');
    expect(result[1]!.path).toBe('page.header.title');
  });

  it('handles empty overrides', () => {
    const result = diff({ title: 'Hello' }, {});
    expect(result).toEqual([]);
  });

  it('handles empty source', () => {
    const result = diff({}, { title: 'Hello' });
    expect(result).toEqual([]);
  });
});
