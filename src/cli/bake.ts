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
  prefix?: string;
}): Promise<{ modified: string[]; skipped: string[]; unmatched: string[] }> {
  // Dynamic import to keep ts-morph out of the browser bundle
  const { Project, SyntaxKind } = await import('ts-morph');
  const project = new Project({ useInMemoryFileSystem: false });
  const root = resolve(options.projectRoot ?? process.cwd());

  const modified: string[] = [];
  const skipped: string[] = [];

  // Build effective overrides map, applying prefix if provided
  const effectiveOverrides: OverrideMap = {};
  const originalKeyMap = new Map<string, string>(); // effectiveKey -> originalKey
  for (const [key, value] of Object.entries(options.overrides)) {
    const effectiveKey = options.prefix ? `${options.prefix}.${key}` : key;
    effectiveOverrides[effectiveKey] = value;
    originalKeyMap.set(effectiveKey, key);
  }

  // Track which override keys were matched
  const matchedKeys = new Set<string>();

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
      const fullPath = resolvePropertyPath(prop, SyntaxKind);

      if (fullPath && fullPath in effectiveOverrides) {
        const initializer = prop.getInitializer();
        if (initializer?.getKind() === SyntaxKind.StringLiteral) {
          const overrideValue = effectiveOverrides[fullPath]!;
          matchedKeys.add(fullPath);
          if (!options.dryRun) {
            // Detect original quote style
            const originalText = initializer.getFullText().trim();
            const quoteChar = originalText.startsWith('"') ? '"' : "'";
            initializer.replaceWithText(`${quoteChar}${escapeString(overrideValue, quoteChar)}${quoteChar}`);
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

  // Determine unmatched keys (using original keys, not prefixed)
  const unmatched: string[] = [];
  for (const effectiveKey of Object.keys(effectiveOverrides)) {
    if (!matchedKeys.has(effectiveKey)) {
      unmatched.push(originalKeyMap.get(effectiveKey) ?? effectiveKey);
    }
  }

  return { modified, skipped, unmatched };
}

function resolvePropertyPath(
  node: { getName(): string; getParent(): unknown },
  SyntaxKind: { ObjectLiteralExpression: number; PropertyAssignment: number; ArrayLiteralExpression: number; VariableDeclaration: number; AsExpression: number; SatisfiesExpression: number },
): string | null {
  const parts: string[] = [node.getName()];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let previous: any = node;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = node.getParent();

  while (current) {
    const kind = current.getKind();

    if (kind === SyntaxKind.ObjectLiteralExpression) {
      // Pass through, the meaningful parent is above
      previous = current;
      current = current.getParent();
    } else if (kind === SyntaxKind.AsExpression || kind === SyntaxKind.SatisfiesExpression) {
      // Pass through type assertion wrappers (e.g. `{ ... } as const`)
      previous = current;
      current = current.getParent();
    } else if (kind === SyntaxKind.ArrayLiteralExpression) {
      // Find the index of the previous node (an element) in the array
      const elements = current.getElements();
      const idx = elements.indexOf(previous);
      if (idx !== -1) {
        parts.unshift(String(idx));
      }
      previous = current;
      current = current.getParent();
    } else if (kind === SyntaxKind.PropertyAssignment) {
      parts.unshift(current.getName()!);
      previous = current;
      current = current.getParent();
    } else if (typeof current.getName === 'function') {
      // VariableDeclaration or similar named node
      parts.unshift(current.getName()!);
      break;
    } else {
      break;
    }
  }

  return parts.length > 0 ? parts.join('.') : null;
}

function escapeString(str: string, quoteChar: string = "'"): string {
  let result = str
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\0')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  if (quoteChar === "'") {
    result = result.replace(/'/g, "\\'");
  } else {
    result = result.replace(/"/g, '\\"');
  }

  return result;
}
