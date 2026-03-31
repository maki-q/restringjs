import type { OverrideMap } from '../core/types';
import { resolve, extname } from 'path';

const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

/**
 * Bake overrides into source files using AST transforms.
 * Uses ts-morph to preserve formatting and comments.
 */
export async function bake(options: {
  source: string[];
  overrides: OverrideMap;
  dryRun?: boolean;
  projectRoot?: string;
}): Promise<{ modified: string[]; skipped: string[] }> {
  // Dynamic import to keep ts-morph out of the browser bundle
  const { Project, SyntaxKind } = await import('ts-morph');
  const project = new Project({ useInMemoryFileSystem: false });
  const root = resolve(options.projectRoot ?? process.cwd());

  const modified: string[] = [];
  const skipped: string[] = [];

  for (const pattern of options.source) {
    project.addSourceFilesAtPaths(pattern);
  }

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = resolve(sourceFile.getFilePath());

    // Validate file stays within project root
    if (!filePath.startsWith(root)) {
      process.stderr.write(`Skipping ${filePath}: outside project root ${root}\n`);
      skipped.push(filePath);
      continue;
    }

    // Validate file extension
    if (!ALLOWED_EXTENSIONS.has(extname(filePath))) {
      skipped.push(filePath);
      continue;
    }

    let fileModified = false;

    // Find string literals and template literals that match override keys
    const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);

    // Track string literals for potential future use
    void stringLiterals;

    // More sophisticated: look for object property assignments matching our paths
    const propertyAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);

    for (const prop of propertyAssignments) {
      // Check nested paths by walking up the AST
      const fullPath = resolvePropertyPath(prop);

      if (fullPath && fullPath in options.overrides) {
        const initializer = prop.getInitializer();
        if (initializer?.getKind() === SyntaxKind.StringLiteral) {
          const overrideValue = options.overrides[fullPath]!;
          if (!options.dryRun) {
            initializer.replaceWithText(`'${escapeString(overrideValue)}'`);
          }
          fileModified = true;
        }
      }
    }

    if (fileModified) {
      if (!options.dryRun) {
        await sourceFile.save();
      }
      modified.push(sourceFile.getFilePath());
    } else {
      skipped.push(sourceFile.getFilePath());
    }
  }

  return { modified, skipped };
}

function resolvePropertyPath(node: { getName(): string; getParent(): { getKind(): number; getName?(): string; getParent(): unknown } }): string | null {
  const parts: string[] = [node.getName()];
  let current = node.getParent();

  while (current) {
    const kind = current.getKind();
    // ObjectLiteralExpression = 210 in ts-morph
    if (kind === 210 || kind === 211) {
      const parent = current.getParent() as { getKind(): number; getName?(): string; getParent(): unknown } | undefined;
      if (parent && typeof parent.getName === 'function') {
        parts.unshift(parent.getName()!);
        current = parent.getParent() as typeof current;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return parts.length > 0 ? parts.join('.') : null;
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\0/g, '\\0')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
