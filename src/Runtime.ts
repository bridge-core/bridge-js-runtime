import { minifySync, parseSync, transformSync } from '@swc/wasm-web'
import { dirname, join, basename } from 'path-browserify'
import { transform } from './Transform/main'
import { loadedWasm } from './main'
import json5 from 'json5'
export interface IModule {
	__default__?: any
	[key: string]: any
}
export type TBaseModule = IModule | (() => IModule) | (() => Promise<IModule>)

export abstract class Runtime {
	protected evaluatedModules = new Map<string, IModule>()
	protected baseModules = new Map<string, TBaseModule>()
	protected env: Record<string, any> = {}
	protected abstract readFile(filePath: string): Promise<string>

	constructor(modules?: [string, TBaseModule][]) {
		if (modules) {
			for (const [moduleName, module] of modules) {
				this.registerModule(moduleName, module)
			}
		}
	}

	async run(
		filePath: string,
		env: Record<string, any> = {},
		fileContent?: string
	) {
		this.env = env

		const module = await this.eval(filePath, fileContent)
		return module
	}
	clearCache() {
		this.evaluatedModules.clear()
	}
	registerModule(moduleName: string, module: TBaseModule) {
		this.baseModules.set(moduleName, module)
	}

	protected async eval(filePath: string, fileContent?: string) {
		const evaluatedModule = this.evaluatedModules.get(filePath)
		if (evaluatedModule) return evaluatedModule

		const fileDirName = dirname(filePath)
		const syntax = filePath.endsWith('.js') ? 'ecmascript' : 'typescript'

		if (!fileContent)
			fileContent = await this.readFile(filePath).catch(() => undefined)
		if (!fileContent) throw new Error(`File "${filePath}" not found`)

		if (loadedWasm === null && import.meta.env.PROD) {
			throw new Error(
				`You must call initRuntimes() before using the runtime`
			)
		}
		await loadedWasm

		let transpiledSource = minifySync(
			transformSync(fileContent, {
				filename: basename(filePath),

				jsc: {
					parser: {
						syntax,
						preserveAllComments: false,
						topLevelAwait: true,
					},
					target: 'es2020',
				},
			}).code,
			{ compress: false, mangle: false, format: { beautify: true } }
		).code

		const { type, body } = parseSync(transpiledSource, {
			syntax,

			target: 'es2022',
		})

		const transformOffset: number = body[0].span.start
		const transformedSource = transform(
			transpiledSource,
			body,
			transformOffset
		)

		const module: IModule = {}

		try {
			await this.runSrc(
				transformedSource,
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
		return module
	}

	protected async require(moduleName: string, baseDir: string) {
		const baseModule = this.baseModules.get(moduleName)
		if (baseModule)
			return typeof baseModule === 'function'
				? await baseModule()
				: baseModule

		// Fetch module from network
		if (moduleName.startsWith('https://')) {
			const response = await fetch(moduleName)
			const text = await response.text()
			return await this.eval(moduleName, text)
		}

		if (moduleName.startsWith('.')) moduleName = join(baseDir, moduleName)

		// Load JSON files
		if (moduleName.endsWith('.json')) {
			const fileContent = await this.readFile(moduleName).catch(
				() => undefined
			)
			if (fileContent) {
				let json: any = {}
				try {
					json = json5.parse(fileContent)
				} catch {
					throw new Error(
						`File "${moduleName}" contains invalid JSON`
					)
				}

				return <IModule>{
					__default__: json,
					...json,
				}
			}
		}

		const extensions = ['.ts', '.js']

		for (const ext of extensions) {
			const filePath = `${moduleName}${ext}`
			let fileContent = await this.readFile(filePath).catch(
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
