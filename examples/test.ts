import Test, { x as y, y as z } from './default'
import * as module from './default'

export const x: number = 3
export abstract class Test2 extends Test {}
export async function doSomething() {
	module.aFunction()
}

doSomething()

export default function myFunc() {}
