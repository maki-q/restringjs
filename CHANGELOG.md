# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-04-01

### Added
- **Full CLI toolkit**: `diff`, `validate`, `export`, `import`, `clear` commands fully wired up with argument parsing and `--help` support
- **`--prefix` flag** for all source-aware commands (`bake`, `diff`, `validate`, `export`) - bridges DB key format (`home.title`) to source variable paths (`strings.home.title`)
- **Unmatched override warnings** in `bake` - reports keys that didn't match any AST path to stderr
- **Array-nested path support** in `bake` - paths like `chapters.0.sections.0.body` now resolve correctly through `ArrayLiteralExpression` nodes
- **`as const` and `satisfies` support** in `bake` - type assertion wrappers no longer break path resolution
- **Shared `extract.ts` utility** for ts-morph AST walking, reused across diff/validate/export
- 44 new tests (262 total)

### Fixed
- **Quote style preservation** in `bake` - detects original quote character (`"` vs `'`) and uses it for replacement, eliminating noisy diffs
- **Tab character escaping** in `bake` - raw tabs are now properly escaped as `\t`
- Array traversal in `resolvePropertyPath()` - handles arbitrary nesting depth (arrays in objects in arrays)

## [0.1.8] - 2026-04-01

### Added
- `onOverrideChange` callback on `RestringProvider` for retrofit integration patterns

## [0.1.7] - 2026-04-01

### Changed
- Removed global Reset button; per-field reset links are now the sole mechanism

### Fixed
- Dirty flag detection: loaded overrides now compared against `field.defaultValue` instead of post-mutation state

## [0.1.6] - 2026-03-31

### Fixed
- DTS build (removed dead `normalizeText` function)
- Phase 3 highlight scanning performance (gated layout events behind animation wait, pre-computed field values)

### Changed
- Test coverage: 196 tests, 96.85% statements

## [0.1.4] - 2026-03-31

### Added
- Per-field highlight visibility toggle (eye icon)
- Dynamic sidebar position flip (left/right toggle button)
- Interpolation template scanner for `{placeholder}` tokens
- Edited field indicator (green dot for persisted, orange for unsaved)

### Fixed
- Tighter template matching (2-fragment guard, immediate-parent scope)

## [0.1.3] - 2026-03-31

### Fixed
- Highlight overlay timing with `requestAnimationFrame` + 100ms delay
- Animation-aware initial scan via `document.getAnimations()` (2s timeout fallback)
- Hook effect stability (context ref + mount guard)

### Added
- Image load, ResizeObserver, CSS animation/transition end, web font loading listeners for overlay accuracy
- MutationObserver filter for attribute-driven visibility changes

## [0.1.1] - 2026-03-31

### Fixed
- Highlight mode toggle not persisting (stale dist/index.js, decoupled store.ts logic)
- Duplicate React instances error via vite.config.ts `allowedHosts`

## [0.1.0] - 2026-03-31

### Added
- Initial release
- Core library: field registration via TreeWalker, override store with `useSyncExternalStore`
- React integration: `RestringProvider`, `useRestring`, `useRegister`, `useRegisterSection` hooks
- UI: highlight overlays, editing sidebar with search/section grouping
- Adapters: memory, localStorage, REST (or custom)
- CLI: `bake` command with ts-morph AST transforms
- i18n: ICU MessageFormat detection, i18next pattern support
- Server: Next.js App Router and Pages Router helpers
- Demo app with 5 pages
- 199 tests, TypeScript strict mode
