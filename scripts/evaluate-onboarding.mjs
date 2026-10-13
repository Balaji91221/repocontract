import {readFile} from 'node:fs/promises';
import {proposeRules} from '../dist/index.js';
const cases=JSON.parse(await readFile(new URL('../examples/onboarding/held-out.json',import.meta.url),'utf8'));
let failures=0;for(const c of cases){const p=await proposeRules(c.document,`fixture-${c.id}.md`);const edges=p.rules.map(r=>[r.from,...r.forbid]);const passed=JSON.stringify(edges)===JSON.stringify(c.edges)&&p.unhandled.length===c.unhandled;console.log(`${passed?'PASS':'FAIL'} ${c.id}`);if(!passed)failures++;}
console.log(`${cases.length-failures}/${cases.length} held-out template cases passed`);process.exitCode=failures?1:0;
