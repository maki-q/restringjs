import { describe, it, expect } from 'vitest';
import { createStore } from './store';

describe('createStore', () => {  it('registers and retrieves a field', () => {
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

  // Edge cases found during demo testing (2026-03-31)

  describe('sidebar and highlight mode independence', () => {
    it('setSidebarOpen does not reset highlightMode', () => {
      const store = createStore();
      // Highlight defaults to true
      expect(store.getHighlightMode()).toBe(true);

      // Turn highlight off
      store.setHighlightMode(false);
      expect(store.getHighlightMode()).toBe(false);

      // Open sidebar - highlight should stay off
      store.setSidebarOpen(true);
      expect(store.getHighlightMode()).toBe(false);

      // Close sidebar - highlight should stay off
      store.setSidebarOpen(false);
      expect(store.getHighlightMode()).toBe(false);
    });

    it('highlight mode survives sidebar close/reopen cycle', () => {
      const store = createStore();

      // Open sidebar, turn off highlights, close sidebar
      store.setSidebarOpen(true);
      store.setHighlightMode(false);
      store.setSidebarOpen(false);

      // Reopen sidebar - highlight should still be off
      store.setSidebarOpen(true);
      expect(store.getHighlightMode()).toBe(false);
    });

    it('highlight mode survives multiple sidebar toggle cycles', () => {
      const store = createStore();

      store.setSidebarOpen(true);
      store.setHighlightMode(false);

      // Toggle sidebar 5 times
      for (let i = 0; i < 5; i++) {
        store.setSidebarOpen(false);
        store.setSidebarOpen(true);
      }

      expect(store.getHighlightMode()).toBe(false);
    });

    it('highlight on also survives sidebar cycles', () => {
      const store = createStore({ defaultHighlightMode: false });
      expect(store.getHighlightMode()).toBe(false);

      // Turn on, then toggle sidebar
      store.setHighlightMode(true);
      store.setSidebarOpen(true);
      store.setSidebarOpen(false);
      store.setSidebarOpen(true);

      expect(store.getHighlightMode()).toBe(true);
    });
  });

  describe('highlight mode configuration', () => {
    it('defaults to true when no option provided', () => {
      const store = createStore();
      expect(store.getHighlightMode()).toBe(true);
    });

    it('respects defaultHighlightMode: false', () => {
      const store = createStore({ defaultHighlightMode: false });
      expect(store.getHighlightMode()).toBe(false);
    });

    it('respects defaultHighlightMode: true', () => {
      const store = createStore({ defaultHighlightMode: true });
      expect(store.getHighlightMode()).toBe(true);
    });
  });

  describe('highlight color configuration', () => {
    it('defaults to #4a6cf7', () => {
      const store = createStore();
      expect(store.getHighlightColor()).toBe('#4a6cf7');
    });

    it('respects custom highlightColor', () => {
      const store = createStore({ highlightColor: '#ff0000' });
      expect(store.getHighlightColor()).toBe('#ff0000');
    });
  });

  describe('snapshot caching', () => {
    it('returns same reference when version has not changed', () => {
      const store = createStore();
      store.registerField({ path: 'a', defaultValue: 'A' });
      const snap1 = store.getSnapshot();
      const snap2 = store.getSnapshot();
      expect(snap1).toBe(snap2); // Same reference
    });

    it('returns new reference after mutation', () => {
      const store = createStore();
      store.registerField({ path: 'a', defaultValue: 'A' });
      const snap1 = store.getSnapshot();
      store.setOverride('a', 'B');
      const snap2 = store.getSnapshot();
      expect(snap1).not.toBe(snap2);
    });

    it('snapshot reflects current highlightMode', () => {
      const store = createStore();
      expect(store.getSnapshot().highlightMode).toBe(true);
      store.setHighlightMode(false);
      expect(store.getSnapshot().highlightMode).toBe(false);
    });

    it('snapshot reflects current sidebarOpen', () => {
      const store = createStore();
      expect(store.getSnapshot().sidebarOpen).toBe(false);
      store.setSidebarOpen(true);
      expect(store.getSnapshot().sidebarOpen).toBe(true);
    });
  });

  describe('no-op deduplication', () => {
    it('setSidebarOpen does not emit when value unchanged', () => {
      const store = createStore();
      let callCount = 0;
      store.subscribe(() => { callCount++; });

      store.setSidebarOpen(false); // Already false
      expect(callCount).toBe(0);

      store.setSidebarOpen(true);
      expect(callCount).toBe(1);

      store.setSidebarOpen(true); // Already true
      expect(callCount).toBe(1);
    });

    it('setHighlightMode does not emit when value unchanged', () => {
      const store = createStore(); // Defaults to true
      let callCount = 0;
      store.subscribe(() => { callCount++; });

      store.setHighlightMode(true); // Already true
      expect(callCount).toBe(0);

      store.setHighlightMode(false);
      expect(callCount).toBe(1);

      store.setHighlightMode(false); // Already false
      expect(callCount).toBe(1);
    });
  });

  describe('hiddenHighlights', () => {
    it('fields are not hidden by default', () => {
      const store = createStore();
      store.registerField({ path: 'hero.title', defaultValue: 'Hello' });
      expect(store.isHighlightHidden('hero.title')).toBe(false);
      expect(store.getHiddenHighlights().size).toBe(0);
    });

    it('toggleHighlightHidden hides a field', () => {
      const store = createStore();
      store.registerField({ path: 'hero.title', defaultValue: 'Hello' });
      store.toggleHighlightHidden('hero.title');
      expect(store.isHighlightHidden('hero.title')).toBe(true);
      expect(store.getHiddenHighlights().has('hero.title')).toBe(true);
    });

    it('toggleHighlightHidden toggles back to visible', () => {
      const store = createStore();
      store.registerField({ path: 'hero.title', defaultValue: 'Hello' });
      store.toggleHighlightHidden('hero.title');
      store.toggleHighlightHidden('hero.title');
      expect(store.isHighlightHidden('hero.title')).toBe(false);
    });

    it('emits on toggle', () => {
      const store = createStore();
      let callCount = 0;
      store.subscribe(() => { callCount++; });
      store.toggleHighlightHidden('hero.title');
      expect(callCount).toBe(1);
      store.toggleHighlightHidden('hero.title');
      expect(callCount).toBe(2);
    });

    it('snapshot includes hiddenHighlights', () => {
      const store = createStore();
      store.registerField({ path: 'hero.title', defaultValue: 'Hello' });
      store.toggleHighlightHidden('hero.title');
      const snap = store.getSnapshot();
      expect(snap.hiddenHighlights.has('hero.title')).toBe(true);
    });

    it('snapshot hiddenHighlights is a copy (not mutated by store)', () => {
      const store = createStore();
      store.toggleHighlightHidden('a.b');
      const snap = store.getSnapshot();
      store.toggleHighlightHidden('c.d');
      expect(snap.hiddenHighlights.has('c.d')).toBe(false);
    });

    it('getHiddenHighlights returns a copy', () => {
      const store = createStore();
      store.toggleHighlightHidden('a.b');
      const hidden = store.getHiddenHighlights();
      hidden.add('x.y');
      expect(store.isHighlightHidden('x.y')).toBe(false);
    });
  });
});
