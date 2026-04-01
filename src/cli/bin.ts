#!/usr/bin/env node

/**
 * restringjs CLI entry point.
 * Commands: bake, diff, validate, export, import, clear
 */
const args = process.argv.slice(2);
const command = args[0];

function parseOverridesFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fs: any,
  overridesPath: string,
): Record<string, string> {
  const overrides: Record<string, string> = {};
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      process.stderr.write(`Invalid overrides: expected a JSON object\n`);
      process.exit(1);
    }
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v !== 'string') {
        process.stderr.write(
          `Invalid override value for "${k}": expected string, got ${typeof v}\n`,
        );
        process.exit(1);
      }
      overrides[k] = v;
    }
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') {
      process.stderr.write(`Could not load overrides from ${overridesPath}\n`);
    } else {
      process.stderr.write(`Error reading overrides: ${err}\n`);
    }
    process.exit(1);
  }
  return overrides;
}

function getArg(name: string): string | undefined {
  const arg = args.find((a: string) => a.startsWith(`--${name}=`));
  return arg?.split('=').slice(1).join('=');
}

function getSources(): string[] {
  return args.slice(1).filter((a: string) => !a.startsWith('--'));
}

const HELP_TEXT = `restringjs CLI

Commands:
  bake       Bake overrides into source files
  diff       Show differences between source and overrides
  validate   Check for stale or invalid overrides
  export     Export current string values from source to JSON
  import     Import overrides from JSON into a target file
  clear      Clear stored overrides

Usage: restringjs <command> [options]

Run restringjs <command> --help for command-specific usage.
`;

