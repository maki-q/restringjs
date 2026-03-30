// Core
export type {
  FieldConfig,
  FieldPath,
  FormatHint,
  SectionConfig,
  OverrideMap,
  StoreSnapshot,
  RestringAdapter,
  RestringProviderProps,
  RestringContextValue,
  ValidationResult,
  DiffEntry,
  BakeOptions,
  RestringConfig,
} from './core/types';
export { createStore, type StoreOptions } from './core/store';
export type { RestringStore } from './core/store';
export { applyOverrides, flattenObject, unflattenObject } from './core/apply';

// React
export { RestringProvider } from './react/provider';
export { RestringContext, useRestringContext } from './react/context';
export { useRestring, useRegister, useRegisterSection, useFieldValue, useSnapshot } from './react/hooks';

// UI
export { RestringSidebar } from './ui/sidebar';
export { RestringHighlight } from './ui/highlight';

// i18n
export { detectFormat, extractIcuVariables, extractI18nextVariables, validateIcu, getPluralCategories } from './i18n/index';
