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
	protected env: Record<string, any> = {}
	abstract readFile(filePath: string): Promise<string>

	constructor(modules?: [string, IModule][]) {
		if (modules) {
			for (const [moduleName, module] of modules) {
				this.registerModule(moduleName, module)
			}
		}
	}

	async run(filePath: string, env: Record<string, any> = {}) {
		this.env = env

		const module = await this.eval(filePath)
		return module
	}
	clearCache() {
		this.evaluatedModules.clear()
	}
	registerModule(moduleName: string, module: IModule) {
		this.baseModules.set(moduleName, module)
	}

	protected async eval(filePath: string, fileContent?: string) {
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
			await this.runSrc(
				transpiledSource,
				Object.assign({}, this.env, {
					___module: module,
					___require: (moduleName: string) =>
						this.require(moduleName, fileDirName),
				})
			)
		} catch (err: any) {
			throw new Error(`Error in ${filePath}: ${err}`)
		}

		this.evaluatedModules.set(filePath, module)
		return module.exports
	}

	protected async require(moduleName: string, baseDir: string) {
		const baseModule = this.baseModules.get(moduleName)
		if (baseModule) return baseModule

		// Fetch module from network
		if (moduleName.startsWith('https://')) {
			const response = await fetch(moduleName)
			const text = await response.text()
			return this.eval(moduleName, text)
		}

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

	protected async runSrc(src: string, env: Record<string, any>) {
		return new Function(
			...Object.keys(env),
			`return (async () => {\n${src}\n})()`
		)(...Object.values(env))
	}
}
