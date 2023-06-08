import init from '@swc/wasm-web'

export { Runtime } from './Runtime'
export { Module } from './Module'

export let loadedWasm: Promise<null> | null = null
export function initRuntimes(initUrl?: string | BufferSource) {
	loadedWasm = init(initUrl).then(() => null)
}
