import { describe, it, expect } from 'vitest';
import { serverApply, createServerApply, withRestringOverrides } from './index';

describe('serverApply', () => {
  it('applies overrides to a strings object', () => {
    const result = serverApply(
      { hero: { title: 'Hello', sub: 'World' } },
      { 'hero.title': 'Hola' },
    );
    expect(result.hero.title).toBe('Hola');
    expect(result.hero.sub).toBe('World');
  });

  it('does not mutate the original', () => {
    const original = { title: 'Hello' };
    serverApply(original, { title: 'Hola' });
    expect(original.title).toBe('Hello');
  });
});

describe('createServerApply', () => {
  it('creates a reusable apply function', async () => {
    const apply = createServerApply(() => ({ title: 'Hola' }));
    const result = await apply({ title: 'Hello' });
    expect(result.title).toBe('Hola');
  });

  it('works with async loaders', async () => {
    const apply = createServerApply(async () => ({ title: 'Async' }));
    const result = await apply({ title: 'Hello' });
    expect(result.title).toBe('Async');
  });
});

describe('withRestringOverrides', () => {
  it('returns overrides as props', async () => {
    const getProps = withRestringOverrides(() => ({ key: 'value' }));
    const result = await getProps();
    expect(result.restringOverrides).toEqual({ key: 'value' });
  });
});
