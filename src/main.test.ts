import { Runtime } from './Runtime'
import { readFile } from 'fs/promises'
import { expect, test } from 'vitest'

class MyRunner extends Runtime {
	// @ts-expect-error File class is not available in node
	async readFile(filePath: string) {
		const fileContent = await readFile(filePath, { encoding: 'utf8' })

		return {
			text: () => fileContent,
		}
	}
	async fileExists(filePath: string): Promise<boolean> {
		try {
			await this.readFile(filePath)
			return true
		} catch {
			return false
		}
	}
}

const runner = new MyRunner()

test('Runner.run()', async () => {
	const module = await runner.run('./examples/test.ts')
	runner.registerModule('@bridge/generate', { useTemplate: () => 'test' })
	expect(module).toBeDefined()
	expect(module.x).toBe(3)

	const sameModule = await runner.run('./examples/test.ts')
	expect(module).toBe(sameModule)

	const module2 = await runner.run('./examples/convertObj.js')
	expect(module2).toBeDefined()
	expect(module2.__default__).toBeTypeOf('function')

	const defaultModule = await runner.run('./examples/default.ts')

	const scriptedEntity = await runner.run('./examples/scriptedEntity.js')
	console.log(scriptedEntity)
})
