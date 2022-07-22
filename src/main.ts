import init from '@swc/wasm-web'

export { Runtime } from './Runtime'

export let loadedWasm: Promise<null> | null = null
export function initRuntimes(initUrl?: string) {
	loadedWasm = init(initUrl).then(() => null)
}
