import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('bin.ts CLI', () => {
  let tempDir: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const origArgv = [...process.argv];
  const origCwd = process.cwd();

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'restringjs-bin-'));
    vi.resetModules();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.argv = [...origArgv];
    process.chdir(origCwd);
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  function getStdout() {
    return stdoutSpy.mock.calls.map(c => String(c[0])).join('');
  }

  function getStderr() {
    return stderrSpy.mock.calls.map(c => String(c[0])).join('');
  }

  it('shows help when no command is given', async () => {
    process.argv = ['node', 'restringjs'];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('restringjs CLI');
    expect(getStdout()).toContain('Commands:');
  });

  // bake tests
  it('bake command runs successfully with valid overrides', async () => {
    const overridesPath = join(tempDir, 'overrides.json');
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(overridesPath, JSON.stringify({ 's.title': 'Hola' }));
    await writeFile(sourcePath, `const s = { title: 'Hello' };\n`);

    process.argv = ['node', 'restringjs', 'bake', sourcePath, `--overrides=${overridesPath}`];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('Modified:');
  });

  it('bake command with --dry-run flag', async () => {
    const overridesPath = join(tempDir, 'overrides.json');
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(overridesPath, JSON.stringify({ 's.title': 'Hola' }));
    await writeFile(sourcePath, `const s = { title: 'Hello' };\n`);

    process.argv = ['node', 'restringjs', 'bake', sourcePath, `--overrides=${overridesPath}`, '--dry-run'];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('dry run');
  });

  it('bake errors on missing overrides file', async () => {
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(sourcePath, `const s = { title: 'Hello' };\n`);
    process.argv = ['node', 'restringjs', 'bake', sourcePath, '--overrides=nonexistent.json'];
    const { run } = await import('./bin');
    await run;
    expect(getStderr()).toContain('Could not load overrides');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('bake errors on invalid overrides JSON (array)', async () => {
    const overridesPath = join(tempDir, 'bad.json');
    await writeFile(overridesPath, JSON.stringify([1, 2, 3]));

    process.argv = ['node', 'restringjs', 'bake', join(tempDir, 'src.ts'), `--overrides=${overridesPath}`];
    const { run } = await import('./bin');
    await run;
    expect(getStderr()).toContain('Invalid overrides');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('bake errors on non-string override values', async () => {
    const overridesPath = join(tempDir, 'bad-vals.json');
    await writeFile(overridesPath, JSON.stringify({ title: 123 }));

    process.argv = ['node', 'restringjs', 'bake', join(tempDir, 'src.ts'), `--overrides=${overridesPath}`];
    const { run } = await import('./bin');
    await run;
    expect(getStderr()).toContain('expected string');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('bake --help shows usage', async () => {
    process.argv = ['node', 'restringjs', 'bake', '--help'];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('Usage: restringjs bake');
  });

  // diff tests
  it('diff shows differences', async () => {
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(sourcePath, `const strings = { title: 'Hello', sub: 'World' };\n`);
    const overridesPath = join(tempDir, 'overrides.json');
    await writeFile(overridesPath, JSON.stringify({ 'strings.title': 'Hola' }));

    process.argv = ['node', 'restringjs', 'diff', sourcePath, `--overrides=${overridesPath}`];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('strings.title');
    expect(getStdout()).toContain('Hello');
    expect(getStdout()).toContain('Hola');
    expect(getStdout()).toContain('1 difference(s)');
  });

  it('diff with no differences', async () => {
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(sourcePath, `const strings = { title: 'Hello' };\n`);
    const overridesPath = join(tempDir, 'overrides.json');
    await writeFile(overridesPath, JSON.stringify({ 'strings.title': 'Hello' }));

    process.argv = ['node', 'restringjs', 'diff', sourcePath, `--overrides=${overridesPath}`];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('No differences found');
  });

  it('diff with prefix', async () => {
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(sourcePath, `const strings = { title: 'Hello' };\n`);
    const overridesPath = join(tempDir, 'overrides.json');
    await writeFile(overridesPath, JSON.stringify({ title: 'Hola' }));

    process.argv = ['node', 'restringjs', 'diff', sourcePath, `--overrides=${overridesPath}`, '--prefix=strings'];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('title');
    expect(getStdout()).toContain('Hola');
  });

  it('diff errors with no sources', async () => {
    process.argv = ['node', 'restringjs', 'diff'];
    const { run } = await import('./bin');
    await run;
    expect(getStderr()).toContain('no source files');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('diff --help shows usage', async () => {
    process.argv = ['node', 'restringjs', 'diff', '--help'];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('Usage: restringjs diff');
  });

  // validate tests
  it('validate with valid overrides', async () => {
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(sourcePath, `const strings = { title: 'Hello' };\n`);
    const overridesPath = join(tempDir, 'overrides.json');
    await writeFile(overridesPath, JSON.stringify({ 'strings.title': 'Hola' }));

    process.argv = ['node', 'restringjs', 'validate', sourcePath, `--overrides=${overridesPath}`];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('All overrides are valid');
  });

  it('validate flags stale keys', async () => {
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(sourcePath, `const strings = { title: 'Hello' };\n`);
    const overridesPath = join(tempDir, 'overrides.json');
    await writeFile(overridesPath, JSON.stringify({ 'nonexistent': 'Gone' }));

    process.argv = ['node', 'restringjs', 'validate', sourcePath, `--overrides=${overridesPath}`];
    const { run } = await import('./bin');
    await run;
    expect(getStderr()).toContain('Stale override');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('validate --help shows usage', async () => {
    process.argv = ['node', 'restringjs', 'validate', '--help'];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('Usage: restringjs validate');
  });

  // export tests
  it('export outputs JSON to stdout', async () => {
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(sourcePath, `const strings = { title: 'Hello', sub: 'World' };\n`);

    process.argv = ['node', 'restringjs', 'export', sourcePath];
    const { run } = await import('./bin');
    await run;
    const output = getStdout();
    const parsed = JSON.parse(output);
    expect(parsed['strings.title']).toBe('Hello');
    expect(parsed['strings.sub']).toBe('World');
  });

  it('export with prefix strips prefix from keys', async () => {
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(sourcePath, `const strings = { title: 'Hello' };\n`);

    process.argv = ['node', 'restringjs', 'export', sourcePath, '--prefix=strings'];
    const { run } = await import('./bin');
    await run;
    const output = getStdout();
    const parsed = JSON.parse(output);
    expect(parsed['title']).toBe('Hello');
    expect(parsed['strings.title']).toBeUndefined();
  });

  it('export with --output writes to file', async () => {
    const sourcePath = join(tempDir, 'strings.ts');
    const outputPath = join(tempDir, 'exported.json');
    await writeFile(sourcePath, `const strings = { title: 'Hello' };\n`);

    process.argv = ['node', 'restringjs', 'export', sourcePath, `--output=${outputPath}`];
    const { run } = await import('./bin');
    await run;
    const content = await readFile(outputPath, 'utf-8');
    expect(JSON.parse(content)['strings.title']).toBe('Hello');
    expect(getStdout()).toContain('Exported');
  });

  it('export --help shows usage', async () => {
    process.argv = ['node', 'restringjs', 'export', '--help'];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('Usage: restringjs export');
  });

  // import tests
  it('import merges overrides into target file', async () => {
    const overridesPath = join(tempDir, 'overrides.json');
    const targetPath = join(tempDir, 'target.json');
    await writeFile(overridesPath, JSON.stringify({ title: 'Hola' }));

    process.argv = ['node', 'restringjs', 'import', `--overrides=${overridesPath}`, `--target=${targetPath}`];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('Imported');
    const content = await readFile(targetPath, 'utf-8');
    expect(JSON.parse(content)).toEqual({ title: 'Hola' });
  });

  it('import errors without --overrides', async () => {
    process.argv = ['node', 'restringjs', 'import'];
    const { run } = await import('./bin');
    await run;
    expect(getStderr()).toContain('--overrides=file.json is required');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('import errors on unsupported adapter', async () => {
    const overridesPath = join(tempDir, 'overrides.json');
    await writeFile(overridesPath, JSON.stringify({ title: 'Hola' }));
    process.argv = ['node', 'restringjs', 'import', `--overrides=${overridesPath}`, '--adapter=rest'];
    const { run } = await import('./bin');
    await run;
    expect(getStderr()).toContain('only --adapter=file is currently supported');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('import --help shows usage', async () => {
    process.argv = ['node', 'restringjs', 'import', '--help'];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('Usage: restringjs import');
  });

  // clear tests
  it('clear writes empty object to target file', async () => {
    const targetPath = join(tempDir, 'target.json');
    await writeFile(targetPath, JSON.stringify({ title: 'Old' }));

    process.argv = ['node', 'restringjs', 'clear', `--target=${targetPath}`];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('Cleared overrides');
    const content = await readFile(targetPath, 'utf-8');
    expect(JSON.parse(content)).toEqual({});
  });

  it('clear --help shows usage', async () => {
    process.argv = ['node', 'restringjs', 'clear', '--help'];
    const { run } = await import('./bin');
    await run;
    expect(getStdout()).toContain('Usage: restringjs clear');
  });
});
