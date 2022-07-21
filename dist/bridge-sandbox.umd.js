(function(c,l){typeof exports=="object"&&typeof module!="undefined"?l(exports,require("@swc/wasm"),require("path-browserify"),require("magic-string")):typeof define=="function"&&define.amd?define(["exports","@swc/wasm","path-browserify","magic-string"],l):(c=typeof globalThis!="undefined"?globalThis:c||self,l(c.BridgeSandbox={},c.init,c.pathBrowserify,c.MagicString))})(this,function(c,l,f,y){"use strict";function h(o){return o&&typeof o=="object"&&"default"in o?o:{default:o}}var w=h(l),v=h(y);function g(o,e,r=0){const a=new v.default(o),u=(t,s,n)=>a.overwrite(t-r,s-r,n),p=(t,s)=>a.slice(t-r,s-r),i=(t,s)=>a.appendRight(t-r,s);return e.forEach(t=>{if(t.type==="ExportDefaultDeclaration")u(t.span.start,t.span.end,`___module.exports.__default__ = ${p(t.decl.span.start,t.decl.span.end)}`);else if(t.type==="ExportDeclaration")u(t.span.start,t.span.end,p(t.declaration.span.start,t.declaration.span.end)),t.declaration.type==="ClassDeclaration"||t.declaration.type==="FunctionDeclaration"?i(t.span.end,`
___module.exports.${t.declaration.identifier.value} = ${t.declaration.identifier.value}`):t.declaration.type==="VariableDeclaration"&&t.declaration.declarations.forEach(s=>{i(t.span.end,`
___module.exports.${s.id.value} = ${s.id.value}`)});else if(t.type==="ImportDeclaration")if(t.specifiers.length===1&&t.specifiers[0].type==="ImportNamespaceSpecifier")u(t.span.start,t.span.end,`const ${t.specifiers[0].local.value} = await ___require(${t.source.raw})`);else{const s=[];t.specifiers.forEach(n=>{n.type==="ImportDefaultSpecifier"?s.push(`__default__: ${n.local.value}`):n.type==="ImportSpecifier"&&s.push(`${n.imported.value}: ${n.local.value}`)}),u(t.span.start,t.span.end,`const {${s.join(", ")}} = await ___require(${t.source.raw})`)}}),a.toString()}class m{constructor(e){if(this.evaluatedModules=new Map,this.baseModules=new Map,this.env={},e)for(const[r,a]of e)this.registerModule(r,a)}async run(e,r={}){return this.env=r,await this.eval(e)}clearCache(){this.evaluatedModules.clear()}registerModule(e,r){this.baseModules.set(e,r)}async eval(e,r){const a=this.evaluatedModules.get(e);if(a)return a;const u=f.dirname(e);if(r||(r=await this.readFile(e).catch(()=>{})),!r)throw new Error(`File "${e}" not found`);await w.default;const{type:p,body:i}=l.parseSync(r,{syntax:e.endsWith(".js")?"ecmascript":"typescript",target:"es2022"}),t=i[0].span.start,s=g(r,i,t);let n=s;e.endsWith(".ts")&&(n=l.transformSync(s,{filename:f.basename(e),jsc:{parser:{syntax:"typescript"},target:"es2020"}}).code);const d={exports:{}};try{await this.runSrc(n,Object.assign({},this.env,{___module:d,___require:_=>this.require(_,u)}))}catch(_){throw new Error(`Error in ${e}: ${_}`)}return this.evaluatedModules.set(e,d),d.exports}async require(e,r){const a=this.baseModules.get(e);if(a)return a;if(e.startsWith("https://")){const i=await(await fetch(e)).text();return this.eval(e,i)}e.startsWith(".")&&(e=f.join(r,e));const u=[".ts",".js"];for(const p of u){const i=`${e}${p}`,t=await this.readFile(i).catch(()=>{});if(!!t)return await this.eval(i,t)}throw new Error(`Module "${e}" not found`)}async runSrc(e,r){return new Function(...Object.keys(r),`return (async () => {
${e}
})()`)(...Object.values(r))}}c.Runtime=m,Object.defineProperties(c,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}})});
