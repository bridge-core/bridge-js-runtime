import init, { parseSync, transformSync } from '@swc/wasm'
import { dirname, join, basename } from 'path-browserify'
import { transform } from './Transform/main'

export interface IModule {
	__default__?: any
	[key: string]: any
}
export abstract class Runtime {
	protected evaluatedModules = new Map<string, IModule>()
	protected baseModules = new Map<string, IModule>()
	abstract readFile(filePath: string): Promise<string>

	constructor() {}

	async eval(filePath: string, fileContent?: string) {
		const evaluatedModule = this.evaluatedModules.get(filePath)
		if (evaluatedModule) return evaluatedModule

		const fileDirName = dirname(filePath)
		if (!fileContent)
			fileContent = await this.readFile(filePath).catch(() => undefined)
		if (!fileContent) throw new Error(`File "${filePath}" not found`)

		await init
		const { type, body } = parseSync(fileContent, {
			syntax: filePath.endsWith('.js') ? 'ecmascript' : 'typescript',

			target: 'es2022',
		})

		const transformOffset: number = body[0].span.start
		const transformedSource = transform(fileContent, body, transformOffset)

		let transpiledSource = transformedSource
		if (filePath.endsWith('.ts')) {
			transpiledSource = transformSync(transformedSource, {
				filename: basename(filePath),

				jsc: {
					parser: {
						syntax: 'typescript',
					},
					target: 'es2020',
				},
			}).code
		}

		const module: { exports: IModule } = { exports: {} }

		try {
			await this.run(transpiledSource, {
				___module: module,
				___require: (moduleName: string) =>
					this.require(moduleName, fileDirName),
			})
		} catch (err: any) {
			throw new Error(`Error in ${filePath}: ${err}`)
		}

		this.evaluatedModules.set(filePath, module)
		return module.exports
	}

	async require(moduleName: string, baseDir: string) {
		const baseModule = this.baseModules.get(moduleName)
		if (baseModule) return baseModule

		if (moduleName.startsWith('.')) moduleName = join(baseDir, moduleName)

		const extensions = ['.ts', '.js']

		for (const ext of extensions) {
			const filePath = `${moduleName}${ext}`
			const fileContent = await this.readFile(filePath).catch(
				() => undefined
			)
			if (!fileContent) continue

			return await this.eval(filePath, fileContent)
		}
		throw new Error(`Module "${moduleName}" not found`)
	}

	async run(src: string, env: Record<string, any>) {
		return new Function(
			...Object.keys(env),
			`return (async () => {\n${src}\n})()`
		)(...Object.values(env))
	}
}
