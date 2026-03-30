/**
 * A dot-separated path identifying a string field.
 * Example: "homepage.hero.title"
 */
export type FieldPath = string;

/**
 * Format hint for i18n string processing.
 */
export type FormatHint = 'icu' | 'i18next' | 'plain';

/**
 * Configuration for a registered string field.
 */
export interface FieldConfig {
  /** Dot-path key for this field */
  path: FieldPath;
  /** Default value before any overrides */
  defaultValue: string;
  /** Section this field belongs to */
  section?: string;
  /** Format hint for parsing */
  format?: FormatHint;
  /** Enable rich text editing (HTML/Markdown preservation) */
  richText?: boolean;
  /** Description shown in sidebar */
  description?: string;
  /** Locale code (e.g. 'en', 'fr') */
  locale?: string;
}

/**
 * A section groups related fields in the sidebar.
 */
export interface SectionConfig {
  /** Unique section identifier */
  id: string;
  /** Display label */
  label: string;
  /** Sort order (lower = higher) */
  order?: number;
  /** Optional description */
  description?: string;
}

/**
 * A map of field paths to override values.
 */
export type OverrideMap = Record<FieldPath, string>;

/**
 * Snapshot of all registered fields and their current values.
 */
export interface StoreSnapshot {
  fields: Map<FieldPath, FieldConfig>;
  sections: Map<string, SectionConfig>;
  overrides: OverrideMap;
  dirty: Set<FieldPath>;
  sidebarOpen: boolean;
  highlightMode: boolean;
}

/**
 * Adapter interface for persisting overrides.
 */
export interface RestringAdapter {
  /** Load all overrides from storage */
  load(): Promise<OverrideMap>;
  /** Save all overrides to storage */
  save(overrides: OverrideMap): Promise<void>;
  /** Clear all stored overrides */
  clear(): Promise<void>;
}

/**
 * Props for RestringProvider.
 */
export interface RestringProviderProps {
  /** Whether the editing sidebar is enabled */
  enabled: boolean;
  /** Storage adapter for persisting overrides */
  adapter?: RestringAdapter;
  /** Children to render */
  children: React.ReactNode;
}

/**
 * Value exposed by the Restring context.
 */
export interface RestringContextValue {
  /** Whether editing mode is active */
  enabled: boolean;
  /** Get the current value for a field (override or default) */
  getValue(path: FieldPath): string;
  /** Set an override for a field */
  setOverride(path: FieldPath, value: string): void;
  /** Reset a single field to its default */
  resetField(path: FieldPath): void;
  /** Reset all fields to defaults */
  resetAll(): void;
  /** Save current overrides via adapter */
  save(): Promise<void>;
  /** Register a field */
  registerField(config: FieldConfig): () => void;
  /** Register a section */
  registerSection(config: SectionConfig): () => void;
  /** Subscribe to store changes */
  subscribe(listener: () => void): () => void;
  /** Get current snapshot */
  getSnapshot(): StoreSnapshot;
  /** Whether there are unsaved changes */
  isDirty(): boolean;
  /** Get override map */
  getOverrides(): OverrideMap;
  /** Load overrides from adapter */
  loadOverrides(): Promise<void>;
  /** Highlight mode: currently focused field path */
  highlightedField: FieldPath | null;
  /** Set the highlighted field */
  setHighlightedField(path: FieldPath | null): void;
  /** Whether the sidebar is open */
  sidebarOpen: boolean;
  /** Set sidebar open state */
  setSidebarOpen(open: boolean): void;
  /** Whether highlight mode is active */
  highlightMode: boolean;
  /** Toggle highlight mode */
  setHighlightMode(on: boolean): void;
}

/**
 * Validation result for a single field.
 */
export interface ValidationResult {
  path: FieldPath;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Diff entry comparing original and override values.
 */
export interface DiffEntry {
  path: FieldPath;
  original: string;
  override: string;
}

/**
 * CLI bake options.
 */
export interface BakeOptions {
  /** Source files or glob patterns */
  source: string[];
  /** Dry run (no writes) */
  dryRun?: boolean;
  /** Override file or adapter config */
  overrides?: string;
}

/**
 * Restring configuration file shape.
 */
export interface RestringConfig {
  /** Glob patterns for source files to scan */
  sources: string[];
  /** Adapter configuration */
  adapter?: {
    type: 'memory' | 'localStorage' | 'rest';
    endpoint?: string;
    key?: string;
  };
  /** Default locale */
  locale?: string;
  /** Default format */
  format?: FormatHint;
}
