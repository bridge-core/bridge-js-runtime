import { Module } from './Module';
export interface IModule {
    __default__?: any;
    [key: string]: any;
}
export type TBaseModule = string | IModule | (() => IModule) | (() => Promise<IModule>);
export declare abstract class Runtime {
    protected evaluatedModules: Map<string, IModule>;
    protected baseModules: Map<string, TBaseModule>;
    protected moduleLoaders: Map<string, (filePath: string) => (File | Module) | Promise<File | Module>>;
    protected env: Record<string, any>;
    abstract readFile(filePath: string): Promise<File>;
    constructor(modules?: [string, TBaseModule][]);
    run(filePath: string, env?: Record<string, any>, file?: File | string): Promise<IModule>;
    clearCache(): void;
    registerModule(moduleName: string, module: TBaseModule): void;
    deleteModule(moduleName: string): void;
    addModuleLoader(fileExtension: string, loader: (filePath: string) => string | Module): void;
    protected eval(filePath: string, env: Record<string, any>, file?: File): Promise<IModule>;
    protected transformSource(filePath: string, fileContent: string): Promise<string>;
    protected require(moduleName: string, baseDir: string, env: Record<string, any>): Promise<IModule>;
    protected runSrc(src: string, env: Record<string, any>): Promise<any>;
}
