(function(o,f){typeof exports=="object"&&typeof module!="undefined"?f(exports,require("@swc/wasm-web"),require("path-browserify"),require("magic-string"),require("json5")):typeof define=="function"&&define.amd?define(["exports","@swc/wasm-web","path-browserify","magic-string","json5"],f):(o=typeof globalThis!="undefined"?globalThis:o||self,f(o.BridgeJsRuntime={},o.init,o.pathBrowserify,o.MagicString,o.json5))})(this,function(o,f,p,v,m){"use strict";function _(u){return u&&typeof u=="object"&&"default"in u?u:{default:u}}var M=_(f),$=_(v),g=_(m);function b(u,t,r=0){const i=new $.default(u),n=(e,s,a)=>i.overwrite(e-r,s-r,a),d=(e,s)=>i.slice(e-r,s-r);let c="";return t.forEach(e=>{if(e.type==="ExportDefaultDeclaration")n(e.span.start,e.span.end,`
___module.__default__ = ${d(e.decl.span.start,e.decl.span.end)};`);else if(e.type==="ExportDefaultExpression")n(e.span.start,e.span.end,`
___module.__default__ = ${d(e.expression.span.start,e.expression.span.end)};`);else if(e.type==="ExportDeclaration")n(e.span.start,e.span.end,d(e.declaration.span.start,e.declaration.span.end)),e.declaration.type==="ClassDeclaration"||e.declaration.type==="FunctionDeclaration"?c+=`
___module.${e.declaration.identifier.value} = ${e.declaration.identifier.value};`:e.declaration.type==="VariableDeclaration"&&e.declaration.declarations.forEach(s=>{c+=`
___module.${s.id.value} = ${s.id.value};`});else if(e.type==="ExportNamedDeclaration"){let s="";for(const{orig:a,exported:l}of e.specifiers)l.value==="default"?s+=`
___module.__default__ = ${a.value};`:s+=`
___module.${l.value} = ${a.value};`;n(e.span.start,e.span.end,s)}else if(e.type==="ImportDeclaration")if(e.specifiers.length===1&&e.specifiers[0].type==="ImportNamespaceSpecifier")n(e.span.start,e.span.end,`
const ${e.specifiers[0].local.value} = await ___require(${e.source.raw});`);else{const s=[];e.specifiers.forEach(l=>{l.type==="ImportDefaultSpecifier"?s.push(`__default__: ${l.local.value}`):l.type==="ImportSpecifier"&&(l.imported||(l.imported=l.local),s.push(`${l.imported.value}: ${l.local.value}`))});const a=s.length===0?`
await ___require(${e.source.raw});`:`
const {${s.join(", ")}} = await ___require(${e.source.raw});`;n(e.span.start,e.span.end,a)}}),i.toString()+c}class y{constructor(t,r){this.__default__=t;for(const[i,n]of Object.entries(r))this[i]=n}}const j=typeof process!="undefined"&&process.release.name==="node";class E{constructor(t){if(this.evaluatedModules=new Map,this.baseModules=new Map,this.moduleLoaders=new Map,this.env={},t)for(const[r,i]of t)this.registerModule(r,i)}async run(t,r={},i){return await this.eval(t,r,i)}clearCache(){this.evaluatedModules.clear()}registerModule(t,r){this.baseModules.set(t,r)}deleteModule(t){this.baseModules.delete(t)}addModuleLoader(t,r){this.baseModules.set(t,r)}async eval(t,r,i){const n=this.evaluatedModules.get(t);if(n)return n;const d=p.dirname(t),c=t.endsWith(".js")?"ecmascript":"typescript";if(i||(i=await this.readFile(t).catch(()=>{})),!i)throw new Error(`File "${t}" not found`);if(o.loadedWasm===null&&!j)throw new Error("You must call initRuntimes() before using the runtime");await o.loadedWasm;let e=f.minifySync(f.transformSync(i,{filename:p.basename(t),jsc:{parser:{syntax:c,preserveAllComments:!1,topLevelAwait:!0},target:"es2020"}}).code,{compress:!1,mangle:!1,format:{beautify:!0}}).code;const{type:s,body:a}=f.parseSync(e,{syntax:c,target:"es2022"}),l=a[0].span.start,x=b(e,a,l),h={};try{await this.runSrc(x,Object.assign({},r,{___module:h,___require:w=>this.require(w,d,r)}))}catch(w){throw new Error(`Error in ${t}: ${w}`)}return this.evaluatedModules.set(t,h),h}async require(t,r,i){const n=this.baseModules.get(t);if(n)return typeof n=="function"?await n():n;if(t.startsWith("https://")){const a=await(await fetch(t)).text();return await this.eval(t,i,a)}t.startsWith(".")&&(t=p.join(r,t));const d=p.extname(t);if(d===".json"){const s=await this.readFile(t).catch(()=>{});if(s){let a={};try{a=g.default.parse(s)}catch{throw new Error(`File "${t}" contains invalid JSON`)}return new y(a,a)}}const c=this.moduleLoaders.get(d);if(c){const s=this.evaluatedModules.get(t);if(s)return s;const a=c(t);return typeof a=="string"?await this.eval(t,i,a):(this.evaluatedModules.set(t,a),a)}const e=[".ts",".js"];for(const s of e){const a=`${t}${s}`;let l=await this.readFile(a).catch(()=>{});if(!!l)return await this.eval(a,i,l)}throw new Error(`Module "${t}" not found`)}async runSrc(t,r){return new Function(...Object.keys(r),`return (async () => {
${t}
})()`)(...Object.values(r))}}o.loadedWasm=null;function S(u){o.loadedWasm=M.default(u).then(()=>null)}o.Module=y,o.Runtime=E,o.initRuntimes=S,Object.defineProperties(o,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}})});
