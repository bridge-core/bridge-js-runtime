import init, { minifySync, transformSync, parseSync } from "@swc/wasm-web";
import { basename, dirname, join, extname } from "path-browserify";
import MagicString from "magic-string";
import json5 from "json5";
function transform(jsContent, body, offset = 0) {
  const jsOutput = new MagicString(jsContent);
  const overwrite = (s, e, str) => jsOutput.overwrite(s - offset, e - offset, str);
  const from = (s, e) => jsOutput.slice(s - offset, e - offset);
  let appendExports = "";
  body.forEach((node) => {
    if (node.type === "ExportDefaultDeclaration") {
      overwrite(
        node.span.start,
        node.span.end,
        `
___module.__default__ = ${from(
          node.decl.span.start,
          node.decl.span.end
        )};`
      );
    } else if (node.type === "ExportDefaultExpression") {
      overwrite(
        node.span.start,
        node.span.end,
        `
___module.__default__ = ${from(
          node.expression.span.start,
          node.expression.span.end
        )};`
      );
    } else if (node.type === "ExportDeclaration") {
      overwrite(
        node.span.start,
        node.span.end,
        from(node.declaration.span.start, node.declaration.span.end)
      );
      if (node.declaration.type === "ClassDeclaration" || node.declaration.type === "FunctionDeclaration") {
        appendExports += `
___module.${node.declaration.identifier.value} = ${node.declaration.identifier.value};`;
      } else if (node.declaration.type === "VariableDeclaration") {
        node.declaration.declarations.forEach((decl) => {
          appendExports += `
___module.${decl.id.value} = ${decl.id.value};`;
        });
      }
    } else if (node.type === "ExportNamedDeclaration") {
      let newExports = "";
      for (const { orig, exported } of node.specifiers) {
        if (exported.value === "default")
          newExports += `
___module.__default__ = ${orig.value};`;
        else
          newExports += `
___module.${exported.value} = ${orig.value};`;
      }
      overwrite(node.span.start, node.span.end, newExports);
    } else if (node.type === "ImportDeclaration") {
      if (node.specifiers.length === 1 && node.specifiers[0].type === "ImportNamespaceSpecifier") {
        overwrite(
          node.span.start,
          node.span.end,
          `
const ${node.specifiers[0].local.value} = await ___require(${node.source.raw});`
        );
      } else {
        const allImports = [];
        node.specifiers.forEach((specifier) => {
          if (specifier.type === "ImportDefaultSpecifier") {
            allImports.push(`__default__: ${specifier.local.value}`);
          } else if (specifier.type === "ImportSpecifier") {
            if (!specifier.imported)
              specifier.imported = specifier.local;
            allImports.push(
              `${specifier.imported.value}: ${specifier.local.value}`
            );
          }
        });
        const importText = allImports.length === 0 ? `
await ___require(${node.source.raw});` : `
const {${allImports.join(
          ", "
        )}} = await ___require(${node.source.raw});`;
        overwrite(node.span.start, node.span.end, importText);
      }
    }
  });
  return jsOutput.toString() + appendExports;
}
class Module {
  constructor(defaultExport, named) {
    this.__default__ = defaultExport;
    for (const [key, value] of Object.entries(named)) {
      this[key] = value;
    }
  }
}
const isNode = typeof process !== "undefined" && typeof process.release !== "undefined" && process.release.name === "node";
class Runtime {
  constructor(modules) {
    this.evaluatedModules = /* @__PURE__ */ new Map();
    this.baseModules = /* @__PURE__ */ new Map();
    this.moduleLoaders = /* @__PURE__ */ new Map();
    this.env = {};
    if (modules) {
      for (const [moduleName, module] of modules) {
        this.registerModule(moduleName, module);
      }
    }
  }
  async run(filePath, env = {}, file) {
    if (typeof file === "string") {
      file = new File([file], basename(filePath));
    }
    const module = await this.eval(filePath, env, file);
    return module;
  }
  clearCache() {
    this.evaluatedModules.clear();
  }
  registerModule(moduleName, module) {
    this.baseModules.set(moduleName, module);
  }
  deleteModule(moduleName) {
    this.baseModules.delete(moduleName);
  }
  addModuleLoader(fileExtension, loader) {
    this.baseModules.set(fileExtension, loader);
  }
  async eval(filePath, env, file) {
    const evaluatedModule = this.evaluatedModules.get(filePath);
    if (evaluatedModule)
      return evaluatedModule;
    const fileDirName = dirname(filePath);
    if (!file)
      file = await this.readFile(filePath).catch(() => void 0);
    if (!file)
      throw new Error(`File "${filePath}" not found`);
    const fileContent = await file.text();
    const transformedSource = await this.transformSource(
      filePath,
      fileContent
    );
    const module = {};
    try {
      await this.runSrc(
        transformedSource,
        Object.assign({}, env, {
          ___module: module,
          ___require: (moduleName) => this.require(moduleName, fileDirName, env)
        })
      );
    } catch (err) {
      throw new Error(`Error in ${filePath}: ${err}`);
    }
    this.evaluatedModules.set(filePath, module);
    return module;
  }
  async transformSource(filePath, fileContent) {
    const syntax = filePath.endsWith(".js") ? "ecmascript" : "typescript";
    if (loadedWasm === null && !isNode) {
      throw new Error(
        `You must call initRuntimes() before using the runtime`
      );
    }
    await loadedWasm;
    let transpiledSource = minifySync(
      transformSync(fileContent, {
        filename: basename(filePath),
        jsc: {
          parser: {
            syntax,
            preserveAllComments: false,
            topLevelAwait: true
          },
          target: "es2020"
        }
      }).code,
      { compress: false, mangle: false, format: { beautify: true } }
    ).code;
    const { type, body } = parseSync(transpiledSource, {
      syntax,
      target: "es2022"
    });
    const transformOffset = body[0].span.start;
    return transform(transpiledSource, body, transformOffset);
  }
  async require(moduleName, baseDir, env) {
    const baseModule = this.baseModules.get(moduleName);
    if (baseModule) {
      if (typeof baseModule === "string") {
        const file = new File([baseModule], moduleName);
        return await this.eval(moduleName, env, file);
      } else if (typeof baseModule === "function") {
        return await baseModule();
      } else {
        return baseModule;
      }
    }
    if (moduleName.startsWith("https://")) {
      const response = await fetch(moduleName);
      const file = new File([await response.blob()], moduleName);
      return await this.eval(moduleName, env, file);
    }
    if (moduleName.startsWith("."))
      moduleName = join(baseDir, moduleName);
    const extension = extname(moduleName);
    if (extension === ".json") {
      const fileContent = await this.readFile(moduleName).then((file) => file.text()).catch(() => void 0);
      if (fileContent) {
        let json = {};
        try {
          json = json5.parse(fileContent);
        } catch {
          throw new Error(
            `File "${moduleName}" contains invalid JSON`
          );
        }
        return new Module(json, json);
      }
    }
    const customLoader = this.moduleLoaders.get(extension);
    if (customLoader) {
      const cachedModule = this.evaluatedModules.get(moduleName);
      if (cachedModule)
        return cachedModule;
      const module = customLoader(moduleName);
      if (module instanceof Module) {
        this.evaluatedModules.set(moduleName, module);
        return module;
      } else {
        return await this.eval(moduleName, env, module);
      }
    }
    const extensions = [".ts", ".js"];
    for (const ext of extensions) {
      const filePath = `${moduleName}${ext}`;
      let fileContent = await this.readFile(filePath).catch(
        () => void 0
      );
      if (!fileContent)
        continue;
      return await this.eval(filePath, env, fileContent);
    }
    throw new Error(`Module "${moduleName}" not found`);
  }
  async runSrc(src, env) {
    return new Function(
      ...Object.keys(env),
      `return (async () => {
${src}
})()`
    )(...Object.values(env));
  }
}
let loadedWasm = null;
function initRuntimes(initUrl) {
  loadedWasm = init(initUrl).then(() => null);
}
export { Module, Runtime, initRuntimes, loadedWasm };
