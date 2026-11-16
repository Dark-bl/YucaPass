import { destinations, categories, areas } from './data.js';
import { getState } from './storage.js';
import { getActiveGuest, getAccountReservations, getAccountLedger, getAccountPoints } from './reservations.js';
import { getAccessContext } from './access.js';
import { renderAccessPage, renderAdminDashboard, renderHotelDashboard, renderPartnerDashboard, hydrateDashboard, hydrateGuestPortal, hydrateRewards, hydratePublicPartners, hydrateHotelOnboarding } from './dashboards.js';
import { hasPendingStamp } from './analytics.js';

export let currentPage = 'inicio';
export let currentFilter = 'Todas';
export let currentQuery = '';
export let currentRegion = 'Todas';
export let favoritesOnly = false;

export const pageTitles = { inicio:'Descubre Yucatán', explorar:'Explorar experiencias', pasaporte:'Mi pasaporte digital', cuenta:'Mi cuenta YucaPass', recompensas:'Recompensas y beneficios', viaje:'Tu experiencia continúa', acceso:'Acceso de servicio YucaPass', 'registrar-hotel':'Registrar mi hotel', admin:'Centro de administración', hotel:'Servicio del hotel', participante:'Servicio del participante' };
export function setPage(page){ currentPage = page; favoritesOnly = false; }
export function setFilter(filter){ currentFilter = filter; }
export function setQuery(query){ currentQuery = query; }
export function setRegion(region){ currentRegion = region; }
export function showFavorites(){ currentPage = 'explorar'; favoritesOnly = true; currentFilter = 'Todas'; currentQuery = ''; currentRegion='Todas'; }
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function heading(kicker,title,description,side=''){
  return `<div class="page-heading"><div><span class="overline">${e(kicker)}</span><h1>${e(title)}</h1><p>${e(description)}</p></div>${side}</div>`;
}
function imageMarkup(item, modal=false){
  return `<div class="${modal?'modal-image':'destination-photo'} ${item.image?'has-image':''}"><div class="photo-fallback">${e(item.symbol)}</div>${item.image?`<img src="${e(item.image)}" alt="${e(item.name)}" loading="lazy" decoding="async" onerror="this.remove();this.parentElement.classList.remove('has-image')">`:''}${item.imageCredit?`<span class="image-credit">Foto: ${e(item.imageCredit)}</span>`:''}${modal?'':'<div class="photo-shade"></div>'}</div>`;
}
export function destinationCard(item, state){
  const saved = state.favorites.includes(item.id);
  return `<article class="destination-card">
    <div class="destination-media">${imageMarkup(item)}<span class="photo-tag">${e(item.category)}</span><button class="save-btn ${saved?'saved':''}" data-action="favorite" data-id="${e(item.id)}" aria-label="${saved?'Quitar de favoritos':'Guardar favorito'}">${saved?'♥':'♡'}</button></div>
    <div class="destination-info">
      <div class="destination-location"><span>⌖</span>${e(item.municipality)} · ${e(item.region)}</div>
      <h3>${e(item.name)}</h3><p>${e(item.description)}</p>
      <div class="destination-meta"><button class="card-open" data-action="details" data-id="${e(item.id)}">Ver experiencia <span>→</span></button></div>
    </div>
  </article>`;
}
function cards(items,state){ return items.map(item=>destinationCard(item,state)).join(''); }
function getFiltered(state){
  const query = currentQuery.trim().toLocaleLowerCase('es-MX');
  return destinations.filter(item=>{
    const matchesCategory = currentFilter==='Todas' || item.category===currentFilter;
    const matchesQuery = !query || [item.name,item.municipality,item.region,item.category,item.type,item.description,...item.tags].join(' ').toLocaleLowerCase('es-MX').includes(query);
    const matchesFavorite = !favoritesOnly || state.favorites.includes(item.id);
    const matchesRegion = currentRegion==='Todas' || item.region===currentRegion;
    return matchesCategory && matchesQuery && matchesFavorite && matchesRegion;
  });
}
function home(state){
  const featured = ['chichen-itza','izamal','celestun'].map(id=>destinations.find(d=>d.id===id)).filter(Boolean);
  const account=getActiveGuest(state);
  const stampPoints=destinations.filter(d=>state.stamps.includes(d.id)).reduce((sum,d)=>sum+d.points,0);
  const points=(account?getAccountPoints(state,account):0)+stampPoints;
  const reservations=account?getAccountReservations(state,account):[];
  const completed=reservations.filter(r=>r.status==='completed').length;
  const welcomeName=account?.guestName||state.profile.name||'Viajero';
  return `<section class="hero-panel"><div class="hero-copy">
      <span class="overline eyebrow-light">YUCATÁN · MÉXICO · CULTURA VIVA</span>
      <h1>Tu viaje deja huella. <em>Yucatán te espera.</em></h1>
      <p>Descubre destinos, conecta con experiencias locales y reúne sellos, puntos y beneficios en un solo pasaporte digital.</p>
      <div class="hero-actions"><button class="btn btn-primary" data-nav="explorar">Explorar experiencias <span>→</span></button><button class="btn btn-secondary" data-nav="pasaporte">${account?'Ver mi pasaporte':'Activar mi pasaporte'}</button></div>
      <div class="hero-stats"><div class="hero-stat"><span class="hero-stat-icon">⌑</span><span><strong>Patrimonio maya</strong><small>Historia y cultura</small></span></div><div class="hero-stat"><span class="hero-stat-icon">♧</span><span><strong>Naturaleza</strong><small>Cenotes, costa y reservas</small></span></div><div class="hero-stat"><span class="hero-stat-icon">✿</span><span><strong>Comunidad</strong><small>Experiencias locales</small></span></div></div>
    </div><div class="hero-aside"><div class="hero-float-card"><div class="hero-float-top"><span>PASAPORTE DIGITAL</span><span class="mini-seal">✦</span></div><strong>Tu historia empieza aquí.</strong><p>Guarda tus visitas, reúne sellos y conoce nuevas experiencias en cada región.</p><div class="hero-float-footer"><span>${destinations.length} EXPERIENCIAS</span><span>YUCATÁN · MX</span></div></div></div></section>
    <section class="home-overview"><article class="home-welcome-card"><div class="home-welcome-avatar">${e(welcomeName.trim().charAt(0).toUpperCase())}</div><div class="home-welcome-copy"><span class="overline">${account?'CUENTA DE VIAJERO':'BIENVENIDO, VIAJERO'}</span><h2>Hola, ${e(welcomeName)}.</h2><p>${account?'Tu pasaporte está activo. Aquí tienes el resumen de tus experiencias.':'Activa tu cuenta con el folio y código que te entregue un hotel participante.'}</p></div>${account?`<span class="folio-pill">Folio · ${e(account.loginFolio)}</span>`:`<button class="btn btn-gold" data-nav="pasaporte">Activar cuenta <span>→</span></button>`}</article>
      <article class="home-points-card"><div class="points-emblem">✦</div><div class="home-points-value"><small>PUNTOS DISPONIBLES</small><strong>${points.toLocaleString('es-MX')}</strong></div><button class="btn btn-gold" data-nav="recompensas">Ver recompensas <span>→</span></button><div class="home-mini-stats"><div><b>${state.stamps.length}</b><small>Sellos</small></div><div><b>${state.favorites.length}</b><small>Favoritos</small></div><div><b>${completed}</b><small>Estancias</small></div></div></article>
    </section>
    <section class="content-section"><div class="section-head"><div><span class="overline">UN ESTADO, MUCHAS FORMAS DE VIVIRLO</span><h2>Explora por experiencia</h2><p>Elige el tipo de viaje que quieres descubrir.</p></div><button class="subtle-link" data-nav="explorar">Ver catálogo completo <span>→</span></button></div><div class="category-row">${categories.map(cat=>`<button class="category-tile" data-category="${e(cat.name)}"><span class="category-icon">${e(cat.symbol)}</span><span><strong>${e(cat.label)}</strong><small>${e(cat.description)}</small></span></button>`).join('')}</div></section>
    <section class="content-section"><div class="section-head"><div><span class="overline">SELECCIÓN EDITORIAL</span><h2>Destinos destacados en Yucatán</h2><p>Patrimonio, pueblos mágicos y naturaleza para comenzar tu recorrido.</p></div><button class="subtle-link" data-nav="explorar">Descubrir los ${destinations.length} destinos <span>→</span></button></div><div class="destination-grid">${cards(featured,state)}</div></section>
    <section class="home-continue-banner"><div><span class="overline eyebrow-light">EXPERIENCIA CONTINUA</span><h2>Tu viaje no termina al salir del hotel.</h2><p>Continúa descubriendo restaurantes, artesanías, actividades y experiencias de comunidades cercanas. Tú decides qué zona explorar.</p></div><div class="home-continue-actions"><button class="btn btn-primary" data-nav="viaje">Seguir explorando <span>→</span></button></div></section>`;
}
function explore(state){
  const items = getFiltered(state);
  const title = favoritesOnly?'Mis lugares guardados':'Explorar Yucatán';
  const desc = favoritesOnly?'Los destinos que has guardado para volver a consultarlos.':'Un catálogo curado con lugares y experiencias documentados en fuentes públicas de turismo y cultura.';
  return `${heading(favoritesOnly?'TU LISTA PERSONAL':'CATÁLOGO DE EXPERIENCIAS',title,desc)}
    <div class="filter-toolbar"><div class="filter-chips">${['Todas',...categories.map(x=>x.name)].map(f=>`<button class="filter-chip ${currentFilter===f?'active':''}" data-filter="${e(f)}">${e(f)}</button>`).join('')}</div><select class="select-control" id="region-filter" aria-label="Filtrar por región"><option value="Todas">Todas las regiones</option>${areas.filter(a=>a!=='Todo Yucatán').map(a=>`<option ${currentRegion===a?'selected':''} value="${e(a)}">${e(a)}</option>`).join('')}</select></div>
    <div class="results-line"><span id="result-count">${items.length} experiencias encontradas</span><span>Sin teléfonos ni correos · Fuentes públicas</span></div>
    <div class="destination-grid" id="explore-grid">${items.length?cards(items,state):`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⌕</div><h3>No encontramos experiencias</h3><p>Prueba otra palabra, categoría o región.</p></div>`}</div>
    <section class="content-section"><div class="section-head"><div><span class="overline">RED LOCAL VERIFICADA</span><h2>Participantes YucaPass</h2><p>Establecimientos y comunidades aprobados por el equipo administrador.</p></div></div><div id="public-partners"><p class="table-loading">Consultando participantes…</p></div></section>`;
}
function guestAccountSection(state){
  const ctx = getAccessContext();
  if (ctx.role === 'guest') {
    const name = ctx.guestProfile?.display_name || ctx.user?.email || 'Viajero';
    return `<section class="remote-guest-card"><div class="remote-guest-head"><div><span class="overline eyebrow-light">PASAPORTE CONECTADO</span><h2>Hola, ${e(name)}.</h2><p>Tu cuenta ya está conectada a YucaPass. Tus reservaciones, sellos y puntos se consultan desde Supabase.</p></div><span class="remote-check">✓</span></div><div id="guest-portfolio" class="remote-portfolio"><p class="table-loading">Consultando tu pasaporte…</p></div><div class="remote-guest-actions">${hasPendingStamp()?'<div class="pending-stamp-callout"><strong>Recibiste un sello de un participante</strong><p>Confirma el enlace para guardarlo en tu pasaporte.</p><button class="btn btn-gold" data-action="claim-pending-stamp">Guardar sello recibido</button></div>':''}<form id="guest-claim-form" class="inline-link-form"><input name="folio" required maxlength="80" placeholder="Folio de otra reservación"><input name="activationCode" required maxlength="64" placeholder="Código de un solo uso"><button class="btn btn-outline" type="submit">Vincular estancia</button></form><button class="text-action" data-action="staff-logout">Cerrar sesión</button></div></section>`;
  }
  if (ctx.user) {
    return `<section class="account-entry-grid"><article class="account-access-card"><span class="overline">CUENTA REGISTRADA</span><h3>Vincula tu reservación</h3><p>Tu correo ya está autenticado. Escribe el folio y el código de un solo uso que te entregó recepción.</p><form id="guest-claim-form" class="role-form"><div class="field full"><label>Folio de reservación</label><input name="folio" required maxlength="80"></div><div class="field full"><label>Código de activación</label><input name="activationCode" required maxlength="64"></div><div class="field full"><button class="btn btn-forest full-width" type="submit">Activar mi pasaporte</button></div></form></article><article class="account-access-card"><span class="overline">SESIÓN ACTIVA</span><h3>${e(ctx.user.email || 'Cuenta YucaPass')}</h3><p>Si esta cuenta no corresponde a tu pasaporte de viajero, puedes cerrar sesión y usar otro correo.</p>${hasPendingStamp()?'<button class="btn btn-gold" data-action="claim-pending-stamp">Guardar sello recibido</button>':''}<button class="btn btn-outline" data-action="staff-logout">Cerrar sesión</button></article></section>`;
  }
  return `<section class="account-entry-grid">
    <article class="account-access-card"><span class="overline">PRIMER ACCESO · HUÉSPED</span><h3>Crea tu cuenta YucaPass</h3><p>Regístrate con tu correo. Después confirma tu dirección si el proyecto lo solicita y vincula el folio con el código que te entregó el hotel.</p>
      <form id="guest-signup-form" class="role-form"><div class="field full"><label>Nombre para tu pasaporte</label><input name="displayName" required maxlength="90" autocomplete="name"></div><div class="field full"><label>Correo electrónico</label><input name="email" type="email" required autocomplete="email"></div><div class="field full"><label>Crea una contraseña</label><input name="password" type="password" required minlength="8" autocomplete="new-password"></div><div class="field full"><label>Confirma tu contraseña</label><input name="passwordConfirm" type="password" required minlength="8" autocomplete="new-password"></div><div class="field full"><button class="btn btn-forest full-width" type="submit">Crear mi cuenta <span>→</span></button></div></form>
    </article>
    <article class="account-access-card account-login-card"><span class="overline">YA TIENES UNA CUENTA</span><h3>Continúa tu viaje</h3><p>Inicia sesión con el correo y la contraseña que registraste en YucaPass.</p>
      <form id="guest-login-form" class="role-form"><div class="field full"><label>Correo electrónico</label><input name="email" type="email" required autocomplete="username"></div><div class="field full"><label>Contraseña</label><input name="password" type="password" required autocomplete="current-password"></div><div class="field full"><button class="btn btn-outline full-width" type="submit">Iniciar sesión</button></div></form><details class="account-details"><summary>¿Olvidaste tu contraseña?</summary><form id="guest-reset-form" class="role-form"><div class="field full"><label>Correo de tu cuenta</label><input name="email" type="email" required autocomplete="email"></div><button class="btn btn-outline full-width" type="submit">Enviar enlace de recuperación</button></form></details>
    </article>
  </section><div class="prototype-warning"><span>ⓘ</span><div><strong>Protege tus datos de viaje</strong>Tu folio identifica la reservación y el código de activación solo se utiliza una vez. No compartas tus claves de acceso.</div></div>`;
}
function passport(state){
  const ctx = getAccessContext();
  const account = getActiveGuest(state);
  const publicCover = `<section class="passport-cover"><div class="cover-top"><span>YUCAPASS · PASAPORTE DIGITAL</span><span class="cover-medallion">✦</span></div><h2>Yucatán: un viaje que deja huella.</h2><p>Tu pasaporte conecta tus estancias con experiencias y comunidades.</p><div class="cover-bottom"><small>PORTADOR · ${(ctx.guestProfile?.display_name || account?.guestName || 'VIAJERO').toLocaleUpperCase('es-MX')}</small><span class="cover-id">YUCAPASS</span></div></section>`;
  if (ctx.role === 'guest') {
    return `${heading('TU CUENTA DE VIAJERO','Mi pasaporte digital','Consulta tus estancias, sellos, puntos y beneficios en tu cuenta personal.')}${publicCover}${guestAccountSection(state)}`;
  }
  if (ctx.user) {
    return `${heading('ACTIVA TU PASAPORTE','Vincula tu estancia','Tu cuenta está lista. Usa el folio y el código de un solo uso que te entregó recepción.')}${publicCover}${guestAccountSection(state)}`;
  }
  return `${heading('TU COLECCIÓN PERSONAL','Mi pasaporte digital','Crea tu cuenta para conservar tus experiencias y vincular las reservaciones de los hoteles participantes.')}${publicCover}${guestAccountSection(state)}<div class="prototype-warning"><span>ⓘ</span><div><strong>Tu información personal permanece privada</strong>Los demás visitantes solo pueden ver el catálogo público. Tus estancias, puntos, sellos y canjes requieren iniciar sesión.</div></div>`;
}
function accountPage(state){
  const ctx = getAccessContext();
  const roleNames = {
    admin: 'Administrador de plataforma', superadmin: 'Superadministrador',
    hotel_owner: 'Equipo de hotel', partner_owner: 'Participante verificado', guest: 'Viajero YucaPass'
  };
  if (ctx.recoveryMode) {
    return `${heading('SEGURIDAD DE TU CUENTA','Crea una contraseña nueva','El enlace de recuperación fue validado. Elige una contraseña nueva para continuar.')}
      <section class="account-auth-layout"><article class="account-access-card account-auth-card">
        <span class="overline">RECUPERACIÓN DE ACCESO</span><h2>Actualizar contraseña</h2>
        <form id="account-password-update-form" class="role-form">
          <div class="field full"><label for="recovery-password">Nueva contraseña</label><div class="password-field"><input id="recovery-password" name="password" type="password" minlength="8" autocomplete="new-password" required><button type="button" class="password-toggle" data-action="toggle-password" data-target="recovery-password" aria-label="Mostrar contraseña">Mostrar</button></div><small>Mínimo 8 caracteres.</small></div>
          <div class="field full"><label for="recovery-password-confirm">Confirma la contraseña</label><input id="recovery-password-confirm" name="passwordConfirm" type="password" minlength="8" autocomplete="new-password" required></div>
          <button class="btn btn-gold full-width" type="submit">Guardar contraseña nueva</button>
        </form>
      </article></section>`;
  }
  if (ctx.user && ['admin','superadmin','hotel_owner','partner_owner'].includes(ctx.role)) {
    const destination = ctx.role === 'admin' || ctx.role === 'superadmin' ? 'admin' : ctx.role === 'hotel_owner' ? 'hotel' : 'participante';
    return `${heading('CUENTA DE SERVICIO','Tu cuenta YucaPass','Gestiona tu sesión y regresa al espacio de trabajo correspondiente.')}
      <section class="account-auth-layout"><article class="account-access-card account-auth-card">
        <div class="account-status-mark">✓</div><span class="overline">SESIÓN AUTENTICADA</span><h2>${e(roleNames[ctx.role] || 'Personal autorizado')}</h2>
        <p class="account-email-display">${e(ctx.user.email || 'Cuenta YucaPass')}</p>
        <div class="account-action-stack"><button class="btn btn-forest full-width" data-nav="${destination}">Abrir mi panel de servicio <span>→</span></button>${ctx.role==='superadmin'?'<button class="btn btn-gold full-width" data-nav="registrar-hotel">Registrar un hotel</button>':''}${['admin','superadmin'].includes(ctx.role)?'<button class="btn btn-outline full-width" data-nav="inicio">Volver a la experiencia pública</button>':''}<button class="btn btn-danger full-width" data-action="guest-logout">Cerrar sesión</button></div>
        <details class="account-details"><summary>Cambiar contraseña</summary><form id="account-password-update-form" class="role-form"><div class="field full"><label>Nueva contraseña</label><input name="password" type="password" minlength="8" required autocomplete="new-password"></div><div class="field full"><label>Confirmar contraseña</label><input name="passwordConfirm" type="password" minlength="8" required autocomplete="new-password"></div><button class="btn btn-outline full-width" type="submit">Actualizar contraseña</button></form></details>
        <p class="account-footnote">Los accesos de servicio son asignados por el equipo YucaPass. Si necesitas ayuda con tu cuenta, contacta a la persona administradora de tu establecimiento.</p>
      </article></section>`;
  }
  if (ctx.user) {
    const profile = ctx.guestProfile || {};
    return `${heading('TU CUENTA DE VIAJERO','Mi cuenta YucaPass','Administra tus datos, seguridad, reservaciones y tu sesión.')}
      <section class="account-auth-layout account-auth-layout-wide">
        <article class="account-access-card account-auth-card"><div class="account-auth-card-head"><div class="account-status-mark">✓</div><div><span class="overline">CUENTA ACTIVA</span><h2>Hola, ${e(profile.display_name || ctx.user.email || 'Viajero')}.</h2><p class="account-email-display">${e(ctx.user.email || '')}</p></div></div>
          <form id="guest-profile-update-form" class="role-form"><div class="field full"><label for="account-display-name">Nombre para tu pasaporte</label><input id="account-display-name" name="displayName" maxlength="90" required value="${e(profile.display_name || '')}"></div><div class="field"><label for="account-language">Idioma</label><select id="account-language" name="preferredLanguage"><option value="es" ${profile.preferred_language!=='en'?'selected':''}>Español</option><option value="en" ${profile.preferred_language==='en'?'selected':''}>English</option></select></div><div class="field"><label class="account-check-label"><input type="checkbox" name="recommendationsEnabled" ${profile.recommendations_enabled!==false?'checked':''}> Recibir recomendaciones</label></div><button class="btn btn-forest full-width" type="submit">Guardar datos de cuenta</button></form>
          <div class="account-action-stack"><button class="btn btn-outline full-width" data-nav="pasaporte">Ver mi pasaporte</button><button class="btn btn-danger full-width" data-action="guest-logout">Cerrar sesión</button></div>
        </article>
        <article class="account-access-card account-auth-card"><span class="overline">SEGURIDAD</span><h2>Cambiar contraseña</h2><p>Si conoces tu contraseña actual, puedes establecer una nueva desde aquí.</p><details class="account-details"><summary>Actualizar contraseña</summary><form id="account-password-update-form" class="role-form"><div class="field full"><label for="account-new-password">Nueva contraseña</label><div class="password-field"><input id="account-new-password" name="password" type="password" minlength="8" autocomplete="new-password" required><button type="button" class="password-toggle" data-action="toggle-password" data-target="account-new-password">Mostrar</button></div></div><div class="field full"><label for="account-new-password-confirm">Confirmar contraseña</label><input id="account-new-password-confirm" name="passwordConfirm" type="password" minlength="8" autocomplete="new-password" required></div><button class="btn btn-outline full-width" type="submit">Guardar contraseña</button></form></details>
          <span class="overline account-section-label">VINCULAR UNA RESERVACIÓN</span><form id="guest-claim-form" class="role-form"><div class="field full"><label>Folio de reservación</label><input name="folio" required maxlength="80" placeholder="Folio entregado por recepción"></div><div class="field full"><label>Código de activación</label><input name="activationCode" required maxlength="64" placeholder="Código de un solo uso"></div><button class="btn btn-gold full-width" type="submit">Vincular estancia</button></form>
        </article>
      </section>
      <section class="account-staff-callout hotel-owner-callout"><div><strong>¿Administras o eres propietario de un hotel?</strong><p>Solicita incorporarlo a YucaPass. Si se aprueba, recibirás un código para activar tu panel de propietario.</p></div><button class="btn btn-gold" data-nav="registrar-hotel">Registrar mi hotel</button></section>`;
  }
  return `${heading('TU IDENTIDAD DE VIAJERO','Crea tu cuenta o inicia sesión','Guarda tus sellos, vincula reservaciones y conserva tus puntos al cambiar de dispositivo.')}
    <section class="account-auth-layout">
      <article class="account-access-card account-auth-card"><div class="account-status-mark">✦</div><span class="overline">NUEVO EN YUCAPASS</span><h2>Crear mi cuenta</h2><p>La cuenta de viajero es gratuita. Después podrás vincular el folio y el código que te entregue el hotel.</p>
        <form id="guest-signup-form" class="role-form">
          <div class="field full"><label for="signup-display-name">Nombre para tu pasaporte</label><input id="signup-display-name" name="displayName" required maxlength="90" autocomplete="name" placeholder="Tu nombre"></div>
          <div class="field full"><label for="signup-email">Correo electrónico</label><input id="signup-email" name="email" type="email" required autocomplete="email" placeholder="tu@correo.com"></div>
          <div class="field full"><label for="signup-password">Crea una contraseña</label><div class="password-field"><input id="signup-password" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres"><button type="button" class="password-toggle" data-action="toggle-password" data-target="signup-password">Mostrar</button></div></div>
          <div class="field full"><label for="signup-password-confirm">Confirma tu contraseña</label><input id="signup-password-confirm" name="passwordConfirm" type="password" required minlength="8" autocomplete="new-password" placeholder="Repite tu contraseña"></div>
          <button class="btn btn-gold full-width" type="submit">Crear cuenta YucaPass <span>→</span></button>
        </form>
        <p class="account-footnote">El registro público crea cuentas de viajeros. Las cuentas de hoteles, administradores y participantes son habilitadas por invitación y asignación de permisos.</p>
      </article>
      <article class="account-access-card account-auth-card account-login-card"><div class="account-status-mark">↗</div><span class="overline">YA ERES PARTE DE YUCAPASS</span><h2>Iniciar sesión</h2><p>Entra con el correo y contraseña de tu cuenta. El sistema identificará tu perfil y abrirá el espacio que te corresponde.</p>
        <form id="guest-login-form" class="role-form">
          <div class="field full"><label for="login-email">Correo electrónico</label><input id="login-email" name="email" type="email" required autocomplete="username" placeholder="tu@correo.com"></div>
          <div class="field full"><label for="login-password">Contraseña</label><div class="password-field"><input id="login-password" name="password" type="password" required autocomplete="current-password"><button type="button" class="password-toggle" data-action="toggle-password" data-target="login-password">Mostrar</button></div></div>
          <button class="btn btn-forest full-width" type="submit">Iniciar sesión</button>
        </form>
        <details class="account-details"><summary>¿Olvidaste tu contraseña?</summary><p>Te enviaremos un enlace seguro al correo registrado.</p><form id="guest-reset-form" class="role-form"><div class="field full"><label for="reset-email">Correo de tu cuenta</label><input id="reset-email" name="email" type="email" required autocomplete="email" placeholder="tu@correo.com"></div><button class="btn btn-outline full-width" type="submit">Enviar enlace de recuperación</button></form></details>
        <details class="account-details"><summary>¿No recibiste el correo de confirmación?</summary><form id="guest-resend-form" class="role-form"><div class="field full"><label for="resend-email">Correo de registro</label><input id="resend-email" name="email" type="email" required autocomplete="email"></div><button class="btn btn-outline full-width" type="submit">Reenviar confirmación</button></form></details>
      </article>
    </section>
    <div class="account-staff-callout"><div><strong>¿Trabajas con un hotel o negocio participante?</strong><p>El personal no se registra desde el formulario de viajeros. Tu acceso debe ser asignado por YucaPass o por el responsable de tu establecimiento.</p></div><button class="btn btn-outline" data-nav="acceso">Acceso de servicio</button></div>
    <section class="account-staff-callout hotel-owner-callout"><div><strong>¿Eres propietario de un hotel?</strong><p>Crea tu cuenta de viajero o inicia sesión y después solicita la incorporación de tu establecimiento.</p></div><button class="btn btn-gold" data-nav="registrar-hotel">Registrar mi hotel</button></section>`;
}

