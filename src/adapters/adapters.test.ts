import { describe, it, expect } from 'vitest';
import { createMemoryAdapter, createLocalStorageAdapter } from './index';

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
  it('loads empty overrides when nothing stored', async () => {
    const adapter = createLocalStorageAdapter('test-key');
    expect(await adapter.load()).toEqual({});
  });

  it('saves and loads overrides', async () => {
    const adapter = createLocalStorageAdapter('test-key-2');
    await adapter.save({ foo: 'bar' });
    expect(await adapter.load()).toEqual({ foo: 'bar' });
  });

  it('clears overrides', async () => {
    const adapter = createLocalStorageAdapter('test-key-3');
    await adapter.save({ foo: 'bar' });
    await adapter.clear();
    expect(await adapter.load()).toEqual({});
  });

  it('handles invalid JSON gracefully', async () => {
    localStorage.setItem('test-bad-json', 'not-json');
    const adapter = createLocalStorageAdapter('test-bad-json');
    expect(await adapter.load()).toEqual({});
  });
});
