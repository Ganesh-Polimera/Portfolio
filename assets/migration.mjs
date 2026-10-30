import { compareInventories, validateInventory } from '../projects/migration-assurance/compare.mjs';
import { csv } from '../projects/processdesk/workflow.mjs';
import { $, element, download } from './demo-shared.mjs';
const samples = { source: [{siteKey:'it',listKey:'documents',itemCount:138},{siteKey:'it',listKey:'tasks',itemCount:42},{siteKey:'hr',listKey:'policies',itemCount:18}], destination: [{siteKey:'it',listKey:'documents',itemCount:105},{siteKey:'it',listKey:'tasks',itemCount:42},{siteKey:'finance',listKey:'archive',itemCount:9}] };
let inventories = structuredClone(samples), results = [];
function feedback(message, error = false) { $('#feedback').textContent = message; $('#feedback').classList.toggle('error', error); }
function render() {
  const metrics = $('#metrics'); metrics.replaceChildren();
  [['Inventories checked', results.length], ['Matched', results.filter(r=>r.status==='Matched').length], ['Exceptions', results.filter(r=>r.status!=='Matched').length], ['Missing at destination', results.filter(r=>r.status==='Missing').length]].forEach(([name,count])=>{const m=element('div',undefined,'metric');m.append(element('strong',count),element('span',name));metrics.append(m);});
  const body = $('#report'); body.replaceChildren();
  const visible = results.filter(r=>!$('#only-exceptions').checked || r.status!=='Matched');
  if (!visible.length) { const tr=element('tr'),td=element('td','No records to display.');td.colSpan=5;tr.append(td);body.append(tr); }
  visible.forEach(r=>{const tr=element('tr');tr.append(element('td',`${r.siteKey} / ${r.listKey}`),element('td',r.sourceCount??'—'),element('td',r.destinationCount??'—'),element('td',r.gap??'—'));const status=element('td');status.append(element('span',r.status,`status ${r.status.toLowerCase()}`));tr.append(status);body.append(tr);});
}
function run() { try { if (!inventories.source || !inventories.destination) throw new Error('Upload a valid source and destination inventory first.'); results=compareInventories(inventories.source,inventories.destination);feedback(`${results.length} inventories compared; ${results.filter(r=>r.status!=='Matched').length} exceptions require review.`);render(); } catch(e) { results=[]; render();feedback(e.message,true); } }
for (const side of ['source','destination']) {
  let uploadVersion = 0;
  $('#'+side).addEventListener('change', async event => {
    const version = ++uploadVersion, file=event.target.files[0];
    inventories[side]=null;results=[];render();
    if (!file) {$('#'+side+'-name').textContent='No inventory loaded';return;}
    try { if(file.size>2*1024*1024)throw new Error('File exceeds the 2 MB limit.'); const parsed=JSON.parse(await file.text());validateInventory(parsed);if(version!==uploadVersion)return;inventories[side]=parsed;$('#'+side+'-name').textContent=`${file.name}: ${parsed.length} records ready`;feedback('File loaded. Run comparison to refresh the report.'); }
    catch(e) { if(version!==uploadVersion)return;$('#'+side+'-name').textContent='No valid inventory loaded';feedback(`${side}: ${e.message}`,true); }
  });
}
$('#compare').addEventListener('click',run);$('#only-exceptions').addEventListener('change',render);
$('#export').addEventListener('click',()=>{if(!results.length)return feedback('Run a comparison with at least one record before exporting.',true);download('migration-validation.csv',csv(results,['siteKey','listKey','sourceCount','destinationCount','gap','status']));});
$('#sample').addEventListener('click',()=>{inventories=structuredClone(samples);['source','destination'].forEach(side=>{$('#'+side).value='';$('#'+side+'-name').textContent=`Synthetic sample ${side} loaded`;});$('#only-exceptions').checked=false;run();});run();
