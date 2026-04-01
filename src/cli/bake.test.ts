import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bake } from './bake';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('bake', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'restringjs-bake-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('modifies matching property assignments', async () => {
    const filePath = join(tempDir, 'strings.ts');
    await writeFile(filePath, `const strings = {
  title: 'Hello World',
  subtitle: 'Welcome',
};
export default strings;
`);

    const result = await bake({
      source: [filePath],
      overrides: { 'strings.title': 'Hola Mundo' },
      projectRoot: tempDir,
    });

    expect(result.modified.length).toBe(1);
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain("'Hola Mundo'");
    expect(content).not.toContain("'Hello World'");
    // subtitle unchanged
    expect(content).toContain("'Welcome'");
  });

  it('handles dry-run without writing', async () => {
    const filePath = join(tempDir, 'strings.ts');
    const original = `const strings = { title: 'Original' };\n`;
    await writeFile(filePath, original);

    const result = await bake({
      source: [filePath],
      overrides: { 'strings.title': 'Changed' },
      dryRun: true,
      projectRoot: tempDir,
    });

    expect(result.modified.length).toBe(1);
    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe(original); // unchanged
  });

  it('skips files outside project root', async () => {
    const filePath = join(tempDir, 'strings.ts');
    await writeFile(filePath, `const s = { title: 'Hello' };\n`);

    // Use a different project root so the file is "outside"
    const result = await bake({
      source: [filePath],
      overrides: { title: 'Changed' },
      projectRoot: join(tempDir, 'subdir'),
    });

    expect(result.skipped.length).toBeGreaterThanOrEqual(1);
    expect(result.modified.length).toBe(0);
  });

  it('skips files with disallowed extensions', async () => {
    const filePath = join(tempDir, 'data.json');
    await writeFile(filePath, `{ "title": "Hello" }\n`);

    const result = await bake({
      source: [join(tempDir, '*.json')],
      overrides: { title: 'Changed' },
      projectRoot: tempDir,
    });

    expect(result.modified.length).toBe(0);
  });

  it('skips files with no matching properties', async () => {
    const filePath = join(tempDir, 'strings.ts');
    await writeFile(filePath, `const s = { title: 'Hello' };\n`);

    const result = await bake({
      source: [filePath],
      overrides: { 'nonexistent.path': 'Changed' },
      projectRoot: tempDir,
    });

    expect(result.skipped.length).toBe(1);
    expect(result.modified.length).toBe(0);
  });

  it('escapes special characters in override values', async () => {
    const filePath = join(tempDir, 'strings.ts');
    await writeFile(filePath, `const s = { msg: 'Hello' };\n`);

    await bake({
      source: [filePath],
      overrides: { 's.msg': "it's a\nnew \"line\"" },
      projectRoot: tempDir,
    });

    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain("\\'s");
    expect(content).toContain('\\n');
  });

  it('handles nested objects with dot-path overrides', async () => {
    const filePath = join(tempDir, 'nested.ts');
    await writeFile(filePath, `const strings = {
  hero: {
    title: 'Welcome',
    sub: 'Subtitle',
  },
};
`);

    const result = await bake({
      source: [filePath],
      overrides: { 'strings.hero.title': 'New Welcome' },
      projectRoot: tempDir,
    });

    expect(result.modified.length).toBe(1);
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain("'New Welcome'");
    expect(content).toContain("'Subtitle'");
  });

  it('handles .tsx files', async () => {
    const filePath = join(tempDir, 'comp.tsx');
    await writeFile(filePath, `const text = { btn: 'Click' };\n`);

    const result = await bake({
      source: [filePath],
      overrides: { 'text.btn': 'Press' },
      projectRoot: tempDir,
    });

    expect(result.modified.length).toBe(1);
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain("'Press'");
  });
});
