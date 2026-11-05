import ts from 'typescript'

export type Literal = null | boolean | number | string | Literal[] | { [key: string]: Literal }
export type ExportUnit = { name: string; line: number; kind: 'constant' | 'function' | 'reexport' }

// Deliberately not a TypeScript interpreter: imports, calls, spreads and dynamic keys never run.
export function literalModule(text: string, filename: string) {
  const file = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const diagnostics = (file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics
  if (diagnostics.length) throw new Error(`Invalid TypeScript source: ${filename}`)
  const declarations = new Map<string, ts.Expression>()
  const units: ExportUnit[] = []
  const exported = (node: ts.Node) => ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
  const unit = (name: string, node: ts.Node, kind: ExportUnit['kind']) => {
    if (units.some(item => item.name === name)) throw new Error(`Duplicate export: ${name}`)
    units.push({ name, line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, kind })
  }
  for (const statement of file.statements) {
    if (ts.isVariableStatement(statement)) {
      if (!(statement.declarationList.flags & ts.NodeFlags.Const)) throw new Error('Only const declarations are supported')
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) throw new Error('Unsupported declaration')
        const name = declaration.name.text
        if (declarations.has(name)) throw new Error(`Duplicate declaration: ${name}`)
        declarations.set(name, declaration.initializer)
        if (exported(statement)) unit(name, declaration, 'constant')
      }
    } else if (ts.isFunctionDeclaration(statement)) {
      if (exported(statement)) {
        if (!statement.name) throw new Error('Unnamed export')
        unit(statement.name.text, statement, 'function')
      }
    } else if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) throw new Error('Wildcard exports need an explicit adapter')
      for (const element of statement.exportClause.elements) unit(element.name.text, element, 'reexport')
    } else if (!ts.isImportDeclaration(statement) && !ts.isTypeAliasDeclaration(statement) && !ts.isInterfaceDeclaration(statement) && !ts.isEmptyStatement(statement)) {
      throw new Error(`Unsupported top-level statement: ${ts.SyntaxKind[statement.kind]}`)
    }
  }
  const active = new Set<string>()
  const independent = (node: ts.Expression): boolean => {
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return independent(node.expression)
    if (ts.isArrayLiteralExpression(node)) return node.elements.every(element => independent(element))
    if (ts.isObjectLiteralExpression(node)) return node.properties.every(property => ts.isPropertyAssignment(property) && independent(property.initializer))
    return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)
      || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)
      || ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)
  }
  let steps = 0
  const nameValue = (name: string, depth: number): Literal => {
    if (active.has(name)) throw new Error(`Cyclic constant: ${name}`)
    const expression = declarations.get(name)
    if (!expression) throw new Error(`Non-local constant: ${name}`)
    active.add(name)
    try { return evaluate(expression, depth + 1) } finally { active.delete(name) }
  }
  const evaluate = (node: ts.Expression, depth: number): Literal => {
    if (++steps > 100000 || depth > 100) throw new Error('Literal extraction budget exceeded')
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return evaluate(node.expression, depth + 1)
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
    if (ts.isNumericLiteral(node)) {
      const value = Number(node.text)
      if (!Number.isFinite(value)) throw new Error('Non-finite number')
      return value
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
    if (node.kind === ts.SyntaxKind.NullKeyword) return null
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
      const value = -Number(node.operand.text)
      if (!Number.isFinite(value)) throw new Error('Non-finite number')
      return value
    }
    if (ts.isIdentifier(node)) return nameValue(node.text, depth)
    if (ts.isPropertyAccessExpression(node)) {
      const object = evaluate(node.expression, depth + 1)
      if (!object || typeof object !== 'object' || Array.isArray(object) || !Object.hasOwn(object, node.name.text)) throw new Error('Unknown literal property')
      return object[node.name.text]
    }
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(element => evaluate(element, depth + 1))
    if (ts.isObjectLiteralExpression(node)) {
      const entries: [string, Literal][] = []
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property) || (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name) && !ts.isNumericLiteral(property.name))) throw new Error('Only explicit static properties are supported')
        const key = property.name.text
        if (['__proto__', 'prototype', 'constructor'].includes(key) || entries.some(([existing]) => existing === key)) throw new Error(`Unsafe or duplicate property: ${key}`)
        entries.push([key, evaluate(property.initializer, depth + 1)])
      }
      return Object.fromEntries(entries)
    }
    throw new Error(`Unsupported literal expression: ${ts.SyntaxKind[node.kind]}`)
  }
  return { units, bindings: [...declarations].map(([name, expression]) => ({ name, independent: independent(expression) })),
    read: (name: string) => { steps = 0; return nameValue(name, 0) } }
}
