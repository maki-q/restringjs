import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('bin.ts CLI', () => {
  let tempDir: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const origArgv = [...process.argv];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'restringjs-bin-'));
    vi.resetModules();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  });

  afterEach(async () => {
    process.argv = [...origArgv];
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
    await import('./bin');
    await new Promise((r) => setTimeout(r, 100));
    expect(getStdout()).toContain('restringjs CLI');
    expect(getStdout()).toContain('Commands:');
  });

  it('outputs diff placeholder', async () => {
    process.argv = ['node', 'restringjs', 'diff'];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 100));
    expect(getStdout()).toContain('diff command');
  });

  it('outputs validate placeholder', async () => {
    process.argv = ['node', 'restringjs', 'validate'];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 100));
    expect(getStdout()).toContain('validate command');
  });

  it('outputs export placeholder', async () => {
    process.argv = ['node', 'restringjs', 'export'];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 100));
    expect(getStdout()).toContain('export command');
  });

  it('outputs import placeholder', async () => {
    process.argv = ['node', 'restringjs', 'import'];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 100));
    expect(getStdout()).toContain('import command');
  });

  it('outputs clear placeholder', async () => {
    process.argv = ['node', 'restringjs', 'clear'];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 100));
    expect(getStdout()).toContain('clear command');
  });

  it('bake command runs successfully with valid overrides', async () => {
    const overridesPath = join(tempDir, 'overrides.json');
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(overridesPath, JSON.stringify({ 's.title': 'Hola' }));
    await writeFile(sourcePath, `const s = { title: 'Hello' };\n`);

    process.argv = ['node', 'restringjs', 'bake', sourcePath, `--overrides=${overridesPath}`];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 500));
    expect(getStdout()).toContain('Modified:');
  });

  it('bake command with --dry-run flag', async () => {
    const overridesPath = join(tempDir, 'overrides.json');
    const sourcePath = join(tempDir, 'strings.ts');
    await writeFile(overridesPath, JSON.stringify({ 's.title': 'Hola' }));
    await writeFile(sourcePath, `const s = { title: 'Hello' };\n`);

    process.argv = ['node', 'restringjs', 'bake', sourcePath, `--overrides=${overridesPath}`, '--dry-run'];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 500));
    expect(getStdout()).toContain('dry run');
  });

  it('bake errors on missing overrides file', async () => {
    process.argv = ['node', 'restringjs', 'bake', 'some-source.ts'];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 200));
    expect(getStderr()).toContain('Could not load overrides');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('bake errors on invalid overrides JSON (array)', async () => {
    const overridesPath = join(tempDir, 'bad.json');
    await writeFile(overridesPath, JSON.stringify([1, 2, 3]));

    process.argv = ['node', 'restringjs', 'bake', 'src.ts', `--overrides=${overridesPath}`];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 200));
    expect(getStderr()).toContain('Invalid overrides');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('bake errors on non-string override values', async () => {
    const overridesPath = join(tempDir, 'bad-vals.json');
    await writeFile(overridesPath, JSON.stringify({ title: 123 }));

    process.argv = ['node', 'restringjs', 'bake', 'src.ts', `--overrides=${overridesPath}`];
    await import('./bin');
    await new Promise((r) => setTimeout(r, 200));
    expect(getStderr()).toContain('expected string');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
