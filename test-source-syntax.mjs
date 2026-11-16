import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const files = [
  'main.js','events.js','pages.js','dashboards.js','data.js','reservations.js',
  'storage.js','supabase-client.js','supabase-config.js','access.js','analytics.js','prepare-web.mjs'
];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${file}: ${result.stderr || result.stdout}`);
}
console.log(`OK: sintaxis de ${files.length} archivos JavaScript planos.`);
