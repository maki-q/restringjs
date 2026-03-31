import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryAdapter, createLocalStorageAdapter, createRestAdapter } from './index';

function createMockStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear() { data.clear(); },
    getItem(key) { return data.get(key) ?? null; },
    key(index) { return [...data.keys()][index] ?? null; },
    removeItem(key) { data.delete(key); },
    setItem(key, value) { data.set(key, String(value)); },
  };
}

describe('createMemoryAdapter', () => {
  it('loads empty overrides by default', async () => {
    const adapter = createMemoryAdapter();
    expect(await adapter.load()).toEqual({});
  });

  it('loads initial overrides', async () => {
    const adapter = createMemoryAdapter({ a: 'x' });
    expect(await adapter.load()).toEqual({ a: 'x' });
  });

  it('saves and loads overrides', async () => {
    const adapter = createMemoryAdapter();
    await adapter.save({ hello: 'world' });
    expect(await adapter.load()).toEqual({ hello: 'world' });
  });

  it('clears overrides', async () => {
    const adapter = createMemoryAdapter({ a: 'x' });
    await adapter.clear();
    expect(await adapter.load()).toEqual({});
  });

  it('returns immutable copies', async () => {
    const adapter = createMemoryAdapter({ a: 'x' });
    const r1 = await adapter.load();
    const r2 = await adapter.load();
    expect(r1).toEqual(r2);
    expect(r1).not.toBe(r2);
  });
});

describe('createLocalStorageAdapter', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  it('loads empty overrides when nothing stored', async () => {
    const adapter = createLocalStorageAdapter('test-key', mockStorage);
    expect(await adapter.load()).toEqual({});
  });

  it('saves and loads overrides', async () => {
    const adapter = createLocalStorageAdapter('test-key-2', mockStorage);
    await adapter.save({ foo: 'bar' });
    expect(await adapter.load()).toEqual({ foo: 'bar' });
  });

  it('clears overrides', async () => {
    const adapter = createLocalStorageAdapter('test-key-3', mockStorage);
    await adapter.save({ foo: 'bar' });
    await adapter.clear();
    expect(await adapter.load()).toEqual({});
  });

  it('handles invalid JSON gracefully', async () => {
    mockStorage.setItem('test-bad-json', 'not-json');
    const adapter = createLocalStorageAdapter('test-bad-json', mockStorage);
    expect(await adapter.load()).toEqual({});
  });

  it('strips non-string values from stored data', async () => {
    mockStorage.setItem('test-mixed', JSON.stringify({ good: 'yes', bad: 42, nested: { x: 1 } }));
    const adapter = createLocalStorageAdapter('test-mixed', mockStorage);
    expect(await adapter.load()).toEqual({ good: 'yes' });
  });
});

describe('createRestAdapter', () => {
  it('rejects non-http schemes', () => {
    expect(() => createRestAdapter('file:///etc/passwd')).toThrow('unsupported protocol');
    expect(() => createRestAdapter('ftp://example.com')).toThrow('unsupported protocol');
  });

  it('rejects invalid URLs', () => {
    expect(() => createRestAdapter('not a url')).toThrow('invalid endpoint URL');
  });

  it('accepts http and https URLs', () => {
    expect(() => createRestAdapter('http://localhost:3000/api')).not.toThrow();
    expect(() => createRestAdapter('https://example.com/api')).not.toThrow();
  });
});
