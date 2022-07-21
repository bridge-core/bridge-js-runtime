import { Runner } from './Runner'
import { readFile } from 'fs/promises'
import { expect, test } from 'vitest'

class MyRunner extends Runner {
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
	expect(await runner.eval('./examples/test.ts')).toMatchObject({ x: 3 })
	// expect(await runner.eval('./examples/default.ts')).toBe(undefined)
})
