import init, { parseSync, transformSync } from "@swc/wasm-web";
import { dirname, basename, join } from "path-browserify";
import MagicString from "magic-string";
function transform(jsContent, body, offset = 0) {
  const jsOutput = new MagicString(jsContent);
  const overwrite = (s, e, str) => jsOutput.overwrite(s - offset, e - offset, str);
  const from = (s, e) => jsOutput.slice(s - offset, e - offset);
  const insert = (s, str) => jsOutput.appendRight(s - offset, str);
  body.forEach((node) => {
    if (node.type === "ExportDefaultDeclaration") {
      overwrite(node.span.start, node.span.end, `___module.exports.__default__ = ${from(node.decl.span.start, node.decl.span.end)}`);
    } else if (node.type === "ExportDeclaration") {
      overwrite(node.span.start, node.span.end, from(node.declaration.span.start, node.declaration.span.end));
      if (node.declaration.type === "ClassDeclaration" || node.declaration.type === "FunctionDeclaration") {
        insert(node.span.end, `
___module.exports.${node.declaration.identifier.value} = ${node.declaration.identifier.value}`);
      } else if (node.declaration.type === "VariableDeclaration") {
        node.declaration.declarations.forEach((decl) => {
          insert(node.span.end, `
___module.exports.${decl.id.value} = ${decl.id.value}`);
        });
      }
    } else if (node.type === "ImportDeclaration") {
      if (node.specifiers.length === 1 && node.specifiers[0].type === "ImportNamespaceSpecifier") {
        overwrite(node.span.start, node.span.end, `const ${node.specifiers[0].local.value} = await ___require(${node.source.raw})`);
      } else {
        const allImports = [];
        node.specifiers.forEach((specifier) => {
          if (specifier.type === "ImportDefaultSpecifier") {
            allImports.push(`__default__: ${specifier.local.value}`);
          } else if (specifier.type === "ImportSpecifier") {
            allImports.push(`${specifier.imported.value}: ${specifier.local.value}`);
          }
        });
        overwrite(node.span.start, node.span.end, `const {${allImports.join(", ")}} = await ___require(${node.source.raw})`);
      }
    }
  });
  return jsOutput.toString();
}
const loadedWasm = init().then(() => null);
class Runtime {
  constructor(modules) {
    this.evaluatedModules = /* @__PURE__ */ new Map();
    this.baseModules = /* @__PURE__ */ new Map();
    this.env = {};
    this.init = loadedWasm;
    if (modules) {
      for (const [moduleName, module] of modules) {
        this.registerModule(moduleName, module);
      }
    }
  }
  async run(filePath, env = {}, fileContent) {
    this.env = env;
    const module = await this.eval(filePath, fileContent);
    return module;
  }
  clearCache() {
    this.evaluatedModules.clear();
  }
  registerModule(moduleName, module) {
    this.baseModules.set(moduleName, module);
  }
  async eval(filePath, fileContent) {
    const evaluatedModule = this.evaluatedModules.get(filePath);
    if (evaluatedModule)
      return evaluatedModule;
    const fileDirName = dirname(filePath);
    if (!fileContent)
      fileContent = await this.readFile(filePath).catch(() => void 0);
    if (!fileContent)
      throw new Error(`File "${filePath}" not found`);
    await this.init;
    const { type, body } = parseSync(fileContent, {
      syntax: filePath.endsWith(".js") ? "ecmascript" : "typescript",
      target: "es2022"
    });
    const transformOffset = body[0].span.start;
    const transformedSource = transform(fileContent, body, transformOffset);
    let transpiledSource = transformedSource;
    if (filePath.endsWith(".ts")) {
      transpiledSource = transformSync(transformedSource, {
        filename: basename(filePath),
        jsc: {
          parser: {
            syntax: "typescript"
          },
          target: "es2020"
        }
      }).code;
    }
    const module = { exports: {} };
    try {
      await this.runSrc(transpiledSource, Object.assign({}, this.env, {
        ___module: module,
        ___require: (moduleName) => this.require(moduleName, fileDirName)
      }));
    } catch (err) {
      throw new Error(`Error in ${filePath}: ${err}`);
    }
    this.evaluatedModules.set(filePath, module);
    return module.exports;
  }
  async require(moduleName, baseDir) {
    const baseModule = this.baseModules.get(moduleName);
    if (baseModule)
      return baseModule;
    if (moduleName.startsWith("https://")) {
      const response = await fetch(moduleName);
      const text = await response.text();
      return this.eval(moduleName, text);
    }
    if (moduleName.startsWith("."))
      moduleName = join(baseDir, moduleName);
    const extensions = [".ts", ".js"];
    for (const ext of extensions) {
      const filePath = `${moduleName}${ext}`;
      const fileContent = await this.readFile(filePath).catch(() => void 0);
      if (!fileContent)
        continue;
      return await this.eval(filePath, fileContent);
    }
    throw new Error(`Module "${moduleName}" not found`);
  }
  async runSrc(src, env) {
    return new Function(...Object.keys(env), `return (async () => {
${src}
})()`)(...Object.values(env));
  }
}
export { Runtime };
