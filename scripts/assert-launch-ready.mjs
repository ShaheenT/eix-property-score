import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('test-results/results.json','utf8'));let failed=0;
for(const suite of data.suites||[])for(const spec of suite.specs||[])for(const test of spec.tests||[])for(const r of test.results||[])if(['failed','timedOut','interrupted'].includes(r.status))failed++;
process.exitCode=failed?1:0;
