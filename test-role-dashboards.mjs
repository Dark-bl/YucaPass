import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL(`./${p}`, import.meta.url), 'utf8');
const [html,pages,dashboards,access,events,sql] = await Promise.all([
  read('index.html'),read('pages.js'),read('dashboards.js'),read('access.js'),read('events.js'),read('MIGRACION_V4_3_REGISTRO_HOTELES.sql')
]);
for (const role of ['public','admin','hotel','partner','staff','account']) assert.match(html,new RegExp(`data-role-nav="${role}"`));
assert.match(pages,/\['admin','superadmin'\]/);
assert.match(pages,/isPublic=\['visitor','guest','admin','superadmin'\]/);
assert.match(dashboards,/context\.adminRole === 'superadmin'/);
assert.match(events,/staff-login-form/);
assert.match(events,/guest-signup-form/);
assert.match(access,/select\('user_id,admin_role'\)/);
assert.match(sql,/private\.is_superadmin/);
console.log('OK: navegación pública, perfiles de servicio y jerarquía administrativa modular.');
