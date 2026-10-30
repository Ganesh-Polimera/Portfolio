import { createRequest, transition, csv } from '../projects/processdesk/workflow.mjs';
import { $, element, download } from './demo-shared.mjs';
const key = 'ganesh-processdesk-v1';
const fixed = '2026-10-25T14:00:00.000Z';
function sample() {
  const a = createRequest({ title: 'New team workspace', description: 'Create a collaboration space for the project team.', category: 'Collaboration', priority: 'Normal' }, fixed, 'DEMO-001');
  const b = createRequest({ title: 'Library access review', description: 'Review existing library access with the business owner.', category: 'Access', priority: 'High' }, fixed, 'DEMO-002');
  const c = createRequest({ title: 'Monthly report automation', description: 'Automate monthly status reporting for service owners.', category: 'Automation', priority: 'Normal' }, fixed, 'DEMO-003');
  return [a, transition(b, 'approve', 'Owner confirmed access requirements.', fixed), transition(c, 'reject', 'Clarify the report requirements first.', fixed)];
}
function validStored(r) { return r && typeof r.id === 'string' && typeof r.title === 'string' && typeof r.description === 'string' && typeof r.category === 'string' && typeof r.priority === 'string' && typeof r.reviewer === 'string' && ['Pending','Approved','Rejected','Escalated'].includes(r.status) && Array.isArray(r.history) && r.history.every(h => typeof h.at === 'string' && typeof h.event === 'string' && typeof h.actor === 'string'); }
let rows = sample();
try { const stored = JSON.parse(localStorage.getItem(key)); if (Array.isArray(stored) && stored.length <= 1000 && stored.every(validStored)) rows = stored; } catch { /* Keep demo usable when browser storage is unavailable. */ }
function feedback(message, error = false) { $('#feedback').textContent = message; $('#feedback').classList.toggle('error', error); }
function persist() { try { localStorage.setItem(key, JSON.stringify(rows)); } catch { feedback('Browser storage is unavailable. Changes work for this session only.'); } }
function render() {
  const metrics = $('#metrics'); metrics.replaceChildren();
  [['Total requests', rows.length], ['Awaiting approval', rows.filter(r => r.status === 'Pending').length], ['Approved', rows.filter(r => r.status === 'Approved').length], ['Escalated', rows.filter(r => r.status === 'Escalated').length]].forEach(([title, count]) => { const m = element('div', undefined, 'metric'); m.append(element('strong', count), element('span', title)); metrics.append(m); });
  const queue = $('#queue'); queue.replaceChildren();
  const term = $('#search').value.toLowerCase(), filter = $('#filter').value;
  const visible = rows.filter(r => `${r.title} ${r.category}`.toLowerCase().includes(term) && (filter === 'All statuses' || r.status === filter));
  if (!visible.length) queue.append(element('p', 'No requests match your filters.', 'empty'));
  visible.forEach(r => {
    const card = element('article', undefined, 'request'), head = element('div', undefined, 'request-head');
    head.append(element('h3', r.title), element('span', r.status, `status ${r.status.toLowerCase()}`));
    card.append(head, element('div', `${r.category} · ${r.priority} priority · ${r.reviewer}`, 'request-meta'), element('p', r.description));
    if (r.status === 'Pending') {
      const label = element('label', 'Decision note (required to reject)'); label.htmlFor = `note-${r.id}`;
      const note = element('input'); note.id = `note-${r.id}`; note.maxLength = 500; note.placeholder = 'Add context for the requester';
      const actions = element('div', undefined, 'request-buttons');
      [['approve', 'Approve', ''], ['reject', 'Reject', 'deny'], ['timeout', 'Simulate timeout', 'timeout']].forEach(([action, title, cls]) => {
        const b = element('button', title, cls); b.type = 'button';
        b.addEventListener('click', () => { try { const current = rows.find(x => x.id === r.id); const updated = transition(current, action, note.value); rows = rows.map(x => x.id === r.id ? updated : x); feedback(`${r.title}: ${updated.status}.`); persist(); render(); } catch(e) { feedback(e.message, true); } }); actions.append(b);
      }); card.append(label, note, actions);
    }
    const audit = element('details', undefined, 'audit'), list = element('ol'); audit.append(element('summary', `View history (${r.history.length} events)`));
    r.history.forEach(h => { const li = element('li', h.event); li.append(element('small', `${h.actor} · ${new Date(h.at).toLocaleString()}`)); list.append(li); }); audit.append(list); card.append(audit); queue.append(card);
  });
}
$('#intake').addEventListener('submit', event => { event.preventDefault(); if (rows.length >= 1000) return feedback('Demo limit reached. Export your data and reset to continue.', true); try { const request = createRequest(Object.fromEntries(new FormData(event.target))); rows.unshift(request); event.target.reset(); $('#search').value = ''; $('#filter').value = 'All statuses'; feedback(`Request submitted to ${request.reviewer}.`); persist(); render(); } catch(e) { feedback(e.message, true); } });
$('#filter').addEventListener('change', render); $('#search').addEventListener('input', render);
$('#export').addEventListener('click', () => download('processdesk-requests.csv', csv(rows, ['id','title','category','priority','reviewer','status','created','updated'])));
$('#reset').addEventListener('click', () => { if (confirm('Replace this browser’s demo requests with the three sample records?')) { rows = sample(); $('#search').value = ''; $('#filter').value = 'All statuses'; feedback('Sample data restored.'); persist(); render(); } });
render();
