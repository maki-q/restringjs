import type { OverrideMap, RestringAdapter } from '../core/types';

/**
 * In-memory adapter. Overrides are lost on page refresh.
 * Useful for testing and ephemeral sessions.
 */
export function createMemoryAdapter(initial: OverrideMap = {}): RestringAdapter {
  let stored: OverrideMap = { ...initial };

  return {
    async load() {
      return { ...stored };
    },
    async save(overrides) {
      stored = { ...overrides };
    },
    async clear() {
      stored = {};
    },
  };
}

/**
 * localStorage adapter. Persists overrides in the browser.
 */
export function createLocalStorageAdapter(key = 'restringjs:overrides'): RestringAdapter {
  return {
    async load() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return {};
        return JSON.parse(raw) as OverrideMap;
      } catch {
        return {};
      }
    },
    async save(overrides) {
      localStorage.setItem(key, JSON.stringify(overrides));
    },
    async clear() {
      localStorage.removeItem(key);
    },
  };
}

/**
 * REST adapter. Sends overrides to a remote endpoint.
 */
export function createRestAdapter(endpoint: string, options?: RequestInit): RestringAdapter {
  return {
    async load() {
      const res = await fetch(endpoint, {
        method: 'GET',
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
      if (!res.ok) return {};
      return (await res.json()) as OverrideMap;
    },
    async save(overrides) {
      await fetch(endpoint, {
        method: 'PUT',
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(overrides),
      });
    },
    async clear() {
      await fetch(endpoint, {
        method: 'DELETE',
        ...options,
      });
    },
  };
}
