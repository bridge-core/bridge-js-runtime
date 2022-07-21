import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.ts'),
			name: 'BridgeJsRuntime',
			fileName: (format) => `bridge-js-runtime.${format}.js`,
		},
		rollupOptions: {
			external: [
				'path-browserify',
				'@swc/wasm',
				'magic-string',
				'typescript',
			],
		},
	},
})
