import { Runtime } from './Runtime'
import { readFile } from 'fs/promises'
import { expect, test } from 'vitest'

class MyRunner extends Runtime {
	readFile(filePath: string): Promise<string> {
		return readFile(filePath, { encoding: 'utf8' })
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
	expect(module).toBeDefined()
	expect(module.x).toBe(3)

	const sameModule = await runner.run('./examples/test.ts')
	expect(module).toBe(sameModule)

	const module2 = await runner.run('./examples/convertObj.js')
	expect(module2).toBeDefined()
	expect(module2.__default__).toBeTypeOf('function')
})
