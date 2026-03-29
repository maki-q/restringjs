# restringjs Demo

Interactive playground demonstrating all restringjs features.

## Quick Start

```bash
cd examples/demo
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) and click the **✏️ Restring** tab on the right side to open the editing sidebar.

## Pages

### 1. Marketing (Hero Section)
Demonstrates basic `useRestring` usage with string fields grouped into sidebar sections:
- **Hero section** — title, subtitle, CTA button text
- **Features** — three feature cards with titles and descriptions
- **Footer** — copyright text

### 2. FAQ / Content
Q&A pairs registered with `useRegisterSection`. Each question and answer is an editable field in the sidebar under the "FAQ" section.

### 3. i18n Playground
Demonstrates internationalization features:
- **ICU Plural** — `{count, plural, one {# item} other {# items}}` with a counter
- **ICU Select** — `{gender, select, male {He} female {She} other {They}}` with gender toggle
- **i18next interpolation** — `{{variable}}` style with sample values
- **Locale switcher** — switch between English, Spanish, and German
- **Format hints** — each field has the correct `format` ('icu', 'i18next', or 'plain')

### 4. Rich Text
Fields with `richText: true` that preserve HTML formatting:
- Announcement banner, author bio, and terms of service
- Shows both rendered output and raw HTML source
- Edit in the sidebar using a contentEditable rich text editor

### 5. Visual Highlight Demo
A page packed with editable text (pricing plans, testimonials, stats). The `RestringHighlight` component is always active:
- Blue overlays appear on DOM elements containing registered strings
- Click any overlay to jump to that field in the sidebar

## Architecture

- `RestringProvider` wraps the entire app with `enabled={true}`
- `RestringSidebar` is rendered globally (right side)
- `RestringHighlight` provides visual overlay mode
- `createLocalStorageAdapter` persists overrides across page refreshes

## CLI Test Flow

After making some edits in the sidebar:

```bash
# 1. Export stored overrides to a JSON file
npx restringjs export --output overrides.json

# 2. See what would change in source files
npx restringjs diff

# 3. Preview AST transforms (dry run)
npx restringjs bake --dry-run

# 4. Apply changes back to source files
npx restringjs bake

# 5. Verify the source files changed and the app still works
pnpm dev
```

## Tech Stack

- Vite + React 19 + TypeScript (strict)
- restringjs (linked from workspace root)
- No CSS frameworks — plain CSS
