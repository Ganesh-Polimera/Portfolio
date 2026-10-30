import { readFile, writeFile } from 'node:fs/promises';
import { compareInventories } from './compare.mjs';
const [source, destination, output] = process.argv.slice(2);
if (!source || !destination) { console.error('Usage: node projects/migration-assurance/cli.mjs source.json destination.json [report.json]'); process.exit(2); }
try {
  const results = compareInventories(JSON.parse(await readFile(source, 'utf8')), JSON.parse(await readFile(destination, 'utf8')));
  if (output) await writeFile(output, JSON.stringify(results, null, 2) + '\n');
  console.table(results);
  process.exitCode = results.some(r => r.status !== 'Matched') ? 1 : 0;
} catch (error) { console.error(error.message); process.exitCode = 2; }
