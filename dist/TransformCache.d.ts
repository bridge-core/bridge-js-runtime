import type { Runtime } from './Runtime';
export declare class TransformCache {
    protected runtime: Runtime;
    constructor(runtime: Runtime);
    protected getCacheKey(filePath: string, lastModified: number): Promise<string>;
    set(filePath: string, lastModified: number, transformedSource: string): Promise<void>;
}
