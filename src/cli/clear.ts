import type { RestringAdapter } from '../core/types';

/**
 * Clear all stored overrides via the adapter.
 */
export async function clear(adapter: RestringAdapter): Promise<void> {
  await adapter.clear();
}
