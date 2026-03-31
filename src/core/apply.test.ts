import { describe, it, expect } from 'vitest';
import { applyOverrides, flattenObject, unflattenObject } from './apply';

describe('applyOverrides', () => {
  it('applies flat overrides', () => {
    const original = { title: 'Hello', subtitle: 'World' };
    const result = applyOverrides(original, { title: 'Hola' });
    expect(result).toEqual({ title: 'Hola', subtitle: 'World' });
  });

  it('does not mutate the original', () => {
    const original = { title: 'Hello' };
    const frozen = Object.freeze(original);
    const result = applyOverrides(frozen as Record<string, unknown>, { title: 'Hola' });
    expect(result.title).toBe('Hola');
    expect(original.title).toBe('Hello');
  });

  it('applies nested dot-path overrides', () => {
    const original = { hero: { title: 'Hello', sub: 'World' } };
    const result = applyOverrides(original, { 'hero.title': 'Hola' });
    expect(result.hero.title).toBe('Hola');
    expect(result.hero.sub).toBe('World');
  });

  it('ignores overrides for non-existent keys', () => {
    const original = { title: 'Hello' };
    const result = applyOverrides(original, { missing: 'Nope' });
    expect(result).toEqual({ title: 'Hello' });
  });

  it('handles deeply nested objects', () => {
    const original = { a: { b: { c: 'deep' } } };
    const result = applyOverrides(original, { 'a.b.c': 'changed' });
    expect(result.a.b.c).toBe('changed');
  });

  it('returns a new object reference', () => {
    const original = { title: 'Hello' };
    const result = applyOverrides(original, {});
    expect(result).not.toBe(original);
    expect(result).toEqual(original);
  });
});

describe('flattenObject', () => {
  it('flattens a simple object', () => {
    expect(flattenObject({ title: 'Hello' })).toEqual({ title: 'Hello' });
  });

  it('flattens nested objects with dot paths', () => {
    expect(flattenObject({ hero: { title: 'Hi', sub: 'Lo' } })).toEqual({
      'hero.title': 'Hi',
      'hero.sub': 'Lo',
    });
  });

  it('handles deeply nested objects', () => {
    expect(flattenObject({ a: { b: { c: 'deep' } } })).toEqual({
      'a.b.c': 'deep',
    });
  });

  it('skips non-string values and arrays', () => {
    expect(flattenObject({ num: 42 as unknown as string, arr: [1, 2] as unknown as string })).toEqual({});
  });

  it('uses prefix when provided', () => {
    expect(flattenObject({ title: 'Hi' }, 'page')).toEqual({ 'page.title': 'Hi' });
  });
});

describe('unflattenObject', () => {
  it('unflattens dot-path keys', () => {
    expect(unflattenObject({ 'hero.title': 'Hi' })).toEqual({ hero: { title: 'Hi' } });
  });

  it('handles multiple paths', () => {
    expect(unflattenObject({ 'a.b': '1', 'a.c': '2', 'd': '3' })).toEqual({
      a: { b: '1', c: '2' },
      d: '3',
    });
  });

  it('roundtrips with flattenObject', () => {
    const original = { hero: { title: 'Hi', sub: 'Lo' }, footer: { text: 'End' } };
    const flat = flattenObject(original);
    const result = unflattenObject(flat);
    expect(result).toEqual(original);
  });
});

describe('prototype pollution protection', () => {
  it('applyOverrides ignores __proto__ keys', () => {
    const original = { title: 'Hello' };
    const result = applyOverrides(original, { '__proto__.polluted': 'yes' });
    expect(result).toEqual({ title: 'Hello' });
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('applyOverrides ignores constructor keys', () => {
    const original = { title: 'Hello' };
    const result = applyOverrides(original, { 'constructor.prototype.polluted': 'yes' });
    expect(result).toEqual({ title: 'Hello' });
  });

  it('unflattenObject ignores __proto__ paths', () => {
    const result = unflattenObject({ '__proto__.polluted': 'yes', 'safe.key': 'ok' });
    expect(result).toEqual({ safe: { key: 'ok' } });
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('flattenObject skips __proto__ keys', () => {
    const obj = { safe: 'yes' };
    Object.defineProperty(obj, '__proto__', { value: { evil: 'no' }, enumerable: true });
    const result = flattenObject(obj);
    expect(result).toEqual({ safe: 'yes' });
  });
});
