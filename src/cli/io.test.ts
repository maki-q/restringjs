import { describe, it, expect } from 'vitest';
import { exportOverrides, importOverrides } from './io';

describe('exportOverrides', () => {
  it('produces valid JSON', () => {
    const json = exportOverrides({ a: 'x', b: 'y' });
    const parsed = JSON.parse(json);
    expect(parsed).toEqual({ a: 'x', b: 'y' });
  });

  it('outputs pretty-printed JSON', () => {
    const json = exportOverrides({ a: 'x' });
    expect(json).toContain('\n');
  });

  it('handles empty overrides', () => {
    const json = exportOverrides({});
    expect(JSON.parse(json)).toEqual({});
  });

  it('handles special characters in values', () => {
    const json = exportOverrides({ key: 'Line 1\nLine 2' });
    const parsed = JSON.parse(json);
    expect(parsed.key).toBe('Line 1\nLine 2');
  });
});

describe('importOverrides', () => {
  it('parses valid JSON object', () => {
    const result = importOverrides('{"a":"x","b":"y"}');
    expect(result).toEqual({ a: 'x', b: 'y' });
  });

  it('rejects arrays', () => {
    expect(() => importOverrides('[1,2]')).toThrow('expected a JSON object');
  });

  it('rejects non-string values', () => {
    expect(() => importOverrides('{"a":123}')).toThrow('expected string');
  });

  it('rejects non-object (string)', () => {
    expect(() => importOverrides('"hello"')).toThrow('expected a JSON object');
  });

  it('rejects null', () => {
    expect(() => importOverrides('null')).toThrow('expected a JSON object');
  });

  it('rejects booleans', () => {
    expect(() => importOverrides('true')).toThrow('expected a JSON object');
  });

  it('rejects numbers', () => {
    expect(() => importOverrides('42')).toThrow('expected a JSON object');
  });

  it('throws on invalid JSON', () => {
    expect(() => importOverrides('not json')).toThrow();
  });

  it('handles empty object', () => {
    const result = importOverrides('{}');
    expect(result).toEqual({});
  });
});

describe('round-trip: export then import', () => {
  it('produces the same data', () => {
    const original = { 'hero.title': 'Hola', 'footer.text': 'Fin' };
    const exported = exportOverrides(original);
    const imported = importOverrides(exported);
    expect(imported).toEqual(original);
  });

  it('handles empty data', () => {
    const original = {};
    const exported = exportOverrides(original);
    const imported = importOverrides(exported);
    expect(imported).toEqual(original);
  });

  it('preserves special characters', () => {
    const original = { key: "It's a \"test\"\nwith newlines" };
    const exported = exportOverrides(original);
    const imported = importOverrides(exported);
    expect(imported).toEqual(original);
  });
});
