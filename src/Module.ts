export class Module {
	__default__: any;
	[key: string]: any

	constructor(defaultExport: any, named: Record<string, any>) {
		this.__default__ = defaultExport

		for (const [key, value] of Object.entries(named)) {
			this[key] = value
		}
	}
}
