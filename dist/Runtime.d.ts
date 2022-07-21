export interface IModule {
    __default__?: any;
    [key: string]: any;
}
export declare abstract class Runtime {
    protected evaluatedModules: Map<string, IModule>;
    protected baseModules: Map<string, IModule>;
    protected env: Record<string, any>;
    abstract readFile(filePath: string): Promise<string>;
    constructor(modules?: [string, IModule][]);
    run(filePath: string, env?: Record<string, any>): Promise<IModule>;
    clearCache(): void;
    registerModule(moduleName: string, module: IModule): void;
    protected eval(filePath: string, fileContent?: string): Promise<IModule>;
    protected require(moduleName: string, baseDir: string): Promise<IModule>;
    protected runSrc(src: string, env: Record<string, any>): Promise<any>;
}
