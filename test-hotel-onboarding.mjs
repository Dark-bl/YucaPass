import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const read = p => readFile(new URL(`./${p}`, import.meta.url), 'utf8');

// GitHub Actions admite cualquier nombre de archivo YAML dentro de .github/workflows.
// No fijar la prueba a build-apk.yml: el workflow puede tener otro nombre en el repositorio.
const workflowDirectory = new URL('./.github/workflows/', import.meta.url);
const workflowNames = await readdir(workflowDirectory).catch(() => []);
const workflowFiles = workflowNames.filter(name => /\.ya?ml$/i.test(name));
const workflowContents = await Promise.all(
  workflowFiles.map(name => readFile(new URL(`./.github/workflows/${name}`, import.meta.url), 'utf8'))
);
const workflow = workflowContents.find(content =>
  /npm run build:web/.test(content) &&
  /npx cap sync android/.test(content) &&
  /YucaPass-5\.0-APK-debug/.test(content) &&
  /npm run check/.test(content)
);

const [pages, dashboards, events, migration, verification, html, css, main] = await Promise.all([
  read('pages.js'),
  read('dashboards.js'),
  read('events.js'),
  read('MIGRACION_V4_3_REGISTRO_HOTELES.sql'),
  read('VERIFICAR_V4_3_REGISTRO_HOTELES.sql'),
  read('index.html'),
  read('yucapass.css'),
  read('main.js')
]);
assert.match(pages, /hotelRegistrationPage/);
assert.match(main, /initialRoute === 'registrar-hotel'/);
assert.match(pages, /data-nav="registrar-hotel"/);
assert.match(pages, /id="hotel-application-form"/);
assert.match(pages, /ctx\.role==='superadmin'/);
assert.match(pages, /id="admin-hotel-form"/);
assert.match(pages, /'registrar-hotel'\]\.includes\(currentPage\)/);
assert.match(pages, /hotel-form-feedback/);
assert.match(events, /friendlyHotelApplicationError/);
assert.match(pages, /id="hotel-invite-claim-form"/);
assert.match(dashboards, /my_hotel_applications/);
assert.match(dashboards, /superadmin_list_hotel_applications/);
assert.match(dashboards, /superadmin_review_hotel_application/);
assert.match(dashboards, /superadmin_reissue_hotel_invite/);
assert.match(dashboards, /claim_hotel_onboarding_invite/);
assert.match(events, /admin-review-hotel-application/);
assert.match(events, /copy-hotel-invite-code/);
assert.match(events, /admin-reissue-hotel-invite/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.hotel_applications/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.hotel_onboarding_invites/);
assert.match(migration, /IF NOT private\.is_superadmin\(\)/);
assert.match(migration, /HOTEL_INVITE_ACCOUNT_MISMATCH/);
assert.match(migration, /REVOKE ALL ON TABLE public\.hotel_onboarding_invites/);
assert.match(migration, /admin_role = 'superadmin'/);
assert.match(migration, /superadmin_reissue_hotel_invite/);
assert.match(verification, /hotel_applications/);
assert.match(html, /yucapass\.css/);
assert.match(css, /@media \(max-width: 600px\)/);
assert.ok(
  workflow,
  'No se encontró un workflow APK válido en .github/workflows (debe ejecutar npm run check, npm run build:web, npx cap sync android y publicar YucaPass-v4.3.1-APK-debug). Archivos YAML encontrados: ' + workflowFiles.join(', ')
);
console.log('OK: solicitud pública, revisión de superadmin, código de un uso, activación del dueño y estilo responsive comparten el mismo código web/Android.');
