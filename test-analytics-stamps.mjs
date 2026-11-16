import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL(`./${p}`, import.meta.url), 'utf8');
const [html,css,analytics,access,dashboards,events,sql,prepare,manifest] = await Promise.all([
  read('index.html'),read('yucapass.css'),read('analytics.js'),read('access.js'),read('dashboards.js'),read('events.js'),read('MIGRACION_V4_3_REGISTRO_HOTELES.sql'),read('prepare-web.mjs'),read('manifest.webmanifest')
]);
assert.match(html,/data-action="toggle-menu"/);
assert.match(html,/data-action="go-back"/);
assert.match(html,/mobile-menu-backdrop/);
assert.match(css,/body\.mobile-menu-open \.sidebar/);
assert.match(analytics,/captureIncomingStampLink/);
assert.match(analytics,/claim_visit_stamp/);
assert.match(access,/visit_stamp_claims/);
assert.match(dashboards,/issue_visit_stamp_link/);
assert.match(dashboards,/get_yucapass_analytics/);
assert.match(events,/partner-stamp-link-form/);
assert.match(events,/popstate/);
for (const rpc of ['track_yucapass_event','claim_visit_stamp','issue_visit_stamp_link','get_yucapass_analytics','record_yucapass_financial_entry']) assert.match(`${analytics}\n${dashboards}`,new RegExp(rpc));
assert.match(prepare,/yucapass\.css/);
assert.match(manifest,/#062d46/);
console.log('OK: menú móvil, sellos por enlace, analítica, contabilidad y bundle modular.');
