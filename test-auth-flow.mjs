import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL(`./${p}`, import.meta.url), 'utf8');
const [html,pages,dashboards,events,access,main,sql,prepare] = await Promise.all([
  read('index.html'),read('pages.js'),read('dashboards.js'),read('events.js'),read('access.js'),read('main.js'),read('MIGRACION_V4_3_REGISTRO_HOTELES.sql'),read('prepare-web.mjs')
]);
for (const id of ['guest-signup-form','guest-login-form','guest-reset-form','guest-resend-form','account-password-update-form','guest-profile-update-form']) {
  assert.ok(pages.includes(id),`Falta UI de ${id}`);
  assert.ok(events.includes(`form.id==='${id}'`),`Falta handler de ${id}`);
}
assert.ok(dashboards.includes('staff-login-form'));
assert.ok(dashboards.includes('staff-reset-form'));
for (const api of ['signUpGuest','signInWithEmail','signOutUser','requestPasswordReset','updateAccountPassword','resendSignupConfirmation','updateGuestAccountProfile']) assert.ok(access.includes(`export async function ${api}`));
assert.match(access,/ensure_guest_profile/);
assert.match(access,/ensure_guest_profile/);
assert.match(access,/rpc\('ensure_guest_profile'/);
assert.match(sql,/private\.is_superadmin/);
assert.match(access,/updateGuestAccountProfile/);
assert.match(access,/preferred_language/);
assert.doesNotMatch(access,/updated_at: new Date\(\)\.toISOString\(\)/);
assert.match(html,/data-nav="cuenta"/);
assert.match(main,/initialRoute === 'cuenta'/);
assert.match(prepare,/yucapass\.css/);
console.log('OK: creación de cuenta, login/logout, recuperación, edición de perfil y enlace de confirmación.');
