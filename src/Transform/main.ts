import MagicString from 'magic-string'

export function transform(jsContent: string, body: any, offset = 0) {
	const jsOutput = new MagicString(jsContent)
	const overwrite = (s: number, e: number, str: string) =>
		jsOutput.overwrite(s - offset, e - offset, str)
	const from = (s: number, e: number) =>
		jsOutput.slice(s - offset, e - offset)

	let appendExports = ''

	body.forEach((node: any) => {
		if (node.type === 'ExportDefaultDeclaration') {
			// Replace "export default ..." with "___module.__default__ = ..."
			overwrite(
				node.span.start,
				node.span.end,
				`\n___module.__default__ = ${from(
					node.decl.span.start,
					node.decl.span.end
				)};`
			)
		} else if (node.type === 'ExportDefaultExpression') {
			// Replace "export default () => {...}" with "___module.__default__ = () => {...}"

			overwrite(
				node.span.start,
				node.span.end,
				`\n___module.__default__ = ${from(
					node.expression.span.start,
					node.expression.span.end
				)};`
			)
		} else if (node.type === 'ExportDeclaration') {
			// Replace "export ... name ..." with "... name = ...; ___module.name = ..."
			overwrite(
				node.span.start,
				node.span.end,
				from(node.declaration.span.start, node.declaration.span.end)
			)

			if (
				node.declaration.type === 'ClassDeclaration' ||
				node.declaration.type === 'FunctionDeclaration'
			) {
				appendExports += `\n___module.${node.declaration.identifier.value} = ${node.declaration.identifier.value};`
			} else if (node.declaration.type === 'VariableDeclaration') {
				node.declaration.declarations.forEach((decl: any) => {
					appendExports += `\n___module.${decl.id.value} = ${decl.id.value};`
				})
			}
		} else if (node.type === 'ExportNamedDeclaration') {
			let newExports = ''
			for (const { orig, exported } of node.specifiers) {
				if (exported.value === 'default')
					newExports += `\n___module.__default__ = ${orig.value};`
				else
					newExports += `\n___module.${exported.value} = ${orig.value};`
			}

			overwrite(node.span.start, node.span.end, newExports)
		} else if (node.type === 'ImportDeclaration') {
			if (
				node.specifiers.length === 1 &&
				node.specifiers[0].type === 'ImportNamespaceSpecifier'
			) {
				// Replace "import * as name from ..." with "const name = ___require(...)"
				overwrite(
					node.span.start,
					node.span.end,
					`\nconst ${node.specifiers[0].local.value} = await ___require(${node.source.raw});`
				)
			} else {
				// Replace "import ... from ..." with "... = ___require(...)"
				const allImports: string[] = []
				node.specifiers.forEach((specifier: any) => {
					if (specifier.type === 'ImportDefaultSpecifier') {
						allImports.push(`__default__: ${specifier.local.value}`)
					} else if (specifier.type === 'ImportSpecifier') {
						if (!specifier.imported)
							specifier.imported = specifier.local

						allImports.push(
							`${specifier.imported.value}: ${specifier.local.value}`
						)
					}
				})
				const importText =
					allImports.length === 0
						? `\nawait ___require(${node.source.raw});`
						: `\nconst {${allImports.join(
								', '
						  )}} = await ___require(${node.source.raw});`

				overwrite(node.span.start, node.span.end, importText)
			}
		}
	})

	return jsOutput.toString() + appendExports
}
