import MagicString from 'magic-string'

export function transform(jsContent: string, body: any, offset = 0) {
	const jsOutput = new MagicString(jsContent)
	const overwrite = (s: number, e: number, str: string) =>
		jsOutput.overwrite(s - offset, e - offset, str)
	const from = (s: number, e: number) =>
		jsOutput.slice(s - offset, e - offset)
	const insert = (s: number, str: string) =>
		jsOutput.appendRight(s - offset, str)

	body.forEach((node: any) => {
		if (node.type === 'ExportDefaultDeclaration') {
			// Replace with "export default ..." with "___module.exports.__default__ = ..."
			overwrite(
				node.span.start,
				node.span.end,
				`___module.exports.__default__ = ${from(
					node.decl.span.start,
					node.decl.span.end
				)}`
			)
		} else if (node.type === 'ExportDeclaration') {
			// Replace with "export ... name ..." with "... name = ...; ___module.exports.name = ..."
			overwrite(
				node.span.start,
				node.span.end,
				from(node.declaration.span.start, node.declaration.span.end)
			)
			if (
				node.declaration.type === 'ClassDeclaration' ||
				node.declaration.type === 'FunctionDeclaration'
			) {
				insert(
					node.span.end,
					`\n___module.exports.${node.declaration.identifier.value} = ${node.declaration.identifier.value}`
				)
			} else if (node.declaration.type === 'VariableDeclaration') {
				node.declaration.declarations.forEach((decl: any) => {
					insert(
						node.span.end,
						`\n___module.exports.${decl.id.value} = ${decl.id.value}`
					)
				})
			}
		} else if (node.type === 'ImportDeclaration') {
			if (
				node.specifiers.length === 1 &&
				node.specifiers[0].type === 'ImportNamespaceSpecifier'
			) {
				// Replace with "import * as name from ..." with "const name = ___require(...)"
				overwrite(
					node.span.start,
					node.span.end,
					`const ${node.specifiers[0].local.value} = await ___require(${node.source.raw})`
				)
			} else {
				// Replace with "import ... from ..." with "... = ___require(...)"
				const allImports: string[] = []
				node.specifiers.forEach((specifier: any) => {
					if (specifier.type === 'ImportDefaultSpecifier') {
						allImports.push(`__default__: ${specifier.local.value}`)
					} else if (specifier.type === 'ImportSpecifier') {
						allImports.push(
							`${specifier.imported.value}: ${specifier.local.value}`
						)
					}
				})

				overwrite(
					node.span.start,
					node.span.end,
					`const {${allImports.join(', ')}} = await ___require(${
						node.source.raw
					})`
				)
			}
		}
	})

	return jsOutput.toString()
}