function hotelRegistrationPage(){
  const ctx=getAccessContext();
  const intro=heading('RED DE HOTELES YUCAPASS','Incorpora tu hotel','Da de alta tu establecimiento y conecta tu operación con viajeros que descubren Yucatán.');

  if(!ctx.user){
    return `${intro}
      <section class="hotel-onboarding-hero"><div class="hotel-onboarding-symbol">⌂</div><div><span class="overline eyebrow-light">PARA PROPIETARIOS Y ADMINISTRADORES</span><h2>Tu hotel puede formar parte de YucaPass.</h2><p>Crea tu cuenta gratuita o inicia sesión. Después podrás completar la información del establecimiento y dar seguimiento a tu solicitud.</p><div class="hero-actions"><button class="btn btn-gold" data-nav="cuenta">Crear cuenta o iniciar sesión <span>→</span></button><button class="btn btn-secondary" data-nav="inicio">Conocer YucaPass</button></div></div></section>
      <section class="hotel-onboarding-steps hotel-onboarding-steps-public" aria-label="Proceso de incorporación"><span><b>1</b> Crea tu cuenta</span><span><b>2</b> Envía los datos</span><span><b>3</b> Revisión</span><span><b>4</b> Activación</span></section>`;
  }

  // La cuenta superadministradora puede dar de alta un hotel directamente.
  // El formulario público de solicitud sigue disponible para propietarios autenticados.
  if(ctx.role==='superadmin'){
    return `${intro}
      <section class="hotel-admin-register dashboard-card">
        <div class="dashboard-card-head"><div><span class="overline">ALTA DIRECTA</span><h2>Registrar un establecimiento</h2><p>Agrega el hotel y asigna a la persona responsable. La cuenta propietaria debe existir previamente en YucaPass para recibir acceso de inmediato.</p></div><span class="dashboard-card-icon">⌂</span></div>
        <form id="admin-hotel-form" class="role-form compact-form hotel-admin-form">
          <div class="field full"><label for="direct-hotel-name">Nombre comercial del hotel</label><input id="direct-hotel-name" name="name" required minlength="2" maxlength="100" placeholder="Hotel Hacienda del Mayab"></div>
          <div class="field"><label for="direct-hotel-municipality">Municipio</label><input id="direct-hotel-municipality" name="municipality" required minlength="2" maxlength="80" placeholder="Valladolid"></div>
          <div class="field"><label for="direct-hotel-slug">Dirección corta (opcional)</label><input id="direct-hotel-slug" name="slug" maxlength="90" placeholder="hotel-hacienda-mayab"><small>Se usa para identificar el hotel en enlaces internos.</small></div>
          <div class="field full"><label for="direct-hotel-owner">Correo de la persona propietaria</label><input id="direct-hotel-owner" name="ownerEmail" type="email" required autocomplete="email" placeholder="propietario@hotel.com"><small>Debe ser el correo de una cuenta ya creada en YucaPass.</small></div>
          <button class="btn btn-gold full-width" type="submit">Crear hotel y asignar responsable <span>→</span></button>
        </form>
        <div class="hotel-admin-register-actions"><button class="btn btn-outline" data-nav="admin">Volver al centro de administración</button><button class="btn btn-soft" data-nav="inicio">Ver sitio público</button></div>
      </section>
      <section class="hotel-onboarding-note hotel-admin-help"><strong>¿El propietario todavía no tiene cuenta?</strong><p>Primero debe crearla y confirmar su correo. Después podrás regresar aquí y asignarle el hotel.</p></section>`;
  }

  if((ctx.memberships||[]).length){
    return `${intro}<section class="dashboard-card hotel-onboarding-block hotel-existing-access"><div class="hotel-existing-icon">✓</div><div><span class="overline">ACCESO ACTIVO</span><h2>Tu cuenta ya está vinculada a un hotel.</h2><p>Entra a tu espacio de trabajo para administrar reservaciones, huéspedes y folios.</p><button class="btn btn-gold" data-nav="hotel">Abrir servicio del hotel <span>→</span></button></div></section>`;
  }

  const emailConfirmed=Boolean(ctx.user.email_confirmed_at||ctx.user.confirmed_at);
  return `${intro}
    <section class="hotel-onboarding-hero"><div class="hotel-onboarding-symbol">⌂</div><div><span class="overline eyebrow-light">INCORPORACIÓN DE ESTABLECIMIENTOS</span><h2>Cuéntanos sobre tu hotel.</h2><p>Completa el formulario una sola vez. El equipo YucaPass revisará la información y podrás consultar aquí el avance.</p></div></section>
    ${!emailConfirmed?`<div class="hotel-inline-notice" role="status"><strong>Confirma tu correo antes de enviar.</strong><span>Abre el mensaje de confirmación que enviamos a ${e(ctx.user.email||'tu correo')} y después regresa a esta página.</span><button class="text-action" data-nav="cuenta">Ir a mi cuenta</button></div>`:''}
    <section class="hotel-onboarding-layout">
      <article class="dashboard-card hotel-onboarding-card">
        <div class="dashboard-card-head"><div><span class="overline">SOLICITUD DE INCORPORACIÓN</span><h2>Datos del establecimiento</h2><p>La información será utilizada para revisar tu solicitud. No se publicará en el catálogo hasta que el hotel sea aprobado y activado.</p></div><span class="dashboard-card-icon">⌂</span></div>
        <form id="hotel-application-form" class="role-form compact-form hotel-application-form">
          <div class="field full"><label for="hotel-app-name">Nombre comercial del hotel</label><input id="hotel-app-name" name="hotelName" required minlength="2" maxlength="120" autocomplete="organization" placeholder="Ej. Hotel Hacienda del Mayab"></div>
          <div class="field"><label for="hotel-app-municipality">Municipio</label><input id="hotel-app-municipality" name="municipality" required minlength="2" maxlength="90" autocomplete="address-level2" placeholder="Ej. Valladolid"></div>
          <div class="field"><label for="hotel-app-website">Página web (opcional)</label><input id="hotel-app-website" name="websiteUrl" type="url" maxlength="240" inputmode="url" placeholder="https://tuhotel.com"><small>Incluye https:// al inicio.</small></div>
          <div class="field full"><label for="hotel-app-description">Cuéntanos qué ofrece tu hotel</label><textarea id="hotel-app-description" name="description" rows="4" minlength="20" maxlength="1200" required placeholder="Tipo de hospedaje, servicios, ubicación y experiencias que ofrece el establecimiento…"></textarea><small>Escribe al menos 20 caracteres.</small></div>
          <button class="btn btn-gold full-width hotel-submit-button" type="submit" ${emailConfirmed?'':'disabled'}>${emailConfirmed?'Enviar solicitud':'Confirma tu correo para continuar'} <span>→</span></button>
          <p class="hotel-form-feedback" id="hotel-application-feedback" role="status" aria-live="polite">${emailConfirmed?'La incorporación no tiene costo. Te avisaremos cuando tu solicitud sea revisada.':'Después de confirmar tu correo, vuelve a esta página para enviar la solicitud.'}</p>
        </form>
      </article>
      <aside class="dashboard-card hotel-onboarding-aside">
        <span class="overline">SOLICITUD A NOMBRE DE</span><h3>${e(ctx.guestProfile?.display_name||ctx.user.email||'Propietario')}</h3><p class="account-email-display">${e(ctx.user.email||'')}</p>
        <div class="hotel-onboarding-note"><strong>¿Qué sigue?</strong><p>Recibirás una respuesta cuando el equipo revise los datos. Si se aprueba, te enviaremos un código personal para activar el panel de tu hotel.</p></div>
        <div class="hotel-onboarding-note"><strong>Ten en cuenta</strong><p>El código solo puede utilizarse desde la cuenta que envió esta solicitud y tiene una fecha de vencimiento.</p></div>
      </aside>
    </section>
    <section class="hotel-onboarding-steps" aria-label="Etapas de incorporación"><span><b>1</b> Envías la solicitud</span><span><b>2</b> Revisamos los datos</span><span><b>3</b> Recibes respuesta</span><span><b>4</b> Activas tu hotel</span></section>
    <section class="dashboard-card hotel-onboarding-block"><div class="dashboard-card-head"><div><span class="overline">SEGUIMIENTO</span><h2>Estado de mi solicitud</h2><p>Consulta aquí las actualizaciones y activa tu hotel cuando recibas la invitación.</p></div><button class="icon-action" data-action="hotel-applications-refresh" title="Actualizar solicitudes" aria-label="Actualizar solicitudes">↻</button></div><div id="my-hotel-applications" class="dashboard-list"><p class="table-loading">Cargando tus solicitudes…</p></div>
      <form id="hotel-invite-claim-form" class="role-form hotel-claim-form" hidden><div class="field full"><label for="hotel-invite-code">Código de activación</label><input id="hotel-invite-code" name="inviteCode" required maxlength="23" autocomplete="one-time-code" placeholder="YH-XXXXXXXXXXXXXXXXXXXX"><small>Escribe el código que recibiste del equipo YucaPass.</small></div><button class="btn btn-forest" type="submit">Activar mi hotel</button></form>
    </section>`;
}
function rewardsPage(state){
  const ctx = getAccessContext();
  return `${heading('BENEFICIOS DEL VIAJERO','Recompensas YucaPass','Consulta beneficios disponibles y utiliza los puntos de tu pasaporte en establecimientos participantes.')}
    <section class="rewards-header"><div class="rewards-medal">✦</div><div><span class="overline eyebrow-light">BENEFICIOS OFICIALES</span><h2>Descubre nuevas experiencias.</h2><p>${ctx.role==='guest'?'Tu saldo y canjes se consultan en tu pasaporte.':'Inicia sesión para consultar tu saldo y canjear beneficios.'}</p></div><button class="btn btn-gold" data-nav="pasaporte">${ctx.role==='guest'?'Ver mi pasaporte':'Iniciar sesión'} <span>→</span></button></section>
    <section class="content-section"><div class="section-head"><div><span class="overline">CATÁLOGO VERIFICADO</span><h2>Beneficios disponibles</h2><p>Solo se muestran recompensas activas aprobadas por YucaPass.</p></div></div><div id="public-rewards"><p class="table-loading">Consultando beneficios…</p></div></section>
    ${ctx.role==='guest'?'<section class="content-section"><div class="prototype-warning"><span>ⓘ</span><div>Los canjes se validan desde el servidor. No compartas tu código de recompensa con otras personas.</div></div></section>':''}`;
}

