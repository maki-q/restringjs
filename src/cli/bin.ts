#!/usr/bin/env node

/**
 * restringjs CLI entry point.
 * Commands: bake, diff, validate, export, import, clear
 */
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'bake': {
      const { bake } = await import('./bake.js');
      const sources = args.slice(1).filter((a: string) => !a.startsWith('--'));
      const dryRun = args.includes('--dry-run');
      const fs = await import('fs');
      const overridesArg = args.find((a: string) => a.startsWith('--overrides='));
      const overridesPath = overridesArg?.split('=')[1] ?? '.restringjs-overrides.json';
      let overrides: Record<string, string> = {};
      try {
        const raw: unknown = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          process.stderr.write(`Invalid overrides: expected a JSON object\n`);
          process.exit(1);
        }
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          if (typeof v !== 'string') {
            process.stderr.write(`Invalid override value for "${k}": expected string, got ${typeof v}\n`);
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
      const result = await bake({ source: sources, overrides, dryRun });
      process.stdout.write(`Modified: ${result.modified.length} files\n`);
      if (dryRun) process.stdout.write('(dry run — no files written)\n');
      break;
    }
    case 'diff': {
      process.stdout.write('diff command — provide source and overrides files\n');
      break;
    }
    case 'validate': {
      process.stdout.write('validate command — checks for stale overrides\n');
      break;
    }
    case 'export': {
      process.stdout.write('export command — exports overrides to JSON\n');
      break;
    }
    case 'import': {
      process.stdout.write('import command — imports overrides from JSON\n');
      break;
    }
    case 'clear': {
      process.stdout.write('clear command — removes all stored overrides\n');
      break;
    }
    default:
      process.stdout.write(
        `restringjs CLI\n\nCommands:\n  bake       Bake overrides into source files\n  diff       Show differences between source and overrides\n  validate   Check for stale or invalid overrides\n  export     Export overrides to JSON\n  import     Import overrides from JSON\n  clear      Clear stored overrides\n\nUsage: restringjs <command> [options]\n`,
      );
  }
}

void main();
