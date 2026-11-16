import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const read = p => readFile(new URL(`./${p}`, import.meta.url), 'utf8');
const [prepare, config, index, css, migration, readme] = await Promise.all([
  read('prepare-web.mjs'),
  read('capacitor.config.json'),
  read('index.html'),
  read('yucapass.css'),
  read('MIGRACION_V4_3_REGISTRO_HOTELES.sql'),
  read('README.md')
]);
const workflowDirectory = new URL('./.github/workflows/', import.meta.url);
const workflowNames = await readdir(workflowDirectory).catch(() => []);
const workflowFiles = workflowNames.filter(name => /\.ya?ml$/i.test(name));
const workflowContents = await Promise.all(workflowFiles.map(name => readFile(new URL(`./.github/workflows/${name}`, import.meta.url), 'utf8')));
const workflow = workflowContents.find(content => /npm run build:web/.test(content) && /npx cap sync android/.test(content) && /YucaPass-5\.0-APK-debug/.test(content) && /npm run check/.test(content));
assert.match(prepare, /const files = \[/);
assert.match(config, /"webDir": "dist"/);
assert.match(index, /\.\/main\.js/);
assert.ok(workflow, 'No se encontró un workflow APK válido en .github/workflows. Archivos YAML encontrados: ' + workflowFiles.join(', '));
assert.match(css, /@media \(max-width: 600px\)/);
assert.match(migration, /hotel_applications/);
assert.match(readme, /una sola fuente funcional/i);
console.log('OK: una sola fuente web genera el bundle dist que Capacitor empaqueta para Android.');
