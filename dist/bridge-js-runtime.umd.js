(function(u,d){typeof exports=="object"&&typeof module!="undefined"?d(exports,require("@swc/wasm-web"),require("magic-string"),require("json5")):typeof define=="function"&&define.amd?define(["exports","@swc/wasm-web","magic-string","json5"],d):(u=typeof globalThis!="undefined"?globalThis:u||self,d(u.BridgeJsRuntime={},u.init,u.MagicString,u.json5))})(this,function(u,d,m,v){"use strict";function p(n){return n&&typeof n=="object"&&"default"in n?n:{default:n}}var $=p(d),E=p(m),M=p(v);const S=/^[A-Za-z]:\//;function _(n=""){return n&&n.replace(/\\/g,"/").replace(S,e=>e.toUpperCase())}const b=/^[/\\]{2}/,j=/^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/,w=/^[A-Za-z]:$/,x=function(n){if(n.length===0)return".";n=_(n);const e=n.match(b),t=h(n),r=n[n.length-1]==="/";return n=D(n,!t),n.length===0?t?"/":r?"./":".":(r&&(n+="/"),w.test(n)&&(n+="/"),e?t?`//${n}`:`//./${n}`:t&&!h(n)?`/${n}`:n)},R=function(...n){if(n.length===0)return".";let e;for(const t of n)t&&t.length>0&&(e===void 0?e=t:e+=`/${t}`);return e===void 0?".":x(e.replace(/\/\/+/g,"/"))};function D(n,e){let t="",r=0,a=-1,o=0,c=null;for(let s=0;s<=n.length;++s){if(s<n.length)c=n[s];else{if(c==="/")break;c="/"}if(c==="/"){if(!(a===s-1||o===1))if(o===2){if(t.length<2||r!==2||t[t.length-1]!=="."||t[t.length-2]!=="."){if(t.length>2){const i=t.lastIndexOf("/");i===-1?(t="",r=0):(t=t.slice(0,i),r=t.length-1-t.lastIndexOf("/")),a=s,o=0;continue}else if(t.length>0){t="",r=0,a=s,o=0;continue}}e&&(t+=t.length>0?"/..":"..",r=2)}else t.length>0?t+=`/${n.slice(a+1,s)}`:t=n.slice(a+1,s),r=s-a-1;a=s,o=0}else c==="."&&o!==-1?++o:o=-1}return t}const h=function(n){return j.test(n)},T=/.(\.[^./]+)$/,I=function(n){const e=T.exec(_(n));return e&&e[1]||""},O=function(n){const e=_(n).replace(/\/$/,"").split("/").slice(0,-1);return e.length===1&&w.test(e[0])&&(e[0]+="/"),e.join("/")||(h(n)?"/":".")},y=function(n,e){const t=_(n).split("/").pop();return e&&t.endsWith(e)?t.slice(0,-e.length):t};function A(n,e,t=0){const r=new E.default(n),a=(s,i,l)=>r.overwrite(s-t,i-t,l),o=(s,i)=>r.slice(s-t,i-t);let c="";return e.forEach(s=>{if(s.type==="ExportDefaultDeclaration")a(s.span.start,s.span.end,`
___module.__default__ = ${o(s.decl.span.start,s.decl.span.end)};`);else if(s.type==="ExportDefaultExpression")a(s.span.start,s.span.end,`
___module.__default__ = ${o(s.expression.span.start,s.expression.span.end)};`);else if(s.type==="ExportDeclaration")a(s.span.start,s.span.end,o(s.declaration.span.start,s.declaration.span.end)),s.declaration.type==="ClassDeclaration"||s.declaration.type==="FunctionDeclaration"?c+=`
___module.${s.declaration.identifier.value} = ${s.declaration.identifier.value};`:s.declaration.type==="VariableDeclaration"&&s.declaration.declarations.forEach(i=>{c+=`
___module.${i.id.value} = ${i.id.value};`});else if(s.type==="ExportNamedDeclaration"){let i="";for(const{orig:l,exported:f}of s.specifiers)f.value==="default"?i+=`
___module.__default__ = ${l.value};`:i+=`
___module.${f.value} = ${l.value};`;a(s.span.start,s.span.end,i)}else if(s.type==="ImportDeclaration")if(s.specifiers.length===1&&s.specifiers[0].type==="ImportNamespaceSpecifier")a(s.span.start,s.span.end,`
const ${s.specifiers[0].local.value} = await ___require(${s.source.raw});`);else{const i=[];s.specifiers.forEach(f=>{f.type==="ImportDefaultSpecifier"?i.push(`__default__: ${f.local.value}`):f.type==="ImportSpecifier"&&(f.imported||(f.imported=f.local),i.push(`${f.imported.value}: ${f.local.value}`))});const l=i.length===0?`
await ___require(${s.source.raw});`:`
const {${i.join(", ")}} = await ___require(${s.source.raw});`;a(s.span.start,s.span.end,l)}}),r.toString()+c}class g{constructor(e,t){this.__default__=e;for(const[r,a]of Object.entries(t))this[r]=a}}const F=typeof process!="undefined"&&typeof process.release!="undefined"&&process.release.name==="node";class L{constructor(e){if(this.evaluatedModules=new Map,this.baseModules=new Map,this.moduleLoaders=new Map,this.env={},e)for(const[t,r]of e)this.registerModule(t,r)}async run(e,t={},r){return typeof r=="string"&&(r=new File([r],y(e))),await this.eval(e,t,r)}clearCache(){this.evaluatedModules.clear()}registerModule(e,t){this.baseModules.set(e,t)}deleteModule(e){this.baseModules.delete(e)}addModuleLoader(e,t){this.baseModules.set(e,t)}async eval(e,t,r){const a=this.evaluatedModules.get(e);if(a)return a;const o=O(e);if(r||(r=await this.readFile(e).catch(()=>{})),!r)throw new Error(`File "${e}" not found`);const c=await r.text(),s=await this.transformSource(e,c),i={};try{await this.runSrc(s,Object.assign({},t,{___module:i,___require:l=>this.require(l,o,t)}))}catch(l){throw new Error(`Error in ${e}: ${l}`)}return this.evaluatedModules.set(e,i),i}async transformSource(e,t){const r=e.endsWith(".js")?"ecmascript":"typescript";if(u.loadedWasm===null&&!F)throw new Error("You must call initRuntimes() before using the runtime");await u.loadedWasm;let a=d.minifySync(d.transformSync(t,{filename:y(e),jsc:{parser:{syntax:r,topLevelAwait:!0},preserveAllComments:!1,target:"es2020"},isModule:!0}).code,{compress:!1,mangle:!1,format:{beautify:!0},module:!0}).code;const{type:o,body:c}=d.parseSync(a,{syntax:r,target:"es2022"}),s=c[0].span.start;return A(a,c,s)}async require(e,t,r){const a=this.baseModules.get(e);if(a)if(typeof a=="string"){const i=new File([a],e);return await this.eval(e,r,i)}else return typeof a=="function"?await a():a;if(e.startsWith("https://")){const i=await fetch(e),l=new File([await i.blob()],e);return await this.eval(e,r,l)}e.startsWith(".")&&(e=R(t,e));const o=I(e);if(o===".json"){const i=await this.readFile(e).then(l=>l.text()).catch(()=>{});if(i){let l={};try{l=M.default.parse(i)}catch{throw new Error(`File "${e}" contains invalid JSON`)}return new g(l,l)}}const c=this.moduleLoaders.get(o);if(c){const i=this.evaluatedModules.get(e);if(i)return i;const l=c(e);return l instanceof g?(this.evaluatedModules.set(e,l),l):await this.eval(e,r,l)}const s=[".ts",".js"];for(const i of s){const l=`${e}${i}`;let f=await this.readFile(l).catch(()=>{});if(!!f)return await this.eval(l,r,f)}throw new Error(`Module "${e}" not found`)}async runSrc(e,t){return new Function(...Object.keys(t),`return (async () => {
${e}
})()`)(...Object.values(t))}}u.loadedWasm=null;function q(n){u.loadedWasm=$.default(n).then(()=>null)}u.Module=g,u.Runtime=L,u.initRuntimes=q,Object.defineProperties(u,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}})});
