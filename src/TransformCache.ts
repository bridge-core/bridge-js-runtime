import type { Runtime } from './Runtime'

/**
 * Not used just yet
 */
export class TransformCache {
	constructor(protected runtime: Runtime) {}

	protected async getCacheKey(filePath: string, lastModified: number) {
		if (!('crypto' in globalThis)) {
			// Node fallback for crypto
			globalThis.crypto = require('crypto').webcrypto
		}

		// Use web crypto to generate a hash of the file path and last modified date
		const hash = crypto.subtle.digest(
			'SHA-1',
			new TextEncoder().encode(filePath + '@' + lastModified)
		)

		// Convert the hash to a hex string
		const hashArray = Array.from(new Uint8Array(await hash))
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
		return hashHex
	}

	async set(
		filePath: string,
		lastModified: number,
		transformedSource: string
	) {
		const cacheKey = await this.getCacheKey(filePath, lastModified)

		// Store the transformed source in the cache
		// await this.runtime.writeToCacheDir(cacheKey, transformedSource)
	}
}
