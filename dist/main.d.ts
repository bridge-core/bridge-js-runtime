export { Runtime } from './Runtime';
export { Module } from './Module';
export declare let loadedWasm: Promise<null> | null;
export declare function initRuntimes(initUrl?: string | BufferSource): void;
