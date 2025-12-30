const fs = require('fs');
const path = require('path');
const reportPath = path.join(__dirname, '..', 'jscpd-report.json', 'jscpd-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('report not found:', reportPath);
  process.exit(2);
}
const raw = fs.readFileSync(reportPath,'utf8');
let data;
try{ data = JSON.parse(raw); }catch(e){ console.error('json parse error', e.message); process.exit(2); }
const duplicates = data.duplicates || [];
duplicates.sort((a,b)=>b.lines - a.lines);
const top = duplicates.slice(0,20);
for (let i=0;i<top.length;i++){
  const d = top[i];
  const f1 = d.firstFile; const f2 = d.secondFile;
  console.log(`${i+1}. lines=${d.lines} format=${d.format} files:`);
  console.log(`   - ${f1.name} [${f1.startLoc.line}-${f1.endLoc.line}]`);
  console.log(`   - ${f2.name} [${f2.startLoc.line}-${f2.endLoc.line}]`);
  const excerpt = (d.fragment||'').replace(/\r\n/g,'\\n');
  const short = excerpt.length>200?excerpt.slice(0,200)+'...':excerpt;
  console.log(`   excerpt: ${short}`);
  console.log('   suggestion:', suggest(d));
  console.log('');
}
function suggest(d){
  // basic heuristics
  if (d.format==='markup' || (d.firstFile.name.includes('coverage')||d.secondFile.name.includes('coverage'))) return 'Generated/coverage HTML duplication — exclude from scans or ignore.';
  if (d.firstFile.name.endsWith('.d.ts') || d.secondFile.name.endsWith('.d.ts')) return 'Type defs duplication — deduplicate by exporting shared types from a single entry.';
  if (d.firstFile.name.includes('__tests__') || d.secondFile.name.includes('__tests__')) return 'Test scaffolding duplication — extract test helpers/fixtures.';
  if (d.lines>30) return 'High duplication — consider extracting shared helper/module, consolidate types, or refactor into a utility.';
  return 'Consider small refactor or helper extraction.';
}
