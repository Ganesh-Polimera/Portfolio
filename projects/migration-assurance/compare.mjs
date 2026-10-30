export function validateInventory(data) {
  if (!Array.isArray(data) || data.length > 10000) throw new Error('Inventory must be a JSON array with up to 10,000 records.');
  const seen = new Set();
  return data.map((row, i) => {
    if (!row || typeof row.siteKey !== 'string' || !row.siteKey.trim() || typeof row.listKey !== 'string' || !row.listKey.trim()) throw new Error(`Record ${i + 1}: siteKey and listKey must be non-empty strings.`);
    if (!Number.isSafeInteger(row.itemCount) || row.itemCount < 0) throw new Error(`Record ${i + 1}: itemCount must be a non-negative safe integer.`);
    const siteKey = row.siteKey.trim().toLowerCase(), listKey = row.listKey.trim().toLowerCase();
    const key = JSON.stringify([siteKey, listKey]);
    if (seen.has(key)) throw new Error(`Duplicate inventory key: ${siteKey} / ${listKey}.`);
    seen.add(key);
    return { siteKey, listKey, itemCount: row.itemCount };
  });
}
export function compareInventories(source, destination) {
  const a = validateInventory(source), b = validateInventory(destination);
  const key = r => JSON.stringify([r.siteKey, r.listKey]);
  const src = new Map(a.map(r => [key(r), r])), dst = new Map(b.map(r => [key(r), r]));
  return [...new Set([...src.keys(), ...dst.keys()])].sort().map(k => {
    const s = src.get(k), d = dst.get(k), r = s || d;
    return { siteKey: r.siteKey, listKey: r.listKey, sourceCount: s?.itemCount ?? null, destinationCount: d?.itemCount ?? null, gap: s && d ? s.itemCount - d.itemCount : null, status: !s ? 'Extra' : !d ? 'Missing' : s.itemCount === d.itemCount ? 'Matched' : 'Mismatch' };
  });
}
