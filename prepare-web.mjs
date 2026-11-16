import { mkdir, rm, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = process.cwd();
const dist = resolve(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const files = [
  'index.html', 'manifest.webmanifest', 'yucapass.css', 'sw.js',
  'access.js',
  'analytics.js',
  'reservations.js',
  'storage.js',
  'supabase-client.js',
  'supabase-config.js',
  'data.js',
  'dashboards.js',
  'events.js',
  'pages.js',
  'main.js',
  'brand-mark.svg',
  'yucapass-emblem.png',
  'yucapass-icon-192.png',
  'yucapass-icon-512.png',
  'yucapass-logo.svg'
];
for (const file of files) {
  await copyFile(resolve(root, file), resolve(dist, file));
}
console.log('YucaPass 5.0.0: fuente única web/PWA/Android lista en dist/.');
