# restringjs

Live string editor for React — edit text in-context, then bake changes into code.

**restringjs** gives your team a sidebar where they can tweak every user-facing string in your app, see changes instantly, then permanently bake those edits into your source files with a single CLI command. No CMS required.

## Features

- **Live editing sidebar** — search, filter, group, and edit strings in-place
- **Zero bytes when disabled** — the sidebar tree-shakes completely in production
- **Bake & eject** — apply overrides directly into source code via AST transforms (preserves formatting and comments)
- **ICU MessageFormat** — syntax validation, variable chips, plural grouping, select variant tabs
- **i18next support** — auto-detects `{{variable}}` and `$t()` patterns
- **RTL-aware** — inputs auto-detect text direction
- **Rich text** — opt-in HTML/Markdown preservation per field
- **Visual highlight mode** — overlay DOM elements, click to jump to the editor
- **Pluggable storage** — memory, localStorage, and REST adapters (or write your own)
- **Server-side rendering** — Next.js App Router and Pages Router helpers
- **TypeScript-first** — full types, no `any` leakage

## Try the Demo

See all features in action without setting up a project:

```bash
git clone https://github.com/maki-q/restringjs.git
cd restringjs
pnpm install
pnpm demo
```

This starts a Vite dev server with pages covering basic usage, FAQ sections, i18n (ICU + i18next), rich text editing, and visual highlight mode.

## Quick Start

```bash
npm install restringjs
```

### 1. Wrap your app

```tsx
import { RestringProvider, RestringSidebar } from 'restringjs';
import { createLocalStorageAdapter } from 'restringjs/adapters';

const adapter = createLocalStorageAdapter();

function App() {
  return (
    <RestringProvider enabled={process.env.NODE_ENV === 'development'} adapter={adapter}>
      <YourApp />
      <RestringSidebar />
    </RestringProvider>
  );
}
```

### 2. Register strings

```tsx
import { useRestring } from 'restringjs';

function Hero() {
  const title = useRestring({
    path: 'hero.title',
    defaultValue: 'Welcome to our app',
    section: 'hero',
  });

  const subtitle = useRestring({
    path: 'hero.subtitle',
    defaultValue: 'The best way to manage your strings',
    section: 'hero',
  });

  return (
    <section>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  );
}
```

### 3. Bake changes into code

```bash
npx restringjs bake "src/**/*.tsx"
```

Done. Your source files now contain the edited strings. No runtime overhead. No adapter needed anymore.

## Adapters

```ts
import { createMemoryAdapter, createLocalStorageAdapter, createRestAdapter } from 'restringjs/adapters';

// Ephemeral (lost on refresh)
const memory = createMemoryAdapter();

// Persists in browser
const local = createLocalStorageAdapter('my-app:overrides');

// Persists to your API
const rest = createRestAdapter('https://api.example.com/overrides', {
  headers: { Authorization: 'Bearer ...' },
});
```

### Custom adapter

```ts
import type { RestringAdapter } from 'restringjs';

const myAdapter: RestringAdapter = {
  async load() { /* return OverrideMap */ },
  async save(overrides) { /* persist overrides */ },
  async clear() { /* remove all overrides */ },
};
```

## ICU MessageFormat

restringjs understands ICU syntax out of the box:

```tsx
const greeting = useRestring({
  path: 'greeting',
  defaultValue: 'Hello {name}, you have {count, plural, one {# message} other {# messages}}',
  format: 'icu',
});
```

The sidebar will show variable chips, validate syntax, and group plural forms with locale-aware labels.

## i18next Support

```tsx
const welcome = useRestring({
  path: 'welcome',
  defaultValue: 'Welcome {{userName}}! See $t(features.title) for details.',
  format: 'i18next',
});
```

Format detection is automatic — you can also omit `format` and let restringjs figure it out.

## Server-Side Rendering

### Next.js App Router

```ts
import { createServerApply } from 'restringjs/server';

const apply = createServerApply(async () => {
  // Load overrides from your database, API, cookie, etc.
  return { 'hero.title': 'Server-rendered override' };
});

export default async function Page() {
  const strings = await apply({
    hero: { title: 'Default title', subtitle: 'Default subtitle' },
  });

  return <h1>{strings.hero.title}</h1>;
}
```

### Next.js Pages Router

```ts
import { withRestringOverrides, serverApply } from 'restringjs/server';

export const getServerSideProps = async () => {
  const { restringOverrides } = await withRestringOverrides(() => loadOverrides())();
  return { props: { restringOverrides } };
};
```

## Visual Highlight Mode

Show overlays on DOM elements that contain registered strings:

```tsx
import { RestringHighlight } from 'restringjs';

<RestringProvider enabled>
  <YourApp />
  <RestringHighlight />
  <RestringSidebar />
</RestringProvider>
```

Click any highlighted element to jump to its field in the sidebar.

## CLI

```bash
# Bake overrides into source files
restringjs bake "src/**/*.tsx"

# Dry run (preview changes)
restringjs bake "src/**/*.tsx" --dry-run

# Show diffs between source and overrides
restringjs diff

# Validate overrides (check for stale keys)
restringjs validate

# Export overrides to JSON
restringjs export > overrides.json

# Import overrides from JSON
restringjs import < overrides.json

# Clear all stored overrides
restringjs clear
```

## API Reference

### Hooks

| Hook | Description |
|------|-------------|
| `useRestring(config)` | Register a field, return its current value |
| `useRegister(config)` | Register a field, return `[value, setValue]` |
| `useRegisterSection(config)` | Register a sidebar section |
| `useFieldValue(path)` | Read a field value without registering |
| `useSnapshot()` | Get the full store snapshot |

### Components

| Component | Description |
|-----------|-------------|
| `RestringProvider` | Context provider (required) |
| `RestringSidebar` | Editing sidebar UI |
| `RestringHighlight` | Visual overlay mode |

### Utilities

| Function | Description |
|----------|-------------|
| `applyOverrides(obj, overrides)` | Apply overrides immutably |
| `flattenObject(obj)` | Flatten nested object to dot-paths |
| `unflattenObject(flat)` | Reverse of flatten |
| `detectFormat(value)` | Auto-detect string format |
| `createStore()` | Create a standalone store instance |

## Configuration

Create `restringjs.config.ts`:

```ts
import { defineConfig } from 'restringjs/config';

export default defineConfig({
  sources: ['src/**/*.{ts,tsx}'],
  locale: 'en',
  format: 'icu',
  adapter: {
    type: 'rest',
    endpoint: 'https://api.example.com/overrides',
  },
});
```

## How It Works

1. **Register** strings with `useRestring()` — each gets a unique dot-path key
2. **Edit** in the sidebar — changes are stored via your chosen adapter
3. **Bake** with the CLI — ts-morph rewrites your source files, replacing defaults with overrides
4. **Eject** — remove restringjs entirely; your strings are now hardcoded

The bake step uses AST transforms (not regex), so it preserves your formatting, comments, and code structure.

## License

MIT
