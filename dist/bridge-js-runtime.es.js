import init, { minifySync, transformSync, parseSync } from "@swc/wasm-web";
import MagicString from "magic-string";
import json5 from "json5";
const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _UNC_REGEX = /^[/\\]{2}/;
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
const normalize = function(path) {
  if (path.length === 0) {
    return ".";
  }
  path = normalizeWindowsPath(path);
  const isUNCPath = path.match(_UNC_REGEX);
  const isPathAbsolute = isAbsolute(path);
  const trailingSeparator = path[path.length - 1] === "/";
  path = normalizeString(path, !isPathAbsolute);
  if (path.length === 0) {
    if (isPathAbsolute) {
      return "/";
    }
    return trailingSeparator ? "./" : ".";
  }
  if (trailingSeparator) {
    path += "/";
  }
  if (_DRIVE_LETTER_RE.test(path)) {
    path += "/";
  }
  if (isUNCPath) {
    if (!isPathAbsolute) {
      return `//./${path}`;
    }
    return `//${path}`;
  }
  return isPathAbsolute && !isAbsolute(path) ? `/${path}` : path;
};
const join = function(...arguments_) {
  if (arguments_.length === 0) {
    return ".";
  }
  let joined;
  for (const argument of arguments_) {
    if (argument && argument.length > 0) {
      if (joined === void 0) {
        joined = argument;
      } else {
        joined += `/${argument}`;
      }
    }
  }
  if (joined === void 0) {
    return ".";
  }
  return normalize(joined.replace(/\/\/+/g, "/"));
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1)
        ;
      else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const _EXTNAME_RE = /.(\.[^./]+)$/;
const extname = function(p) {
  const match = _EXTNAME_RE.exec(normalizeWindowsPath(p));
  return match && match[1] || "";
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};
const basename = function(p, extension) {
  const lastSegment = normalizeWindowsPath(p).split("/").pop();
  return extension && lastSegment.endsWith(extension) ? lastSegment.slice(0, -extension.length) : lastSegment;
};
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
    const transformedSource = await this.transformSource(filePath, fileContent);
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
      throw new Error(`You must call initRuntimes() before using the runtime`);
    }
    await loadedWasm;
    let transpiledSource = minifySync(
      transformSync(fileContent, {
        filename: basename(filePath),
        jsc: {
          parser: {
            syntax,
            topLevelAwait: true
          },
          preserveAllComments: false,
          target: "es2020"
        },
        isModule: true
      }).code,
      { compress: false, mangle: false, format: { beautify: true }, module: true }
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
          throw new Error(`File "${moduleName}" contains invalid JSON`);
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
      let fileContent = await this.readFile(filePath).catch(() => void 0);
      if (!fileContent)
        continue;
      return await this.eval(filePath, env, fileContent);
    }
    throw new Error(`Module "${moduleName}" not found`);
  }
  async runSrc(src, env) {
    return new Function(...Object.keys(env), `return (async () => {
${src}
})()`)(
      ...Object.values(env)
    );
  }
}
let loadedWasm = null;
function initRuntimes(initUrl) {
  loadedWasm = init(initUrl).then(() => null);
}
export { Module, Runtime, initRuntimes, loadedWasm };
