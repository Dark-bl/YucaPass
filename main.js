import { initEvents, refresh } from './events.js';
import { setPage } from './pages.js';
import { initAccessContext, getAccessContext } from './access.js';
import { checkSupabaseConnection, paintSupabaseStatus } from './supabase-client.js';
import { captureIncomingStampLink, initAnalyticsConsent, hasPendingStamp, claimPendingVisitStamp, trackEvent } from './analytics.js';

const incomingStamp = captureIncomingStampLink();
initAnalyticsConsent();
await initAccessContext();
const access = getAccessContext();
const initialRoute = window.location.hash.slice(1).split('?')[0].toLowerCase();
if (access.recoveryMode || initialRoute === 'cuenta') setPage('cuenta');
else if (initialRoute === 'acceso') setPage('acceso');
else if (initialRoute === 'registrar-hotel') setPage('registrar-hotel');
else if (incomingStamp || hasPendingStamp()) setPage('pasaporte');
initEvents();
refresh();
trackEvent('page_view', { screen: incomingStamp ? 'pasaporte_stamp_link' : 'inicio', source: 'app_open' });

// Si el visitante ya tenía una sesión y abrió un enlace de sello, lo validamos.
if (hasPendingStamp() && access.user) {
  claimPendingVisitStamp().then(result => {
    refresh();
    document.dispatchEvent(new CustomEvent('yucapass:toast', {
      detail: { message: `Sello guardado: ${result?.destination_name || 'visita validada'} · +${Number(result?.points_awarded || 0)} puntos.` }
    }));
  }).catch(() => {
    // El sello queda pendiente hasta que el visitante complete su acceso.
  });
}

checkSupabaseConnection().then(paintSupabaseStatus);
document.addEventListener('click', async event => {
  if (event.target.closest('[data-action="supabase-check"]')) paintSupabaseStatus(await checkSupabaseConnection());
});
document.addEventListener('yucapass:access-updated', () => {
  if (hasPendingStamp() && getAccessContext().user) {
    claimPendingVisitStamp().then(result => {
      refresh();
      document.dispatchEvent(new CustomEvent('yucapass:toast', {
        detail: { message: `Sello guardado: ${result?.destination_name || 'visita validada'} · +${Number(result?.points_awarded || 0)} puntos.` }
      }));
    }).catch(() => {});
  }
});


// YucaPass 5.0: instalación PWA y caché limitado a recursos estáticos propios.
let deferredInstallPrompt = null;
const installButton = document.getElementById('pwa-install-button');

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton) installButton.hidden = false;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
  document.dispatchEvent(new CustomEvent('yucapass:toast', {
    detail: { message: 'YucaPass se instaló correctamente en tu dispositivo.' }
  }));
});

document.addEventListener('click', async event => {
  const target = event.target;
  const button = target instanceof Element ? target.closest('#pwa-install-button') : null;
  if (!button) return;
  if (!deferredInstallPrompt) {
    document.dispatchEvent(new CustomEvent('yucapass:toast', {
      detail: { message: 'La instalación no está disponible en este navegador. Usa el menú del navegador y selecciona “Añadir a pantalla de inicio”.' }
    }));
    return;
  }
  try {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice?.outcome === 'accepted' && installButton) installButton.hidden = true;
  } catch (error) {
    console.warn('No se pudo mostrar la instalación de YucaPass:', error?.message || error);
  }
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(error => {
      console.warn('No se pudo registrar el soporte PWA de YucaPass:', error?.message || error);
    });
  }, { once: true });
}