function journey(state){
  const selectedArea=state.area||'Todo Yucatán';
  const selectedStage=state.stage||'Estoy planeando';
  const stageMessage=selectedStage==='Ya regresé a casa'?'Continúa descubriendo Yucatán desde donde estés. Puedes guardar ideas para un próximo viaje y consultar experiencias de otras comunidades.':selectedStage==='Estoy de visita'?'Consulta experiencias cercanas a la zona que elegiste y guarda los lugares que quieras conocer durante tu estancia.':'Organiza tu viaje con tiempo: explora las regiones, guarda tus lugares favoritos y crea una lista de experiencias por descubrir.';
  let recs=destinations.filter(d=>(selectedArea==='Todo Yucatán'||d.region===selectedArea)&&state.interests.includes(d.category));
  if(!recs.length) recs=destinations.filter(d=>selectedArea==='Todo Yucatán'||d.region===selectedArea);
  if(!recs.length) recs=destinations.filter(d=>state.interests.includes(d.category));
  return `${heading('EXPERIENCIA CONTINUA','Tu viaje continúa después de la estancia','Una vez que salgas del hotel, la plataforma puede mantenerte conectado con lugares, actividades y proyectos locales. Tú eliges la zona; no hay seguimiento automático.')}
    <div class="journey-hero"><section class="journey-panel"><span class="overline eyebrow-light">RECOMENDACIONES POR ZONA</span><h2>Descubre lo que hay alrededor.</h2><p>${e(stageMessage)} Las recomendaciones de esta versión son editoriales; todavía no son ofertas comerciales ni reservaciones.</p><div class="journey-selects"><label>¿Qué zona te interesa?<select id="journey-area">${areas.map(a=>`<option ${a===selectedArea?'selected':''} value="${e(a)}">${e(a)}</option>`).join('')}</select></label><label>¿En qué etapa estás?<select id="journey-stage"><option ${selectedStage==='Estoy planeando'?'selected':''}>Estoy planeando</option><option ${selectedStage==='Estoy de visita'?'selected':''}>Estoy de visita</option><option ${selectedStage==='Ya regresé a casa'?'selected':''}>Ya regresé a casa</option></select></label></div></section>
    <section class="journey-info-card"><div><span class="journey-big-icon">✧</span><h3>Tu experiencia puede seguir creciendo.</h3><p>Guarda los lugares que te interesan, organiza tus próximas paradas y descubre experiencias según la zona y los temas que más te gustan.</p></div><button class="btn btn-outline" data-nav="pasaporte">Ver mis recuerdos <span>→</span></button></section></div>
    <section class="content-section"><div class="section-head"><div><span class="overline">PERSONALIZA TU RECORRIDO</span><h2>¿Qué te gustaría descubrir?</h2><p>Selecciona tus intereses para ajustar la selección de experiencias.</p></div></div><div class="interest-grid">${categories.map(c=>`<label class="interest-pill"><input type="checkbox" data-interest="${e(c.name)}" ${state.interests.includes(c.name)?'checked':''}> ${e(c.label)}</label>`).join('')}</div></section>
    <section class="content-section"><div class="section-head"><div><span class="overline">PARA SEGUIR EXPLORANDO</span><h2>Recomendaciones para ti</h2><p>${recs.length} experiencias de referencia · ${e(selectedArea)}</p></div></div>${state.profile.recommendations?`<div class="destination-grid">${cards(recs.slice(0,6),state)}</div>`:`<div class="empty-state"><div class="empty-icon">✧</div><h3>Recomendaciones pausadas</h3><p>Activa las recomendaciones desde tu perfil para ver experiencias por zona e intereses.</p><button class="btn btn-outline" data-action="profile">Configurar preferencias</button></div>`}</section>
    <div class="journey-privacy-note"><span>✦</span><p><strong>Tu recorrido, a tu manera.</strong> Elige la zona que quieres explorar y cambia tus preferencias cuando quieras.</p></div>`;
}
export function renderView(root){
  const state=getState();
  const ctx=getAccessContext();
  const platformRoles=['admin','superadmin'];
  const isPlatformAdmin=platformRoles.includes(ctx.role);
  const hasHotel=(ctx.memberships||[]).length>0;
  const hasPartner=(ctx.partnerMemberships||[]).length>0;
  const isStaff=isPlatformAdmin||hasHotel||hasPartner;
  // El superadministrador conserva toda la experiencia pública y obtiene un acceso
  // independiente al centro de servicio; los otros puestos ven solo su operación.
  const isPublic=['visitor','guest','admin','superadmin'].includes(ctx.role);

  if(currentPage==='acceso') {
    if(isPlatformAdmin) currentPage='inicio';
    else if(hasHotel) currentPage='hotel';
    else if(hasPartner) currentPage='participante';
    else if(ctx.role==='guest') currentPage='pasaporte';
  }
  if(isPlatformAdmin && !['inicio','explorar','pasaporte','cuenta','recompensas','viaje','admin','acceso','registrar-hotel'].includes(currentPage)) currentPage='inicio';
  // Las cuentas de servicio pueden tener varias membresías: no bloqueamos el cambio
  // entre hotel y participante si la cuenta tiene acceso a ambos espacios.
  if(!isPlatformAdmin && hasHotel && hasPartner && !['hotel','participante','acceso','cuenta','registrar-hotel'].includes(currentPage)) currentPage='hotel';
  else if(!isPlatformAdmin && hasHotel && !hasPartner && !['hotel','acceso','cuenta','registrar-hotel'].includes(currentPage)) currentPage='hotel';
  else if(!isPlatformAdmin && !hasHotel && hasPartner && !['participante','acceso','cuenta','registrar-hotel'].includes(currentPage)) currentPage='participante';
  if(currentPage==='admin' && !isPlatformAdmin) currentPage='acceso';
  if(currentPage==='hotel' && !hasHotel) currentPage='acceso';
  if(currentPage==='participante' && !hasPartner) currentPage='acceso';
  if(['aliados'].includes(currentPage)) currentPage='acceso';

  const templates={
    inicio:home, explorar:explore, pasaporte:passport, cuenta:accountPage, recompensas:rewardsPage,
    viaje:journey, acceso:()=>renderAccessPage(), 'registrar-hotel':hotelRegistrationPage,
    admin:()=>renderAdminDashboard(ctx), hotel:()=>renderHotelDashboard(ctx), participante:()=>renderPartnerDashboard(ctx)
  };
  root.innerHTML=(templates[currentPage]||home)(state);
  const topTitle=document.getElementById('topbar-title');
  if(topTitle)topTitle.textContent=pageTitles[currentPage]||pageTitles.inicio;
  const kicker=document.getElementById('topbar-kicker');
  if(kicker) kicker.textContent=currentPage==='admin'?'ÁREA DE ADMINISTRACIÓN':(['hotel','participante'].includes(currentPage)?'ÁREA DE SERVICIO':'TU GUÍA DIGITAL');

  document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===currentPage));
  document.querySelectorAll('[data-role-nav]').forEach(el=>{
    const kind=el.dataset.roleNav;
    const show=kind==='public'?isPublic
      :kind==='admin'?isPlatformAdmin
      :kind==='hotel'?hasHotel
      :kind==='partner'?hasPartner
      :kind==='access'?(!isStaff)
      :kind==='staff'?isStaff
      :kind==='account'?true:false;
    el.hidden=!show;
  });
  document.querySelectorAll('.visitor-only').forEach(el=>el.hidden=!isPublic);
  document.querySelectorAll('.staff-only').forEach(el=>el.hidden=!isStaff);

  if(['admin','hotel','participante'].includes(currentPage)) hydrateDashboard(root,currentPage).catch(err=>{
    console.error(`YucaPass: no se pudo cargar el panel ${currentPage}.`,err);
    const target=root.querySelector('.dashboard-page');
    const retryAction={admin:'admin-refresh',hotel:'hotel-refresh',participante:'partner-refresh'}[currentPage];
    if(target){const warning=document.createElement('div');warning.className='dashboard-error dashboard-friendly-error';warning.innerHTML=`<strong>No pudimos cargar esta sección.</strong><span>Comprueba tu conexión e inténtalo de nuevo.</span><button class="btn btn-outline" type="button" data-action="${retryAction}">Volver a intentar</button>`;target.prepend(warning);}
  });
  if(currentPage==='registrar-hotel' && ctx.user && ctx.role!=='superadmin' && !(ctx.memberships||[]).length) hydrateHotelOnboarding(root).catch(err=>{console.error('YucaPass: no se pudo cargar el estado de solicitudes.',err);const target=root.querySelector('#my-hotel-applications');if(target)target.innerHTML=`<div class="hotel-load-error" role="status"><strong>No pudimos cargar el estado de tus solicitudes.</strong><span>Tu cuenta y tus datos siguen protegidos. Comprueba tu conexión y vuelve a intentarlo.</span><button class="btn btn-outline" data-action="hotel-applications-refresh" type="button">Intentar de nuevo</button></div>`;});
  if(['pasaporte','cuenta'].includes(currentPage) && ctx.guestProfile && root.querySelector('#guest-portfolio')) hydrateGuestPortal(root).catch(err=>{
    console.error('YucaPass: no se pudo cargar el pasaporte.',err);const target=root.querySelector('#guest-portfolio'); if(target)target.innerHTML='<p class="dashboard-error">No pudimos cargar tu pasaporte en este momento. Comprueba tu conexión y vuelve a intentarlo.</p>';
  });
  if(currentPage==='recompensas') hydrateRewards(root).catch(err=>{
    console.error('YucaPass: no se pudieron cargar las recompensas.',err);const target=root.querySelector('#public-rewards'); if(target)target.innerHTML='<p class="dashboard-error">No pudimos mostrar las recompensas en este momento. Inténtalo de nuevo más tarde.</p>';
  });
  if(currentPage==='explorar') hydratePublicPartners(root).catch(err=>{
    console.error('YucaPass: no se pudieron cargar los participantes.',err);const target=root.querySelector('#public-partners'); if(target)target.innerHTML='<p class="dashboard-error">No pudimos mostrar los establecimientos participantes en este momento. Inténtalo de nuevo más tarde.</p>';
  });
  return state;
}
export function renderModal(destination,state){
  const earned=state.stamps.includes(destination.id);
  return `<article class="modal-card"> <button class="modal-close" data-action="close-modal" aria-label="Cerrar">×</button>${imageMarkup(destination,true)}<div class="modal-body"><span class="overline">${e(destination.type)} · ${e(destination.category)}</span><h2>${e(destination.name)}</h2><div class="modal-place">⌖ ${e(destination.municipality)} · ${e(destination.region)}</div><p>${e(destination.description)}</p><p><strong>${e(destination.experience)}.</strong> Esta ficha resume información pública de referencia; confirma condiciones, accesos y disponibilidad con la fuente oficial antes de tu visita.</p><div class="modal-tags">${destination.tags.map(t=>`<span>${e(t)}</span>`).join('')}</div><div class="modal-actions"><span class="stamp-validation-note">${earned?'✓ Visita guardada en este dispositivo':'El sello se entrega mediante un enlace seguro enviado por el participante.'}</span><button class="btn btn-outline" data-action="map" data-id="${e(destination.id)}">Abrir mapa ↗</button><a class="btn btn-soft" href="${e(destination.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fuente pública ↗</a><button class="btn btn-outline" data-action="favorite" data-id="${e(destination.id)}">${state.favorites.includes(destination.id)?'♥ Guardado':'♡ Guardar'}</button></div><div class="source-footnote">Consulta la <a href="${e(destination.sourceUrl)}" target="_blank" rel="noopener noreferrer">fuente oficial</a> para información actualizada antes de tu visita.</div></div></article>`;
}
export function renderProfileModal(state){
 return `<article class="modal-card modal-form"><button class="modal-close" data-action="close-modal" aria-label="Cerrar">×</button><span class="overline">TU PERFIL DIGITAL</span><h2>Configura tu experiencia</h2><p>Personaliza el nombre que aparece en tu experiencia y elige tus preferencias de idioma y recomendaciones.</p><form id="profile-form"><div class="modal-form-grid"><div class="field full"><label for="profile-name">Nombre visible</label><input id="profile-name" maxlength="45" value="${e(state.profile.name)}" /></div><div class="field"><label for="profile-language">Idioma</label><select id="profile-language"><option ${state.profile.language==='Español'?'selected':''}>Español</option><option ${state.profile.language==='English'?'selected':''}>English</option></select></div><div class="field"><label>Privacidad</label><div class="interest-pill"><input id="profile-recommendations" type="checkbox" ${state.profile.recommendations?'checked':''}> Recibir recomendaciones</div></div></div><div class="journey-privacy-note"><span>✦</span><p>La zona de tus recomendaciones la eliges tú. Puedes cambiar tus intereses y preferencias en cualquier momento.</p></div><button class="btn btn-forest" type="submit">Guardar preferencias</button></form></article>`;
}