async function main() {
  switch (command) {
    case 'bake': {
      if (args.includes('--help')) {
        process.stdout.write(
          `Usage: restringjs bake <source-glob> --overrides=file.json [--prefix=X] [--dry-run]\n\nBake overrides directly into source files using AST transforms.\n`,
        );
        break;
      }
      const { bake } = await import('./bake.js');
      const sources = getSources();
      const dryRun = args.includes('--dry-run');
      const fs = await import('fs');
      const overridesPath = getArg('overrides') ?? '.restringjs-overrides.json';
      const overrides = parseOverridesFile(fs, overridesPath);
      const prefix = getArg('prefix');
      const result = await bake({ source: sources, overrides, dryRun, prefix });
      process.stdout.write(`Modified: ${result.modified.length} files\n`);
      if (result.unmatched && result.unmatched.length > 0) {
        for (const key of result.unmatched) {
          process.stderr.write(`Warning: unmatched override key "${key}"\n`);
        }
      }
      if (dryRun) process.stdout.write('(dry run — no files written)\n');
      break;
    }

    case 'diff': {
      if (args.includes('--help')) {
        process.stdout.write(
          `Usage: restringjs diff <source-glob> --overrides=file.json [--prefix=X]\n\nShow differences between current source values and overrides.\n`,
        );
        break;
      }
      const { diff } = await import('./diff.js');
      const { extractStringsFromSource } = await import('./extract.js');
      const fs = await import('fs');
      const sources = getSources();
      if (sources.length === 0) {
        process.stderr.write('Error: no source files specified\n');
        process.exit(1);
      }
      const overridesPath = getArg('overrides') ?? '.restringjs-overrides.json';
      const overrides = parseOverridesFile(fs, overridesPath);
      const prefix = getArg('prefix');

      // Extract current values from source
      const sourceStrings = await extractStringsFromSource(sources);

      // If prefix, build a version of source strings without the prefix for comparison
      let compareSource: Record<string, unknown>;
      let compareOverrides: Record<string, string>;

      if (prefix) {
        // Strip prefix from source keys to match override keys
        compareSource = {};
        for (const [key, value] of Object.entries(sourceStrings)) {
          if (key.startsWith(prefix + '.')) {
            (compareSource as Record<string, string>)[key.slice(prefix.length + 1)] = value;
          }
        }
        compareOverrides = overrides;
      } else {
        compareSource = sourceStrings;
        compareOverrides = overrides;
      }

      const entries = diff(compareSource, compareOverrides);

      if (entries.length === 0) {
        process.stdout.write('No differences found.\n');
      } else {
        // Print colored table
        const pathWidth = Math.max(4, ...entries.map((e) => e.path.length));
        const origWidth = Math.max(8, ...entries.map((e) => e.original.length));
        const overWidth = Math.max(8, ...entries.map((e) => e.override.length));

        const header = `${'Path'.padEnd(pathWidth)}  ${'Original'.padEnd(origWidth)}  ${'Override'.padEnd(overWidth)}`;
        const sep = `${'-'.repeat(pathWidth)}  ${'-'.repeat(origWidth)}  ${'-'.repeat(overWidth)}`;

        process.stdout.write(`${header}\n${sep}\n`);
        for (const entry of entries) {
          process.stdout.write(
            `${entry.path.padEnd(pathWidth)}  \x1b[31m${entry.original.padEnd(origWidth)}\x1b[0m  \x1b[32m${entry.override.padEnd(overWidth)}\x1b[0m\n`,
          );
        }
        process.stdout.write(`\n${entries.length} difference(s) found.\n`);
      }
      break;
    }

    case 'validate': {
      if (args.includes('--help')) {
        process.stdout.write(
          `Usage: restringjs validate <source-glob> --overrides=file.json [--prefix=X]\n\nCheck overrides for stale keys and empty values.\n`,
        );
        break;
      }
      const { validate } = await import('./validate.js');
      const { extractStringsFromSource } = await import('./extract.js');
      const fs = await import('fs');
      const sources = getSources();
      if (sources.length === 0) {
        process.stderr.write('Error: no source files specified\n');
        process.exit(1);
      }
      const overridesPath = getArg('overrides') ?? '.restringjs-overrides.json';
      const overrides = parseOverridesFile(fs, overridesPath);
      const prefix = getArg('prefix');

      // Extract current values from source
      const sourceStrings = await extractStringsFromSource(sources);

      // If prefix, strip prefix from source keys
      let compareSource: Record<string, unknown>;
      if (prefix) {
        compareSource = {};
        for (const [key, value] of Object.entries(sourceStrings)) {
          if (key.startsWith(prefix + '.')) {
            (compareSource as Record<string, string>)[key.slice(prefix.length + 1)] = value;
          }
        }
      } else {
        compareSource = sourceStrings;
      }

      const results = validate(compareSource, overrides);

      let hasIssues = false;
      for (const result of results) {
        for (const warning of result.warnings) {
          process.stderr.write(`Warning: ${warning}\n`);
          hasIssues = true;
        }
        for (const error of result.errors) {
          process.stderr.write(`Error: ${error}\n`);
          hasIssues = true;
        }
      }

      if (!hasIssues) {
        process.stdout.write('All overrides are valid.\n');
        process.exit(0);
      } else {
        process.exit(1);
      }
      break;
    }

    case 'export': {
      if (args.includes('--help')) {
        process.stdout.write(
          `Usage: restringjs export <source-glob> [--prefix=X] [--output=file.json]\n\nExport all string values from source files as JSON.\n`,
        );
        break;
      }
      const { extractStringsFromSource } = await import('./extract.js');
      const { exportOverrides } = await import('./io.js');
      const sources = getSources();
      if (sources.length === 0) {
        process.stderr.write('Error: no source files specified\n');
        process.exit(1);
      }
      const prefix = getArg('prefix');
      const output = getArg('output');

      const sourceStrings = await extractStringsFromSource(sources);

      // If prefix, strip prefix from keys
      let exportMap: Record<string, string>;
      if (prefix) {
        exportMap = {};
        for (const [key, value] of Object.entries(sourceStrings)) {
          if (key.startsWith(prefix + '.')) {
            exportMap[key.slice(prefix.length + 1)] = value;
          }
        }
      } else {
        exportMap = sourceStrings;
      }

      const json = exportOverrides(exportMap);

      if (output) {
        const fs = await import('fs');
        fs.writeFileSync(output, json + '\n', 'utf-8');
        process.stdout.write(`Exported ${Object.keys(exportMap).length} strings to ${output}\n`);
      } else {
        process.stdout.write(json + '\n');
      }
      break;
    }

    case 'import': {
      if (args.includes('--help')) {
        process.stdout.write(
          `Usage: restringjs import --overrides=file.json [--adapter=file] [--target=file.json]\n\nImport overrides from a JSON file into a target override file.\n`,
        );
        break;
      }
      const { importOverrides } = await import('./io.js');
      const fs = await import('fs');
      const overridesPath = getArg('overrides');
      if (!overridesPath) {
        process.stderr.write('Error: --overrides=file.json is required\n');
        process.exit(1);
      }
      const adapter = getArg('adapter') ?? 'file';
      const target = getArg('target') ?? '.restringjs-overrides.json';

      if (adapter !== 'file') {
        process.stderr.write(`Error: only --adapter=file is currently supported\n`);
        process.exit(1);
      }

      let rawJson: string;
      try {
        rawJson = fs.readFileSync(overridesPath, 'utf-8');
      } catch {
        process.stderr.write(`Could not read overrides from ${overridesPath}\n`);
        process.exit(1);
        return;
      }

      const newOverrides = importOverrides(rawJson);

      // Load existing target file and merge
      let existing: Record<string, string> = {};
      try {
        const existingRaw = fs.readFileSync(target, 'utf-8');
        existing = importOverrides(existingRaw);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      const merged = { ...existing, ...newOverrides };
      fs.writeFileSync(target, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
      process.stdout.write(
        `Imported ${Object.keys(newOverrides).length} overrides into ${target}\n`,
      );
      break;
    }

    case 'clear': {
      if (args.includes('--help')) {
        process.stdout.write(
          `Usage: restringjs clear [--target=file.json]\n\nClear all overrides from the target file.\n`,
        );
        break;
      }
      const fs = await import('fs');
      const target = getArg('target') ?? '.restringjs-overrides.json';
      fs.writeFileSync(target, '{}\n', 'utf-8');
      process.stdout.write(`Cleared overrides in ${target}\n`);
      break;
    }

    default:
      process.stdout.write(HELP_TEXT);
  }
}

export const run = main();
