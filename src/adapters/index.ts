import type { OverrideMap, RestringAdapter } from '../core/types';

/**
 * Validate that a parsed value is a valid OverrideMap (all string values).
 * Returns a clean object with only string-valued entries.
 */
function validateOverrideMap(raw: unknown): OverrideMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: OverrideMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

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
 * Accepts an optional storage parameter for testing or custom storage backends.
 *
 * **Security note:** localStorage data is accessible to any JavaScript running
 * on the same origin, including third-party scripts. Do not store sensitive
 * content in overrides if untrusted scripts run on the same page.
 * Consider `sessionStorage` (via the `storage` parameter) if overrides should
 * not persist across browser sessions.
 */
export function createLocalStorageAdapter(
  key = 'restringjs:overrides',
  storage?: Storage,
): RestringAdapter {
  const getStorage = () => storage ?? globalThis.localStorage;

  return {
    async load() {
      try {
        const raw = getStorage().getItem(key);
        if (!raw) return {};
        return validateOverrideMap(JSON.parse(raw));
      } catch {
        return {};
      }
    },
    async save(overrides) {
      getStorage().setItem(key, JSON.stringify(overrides));
    },
    async clear() {
      getStorage().removeItem(key);
    },
  };
}

/**
 * REST adapter. Sends overrides to a remote endpoint.
 *
 * **Security note:** Do not pass user-controlled URLs as the `endpoint`.
 * Only `http:` and `https:` schemes are accepted; other schemes
 * (e.g., `file:`, `ftp:`) are rejected to prevent SSRF when used server-side.
 */
export function createRestAdapter(endpoint: string, options?: RequestInit): RestringAdapter {
  // Validate endpoint scheme
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`restringjs REST adapter: unsupported protocol "${url.protocol}". Only http: and https: are allowed.`);
    }
  } catch (e) {
    if (e instanceof TypeError) {
      const wrapped = new Error(`restringjs REST adapter: invalid endpoint URL "${endpoint}".`);
      (wrapped as unknown as Record<string, unknown>).cause = e;
      throw wrapped;
    }
    throw e;
  }

  return {
    async load() {
      const res = await fetch(endpoint, {
        method: 'GET',
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
      if (!res.ok) return {};
      const raw: unknown = await res.json();
      return validateOverrideMap(raw);
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
