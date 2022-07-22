import Test, { x as y, y as z } from './default'
import * as module from './default'
import './stopWatch'
import { cooldownTime } from './global.json'

export const x: number = 3
export abstract class Test2 extends Test {}
export async function doSomething(cooldownTime: number) {
	module.aFunction()
	console.log(cooldownTime)
}

doSomething(cooldownTime)

export default function myFunc() {}
