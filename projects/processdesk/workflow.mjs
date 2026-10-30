export const ROUTES = Object.freeze({ Access: 'Access Reviewer', Collaboration: 'Site Owner', Automation: 'Automation Lead' });
function requestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  // Preview servers can use HTTP, where randomUUID is unavailable. IDs are demo identifiers, not credentials.
  const bytes = new Uint32Array(4);
  if (typeof globalThis.crypto?.getRandomValues === 'function') { globalThis.crypto.getRandomValues(bytes); return 'REQ-' + [...bytes].map(x => x.toString(16).padStart(8, '0')).join(''); }
  return 'REQ-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
export function createRequest(input, now = new Date().toISOString(), id = requestId()) {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  if (title.length < 5 || title.length > 100) throw new Error('Use a title between 5 and 100 characters.');
  if (description.length < 10 || description.length > 2000) throw new Error('Describe the request in 10 to 2,000 characters.');
  if (!Object.hasOwn(ROUTES, input.category)) throw new Error('Choose a valid category.');
  if (!['Normal', 'High'].includes(input.priority)) throw new Error('Choose a valid priority.');
  return { id, title, description, category: input.category, priority: input.priority, reviewer: ROUTES[input.category], status: 'Pending', created: now, updated: now, history: [{ at: now, event: 'Submitted', actor: 'Demo requester' }, { at: now, event: `Routed to ${ROUTES[input.category]}`, actor: 'Demo routing engine' }] };
}
export function transition(request, action, comment = '', now = new Date().toISOString()) {
  if (request.status !== 'Pending') throw new Error('This request already has an outcome. Reset sample data to start again.');
  const states = { approve: 'Approved', reject: 'Rejected', timeout: 'Escalated' };
  if (!Object.hasOwn(states, action)) throw new Error('Unknown action.');
  if (action === 'reject' && !comment.trim()) throw new Error('Add a reason before rejecting the request.');
  return { ...request, status: states[action], updated: now, history: [...request.history, { at: now, event: action === 'timeout' ? 'Approval SLA elapsed; escalated for manual review' : `${states[action]}${comment.trim() ? ': ' + comment.trim().slice(0, 500) : ''}`, actor: action === 'timeout' ? 'Demo timeout engine' : request.reviewer }] };
}
export function csv(rows, headers) {
  const escape = value => {
    let s = String(value ?? '');
    if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [headers.map(escape).join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\r\n');
}
