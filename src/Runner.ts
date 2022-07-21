import init, { parseSync, transformSync } from '@swc/wasm'
import { dirname, join, basename } from 'path-browserify'
import { transform } from './Transform/main'

let transformOffset = 1

export abstract class Runner {
	protected moduleExports: Record<string, any> = {}
	abstract readFile(filePath: string): Promise<string>
	abstract fileExists(filePath: string): Promise<boolean>

	constructor(protected baseModules: Record<string, any> = {}) {}

	async eval(filePath: string) {
		if (this.moduleExports[filePath]) return this.moduleExports[filePath]

		const fileDirName = dirname(filePath)
		let jsContent = await this.readFile(filePath)
		// if (filePath.endsWith('.ts')) {
		// 	const transformed = transformSync(jsContent, {
		// 		filename: basename(filePath),

		// 		jsc: {
		// 			parser: {
		// 				syntax: 'typescript',
		// 			},
		// 			target: 'es2020',
		// 		},
		// 	})
		// 	transformOffset += jsContent.length + 1
		// 	jsContent = transformed.code
		// }
		await init

		const { type, body } = parseSync(jsContent, {
			syntax: filePath.endsWith('.js') ? 'ecmascript' : 'typescript',

			target: 'es2022',
		})

		const transformedSource = transform(jsContent, body, transformOffset)

		transformOffset += jsContent.length + 1
		console.log(transformedSource)

		const module = { exports: {} }

		try {
			await this.run(transformedSource, {
				___module: module,
				___require: (moduleName: string) =>
					this.require(moduleName, fileDirName),
			})
		} catch (err) {
			throw new Error(`Error in ${filePath}: ${err}`)
		}

		this.moduleExports[filePath] = module.exports
		return module.exports
	}

	async require(moduleName: string, baseDir: string) {
		if (this.baseModules[moduleName]) return this.baseModules[moduleName]

		if (moduleName.startsWith('.')) moduleName = join(baseDir, moduleName)

		const extensions = ['.ts', '.js']

		for (const ext of extensions) {
			const filePath = `${moduleName}${ext}`
			if (await this.fileExists(filePath))
				return await this.eval(filePath)
		}
		throw new Error(`Module not found: ${moduleName}`)
	}

	async run(src: string, env: Record<string, any>) {
		console.log(
			new Function(
				...Object.keys(env),
				`return (async () => {\n${src}\n})()`
			).toString(),
			...Object.values(env)
		)
		return new Function(
			...Object.keys(env),
			`return (async () => {\n${src}\n})()`
		)(...Object.values(env))
	}
}
