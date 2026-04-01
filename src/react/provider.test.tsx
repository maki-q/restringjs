import { describe, it, expect, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import { RestringProvider } from './provider';
import { createMemoryAdapter } from '../adapters/index';
import { useRestring, useSnapshot } from './hooks';
import { useRestringContext } from './context';

afterEach(cleanup);

describe('RestringProvider', () => {
  it('renders children when disabled', () => {
    const { getByText } = render(
      <RestringProvider enabled={false}>
        <div>child content</div>
      </RestringProvider>,
    );
    expect(getByText('child content')).toBeTruthy();
  });

  it('does not provide context when disabled', () => {
    let error: Error | null = null;
    function ContextConsumer() {
      try {
        useRestringContext();
      } catch (e) {
        error = e as Error;
      }
      return <div>test</div>;
    }
    render(
      <RestringProvider enabled={false}>
        <ContextConsumer />
      </RestringProvider>,
    );
    expect(error).toBeTruthy();
    expect(error!.message).toContain('useRestringContext must be used within');
  });

  it('provides context when enabled', () => {
    let ctx: ReturnType<typeof useRestringContext> | null = null;
    function ContextConsumer() {
      ctx = useRestringContext();
      return null;
    }
    render(
      <RestringProvider enabled adapter={createMemoryAdapter()}>
        <ContextConsumer />
      </RestringProvider>,
    );
    expect(ctx).toBeTruthy();
    expect(ctx!.enabled).toBe(true);
  });

  it('loads overrides from adapter on mount', async () => {
    const adapter = createMemoryAdapter({ 'pre.field': 'loaded-value' });
    let fieldVal = '';
    function Reader() {
      fieldVal = useRestring({ path: 'pre.field', defaultValue: 'default' });
      return null;
    }
    await act(async () => {
      render(
        <RestringProvider enabled adapter={adapter}>
          <Reader />
        </RestringProvider>,
      );
    });
    // After mount, adapter.load() should have been called and overrides applied
    expect(fieldVal).toBe('loaded-value');
  });

  it('save persists overrides to adapter', async () => {
    const adapter = createMemoryAdapter();
    const saveSpy = vi.spyOn(adapter, 'save');
    let ctx: ReturnType<typeof useRestringContext> | null = null;
    function Consumer() {
      ctx = useRestringContext();
      useRestring({ path: 'save.field', defaultValue: 'orig' });
      return null;
    }
    await act(async () => {
      render(
        <RestringProvider enabled adapter={adapter}>
          <Consumer />
        </RestringProvider>,
      );
    });
    act(() => ctx!.setOverride('save.field', 'new-val'));
    await act(async () => {
      await ctx!.save();
    });
    expect(saveSpy).toHaveBeenCalled();
    const savedData = saveSpy.mock.calls[0]![0];
    expect(savedData['save.field']).toBe('new-val');
  });

  it('loadOverrides reloads from adapter', async () => {
    const adapter = createMemoryAdapter();
    let ctx: ReturnType<typeof useRestringContext> | null = null;
    let fieldVal = '';
    function Consumer() {
      ctx = useRestringContext();
      fieldVal = useRestring({ path: 'reload.field', defaultValue: 'orig' });
      return null;
    }
    await act(async () => {
      render(
        <RestringProvider enabled adapter={adapter}>
          <Consumer />
        </RestringProvider>,
      );
    });
    expect(fieldVal).toBe('orig');
    // Manually save to adapter
    await adapter.save({ 'reload.field': 'reloaded' });
    await act(async () => {
      await ctx!.loadOverrides();
    });
    expect(fieldVal).toBe('reloaded');
  });

  it('works without adapter (no crash on save/loadOverrides)', async () => {
    let ctx: ReturnType<typeof useRestringContext> | null = null;
    function Consumer() {
      ctx = useRestringContext();
      return null;
    }
    await act(async () => {
      render(
        <RestringProvider enabled>
          <Consumer />
        </RestringProvider>,
      );
    });
    // Should not throw
    await act(async () => {
      await ctx!.save();
      await ctx!.loadOverrides();
    });
  });

  it('exposes highlightMode and highlightColor defaults', () => {
    let ctx: ReturnType<typeof useRestringContext> | null = null;
    function Consumer() {
      ctx = useRestringContext();
      return null;
    }
    render(
      <RestringProvider enabled>
        <Consumer />
      </RestringProvider>,
    );
    expect(ctx!.highlightMode).toBe(true);
    expect(ctx!.highlightColor).toBe('#4a6cf7');
  });

  it('respects custom defaultHighlightMode and highlightColor', () => {
    let ctx: ReturnType<typeof useRestringContext> | null = null;
    function Consumer() {
      ctx = useRestringContext();
      return null;
    }
    render(
      <RestringProvider enabled defaultHighlightMode={false} highlightColor="#ff0000">
        <Consumer />
      </RestringProvider>,
    );
    expect(ctx!.highlightMode).toBe(false);
    expect(ctx!.highlightColor).toBe('#ff0000');
  });

  it('isDirty reflects state changes', () => {
    let ctx: ReturnType<typeof useRestringContext> | null = null;
    function Consumer() {
      ctx = useRestringContext();
      useRestring({ path: 'dirty.check', defaultValue: 'original' });
      return null;
    }
    render(
      <RestringProvider enabled adapter={createMemoryAdapter()}>
        <Consumer />
      </RestringProvider>,
    );
    expect(ctx!.isDirty()).toBe(false);
    act(() => ctx!.setOverride('dirty.check', 'modified'));
    expect(ctx!.isDirty()).toBe(true);
  });

  it('resetAll clears overrides', () => {
    let ctx: ReturnType<typeof useRestringContext> | null = null;
    let val = '';
    function Consumer() {
      ctx = useRestringContext();
      val = useRestring({ path: 'reset.field', defaultValue: 'orig' });
      return null;
    }
    render(
      <RestringProvider enabled adapter={createMemoryAdapter()}>
        <Consumer />
      </RestringProvider>,
    );
    act(() => ctx!.setOverride('reset.field', 'changed'));
    expect(val).toBe('changed');
    act(() => ctx!.resetAll());
    expect(val).toBe('orig');
  });
});
