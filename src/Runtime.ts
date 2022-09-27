import { minifySync, parseSync, transformSync } from '@swc/wasm-web'
import { dirname, join, basename, extname } from 'path-browserify'
import { transform } from './Transform/main'
import { loadedWasm } from './main'
import json5 from 'json5'
import { Module } from './Module'
export interface IModule {
	__default__?: any
	[key: string]: any
}
export type TBaseModule = IModule | (() => IModule) | (() => Promise<IModule>)

const isNode =
	typeof process !== 'undefined' &&
	typeof process.release !== 'undefined' &&
	process.release.name === 'node'
export abstract class Runtime {
	protected evaluatedModules = new Map<string, IModule>()
	protected baseModules = new Map<string, TBaseModule>()
	protected moduleLoaders = new Map<
		string,
		(filePath: string) => string | Module
	>()

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
		const module = await this.eval(filePath, env, fileContent)
		return module
	}
	clearCache() {
		this.evaluatedModules.clear()
	}
	registerModule(moduleName: string, module: TBaseModule) {
		this.baseModules.set(moduleName, module)
	}
	deleteModule(moduleName: string) {
		this.baseModules.delete(moduleName)
	}

	/**
	 * Allow the JS runtime to load new file types
	 *
	 * @param fileExtension File extension that this loader will handle
	 * @param loader A module loader can either return a string (JS to be evaluated) or an object represeting the module exports
	 */
	addModuleLoader(
		fileExtension: string,
		loader: (filePath: string) => string | Module
	) {
		this.baseModules.set(fileExtension, loader)
	}

	protected async eval(
		filePath: string,
		env: Record<string, any>,
		fileContent?: string
	) {
		const evaluatedModule = this.evaluatedModules.get(filePath)
		if (evaluatedModule) return evaluatedModule

		const fileDirName = dirname(filePath)
		const syntax = filePath.endsWith('.js') ? 'ecmascript' : 'typescript'

		if (!fileContent)
			fileContent = await this.readFile(filePath).catch(() => undefined)
		if (!fileContent) throw new Error(`File "${filePath}" not found`)

		if (loadedWasm === null && !isNode) {
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
				Object.assign({}, env, {
					___module: module,
					___require: (moduleName: string) =>
						this.require(moduleName, fileDirName, env),
				})
			)
		} catch (err: any) {
			throw new Error(`Error in ${filePath}: ${err}`)
		}

		this.evaluatedModules.set(filePath, module)
		return module
	}

	protected async require(
		moduleName: string,
		baseDir: string,
		env: Record<string, any>
	) {
		const baseModule = this.baseModules.get(moduleName)
		if (baseModule)
			return typeof baseModule === 'function'
				? await baseModule()
				: baseModule

		// Fetch module from network
		if (moduleName.startsWith('https://')) {
			const response = await fetch(moduleName)
			const text = await response.text()
			return await this.eval(moduleName, env, text)
		}

		if (moduleName.startsWith('.')) moduleName = join(baseDir, moduleName)

		const extension = extname(moduleName)

		// Load JSON files
		if (extension === '.json') {
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

				return new Module(json, json)
			}
		}

		const customLoader = this.moduleLoaders.get(extension)
		if (customLoader) {
			const cachedModule = this.evaluatedModules.get(moduleName)
			if (cachedModule) return cachedModule

			const module = customLoader(moduleName)

			if (typeof module === 'string') {
				return await this.eval(moduleName, env, module)
			} else {
				this.evaluatedModules.set(moduleName, module)
				return module
			}
		}

		const extensions = ['.ts', '.js']

		for (const ext of extensions) {
			const filePath = `${moduleName}${ext}`
			let fileContent = await this.readFile(filePath).catch(
				() => undefined
			)
			if (!fileContent) continue

			return await this.eval(filePath, env, fileContent)
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
