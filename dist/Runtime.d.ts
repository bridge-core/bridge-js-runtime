import { Module } from './Module';
export interface IModule {
    __default__?: any;
    [key: string]: any;
}
export declare type TBaseModule = IModule | (() => IModule) | (() => Promise<IModule>);
export declare abstract class Runtime {
    protected evaluatedModules: Map<string, IModule>;
    protected baseModules: Map<string, TBaseModule>;
    protected moduleLoaders: Map<string, (filePath: string) => string | Module>;
    protected env: Record<string, any>;
    protected abstract readFile(filePath: string): Promise<string>;
    constructor(modules?: [string, TBaseModule][]);
    run(filePath: string, env?: Record<string, any>, fileContent?: string): Promise<IModule>;
    clearCache(): void;
    registerModule(moduleName: string, module: TBaseModule): void;
    deleteModule(moduleName: string): void;
    addModuleLoader(fileExtension: string, loader: (filePath: string) => string | Module): void;
    protected eval(filePath: string, env: Record<string, any>, fileContent?: string): Promise<IModule>;
    protected require(moduleName: string, baseDir: string, env: Record<string, any>): Promise<IModule>;
    protected runSrc(src: string, env: Record<string, any>): Promise<any>;
}
