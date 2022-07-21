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

test('Runner.eval()', async () => {
	const module = await runner.eval('./examples/test.ts')
	expect(module).toBeDefined()
	expect(module.x).toBe(3)
})
