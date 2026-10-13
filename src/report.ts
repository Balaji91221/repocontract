import type { CheckResult } from "./index.ts";
export function renderReport(report: CheckResult): string {
  const validEdge = (e: any) =>
    e &&
    typeof e.from === "string" &&
    typeof e.to === "string" &&
    Number.isInteger(e.line) &&
    e.line > 0 &&
    typeof e.specifier === "string";
  if (
    !report ||
    report.schemaVersion !== 1 ||
    typeof report.complete !== "boolean" ||
    !Number.isInteger(report.files) ||
    report.files < 0 ||
    !Array.isArray(report.edges) ||
    !report.edges.every(validEdge) ||
    !Array.isArray(report.violations) ||
    !report.violations.every(
      (v) =>
        v &&
        typeof v.ruleId === "string" &&
        typeof v.reason === "string" &&
        (v.reference === undefined || typeof v.reference === "string") &&
        validEdge(v.edge),
    ) ||
    !Array.isArray(report.errors) ||
    !report.errors.every(
      (e) => e && typeof e.file === "string" && typeof e.message === "string",
    ) ||
    (report.complete && report.errors.length)
  )
    throw new Error("Invalid architecture report");
  const data = JSON.stringify(report)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RepoContract architecture report</title><style>body{font:16px system-ui;background:#f5f7fa;color:#152238;margin:0}main{max-width:1100px;margin:32px auto;padding:24px}h1{font-size:32px}input,button{font:inherit;padding:10px;border:1px solid #bac5d5;border-radius:6px}article{background:white;padding:18px;margin:12px 0;border-radius:8px;border-left:4px solid #3458a8}pre{white-space:pre-wrap;overflow-wrap:anywhere}.error{color:#a21c32}svg{background:white;width:100%;height:400px;border-radius:10px}text{font:12px system-ui}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:8px;border-bottom:1px solid #ddd}</style><main><h1>Architecture check</h1><p id="summary"></p><label>Filter paths or rule IDs <input id="query" placeholder="src/routes"></label><h2>Dependencies</h2><svg id="graph" role="img" aria-label="Dependency graph"></svg><h2>Violations</h2><section id="violations"></section><h2>Analysis errors</h2><section id="errors"></section></main><script type="application/json" id="data">${data}</script><script>
 const report=JSON.parse(document.querySelector('#data').textContent);document.querySelector('#summary').textContent=(report.complete?'Complete':'Incomplete')+' scan • '+report.files+' files • '+report.violations.length+' violations';
 function render(){const q=document.querySelector('#query').value.toLowerCase();const container=document.querySelector('#violations');container.replaceChildren();for(const v of report.violations){if(!JSON.stringify(v).toLowerCase().includes(q))continue;const a=document.createElement('article');const title=document.createElement('strong');title.textContent=v.ruleId;const p=document.createElement('p');p.textContent=v.reason;const code=document.createElement('pre');code.textContent=v.edge.from+':'+v.edge.line+' → '+v.edge.to+(v.reference?'\\nDecision: '+v.reference:'');a.append(title,p,code);container.append(a);}if(!container.children.length)container.textContent='No matching violations.';
 const edges=report.edges.filter(e=>(e.from+' '+e.to).toLowerCase().includes(q)).slice(0,100);const names=[...new Set(edges.flatMap(e=>[e.from,e.to]))];const svg=document.querySelector('#graph');svg.replaceChildren();svg.setAttribute('viewBox','0 0 1000 '+Math.max(400,names.length*32));const positions=new Map(names.map((n,i)=>[n,{x:i%2?650:40,y:30+i*30}]));const add=(kind,attrs,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',kind);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text)e.textContent=text;svg.append(e);};for(const e of edges){const a=positions.get(e.from),b=positions.get(e.to);add('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#a8b8d8'});}for(const[n,p]of positions){add('circle',{cx:p.x,cy:p.y,r:4,fill:'#234fb0'});add('text',{x:p.x+8,y:p.y-6},n);} }
 for(const err of report.errors){const p=document.createElement('p');p.className='error';p.textContent=err.file+': '+err.message;document.querySelector('#errors').append(p);}document.querySelector('#query').addEventListener('input',render);render();
 </script></html>`;
}
