import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clear } from './clear';
import type { RestringAdapter } from '../core/types';

describe('clear', () => {
  it('calls adapter.clear()', async () => {
    const adapter: RestringAdapter = {
      load: vi.fn(async () => ({})),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };
    await clear(adapter);
    expect(adapter.clear).toHaveBeenCalledOnce();
  });

  it('propagates adapter errors', async () => {
    const adapter: RestringAdapter = {
      load: vi.fn(async () => ({})),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => { throw new Error('storage failure'); }),
    };
    await expect(clear(adapter)).rejects.toThrow('storage failure');
  });
});
