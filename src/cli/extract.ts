/**
 * Extract all string literal values from source files using ts-morph AST walking.
 * Returns a flat map of dot-path keys to string values.
 */
export async function extractStringsFromSource(
  sourcePatterns: string[],
): Promise<Record<string, string>> {
  const { Project, SyntaxKind } = await import('ts-morph');
  const project = new Project({ useInMemoryFileSystem: false });

  for (const pattern of sourcePatterns) {
    project.addSourceFilesAtPaths(pattern);
  }

  const result: Record<string, string> = {};

  for (const sourceFile of project.getSourceFiles()) {
    const propertyAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);

    for (const prop of propertyAssignments) {
      const fullPath = resolvePropertyPath(prop, SyntaxKind);
      if (!fullPath) continue;

      const initializer = prop.getInitializer();
      if (initializer?.getKind() === SyntaxKind.StringLiteral) {
        // Get the actual string value (without quotes)
        const text = initializer.getText();
        // Remove surrounding quotes and unescape
        const unquoted = text.slice(1, -1);
        result[fullPath] = unescapeString(unquoted);
      }
    }
  }

  return result;
}

function resolvePropertyPath(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SyntaxKind: any,
): string | null {
  const parts: string[] = [node.getName()];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let previous: any = node;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = node.getParent();

  while (current) {
    const kind = current.getKind();

    if (kind === SyntaxKind.ObjectLiteralExpression) {
      previous = current;
      current = current.getParent();
    } else if (kind === SyntaxKind.AsExpression || kind === SyntaxKind.SatisfiesExpression) {
      previous = current;
      current = current.getParent();
    } else if (kind === SyntaxKind.ArrayLiteralExpression) {
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
      parts.unshift(current.getName()!);
      break;
    } else {
      break;
    }
  }

  return parts.length > 0 ? parts.join('.') : null;
}

function unescapeString(str: string): string {
  return str
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\0/g, '\0')
    .replace(/\\\\/g, '\\');
}
