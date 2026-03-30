import type {
  FieldConfig,
  FieldPath,
  OverrideMap,
  SectionConfig,
  StoreSnapshot,
} from './types';

type Listener = () => void;

/**
 * Central store for field registrations and overrides.
 * Immutable apply — never mutates original config objects.
 */
export function createStore() {
  const fields = new Map<FieldPath, FieldConfig>();
  const sections = new Map<string, SectionConfig>();
  let overrides: OverrideMap = {};
  const dirty = new Set<FieldPath>();
  const listeners = new Set<Listener>();
  let sidebarOpen = false;
  let highlightMode = false;
  let version = 0;
  let cachedSnapshot: StoreSnapshot | null = null;
  let cachedSnapshotVersion = -1;

  function emit() {
    version++;
    for (const fn of listeners) {
      fn();
    }
  }

  function registerField(config: FieldConfig): () => void {
    fields.set(config.path, config);
    emit();
    return () => {
      fields.delete(config.path);
      emit();
    };
  }

  function registerSection(config: SectionConfig): () => void {
    sections.set(config.id, config);
    emit();
    return () => {
      sections.delete(config.id);
      emit();
    };
  }

  function getValue(path: FieldPath): string {
    if (path in overrides) {
      return overrides[path]!;
    }
    const field = fields.get(path);
    return field?.defaultValue ?? '';
  }

  function setOverride(path: FieldPath, value: string): void {
    const field = fields.get(path);
    if (field && value === field.defaultValue) {
      // Setting back to default removes the override
      const { [path]: _removed, ...rest } = overrides;
      void _removed;
      overrides = rest;
      dirty.delete(path);
    } else {
      overrides = { ...overrides, [path]: value };
      dirty.add(path);
    }
    emit();
  }

  function resetField(path: FieldPath): void {
    if (path in overrides) {
      const { [path]: _removed, ...rest } = overrides;
      void _removed;
      overrides = rest;
      dirty.delete(path);
      emit();
    }
  }

  function resetAll(): void {
    overrides = {};
    dirty.clear();
    emit();
  }

  function setOverrides(newOverrides: OverrideMap): void {
    overrides = { ...newOverrides };
    dirty.clear();
    emit();
  }

  function getOverrides(): OverrideMap {
    return { ...overrides };
  }

  function isDirty(): boolean {
    return dirty.size > 0;
  }

  function setSidebarOpen(open: boolean): void {
    if (sidebarOpen !== open) {
      sidebarOpen = open;
      // Default: highlights on when sidebar opens, off when it closes
      highlightMode = open;
      emit();
    }
  }

  function getSidebarOpen(): boolean {
    return sidebarOpen;
  }

  function setHighlightMode(on: boolean): void {
    if (highlightMode !== on) {
      highlightMode = on;
      emit();
    }
  }

  function getHighlightMode(): boolean {
    return highlightMode;
  }

  function getSnapshot(): StoreSnapshot {
    if (cachedSnapshotVersion === version && cachedSnapshot) {
      return cachedSnapshot;
    }
    cachedSnapshot = {
      fields: new Map(fields),
      sections: new Map(sections),
      overrides: { ...overrides },
      dirty: new Set(dirty),
      sidebarOpen,
      highlightMode,
    };
    cachedSnapshotVersion = version;
    return cachedSnapshot;
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getVersion(): number {
    return version;
  }

  return {
    registerField,
    registerSection,
    getValue,
    setOverride,
    resetField,
    resetAll,
    setOverrides,
    getOverrides,
    isDirty,
    setSidebarOpen,
    getSidebarOpen,
    setHighlightMode,
    getHighlightMode,
    getSnapshot,
    subscribe,
    getVersion,
  };
}

export type RestringStore = ReturnType<typeof createStore>;
