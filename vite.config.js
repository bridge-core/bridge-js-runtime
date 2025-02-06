import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.ts'),
			name: 'BridgeJsRuntime',
			fileName: (format) => `bridge-js-runtime.${format}.js`,
		},
		assetsInlineLimit: 0,
		rollupOptions: {
			external: [
				'pathe',
				'@swc/wasm-web',
				'magic-string',
				'json5',
			],
		},
	},
})
