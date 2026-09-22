import fs from 'node:fs';
const input='test-results/results.json', output='playwright-report/LAUNCH-CERTIFICATE.md';
const baseUrl=process.env.BASE_URL||'https://eix-property-score-beta.vercel.app';
if(!fs.existsSync(input)){fs.mkdirSync('playwright-report',{recursive:true});fs.writeFileSync(output,'# EiX Property Score Launch Certificate\n\nStatus: **NOT RUN**\n');process.exit(0);}
const data=JSON.parse(fs.readFileSync(input,'utf8'));let passed=0,failed=0,skipped=0,timedOut=0;
for(const suite of data.suites||[])for(const spec of suite.specs||[]){const rs=(spec.tests||[]).flatMap(t=>t.results||[]);if(!rs.length){skipped++;continue;}const r=rs[rs.length-1];if(r.status==='passed')passed++;else if(r.status==='timedOut'){failed++;timedOut++;}else if(r.status==='skipped')skipped++;else failed++;}
const total=passed+failed+skipped;const status=failed===0&&total>0?'PASS — READY FOR QA SIGN-OFF':'FAIL — NOT READY FOR QA SIGN-OFF';
const text=['# EiX Property Score Launch Certificate','','**Status:** '+status,'**Production URL:** '+baseUrl,'**Generated:** '+new Date().toISOString(),'','| Metric | Result |','|---|---:|','| Tests counted | '+total+' |','| Passed | '+passed+' |','| Failed | '+failed+' |','| Skipped | '+skipped+' |','| Timed out | '+timedOut+' |','','This certificate is generated from the Playwright JSON result and does not represent a real PayFast settlement.'].join('\n');
fs.mkdirSync('playwright-report',{recursive:true});fs.writeFileSync(output,text);console.log(text);
