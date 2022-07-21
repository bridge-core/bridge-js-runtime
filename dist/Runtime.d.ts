export interface IModule {
    __default__?: any;
    [key: string]: any;
}
export declare abstract class Runtime {
    protected evaluatedModules: Map<string, IModule>;
    protected baseModules: Map<string, IModule>;
    abstract readFile(filePath: string): Promise<string>;
    constructor();
    eval(filePath: string, fileContent?: string): Promise<IModule>;
    require(moduleName: string, baseDir: string): Promise<IModule>;
    run(src: string, env: Record<string, any>): Promise<any>;
}
