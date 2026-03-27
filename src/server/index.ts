import { applyOverrides } from '../core/apply';
import type { OverrideMap } from '../core/types';

/**
 * Apply overrides server-side. Works in any Node.js context.
 * Returns a new object with overrides applied immutably.
 */
export function serverApply<T extends Record<string, unknown>>(
  strings: T,
  overrides: OverrideMap,
): T {
  return applyOverrides(strings, overrides);
}

/**
 * Next.js App Router helper: load overrides from a cookie or fetch call,
 * then apply to your strings object.
 */
export function createServerApply(loadOverrides: () => Promise<OverrideMap> | OverrideMap) {
  return async function apply<T extends Record<string, unknown>>(strings: T): Promise<T> {
    const overrides = await loadOverrides();
    return applyOverrides(strings, overrides);
  };
}

/**
 * Next.js Pages Router: getServerSideProps helper.
 * Loads overrides and provides them as a prop.
 */
export function withRestringOverrides(
  loadOverrides: () => Promise<OverrideMap> | OverrideMap,
) {
  return async function getRestringProps() {
    const overrides = await loadOverrides();
    return { restringOverrides: overrides };
  };
}
