import { describe, it, expect } from 'vitest';
import { createStore } from './store';

describe('createStore', () => {
  it('registers and retrieves a field', () => {
    const store = createStore();
    store.registerField({ path: 'hero.title', defaultValue: 'Hello' });
    expect(store.getValue('hero.title')).toBe('Hello');
  });

  it('returns empty string for unregistered fields', () => {
    const store = createStore();
    expect(store.getValue('missing.field')).toBe('');
  });

  it('applies overrides over defaults', () => {
    const store = createStore();
    store.registerField({ path: 'hero.title', defaultValue: 'Hello' });
    store.setOverride('hero.title', 'Hola');
    expect(store.getValue('hero.title')).toBe('Hola');
  });

  it('removes override when set back to default', () => {
    const store = createStore();
    store.registerField({ path: 'hero.title', defaultValue: 'Hello' });
    store.setOverride('hero.title', 'Changed');
    expect(store.isDirty()).toBe(true);
    store.setOverride('hero.title', 'Hello');
    expect(store.isDirty()).toBe(false);
    expect(store.getValue('hero.title')).toBe('Hello');
  });

  it('resets a single field', () => {
    const store = createStore();
    store.registerField({ path: 'hero.title', defaultValue: 'Hello' });
    store.setOverride('hero.title', 'Changed');
    store.resetField('hero.title');
    expect(store.getValue('hero.title')).toBe('Hello');
    expect(store.isDirty()).toBe(false);
  });

  it('resets all fields', () => {
    const store = createStore();
    store.registerField({ path: 'a', defaultValue: 'A' });
    store.registerField({ path: 'b', defaultValue: 'B' });
    store.setOverride('a', 'X');
    store.setOverride('b', 'Y');
    store.resetAll();
    expect(store.getValue('a')).toBe('A');
    expect(store.getValue('b')).toBe('B');
    expect(store.isDirty()).toBe(false);
  });

  it('bulk sets overrides', () => {
    const store = createStore();
    store.registerField({ path: 'a', defaultValue: 'A' });
    store.setOverrides({ a: 'X', b: 'Y' });
    expect(store.getValue('a')).toBe('X');
    expect(store.getOverrides()).toEqual({ a: 'X', b: 'Y' });
  });

  it('returns immutable override map', () => {
    const store = createStore();
    store.setOverrides({ a: 'X' });
    const o1 = store.getOverrides();
    const o2 = store.getOverrides();
    expect(o1).toEqual(o2);
    expect(o1).not.toBe(o2); // Different references
  });

  it('notifies subscribers on changes', () => {
    const store = createStore();
    let callCount = 0;
    store.subscribe(() => { callCount++; });
    store.registerField({ path: 'a', defaultValue: 'A' });
    expect(callCount).toBe(1);
    store.setOverride('a', 'B');
    expect(callCount).toBe(2);
  });

  it('unsubscribes correctly', () => {
    const store = createStore();
    let callCount = 0;
    const unsub = store.subscribe(() => { callCount++; });
    store.registerField({ path: 'a', defaultValue: 'A' });
    expect(callCount).toBe(1);
    unsub();
    store.setOverride('a', 'B');
    expect(callCount).toBe(1); // No more calls
  });

  it('unregisters fields via cleanup function', () => {
    const store = createStore();
    const cleanup = store.registerField({ path: 'a', defaultValue: 'A' });
    expect(store.getSnapshot().fields.has('a')).toBe(true);
    cleanup();
    expect(store.getSnapshot().fields.has('a')).toBe(false);
  });

  it('registers and unregisters sections', () => {
    const store = createStore();
    const cleanup = store.registerSection({ id: 'hero', label: 'Hero Section' });
    expect(store.getSnapshot().sections.has('hero')).toBe(true);
    cleanup();
    expect(store.getSnapshot().sections.has('hero')).toBe(false);
  });

  it('getSnapshot returns current state', () => {
    const store = createStore();
    store.registerField({ path: 'a', defaultValue: 'A', section: 'main' });
    store.registerSection({ id: 'main', label: 'Main' });
    store.setOverride('a', 'X');
    const snap = store.getSnapshot();
    expect(snap.fields.size).toBe(1);
    expect(snap.sections.size).toBe(1);
    expect(snap.overrides).toEqual({ a: 'X' });
    expect(snap.dirty.has('a')).toBe(true);
  });

  it('tracks version on changes', () => {
    const store = createStore();
    const v0 = store.getVersion();
    store.registerField({ path: 'a', defaultValue: 'A' });
    expect(store.getVersion()).toBe(v0 + 1);
    store.setOverride('a', 'B');
    expect(store.getVersion()).toBe(v0 + 2);
  });

  it('resetField is no-op for non-overridden field', () => {
    const store = createStore();
    store.registerField({ path: 'a', defaultValue: 'A' });
    let callCount = 0;
    store.subscribe(() => { callCount++; });
    store.resetField('a');
    expect(callCount).toBe(0); // No emit since nothing changed
  });
});
