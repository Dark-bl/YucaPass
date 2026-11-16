import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
const read = name => readFile(new URL(`./${name}`, import.meta.url), 'utf8');
const [html, manifestText, main, sw, prep, packageText, pagesWorkflow] = await Promise.all([
  read('index.html'), read('manifest.webmanifest'), read('main.js'), read('sw.js'),
  read('prepare-web.mjs'), read('package.json'),
  read('.github/workflows/deploy-pages.yml')
]);
const manifest = JSON.parse(manifestText);
const pkg = JSON.parse(packageText);
assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
assert.match(html, /apple-touch-icon/);
assert.match(html, /id="pwa-install-button"/);
assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'));
assert.match(main, /beforeinstallprompt/);
assert.match(main, /serviceWorker\.register\('\.\/sw\.js'/);
assert.match(sw, /url\.origin !== self\.location\.origin/);
assert.doesNotMatch(sw, /supabase\.co|localStorage|sessionStorage/);
assert.match(prep, /'sw\.js'/);
assert.match(prep, /'yucapass-icon-192\.png'/);
assert.match(pagesWorkflow, /upload-pages-artifact/);
assert.match(pagesWorkflow, /deploy-pages/);
assert.equal(pkg.version, '5.0.0');
await stat(new URL('./yucapass-icon-192.png', import.meta.url));
console.log('OK: PWA, manifest, iconos, instalación, caché limitado y despliegue web por GitHub Pages.');
