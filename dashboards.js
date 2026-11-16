import { getSupabaseClient } from './supabase-client.js';
import { getAccessContext, getActiveMembership, getActivePartnerMembership, refreshAccessContext } from './access.js';
import { destinations } from './data.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const date = v => v ? new Date(`${String(v).slice(0,10)}T12:00:00`).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const statusLabel = { confirmed:'Confirmada', checked_in:'En estancia', completed:'Completada', cancelled:'Cancelada', pending:'Pendiente', approved:'Aprobada', rejected:'No aprobada' };

export function renderAccessPage() {
  return `<section class="role-auth-shell">
    <div class="role-auth-brand"><img src="./yucapass-emblem.png" alt=""><span>YucaPass</span><small>ACCESO DE ESTABLECIMIENTOS</small></div>
    <div class="role-auth-card"><div class="role-auth-intro"><span class="overline">PORTAL PRIVADO</span><h1>Bienvenido de nuevo.</h1><p>Acceso exclusivo para administración YucaPass, hoteles y participantes verificados.</p></div>
      <form id="staff-login-form" class="role-form"><div class="field full"><label for="staff-email">Correo de acceso</label><input id="staff-email" name="email" type="email" autocomplete="username" required placeholder="nombre@establecimiento.com"></div><div class="field full"><label for="staff-password">Contraseña</label><div class="password-field"><input id="staff-password" name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="Tu contraseña"><button type="button" class="password-toggle" data-action="toggle-password" data-target="staff-password">Mostrar</button></div></div><button class="btn btn-forest full-width" type="submit">Iniciar sesión segura <span>→</span></button></form>
      <details class="account-details staff-reset-details"><summary>¿Olvidaste tu contraseña?</summary><p>Envía un enlace de recuperación al correo de tu cuenta de servicio.</p><form id="staff-reset-form" class="role-form"><div class="field full"><label for="staff-reset-email">Correo de acceso</label><input id="staff-reset-email" name="email" type="email" required autocomplete="email"></div><button class="btn btn-outline full-width" type="submit">Enviar recuperación</button></form></details>
      <div class="role-auth-foot"><span class="secure-mark">⌑</span><span>El panel que verás depende de los permisos asignados a tu cuenta. No hay registro público de personal.</span></div>
      <button class="subtle-link" data-nav="inicio">← Volver a la experiencia turística</button>
    </div><aside class="role-auth-aside"><span class="overline eyebrow-light">YUCAPASS · OPERACIÓN</span><h2>Una plataforma.<br>Accesos separados.</h2><p>Los visitantes descubren experiencias. Los hoteles gestionan sus propias estancias. El equipo administrador supervisa la red completa.</p><div class="role-auth-roles"><div><b>01</b><span>Administración YucaPass</span></div><div><b>02</b><span>Dueños y equipos de hotel</span></div><div><b>03</b><span>Participantes verificados</span></div><div><b>04</b><span>Visitantes y huéspedes</span></div></div></aside>
  </section>`;
}

export function renderAdminDashboard(context) {
  const isSuperadmin = context.adminRole === 'superadmin';
  const roleTitle = isSuperadmin ? 'Superadministrador' : 'Administrador de plataforma';
  return `<section class="dashboard-page">
    <div class="dashboard-heading"><div><span class="overline">CENTRO DE CONTROL · YUCAPASS 4.3</span><h1>Administración general</h1><p>El espacio de servicio está separado de la experiencia pública. Desde aquí administras la red YucaPass.</p></div><div class="dashboard-heading-actions"><span class="role-chip admin-chip">${roleTitle}</span><button class="btn btn-soft" data-nav="inicio">Volver a YucaPass público</button><button class="btn btn-outline" data-action="staff-logout">Cerrar sesión</button></div></div>
    <div class="dashboard-kpis admin-kpis"><article class="dashboard-kpi"><span>Hoteles registrados</span><strong data-admin-count="hotels">—</strong><small>Todos los establecimientos</small></article><article class="dashboard-kpi"><span>Solicitudes por revisar</span><strong data-admin-count="applications">—</strong><small>Participantes y experiencias</small></article><article class="dashboard-kpi"><span>Aliados publicados</span><strong data-admin-count="partners">—</strong><small>Verificados y activos</small></article><article class="dashboard-kpi"><span>Experiencias activas</span><strong data-admin-count="experiences">—</strong><small>Visibles a visitantes</small></article></div>
    <div class="dashboard-grid admin-main-grid">
      ${isSuperadmin ? `<section class="dashboard-card"><div class="dashboard-card-head"><div><span class="overline">ALTA ADMINISTRATIVA EXCEPCIONAL</span><h2>Crear hotel manualmente</h2><p>Usa esta opción solo para altas gestionadas directamente por superadministración. El registro normal se realiza mediante solicitud y código de activación.</p></div><span class="dashboard-card-icon">⌂</span></div>
        <form id="admin-hotel-form" class="role-form compact-form"><div class="field full"><label>Nombre comercial</label><input name="name" required maxlength="100" placeholder="Hotel Hacienda del Mayab"></div><div class="field"><label>Municipio</label><input name="municipality" required maxlength="80" placeholder="Valladolid"></div><div class="field"><label>Clave URL (slug)</label><input name="slug" maxlength="90" placeholder="hotel-hacienda-mayab"></div><div class="field full"><label>Correo de la cuenta propietaria</label><input name="ownerEmail" type="email" required placeholder="dueno@hotel.com"></div><button class="btn btn-forest full-width" type="submit">Crear hotel y asignar dueño</button></form>
      </section>` : `<section class="dashboard-card"><div class="dashboard-card-head"><div><span class="overline">RED DE HOTELES</span><h2>Solicitudes de incorporación</h2><p>Los hoteles presentan su solicitud desde la página pública. La aprobación y la emisión del código corresponden al superadministrador.</p></div><span class="dashboard-card-icon">⌂</span></div></section>`}
      <section class="dashboard-card"><div class="dashboard-card-head"><div><span class="overline">GESTIÓN DE ESTABLECIMIENTOS</span><h2>Hoteles registrados</h2><p>Activa o pausa su publicación en el catálogo.</p></div><button class="icon-action" data-action="admin-refresh" title="Actualizar">↻</button></div><div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>Hotel</th><th>Municipio</th><th>Estado</th><th>Acción</th></tr></thead><tbody id="admin-hotels-rows"><tr><td colspan="4" class="table-loading">Cargando hoteles…</td></tr></tbody></table></div></section>
    </div>
    <section class="dashboard-card dashboard-wide"><div class="dashboard-card-head"><div><span class="overline">PARTICIPANTES</span><h2>Solicitudes de incorporación</h2><p>Hoteles y dueños pueden proponer restaurantes, comercios, experiencias y comunidades. Solo se publican después de tu aprobación.</p></div><span class="role-chip">Revisión administrativa</span></div><div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>Participante</th><th>Tipo</th><th>Municipio</th><th>Solicitante</th><th>Estado</th><th>Revisión</th></tr></thead><tbody id="admin-applications-rows"><tr><td colspan="6" class="table-loading">Cargando solicitudes…</td></tr></tbody></table></div></section>
    <div class="dashboard-grid admin-bottom-grid">
      <section class="dashboard-card"><div class="dashboard-card-head"><div><span class="overline">CONTENIDO TURÍSTICO</span><h2>Publicar experiencia</h2><p>Agrega una ficha al catálogo público. La imagen se guarda en el almacenamiento de YucaPass.</p></div></div>
        <form id="admin-experience-form" class="role-form compact-form"><div class="field"><label>ID único</label><input name="id" required maxlength="60" placeholder="cenote-ejemplo"></div><div class="field"><label>Nombre</label><input name="name" required maxlength="120" placeholder="Cenote de ejemplo"></div><div class="field"><label>Municipio</label><input name="municipality" required maxlength="80"></div><div class="field"><label>Región</label><input name="region" required maxlength="60"></div><div class="field"><label>Categoría</label><select name="category"><option>Cultura</option><option>Naturaleza</option><option>Gastronomía</option><option>Comunidad</option></select></div><div class="field"><label>Imagen (opcional)</label><input name="image" type="file" accept="image/png,image/jpeg,image/webp"></div><div class="field full"><label>Descripción pública</label><textarea name="description" required maxlength="700" rows="3"></textarea></div><div class="field full"><label>Fuente pública (URL)</label><input name="sourceUrl" type="url" placeholder="https://"></div><div class="field full"><label>Búsqueda de mapa</label><input name="mapQuery" maxlength="180" placeholder="Cenote, municipio, Yucatán, México"></div><button class="btn btn-forest full-width" type="submit">Guardar y publicar experiencia</button></form>
      </section>
      <section class="dashboard-card"><div class="dashboard-card-head"><div><span class="overline">ALIADOS APROBADOS</span><h2>Participantes publicados</h2><p>Listado de negocios y comunidades visibles para turistas.</p></div></div><div id="admin-published-partners" class="dashboard-list"><p class="table-loading">Cargando participantes…</p></div></section>
    </div>
    <section class="dashboard-card dashboard-wide"><div class="dashboard-card-head"><div><span class="overline">BENEFICIOS DEL VIAJERO</span><h2>Crear recompensa</h2><p>Solo las recompensas activas se muestran a los visitantes autenticados o públicos. Los puntos se descuentan mediante una función atómica.</p></div></div>
      <form id="admin-reward-form" class="role-form compact-form"><div class="field"><label>ID único</label><input name="id" required maxlength="50" placeholder="desayuno-regional"></div><div class="field"><label>Nombre</label><input name="name" required maxlength="120"></div><div class="field"><label>Puntos requeridos</label><input name="pointsCost" type="number" min="1" max="100000" required></div><div class="field"><label>Participante vinculado (opcional)</label><select name="partnerId" id="admin-reward-partner"><option value="">Sin participante</option></select></div><div class="field full"><label>Descripción</label><textarea name="description" rows="2" required maxlength="500"></textarea></div><label class="interest-pill field full"><input name="isActive" type="checkbox" checked> Publicar al guardar</label><button class="btn btn-forest full-width" type="submit">Guardar recompensa</button></form>
    </section>
    <section class="dashboard-card dashboard-wide"><div class="dashboard-card-head"><div><span class="overline">OFERTAS DE PARTICIPANTES</span><h2>Solicitudes de beneficios</h2><p>Los participantes proponen beneficios; el administrador decide cuáles se convierten en recompensas públicas.</p></div><span class="role-chip">Aprobación obligatoria</span></div><div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>Beneficio</th><th>Participante</th><th>Puntos</th><th>Estado</th><th>Acción</th></tr></thead><tbody id="admin-offer-applications-rows"><tr><td colspan="5" class="table-loading">Cargando solicitudes…</td></tr></tbody></table></div></section>
    ${renderAnalyticsPanel('platform', '', 'Indicadores generales de YucaPass', true)}
    ${isSuperadmin ? `<section class="dashboard-card dashboard-wide superadmin-console" id="superadmin-console">
      <div class="dashboard-card-head"><div><span class="overline">NIVEL MÁXIMO DE PLATAFORMA</span><h2>Administración de administradores</h2><p>El superadministrador conserva la experiencia pública completa de YucaPass y dispone de este centro de control separado. Solo este nivel puede otorgar o retirar roles administrativos.</p></div><span class="role-chip superadmin-chip">Superadmin</span></div>
      <section class="dashboard-card superadmin-inner-card hotel-applications-console"><div class="dashboard-card-head"><div><span class="overline">INCORPORACIÓN DE HOTELES</span><h2>Solicitudes de nuevos establecimientos</h2><p>El propietario se registra como viajero, presenta su hotel y espera la revisión. Al aprobar, aquí se genera un código único que debes entregar al solicitante.</p></div><button class="icon-action" data-action="superadmin-refresh" title="Actualizar solicitudes">↻</button></div><div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>Hotel</th><th>Municipio</th><th>Solicitante</th><th>Fecha</th><th>Estado</th><th>Revisión</th></tr></thead><tbody id="superadmin-hotel-applications-rows"><tr><td colspan="6" class="table-loading">Cargando solicitudes de hoteles…</td></tr></tbody></table></div><div id="hotel-invite-result" class="hotel-invite-result" hidden aria-live="polite"><div><span class="overline">CÓDIGO DE ACTIVACIÓN · MOSTRADO UNA SOLA VEZ</span><strong id="hotel-invite-result-name">Invitación de hotel</strong><code id="hotel-invite-result-code"></code><small id="hotel-invite-result-expiry"></small></div><button class="btn btn-gold" type="button" data-action="copy-hotel-invite-code">Copiar código</button></div></section>
      <div class="dashboard-kpis superadmin-kpis"><article class="dashboard-kpi"><span>Administradores</span><strong data-super-count="admins">—</strong><small>Sin contar superadministradores</small></article><article class="dashboard-kpi"><span>Superadministradores</span><strong data-super-count="superadmins">—</strong><small>Control global</small></article><article class="dashboard-kpi"><span>Hoteles activos</span><strong data-super-count="activeHotels">—</strong><small>Red operativa</small></article><article class="dashboard-kpi"><span>Solicitudes pendientes</span><strong data-super-count="pending">—</strong><small>Participantes y beneficios</small></article></div>
      <div class="dashboard-grid superadmin-grid">
        <section class="dashboard-card superadmin-inner-card"><div class="dashboard-card-head"><div><span class="overline">CONTROL DE ACCESO</span><h2>Asignar nivel administrativo</h2><p>La persona debe existir primero en Authentication → Users.</p></div></div><form id="superadmin-role-form" class="role-form compact-form"><div class="field full"><label>Correo de la cuenta YucaPass</label><input name="email" type="email" required placeholder="persona@ejemplo.com"></div><div class="field full"><label>Nivel</label><select name="adminRole"><option value="admin">Administrador</option><option value="superadmin">Superadministrador</option></select></div><button class="btn btn-forest full-width" type="submit">Guardar nivel administrativo</button></form></section>
        <section class="dashboard-card superadmin-inner-card"><div class="dashboard-card-head"><div><span class="overline">CUENTAS CON ACCESO GLOBAL</span><h2>Administradores registrados</h2><p>Retira accesos cuando sea necesario. El sistema protege al último superadministrador.</p></div><button class="icon-action" data-action="superadmin-refresh" title="Actualizar">↻</button></div><div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>Cuenta</th><th>Nivel</th><th>Alta</th><th>Acción</th></tr></thead><tbody id="superadmin-admin-rows"><tr><td colspan="4" class="table-loading">Cargando administradores…</td></tr></tbody></table></div></section>
      </div>
      <section class="dashboard-card superadmin-inner-card"><div class="dashboard-card-head"><div><span class="overline">TRAZABILIDAD</span><h2>Historial de cambios administrativos</h2><p>Registro de altas, cambios de nivel y retiros de acceso.</p></div></div><div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>Fecha</th><th>Responsable</th><th>Cuenta afectada</th><th>Acción</th><th>Antes</th><th>Después</th></tr></thead><tbody id="superadmin-audit-rows"><tr><td colspan="6" class="table-loading">Cargando historial…</td></tr></tbody></table></div></section>
      <div class="dashboard-security-note"><b>Principio de privilegio mínimo</b><span>Solo el superadministrador puede cambiar los niveles de acceso. Cada ajuste queda registrado en el historial de administración.</span></div>
    </section>` : ''}
    <div class="dashboard-security-note"><b>Control de acceso activo</b><span>Las acciones disponibles dependen del nivel de acceso de tu cuenta. Mantén tus datos de inicio de sesión privados.</span></div>
  </section>`;
}

export function renderHotelDashboard(context) {
  const memberships = context.memberships || [];
  const active = getActiveMembership();
  const options = memberships.map(m => `<option value="${esc(m.hotel_id)}" ${active?.hotel_id===m.hotel_id?'selected':''}>${esc(m.hotels?.name || 'Hotel')} · ${esc(m.hotels?.municipality || '')} · ${esc(m.role)}</option>`).join('');
  return `<section class="dashboard-page">
    <div class="dashboard-heading"><div><span class="overline">PORTAL PRIVADO DEL ESTABLECIMIENTO</span><h1>Servicio del hotel</h1><p>Tu espacio muestra las operaciones y herramientas que corresponden a tu puesto.</p></div><div class="dashboard-heading-actions"><span class="role-chip hotel-chip">${esc(({owner:'Dueño',manager:'Encargado',reception:'Recepción'})[active?.role] || active?.role || 'Personal')}</span><button class="btn btn-outline" data-action="staff-logout">Cerrar sesión</button></div></div>
    ${memberships.length>1?`<div class="hotel-switcher"><label for="hotel-switch">Establecimiento activo</label><select id="hotel-switch">${options}</select></div>`:''}
    <div class="dashboard-hotel-banner"><div><span class="overline eyebrow-light">${esc(active?.hotels?.municipality || 'YUCATÁN')} · YUCAPASS</span><h2>${esc(active?.hotels?.name || 'Mi establecimiento')}</h2><p>Tu equipo administra únicamente la información de los hoteles donde tiene una membresía autorizada.</p></div><img src="./yucapass-emblem.png" alt="YucaPass"></div>
    <div class="role-workspace-note"><strong>${active?.role==='owner'?'Vista de propietario':active?.role==='manager'?'Vista de encargado':'Vista de recepción'}</strong><span>${active?.role==='owner'?'Control del establecimiento, equipo, propuestas de aliados y operación diaria.':active?.role==='manager'?'Operación diaria, recepción y coordinación del equipo de recepción.':'Consulta y operación de reservaciones, entradas y salidas. No administra al personal ni aprueba participantes.'}</span></div>
    <div class="dashboard-kpis"><article class="dashboard-kpi"><span>Reservaciones</span><strong data-hotel-count="all">—</strong><small>En este establecimiento</small></article><article class="dashboard-kpi"><span>Por recibir</span><strong data-hotel-count="confirmed">—</strong><small>Confirmadas</small></article><article class="dashboard-kpi"><span>En estancia</span><strong data-hotel-count="checked_in">—</strong><small>Huéspedes alojados</small></article><article class="dashboard-kpi"><span>Estancias completadas</span><strong data-hotel-count="completed">—</strong><small>Salidas registradas</small></article></div>
    <div class="dashboard-grid hotel-main-grid">
      <section class="dashboard-card"><div class="dashboard-card-head"><div><span class="overline">RECEPCIÓN</span><h2>Crear reservación</h2><p>Conserva el folio original. YucaPass crea una invitación de activación para el pasaporte.</p></div><span class="dashboard-card-icon">▣</span></div>
        <form id="hotel-reservation-form" class="role-form compact-form"><input type="hidden" name="hotelId" value="${esc(active?.hotel_id || '')}"><div class="field full"><label>Folio original del hotel</label><input name="folio" required maxlength="80" placeholder="El mismo folio que ya utiliza el hotel"></div><div class="field full"><label>Nombre del huésped principal</label><input name="guestName" required maxlength="100"></div><div class="field"><label>Habitación (opcional)</label><input name="room" maxlength="24"></div><div class="field"><label>Número de huéspedes</label><input name="guestCount" type="number" min="1" max="12" value="2" required></div><div class="field"><label>Entrada</label><input name="checkIn" type="date" required></div><div class="field"><label>Salida</label><input name="checkOut" type="date" required></div><button class="btn btn-forest full-width" type="submit">Crear reservación y generar pase</button></form>
        <p class="form-hint">El código de activación se muestra una sola vez. Entrégalo al huésped junto con su folio.</p>
      </section>
      <section class="dashboard-card"><div class="dashboard-card-head"><div><span class="overline">OPERACIÓN DIARIA</span><h2>Reservaciones del hotel</h2><p>La lista se filtra en Supabase por la membresía del usuario.</p></div><button class="icon-action" data-action="hotel-refresh" title="Actualizar">↻</button></div><div id="hotel-reservation-rows" class="hotel-reservation-table"><p class="table-loading">Cargando reservaciones…</p></div></section>
    </div>
    ${['owner','manager'].includes(active?.role)?`<section class="dashboard-card dashboard-wide"><div class="dashboard-card-head"><div><span class="overline">EQUIPO DEL HOTEL</span><h2>Asignar personal</h2><p>Invita cuentas existentes de YucaPass. Los encargados pueden registrar recepcionistas; el dueño puede asignar encargados.</p></div></div><form id="hotel-team-form" class="role-form compact-form"><input type="hidden" name="hotelId" value="${esc(active?.hotel_id || '')}"><div class="field"><label>Correo de la cuenta</label><input name="email" type="email" required placeholder="personal@hotel.com"></div><div class="field"><label>Permiso</label><select name="role">${active?.role==='owner'?'<option value="manager">Encargado</option>':''}<option value="reception">Recepción</option></select></div><button class="btn btn-outline" type="submit">Asignar acceso</button></form><div id="hotel-team-rows" class="dashboard-list dashboard-list-spaced"><p class="table-loading">Cargando equipo…</p></div></section>`:''}
    ${['owner','manager'].includes(active?.role)?`<section class="dashboard-card dashboard-wide"><div class="dashboard-card-head"><div><span class="overline">RED DE EXPERIENCIAS</span><h2>Proponer un participante</h2><p>Recomienda un restaurante, comercio, cooperativa o experiencia comunitaria. El público no verá la ficha hasta que YucaPass la revise y apruebe.</p></div><span class="role-chip">Revisión pendiente</span></div>
      <form id="partner-application-form" class="role-form partner-application-grid"><input type="hidden" name="hotelId" value="${esc(active?.hotel_id || '')}"><div class="field"><label>Nombre del participante</label><input name="name" required maxlength="120" placeholder="Nombre comercial o comunitario"></div><div class="field"><label>Tipo</label><select name="partnerType"><option value="restaurant">Restaurante</option><option value="commerce">Comercio</option><option value="experience">Experiencia turística</option><option value="community">Comunidad o cooperativa</option></select></div><div class="field"><label>Municipio</label><input name="municipality" required maxlength="80"></div><div class="field"><label>Imagen (opcional)</label><input name="image" type="file" accept="image/png,image/jpeg,image/webp"></div><div class="field full"><label>Descripción pública</label><textarea name="description" required maxlength="600" rows="3"></textarea></div><button class="btn btn-forest" type="submit">Enviar a revisión de YucaPass</button></form>
    `:''}<section class="dashboard-card dashboard-wide"><div class="dashboard-card-head"><div><span class="overline">RED DE EXPERIENCIAS</span><h2>Participantes propuestos</h2><p>Seguimiento de solicitudes enviadas por tu hotel.</p></div></div>
      <div id="hotel-applications" class="dashboard-list dashboard-list-spaced"><p class="table-loading">Cargando tus solicitudes…</p></div>
    </section>
    ${['owner','manager'].includes(active?.role) ? renderAnalyticsPanel('hotel', active.hotel_id, 'Rendimiento de este hotel', true) : '<div class="dashboard-security-note"><b>Analítica reservada</b><span>Las métricas de uso y el registro contable están disponibles para el dueño y el encargado del hotel.</span></div>'}
    <div class="dashboard-security-note"><b>Permisos del establecimiento</b><span>Tu cuenta tiene acceso según su rol. No puede ver reservaciones ni información privada de otros hoteles.</span></div>
  </section>`;
}

export function renderPartnerDashboard(context) {
  const memberships = context.partnerMemberships || [];
  const active = getActivePartnerMembership();
  const options = memberships.map(m => `<option value="${esc(m.partner_id)}" ${active?.partner_id===m.partner_id?'selected':''}>${esc(m.business_partners?.name || 'Participante')} · ${esc(m.role)}</option>`).join('');
  const profile = active?.business_partners || {};
  return `<section class="dashboard-page">
    <div class="dashboard-heading"><div><span class="overline">PORTAL PRIVADO · PARTICIPANTE YUCAPASS</span><h1>Servicio del participante</h1><p>Administra tus propuestas de beneficios y consulta la información pública de tu establecimiento.</p></div><div class="dashboard-heading-actions"><span class="role-chip partner-chip">${esc(active?.role || 'Participante')}</span><button class="btn btn-outline" data-action="staff-logout">Cerrar sesión</button></div></div>
    ${memberships.length>1?`<div class="hotel-switcher"><label for="partner-switch">Participante activo</label><select id="partner-switch">${options}</select></div>`:''}
    <div class="dashboard-hotel-banner partner-banner"><div><span class="overline eyebrow-light">${esc(profile.municipality || 'YUCATÁN')} · PARTICIPANTE VERIFICADO</span><h2>${esc(profile.name || 'Mi establecimiento')}</h2><p>${esc(profile.description || 'Administra los beneficios que quieres proponer a la red YucaPass.')}</p></div><img src="./yucapass-emblem.png" alt="YucaPass"></div>
    <div class="dashboard-kpis"><article class="dashboard-kpi"><span>Estado público</span><strong data-partner-status>—</strong><small>Visibilidad del establecimiento</small></article><article class="dashboard-kpi"><span>Beneficios activos</span><strong data-partner-count="active">—</strong><small>Publicados en YucaPass</small></article><article class="dashboard-kpi"><span>Solicitudes pendientes</span><strong data-partner-count="pending">—</strong><small>En revisión</small></article></div>
    <div class="dashboard-grid partner-main-grid"><section class="dashboard-card"><div class="dashboard-card-head"><div><span class="overline">PROPONER BENEFICIO</span><h2>Enviar una recompensa</h2><p>Tu propuesta será revisada. No se publicará ni descontará puntos hasta que YucaPass la apruebe.</p></div></div>
      ${['owner','manager'].includes(active?.role)?`<form id="partner-offer-form" class="role-form compact-form"><input type="hidden" name="partnerId" value="${esc(active?.partner_id || '')}"><div class="field full"><label>Nombre del beneficio</label><input name="name" required maxlength="120" placeholder="Ej. Bebida regional de bienvenida"></div><div class="field"><label>Puntos necesarios</label><input name="pointsCost" type="number" min="1" max="100000" required></div><div class="field"><label>Imagen (opcional)</label><input name="image" type="file" accept="image/png,image/jpeg,image/webp"></div><div class="field full"><label>Descripción y condiciones</label><textarea name="description" required maxlength="500" rows="3"></textarea></div><button class="btn btn-forest full-width" type="submit">Enviar propuesta a YucaPass</button></form>`:'<p class="muted-copy">Tu perfil es de consulta. Solo el dueño o encargado puede proponer beneficios.</p>'}
    </section><section class="dashboard-card"><div class="dashboard-card-head"><div><span class="overline">TUS BENEFICIOS</span><h2>Historial de propuestas</h2><p>Consulta cuáles están pendientes, aprobadas o rechazadas.</p></div><button class="icon-action" data-action="partner-refresh" title="Actualizar">↻</button></div><div id="partner-offer-rows" class="dashboard-list"><p class="table-loading">Cargando beneficios…</p></div></section></div>
    ${['owner','manager'].includes(active?.role)?`<section class="dashboard-card dashboard-wide"><div class="dashboard-card-head"><div><span class="overline">EQUIPO DEL PARTICIPANTE</span><h2>Personal y permisos</h2><p>${active?.role==='owner'?'Como propietario puedes asignar encargados y personal.':'Como encargado puedes asignar personal operativo, pero no otros encargados.'}</p></div></div><form id="partner-team-form" class="role-form compact-form"><input type="hidden" name="partnerId" value="${esc(active?.partner_id || '')}"><div class="field"><label>Correo de la cuenta</label><input name="email" type="email" required placeholder="equipo@negocio.com"></div><div class="field"><label>Permiso</label><select name="role">${active?.role==='owner'?'<option value="manager">Encargado</option>':''}<option value="staff">Personal</option></select></div><button class="btn btn-outline" type="submit">Asignar acceso</button></form><div id="partner-team-rows" class="dashboard-list dashboard-list-spaced"><p class="table-loading">Cargando equipo…</p></div></section>`:''}
    ${renderPartnerStampPanel(active, profile)}
    ${['owner','manager'].includes(active?.role) ? renderAnalyticsPanel('partner', active.partner_id, 'Rendimiento de este participante', true) : '<div class="dashboard-security-note"><b>Analítica reservada</b><span>Las métricas y el registro contable están disponibles para el propietario y encargado del participante.</span></div>'}
    <div class="role-workspace-note"><strong>${active?.role==='owner'?'Vista de propietario':active?.role==='manager'?'Vista de encargado':'Vista de personal'}</strong><span>${active?.role==='owner'?'Gestiona equipo, perfil público y propuestas de beneficios.':active?.role==='manager'?'Coordina propuestas de beneficios y personal operativo.':'Consulta el estado del participante y las ofertas publicadas; no puede aprobar ni publicar beneficios.'}</span></div>
    <div class="dashboard-security-note"><b>Acceso privado del participante</b><span>Solo las cuentas asignadas por YucaPass pueden administrar este establecimiento. La información pública cambia únicamente después de una aprobación.</span></div>
  </section>`;
}

function setText(root, selector, value) { const el = root.querySelector(selector); if (el) el.textContent = value; }
function tableMessage(root, selector, message) { const el = root.querySelector(selector); if (el) el.innerHTML = `<tr><td colspan="8" class="table-loading">${esc(message)}</td></tr>`; }

function renderAnalyticsPanel(scopeType, scopeId, title, canWriteFinance) {
  const scope = esc(scopeType);
  const id = esc(scopeId || '');
  return `<section class="dashboard-card dashboard-wide analytics-panel" data-analytics-scope="${scope}" data-analytics-id="${id}">
    <div class="dashboard-card-head analytics-heading"><div><span class="overline">INTELIGENCIA Y RESULTADOS</span><h2>${esc(title || 'Analítica de YucaPass')}</h2><p>Visitas, uso, horarios de mayor actividad y rendimiento. Los visitantes únicos son navegadores que aceptaron la medición anónima; no representan personas identificadas.</p></div><div class="analytics-controls"><label class="analytics-period">Periodo<select data-analytics-days><option value="7">7 días</option><option value="30" selected>30 días</option><option value="90">90 días</option><option value="365">12 meses</option></select></label><button class="btn btn-outline" data-action="analytics-refresh">Actualizar</button></div></div>
    <div class="analytics-kpis">
      <article class="analytics-kpi"><span>Visitas de página</span><strong data-analytics-value="page_views">—</strong><small>Vistas agregadas</small></article>
      <article class="analytics-kpi"><span>Navegadores únicos</span><strong data-analytics-value="unique_visitors">—</strong><small>Sesiones con consentimiento; no equivalen a personas</small></article>
      <article class="analytics-kpi"><span>Vistas de experiencias</span><strong data-analytics-value="experience_views">—</strong><small>Interés en destinos</small></article>
      <article class="analytics-kpi"><span>Sellos emitidos</span><strong data-analytics-value="stamp_claims">—</strong><small>Visitas validadas</small></article>
      <article class="analytics-kpi"><span>Reservaciones creadas</span><strong data-analytics-value="reservations_created">—</strong><small>Registros operativos</small></article>
      <article class="analytics-kpi"><span>Pasaportes activados</span><strong data-analytics-value="guest_activations">—</strong><small>Folios vinculados a una cuenta</small></article>
      <article class="analytics-kpi"><span>Cuentas de huéspedes</span><strong data-analytics-value="guest_accounts_total">—</strong><small><span data-analytics-value="guest_accounts_created">—</span> creadas en el periodo</small></article>
      <article class="analytics-kpi"><span>Enlaces de sello creados</span><strong data-analytics-value="stamp_links_created">—</strong><small>Invitaciones emitidas por participantes</small></article>
      <article class="analytics-kpi"><span>Canjes</span><strong data-analytics-value="reward_redemptions">—</strong><small>Recompensas canjeadas</small></article>
      <article class="analytics-kpi"><span>Participantes aprobados</span><strong data-analytics-value="partner_approval_rate">—</strong><small>Tasa de aprobación de solicitudes</small></article>
      <article class="analytics-kpi"><span>Beneficios aprobados</span><strong data-analytics-value="offer_approval_rate">—</strong><small>Tasa de aprobación de recompensas</small></article>
      <article class="analytics-kpi"><span>Conversión a sello</span><strong data-analytics-value="claim_rate">—</strong><small>Sellos / vistas de experiencia</small></article>
    </div>
    <div class="analytics-grid">
      <section class="analytics-chart-card"><div class="analytics-chart-head"><div><span class="overline">TENDENCIA</span><h3>Actividad por día</h3></div><small>Vistas y visitantes consentidos</small></div><div class="analytics-chart" data-analytics-chart="daily"><p class="table-loading">Cargando actividad…</p></div></section>
      <section class="analytics-chart-card"><div class="analytics-chart-head"><div><span class="overline">HORARIOS</span><h3>Horas con más actividad</h3></div><small>Eventos registrados, no personas · hora de Yucatán</small></div><div class="analytics-chart" data-analytics-chart="hourly"><p class="table-loading">Cargando horarios…</p></div></section>
      <section class="analytics-chart-card"><div class="analytics-chart-head"><div><span class="overline">DESTINOS</span><h3>Experiencias más consultadas</h3></div></div><div class="analytics-chart" data-analytics-chart="top"><p class="table-loading">Cargando experiencias…</p></div></section>
      <section class="analytics-chart-card"><div class="analytics-chart-head"><div><span class="overline">DISPOSITIVOS</span><h3>Origen de las visitas</h3></div></div><div class="analytics-chart" data-analytics-chart="devices"><p class="table-loading">Cargando dispositivos…</p></div></section>
    </div>
    <section class="analytics-finance"><div class="analytics-chart-head"><div><span class="overline">CONTROL CONTABLE</span><h3>Ingresos y gastos registrados</h3><p>Son movimientos capturados manualmente en YucaPass; no son cobros automáticos ni estados bancarios.</p></div></div>
      <div class="analytics-finance-kpis"><div><small>Ingresos</small><strong data-analytics-finance="income">$0.00</strong></div><div><small>Gastos</small><strong data-analytics-finance="expenses">$0.00</strong></div><div><small>Balance registrado</small><strong data-analytics-finance="net">$0.00</strong></div><div><small>Movimientos</small><strong data-analytics-finance="entries">0</strong></div></div>
      <div class="analytics-chart" data-analytics-chart="finance"><p class="table-loading">Cargando movimientos contables…</p></div>
      ${canWriteFinance ? `<form id="financial-entry-form" class="role-form compact-form analytics-entry-form"><input type="hidden" name="scopeType" value="${scope}"><input type="hidden" name="scopeId" value="${id}"><div class="field"><label>Movimiento</label><select name="entryType"><option value="income">Ingreso</option><option value="expense">Gasto</option></select></div><div class="field"><label>Importe (MXN)</label><input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00"></div><div class="field"><label>Categoría</label><input name="category" required maxlength="60" placeholder="Hospedaje, promoción, operación…"></div><div class="field"><label>Fecha</label><input name="occurredOn" type="date" required value="${new Date().toISOString().slice(0,10)}"></div><div class="field full"><label>Descripción</label><input name="description" required maxlength="180" placeholder="Descripción del movimiento"></div><button class="btn btn-gold" type="submit">Registrar movimiento</button></form>` : `<p class="analytics-readonly-note">Solo el propietario o encargado puede registrar ingresos y gastos.</p>`}
    </section>
    <p class="analytics-footnote">Los datos de uso dependen del consentimiento de medición. No se recopilan correos, teléfonos ni ubicación precisa en las estadísticas.</p>
  </section>`;
}

function renderPartnerStampPanel(active, profile) {
  const options = destinations.map(item => `<option value="${esc(item.id)}" data-name="${esc(item.name)}">${esc(item.name)} · ${esc(item.municipality)}</option>`).join('');
  const canIssue = Boolean(active?.partner_id);
  const partnerDestination = `partner-${active?.partner_id || ''}`;
  return `<section class="dashboard-card dashboard-wide stamp-link-panel"><div class="dashboard-card-head"><div><span class="overline">VALIDACIÓN DE VISITAS</span><h2>Enviar un sello digital al visitante</h2><p>Genera un enlace único y envíalo por WhatsApp, correo o el canal del establecimiento. El visitante inicia sesión y el sello se agrega a su pasaporte.</p></div><span class="dashboard-card-icon">✧</span></div>
    ${canIssue ? `<form id="partner-stamp-link-form" class="role-form compact-form"><input type="hidden" name="partnerId" value="${esc(active.partner_id)}"><div class="field full"><label>Lugar o experiencia visitada</label><select name="destinationId" required><option value="${esc(partnerDestination)}" data-name="${esc(profile.name || 'Mi establecimiento')}">Mi establecimiento · ${esc(profile.name || 'Participante')}</option>${options}</select></div><div class="field"><label>Puntos del sello</label><input name="pointsAwarded" type="number" min="1" max="100" value="10" required></div><div class="field"><label>Vigencia del enlace</label><select name="expiryDays"><option value="30">30 días</option><option value="90">90 días</option><option value="180" selected>180 días</option><option value="365">1 año</option></select></div><div class="field"><label>Límite de usos (opcional)</label><input name="maxClaims" type="number" min="1" max="100000" placeholder="Sin límite"></div><button class="btn btn-gold" type="submit">Generar enlace de sello</button></form><div id="partner-stamp-link-result" class="stamp-link-result" aria-live="polite"></div>` : '<p class="muted-copy">No hay un participante activo para emitir sellos.</p>'}
    <div class="stamp-link-history"><div class="dashboard-card-head"><div><span class="overline">ENLACES EMITIDOS</span><h3>Historial de validaciones</h3></div><button class="icon-action" data-action="partner-stamp-links-refresh" title="Actualizar enlaces">↻</button></div><div id="partner-stamp-links-list"><p class="table-loading">Cargando enlaces…</p></div></div>
  </section>`;
}

function renderBarList(rows, labelFn, valueFn, valueLabelFn = valueFn) {
  const values = rows.map(valueFn).map(Number);
  const max = Math.max(1, ...values);
  return rows.map((row, index) => {
    const value = Number(valueFn(row) || 0);
    const label = labelFn(row);
    const width = Math.max(0, Math.min(100, value / max * 100));
    return `<div class="analytics-bar-row"><div class="analytics-bar-label"><span>${esc(label)}</span><b>${esc(valueLabelFn(row))}</b></div><div class="analytics-bar-track"><i style="width:${width.toFixed(1)}%"></i></div></div>`;
  }).join('') || '<p class="muted-copy">Todavía no hay actividad en este periodo.</p>';
}

export async function hydrateAnalyticsPanel(root, scopeType, scopeId = null) {
  const panel = root.querySelector('.analytics-panel');
  if (!panel) return;
  const supabase = await getSupabaseClient();
  const days = Number(panel.querySelector('[data-analytics-days]')?.value || 30);
  const { data, error } = await supabase.rpc('get_yucapass_analytics', {
    p_days: days, p_scope_type: scopeType, p_scope_id: scopeId || null
  });
  if (error) {
    const daily = panel.querySelector('[data-analytics-chart="daily"]');
    if (daily) daily.innerHTML = `<p class="dashboard-error">No se pudieron cargar las métricas: ${esc(error.message)}. Aplica la migración YucaPass 4.2.</p>`;
    return;
  }
  const summary = data?.summary || {};
  for (const key of ['page_views','unique_visitors','experience_views','stamp_claims','stamp_links_created','reservations_created','guest_activations','reward_redemptions','guest_accounts_total','guest_accounts_created']) {
    setText(root, `[data-analytics-value="${key}"]`, Number(summary[key] || 0).toLocaleString('es-MX'));
  }
  for (const key of ['partner_approval_rate','offer_approval_rate']) setText(root, `[data-analytics-value="${key}"]`, `${Number(summary[key] || 0).toLocaleString('es-MX')}%`);
  setText(root, '[data-analytics-value="claim_rate"]', `${Number(summary.claim_rate || 0).toLocaleString('es-MX')}%`);
  const currency = value => Number(value || 0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  for (const key of ['income','expenses','net','entries']) setText(root, `[data-analytics-finance="${key}"]`, key==='entries' ? String(Number(data?.finance?.[key] || 0)) : currency(data?.finance?.[key]));
  const daily = panel.querySelector('[data-analytics-chart="daily"]');
  if (daily) daily.innerHTML = renderBarList(data?.daily || [], r => new Date(`${r.day}T12:00:00`).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}), r => r.page_views, r => `${Number(r.page_views||0)} vistas · ${Number(r.unique_visitors||0)} navegadores`);
  const hourly = panel.querySelector('[data-analytics-chart="hourly"]');
  if (hourly) hourly.innerHTML = renderBarList(data?.hourly || [], r => `${String(r.hour).padStart(2,'0')}:00`, r => r.events, r => `${Number(r.events||0)} eventos`);
  const top = panel.querySelector('[data-analytics-chart="top"]');
  if (top) top.innerHTML = renderBarList(data?.top_experiences || [], r => destinations.find(d=>d.id===r.experience_key)?.name || r.experience_key, r => r.views, r => `${Number(r.views||0)} vistas`);
  const devices = panel.querySelector('[data-analytics-chart="devices"]');
  if (devices) devices.innerHTML = renderBarList(data?.devices || [], r => r.device==='mobile'?'Teléfono':r.device==='desktop'?'Computadora':r.device, r => r.events, r => `${Number(r.events||0)} vistas`);
  const finance = panel.querySelector('[data-analytics-chart="finance"]');
  if (finance) finance.innerHTML = (data?.finance_daily || []).map(r => {
    const maximum = Math.max(1,Number(r.income||0),Number(r.expenses||0));
    const incomeWidth = Math.min(100,Number(r.income||0)/maximum*100);
    const expenseWidth = Math.min(100,Number(r.expenses||0)/maximum*100);
    return `<div class="analytics-finance-row"><span>${new Date(`${r.day}T12:00:00`).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</span><div><i class="income-bar" style="width:${incomeWidth.toFixed(1)}%"></i><i class="expense-bar" style="width:${expenseWidth.toFixed(1)}%"></i></div><small>+${currency(r.income)} / −${currency(r.expenses)}</small></div>`;
  }).join('') || '<p class="muted-copy">No hay movimientos contables registrados en este periodo.</p>';
}

export async function createStampLink(form) {
  const supabase = await getSupabaseClient();
  const selected = form.destinationId.selectedOptions[0];
  const destinationId = form.destinationId.value;
  const destinationName = selected?.dataset.name || selected?.textContent?.split(' · ')[0] || 'Experiencia YucaPass';
  const rawMax = String(form.maxClaims.value || '').trim();
  const { data, error } = await supabase.rpc('issue_visit_stamp_link', {
    p_partner_id: form.partnerId.value,
    p_destination_id: destinationId,
    p_destination_name: destinationName,
    p_points_awarded: Number(form.pointsAwarded.value),
    p_max_claims: rawMax ? Number(rawMax) : null,
    p_expiry_days: Number(form.expiryDays.value)
  });
  if (error) throw error;
  const payload = typeof data === 'string' ? JSON.parse(data) : data;
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('stamp', payload.token);
  url.hash = '';
  const result = document.getElementById('partner-stamp-link-result');
  if (result) result.innerHTML = `<div class="stamp-link-created"><div><strong>Enlace listo para enviar</strong><small>${esc(payload.destination_name)} · +${Number(payload.points_awarded)} puntos · vence ${date(payload.expires_at)}</small></div><input id="partner-stamp-link-url" type="url" readonly value="${esc(url.toString())}" aria-label="Enlace de sello"><div><button type="button" class="btn btn-outline" data-action="copy-stamp-link">Copiar enlace</button><button type="button" class="btn btn-gold" data-action="share-stamp-link">Compartir</button></div></div>`;
  await loadPartnerStampLinks(form.partnerId.value);
  return 'Enlace creado. Compártelo con la persona visitante; el enlace solo se muestra en este momento por seguridad.';
}

export async function submitFinancialEntry(form) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.rpc('record_yucapass_financial_entry', {
    p_scope_type: form.scopeType.value,
    p_scope_id: form.scopeId.value || null,
    p_entry_type: form.entryType.value,
    p_amount: Number(form.amount.value),
    p_category: form.category.value.trim(),
    p_description: form.description.value.trim(),
    p_occurred_on: form.occurredOn.value || null
  });
  if (error) throw error;
  return 'Movimiento contable registrado. Las gráficas se actualizarán.';
}

async function loadPartnerStampLinks(partnerId) {
  const target = document.getElementById('partner-stamp-links-list');
  if (!target) return;
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('list_partner_stamp_links',{p_partner_id:partnerId});
  if (error) { target.innerHTML = `<p class="dashboard-error">No se pudieron consultar los enlaces: ${esc(error.message)}</p>`; return; }
  target.innerHTML = (data || []).map(link => `<div class="dashboard-list-row"><div><strong>${esc(link.destination_name)}</strong><small>+${Number(link.points_awarded)} pts · ${Number(link.claim_count)} usos${link.max_claims?` / ${Number(link.max_claims)}`:''} · vence ${date(link.expires_at)}</small></div><span class="state-pill ${link.active && new Date(link.expires_at)>new Date()?'state-live':'state-paused'}">${link.active && new Date(link.expires_at)>new Date()?'Activo':'Vencido o pausado'}</span></div>`).join('') || '<p class="muted-copy">Todavía no has emitido enlaces de sello.</p>';
}

export async function hydrateHotelOnboarding(root) {
  const target = root.querySelector('#my-hotel-applications');
  if (!target) return;
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('my_hotel_applications');
  if (error) throw error;
  const labels = { pending:'En revisión', approved:'Aprobada · falta activar', rejected:'No aprobada', activated:'Hotel activado' };
  target.innerHTML = (data || []).map(app => `<article class="hotel-application-status"><div><strong>${esc(app.hotel_name)}</strong><small>${esc(app.municipality)} · ${date(app.created_at)}</small>${app.review_notes ? `<small>Nota de revisión: ${esc(app.review_notes)}</small>` : ''}</div><span class="state-pill state-${esc(app.status)}">${esc(labels[app.status] || app.status)}</span></article>`).join('') || '<p class="muted-copy">Todavía no has enviado solicitudes. Completa el formulario para comenzar.</p>';
  const claimForm = root.querySelector('#hotel-invite-claim-form');
  if (claimForm) {
    const canClaim = (data || []).some(app => app.status === 'approved');
    claimForm.hidden = !canClaim;
  }
}

export async function hydrateDashboard(root, page) {
  if (page === 'admin') return loadAdminDashboard(root);
  if (page === 'hotel') return loadHotelDashboard(root);
  if (page === 'participante') return loadPartnerDashboard(root);
}

async function loadAdminDashboard(root) {
  const supabase = await getSupabaseClient();
  const queries = await Promise.all([
    supabase.from('hotels').select('id,name,slug,municipality,is_active,created_at').order('created_at',{ascending:false}).limit(100),
    supabase.from('partner_applications').select('id,name,partner_type,municipality,description,status,created_at,submitted_by,hotel_id').order('created_at',{ascending:false}).limit(100),
    supabase.from('business_partners').select('id,name,partner_type,municipality,is_verified,is_active').order('created_at',{ascending:false}).limit(100),
    supabase.from('experiences').select('id',{count:'exact',head:true}).eq('is_active',true)
  ]);
  const [hotels, apps, partners, experiences] = queries;
  const { data: offerApps, error: offerError } = await supabase.from('partner_offer_applications').select('id,name,description,points_cost,status,partner_id,business_partners(name)').order('created_at',{ascending:false}).limit(100);
  if (offerError) throw offerError;
  for (const q of queries) if (q.error) throw q.error;
  setText(root,'[data-admin-count="hotels"]',String(hotels.data?.length || 0));
  setText(root,'[data-admin-count="applications"]',String((apps.data || []).filter(x=>x.status==='pending').length));
  setText(root,'[data-admin-count="partners"]',String((partners.data || []).filter(x=>x.is_verified && x.is_active).length));
  setText(root,'[data-admin-count="experiences"]',String(experiences.count ?? '—'));
  const hotelRows = root.querySelector('#admin-hotels-rows');
  if (hotelRows) hotelRows.innerHTML = (hotels.data || []).map(h=>`<tr><td><strong>${esc(h.name)}</strong><small>${esc(h.slug)}</small></td><td>${esc(h.municipality)}</td><td><span class="state-pill ${h.is_active?'state-live':'state-paused'}">${h.is_active?'Activo':'Pausado'}</span></td><td><button class="table-action" data-action="admin-toggle-hotel" data-id="${esc(h.id)}" data-active="${h.is_active?'true':'false'}">${h.is_active?'Pausar':'Activar'}</button> <button class="table-action" data-action="admin-assign-owner" data-id="${esc(h.id)}">Asignar dueño</button></td></tr>`).join('') || '<tr><td colspan="4" class="table-loading">Aún no hay hoteles registrados.</td></tr>';
  const appRows = root.querySelector('#admin-applications-rows');
  if (appRows) appRows.innerHTML = (apps.data || []).map(a=>`<tr><td><strong>${esc(a.name)}</strong><small>${esc(a.description).slice(0,90)}</small></td><td>${esc(a.partner_type)}</td><td>${esc(a.municipality)}</td><td>${esc(String(a.submitted_by).slice(0,8))}…</td><td><span class="state-pill state-${esc(a.status)}">${esc(statusLabel[a.status] || a.status)}</span></td><td>${a.status==='pending'?`<button class="table-action" data-action="admin-review-partner" data-id="${esc(a.id)}" data-decision="approved">Aprobar</button> <button class="table-action danger" data-action="admin-review-partner" data-id="${esc(a.id)}" data-decision="rejected">Rechazar</button>`:'—'}</td></tr>`).join('') || '<tr><td colspan="6" class="table-loading">No hay solicitudes de participantes.</td></tr>';
  const published = root.querySelector('#admin-published-partners');
  if (published) published.innerHTML = (partners.data || []).filter(p=>p.is_verified && p.is_active).map(p=>`<div class="dashboard-list-row"><div><strong>${esc(p.name)}</strong><small>${esc(p.partner_type)} · ${esc(p.municipality)}</small></div><span class="state-pill state-live">Publicado</span><button class="table-action" data-action="admin-assign-partner" data-id="${esc(p.id)}">Asignar dueño</button></div>`).join('') || '<p class="table-loading">Todavía no hay participantes aprobados.</p>';
  const offerRows=root.querySelector('#admin-offer-applications-rows');
  if(offerRows) offerRows.innerHTML=(offerApps||[]).map(a=>`<tr><td><strong>${esc(a.name)}</strong><small>${esc(a.description).slice(0,80)}</small></td><td>${esc(a.business_partners?.name||'Participante')}</td><td>${Number(a.points_cost).toLocaleString('es-MX')}</td><td><span class="state-pill state-${esc(a.status)}">${esc(statusLabel[a.status]||a.status)}</span></td><td>${a.status==='pending'?`<button class="table-action" data-action="admin-review-offer" data-id="${esc(a.id)}" data-decision="approved">Aprobar</button> <button class="table-action danger" data-action="admin-review-offer" data-id="${esc(a.id)}" data-decision="rejected">Rechazar</button>`:'—'}</td></tr>`).join('') || '<tr><td colspan="5" class="table-loading">No hay solicitudes de beneficios.</td></tr>';
  const partnerSelect = root.querySelector('#admin-reward-partner');
  if (partnerSelect) partnerSelect.innerHTML = '<option value="">Sin participante</option>' + (partners.data || []).filter(p=>p.is_verified && p.is_active).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  if (getAccessContext().adminRole === 'superadmin') await loadSuperadminTools(root, supabase);
  await hydrateAnalyticsPanel(root, 'platform', null);
}

async function loadSuperadminTools(root, supabase) {
  const summaryTarget = root.querySelector('.superadmin-console');
  if (!summaryTarget) return;
  const [summary, admins, audit, hotelApplications] = await Promise.all([
    supabase.rpc('superadmin_dashboard_summary'),
    supabase.rpc('superadmin_list_platform_admins'),
    supabase.rpc('superadmin_list_admin_audit', { p_limit: 80 }),
    supabase.rpc('superadmin_list_hotel_applications')
  ]);
  const errors = [summary, admins, audit, hotelApplications].filter(result => result.error);
  if (errors.length) {
    const note = document.createElement('div');
    note.className = 'dashboard-error';
    note.textContent = 'Algunas herramientas administrativas no están disponibles en este momento. Comprueba tu conexión y vuelve a intentarlo.';
    summaryTarget.prepend(note);
    return;
  }
  const stats = summary.data || {};
  setText(root,'[data-super-count="admins"]',String(stats.total_admins ?? 0));
  setText(root,'[data-super-count="superadmins"]',String(stats.total_superadmins ?? 0));
  setText(root,'[data-super-count="activeHotels"]',String(stats.active_hotels ?? 0));
  setText(root,'[data-super-count="pending"]',String(Number(stats.pending_partners ?? 0) + Number(stats.pending_offers ?? 0) + (hotelApplications.data || []).filter(x=>x.status==='pending').length));
  const hotelApplicationRows = root.querySelector('#superadmin-hotel-applications-rows');
  const hotelStatus = { pending:'Pendiente', approved:'Aprobada · código pendiente de reclamar', rejected:'Rechazada', activated:'Hotel activado' };
  if (hotelApplicationRows) hotelApplicationRows.innerHTML = (hotelApplications.data || []).map(app => `<tr><td><strong>${esc(app.hotel_name)}</strong><small>${esc(app.website_url || 'Sin sitio web')}</small><small>${esc((app.description || '').slice(0,90))}</small></td><td>${esc(app.municipality)}</td><td><strong>${esc(app.applicant_name || 'Propietario')}</strong><small>${esc(app.applicant_email)}</small></td><td>${date(app.created_at)}</td><td><span class="state-pill state-${esc(app.status)}">${esc(hotelStatus[app.status] || app.status)}</span></td><td>${app.status === 'pending' ? `<button class="table-action" data-action="admin-review-hotel-application" data-id="${esc(app.application_id)}" data-decision="approved" data-name="${esc(app.hotel_name)}">Aprobar y generar código</button> <button class="table-action danger" data-action="admin-review-hotel-application" data-id="${esc(app.application_id)}" data-decision="rejected">Rechazar</button>` : app.status === 'approved' ? `<button class="table-action" data-action="admin-reissue-hotel-invite" data-id="${esc(app.application_id)}" data-name="${esc(app.hotel_name)}">Reemitir código</button>` : app.status === 'activated' ? '<small>Propietario activado</small>' : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="table-loading">No hay solicitudes de hoteles pendientes.</td></tr>';
  const adminRows = root.querySelector('#superadmin-admin-rows');
  if (adminRows) adminRows.innerHTML = (admins.data || []).map(row => `<tr><td><strong>${esc(row.email)}</strong><small>${esc(String(row.user_id).slice(0,8))}…</small></td><td><span class="state-pill ${row.admin_role==='superadmin'?'state-live':'state-paused'}">${row.admin_role==='superadmin'?'Superadministrador':'Administrador'}</span></td><td>${date(row.created_at)}</td><td>${row.email?.toLowerCase()===getAccessContext().user?.email?.toLowerCase() ? '<small>Cuenta actual</small>' : `<button class="table-action danger" data-action="superadmin-remove-admin" data-email="${esc(row.email)}">Retirar acceso</button>`}</td></tr>`).join('') || '<tr><td colspan="4" class="table-loading">No hay administradores registrados.</td></tr>';
  const auditRows = root.querySelector('#superadmin-audit-rows');
  if (auditRows) auditRows.innerHTML = (audit.data || []).map(row => `<tr><td>${date(row.created_at)}</td><td>${esc(row.actor_email || 'Cuenta eliminada')}</td><td>${esc(row.target_email || 'Cuenta eliminada')}</td><td>${esc(row.action)}</td><td>${esc(row.old_role || '—')}</td><td>${esc(row.new_role || '—')}</td></tr>`).join('') || '<tr><td colspan="6" class="table-loading">No hay movimientos administrativos todavía.</td></tr>';
}

async function loadHotelDashboard(root) {
  const ctx = getAccessContext();
  const membership = getActiveMembership();
  if (!membership?.hotel_id) throw new Error('No se encontró una membresía de hotel activa.');
  const supabase = await getSupabaseClient();
  const canManageTeam = ['owner','manager'].includes(membership.role);
  const [reservations, applications, team] = await Promise.all([
    supabase.from('hotel_reservations').select('id,reservation_folio,guest_name,room_reference,guest_count,check_in,check_out,status,guest_user_id,points_awarded_at').eq('hotel_id',membership.hotel_id).order('created_at',{ascending:false}).limit(100),
    supabase.from('partner_applications').select('id,name,partner_type,municipality,status,created_at').eq('hotel_id',membership.hotel_id).order('created_at',{ascending:false}).limit(50),
    canManageTeam ? supabase.rpc('hotel_list_members',{p_hotel_id:membership.hotel_id}) : Promise.resolve({data:[],error:null})
  ]);
  if (reservations.error) throw reservations.error;
  if (applications.error) throw applications.error;
  if (team.error) throw team.error;
  const items = reservations.data || [];
  for (const key of ['all','confirmed','checked_in','completed']) {
    const count = key==='all' ? items.length : items.filter(x=>x.status===key).length;
    setText(root,`[data-hotel-count="${key}"]`,String(count));
  }
  const list = root.querySelector('#hotel-reservation-rows');
  const canTransition = ['owner','manager','reception'].includes(membership.role);
  if (list) list.innerHTML = items.map(r=>`<article class="reservation-admin-row"><div class="reservation-admin-main"><div><span class="overline">${esc(r.reservation_folio)}</span><strong>${esc(r.guest_name)}</strong><small>${r.room_reference?`Hab. ${esc(r.room_reference)} · `:''}${r.guest_count} huésped(es) · ${date(r.check_in)} → ${date(r.check_out)}</small></div><span class="state-pill state-${esc(r.status)}">${esc(statusLabel[r.status]||r.status)}</span></div><div class="reservation-admin-actions">${r.guest_user_id?'<span class="state-pill state-live">Pasaporte vinculado</span>':'<span class="state-pill state-paused">Sin activar</span>'}${r.status==='confirmed'&&canTransition?`<button class="table-action" data-action="hotel-transition" data-id="${esc(r.id)}" data-status="checked_in">Registrar entrada</button>`:''}${r.status==='checked_in'&&canTransition?`<button class="table-action" data-action="hotel-transition" data-id="${esc(r.id)}" data-status="completed">Registrar salida · +100 pts</button>`:''}${['confirmed','checked_in'].includes(r.status)&&canTransition?`<button class="table-action danger" data-action="hotel-transition" data-id="${esc(r.id)}" data-status="cancelled">Cancelar</button>`:''}</div></article>`).join('') || '<div class="empty-state"><h3>Sin reservaciones</h3><p>Las reservaciones que registres aparecerán aquí.</p></div>';
  const appList = root.querySelector('#hotel-applications');
  if (appList) appList.innerHTML = (applications.data || []).map(a=>`<div class="dashboard-list-row"><div><strong>${esc(a.name)}</strong><small>${esc(a.partner_type)} · ${esc(a.municipality)} · ${date(a.created_at)}</small></div><span class="state-pill state-${esc(a.status)}">${esc(statusLabel[a.status]||a.status)}</span></div>`).join('') || '<p class="table-loading">Aún no has propuesto participantes.</p>';
  const teamList = root.querySelector('#hotel-team-rows');
  if (teamList) teamList.innerHTML = (team.data || []).map(member=>`<div class="dashboard-list-row"><div><strong>${esc(member.email || member.user_id)}</strong><small>${esc(member.role)} · ${esc(String(member.user_id).slice(0,8))}…</small></div>${member.role!=='owner' ? `<button class="table-action danger" data-action="hotel-remove-member" data-id="${esc(member.user_id)}" data-hotel-id="${esc(membership.hotel_id)}">Retirar</button>` : '<span class="state-pill state-live">Propietario</span>'}</div>`).join('') || '<p class="table-loading">Aún no hay personal asignado.</p>';
  if (canManageTeam) await hydrateAnalyticsPanel(root,'hotel',membership.hotel_id);
}

async function loadPartnerDashboard(root) {
  const membership = getActivePartnerMembership();
  if (!membership?.partner_id) throw new Error('No se encontró una membresía de participante activa.');
  const supabase = await getSupabaseClient();
  const canManageTeam = ['owner','manager'].includes(membership.role);
  const [profile, offers, rewards, team] = await Promise.all([
    supabase.from('business_partners').select('id,name,partner_type,municipality,description,is_verified,is_active,image_url').eq('id',membership.partner_id).single(),
    supabase.from('partner_offer_applications').select('id,name,description,points_cost,status,approved_reward_id,created_at').eq('partner_id',membership.partner_id).order('created_at',{ascending:false}).limit(100),
    supabase.from('rewards').select('id,name,points_cost,is_active').eq('partner_id',membership.partner_id).eq('is_active',true),
    canManageTeam ? supabase.rpc('partner_list_members',{p_partner_id:membership.partner_id}) : Promise.resolve({data:[],error:null})
  ]);
  for (const q of [profile,offers,rewards,team]) if (q.error) throw q.error;
  setText(root,'[data-partner-status]',profile.data.is_verified && profile.data.is_active ? 'Publicado' : 'En revisión');
  setText(root,'[data-partner-count="active"]',String(rewards.data?.length||0));
  setText(root,'[data-partner-count="pending"]',String((offers.data||[]).filter(x=>x.status==='pending').length));
  const list=root.querySelector('#partner-offer-rows');
  if(list) list.innerHTML=(offers.data||[]).map(o=>`<div class="dashboard-list-row"><div><strong>${esc(o.name)}</strong><small>${Number(o.points_cost).toLocaleString('es-MX')} puntos · ${date(o.created_at)}</small>${o.approved_reward_id?`<small>Recompensa pública: ${esc(o.approved_reward_id)}</small>`:''}</div><span class="state-pill state-${esc(o.status)}">${esc(statusLabel[o.status]||o.status)}</span></div>`).join('') || '<p class="table-loading">Todavía no has enviado propuestas.</p>';
  const teamList=root.querySelector('#partner-team-rows');
  if(teamList) teamList.innerHTML=(team.data||[]).map(member=>`<div class="dashboard-list-row"><div><strong>${esc(member.email || member.user_id)}</strong><small>${esc(member.role)} · ${esc(String(member.user_id).slice(0,8))}…</small></div>${member.role!=='owner'?`<button class="table-action danger" data-action="partner-remove-member" data-id="${esc(member.user_id)}" data-partner-id="${esc(membership.partner_id)}">Retirar</button>`:'<span class="state-pill state-live">Propietario</span>'}</div>`).join('') || '<p class="table-loading">Aún no hay personal asignado.</p>';
  await loadPartnerStampLinks(membership.partner_id);
  if (canManageTeam) await hydrateAnalyticsPanel(root,'partner',membership.partner_id);
}

export async function handleDashboardAction(action) {
  const supabase = await getSupabaseClient();
  if (action.dataset.action === 'admin-review-partner') {
    const ownerEmail = action.dataset.decision === 'approved' ? (window.prompt('Correo de la cuenta YucaPass que administrará este participante (opcional):') || '').trim().toLowerCase() : '';
    const { error } = await supabase.rpc('admin_review_partner_application', { p_application_id: action.dataset.id, p_decision: action.dataset.decision, p_review_notes: null, p_owner_email: ownerEmail || null });
    if (error) throw error;
    return action.dataset.decision === 'approved' ? (ownerEmail ? 'Participante aprobado y responsable asignado si la cuenta existe.' : 'Participante aprobado. Puedes asignar a su dueño desde el listado de participantes.') : 'Solicitud rechazada.';
  }
  if (action.dataset.action === 'admin-review-offer') {
    const { error } = await supabase.rpc('admin_review_partner_offer_application', { p_application_id: action.dataset.id, p_decision: action.dataset.decision, p_review_notes: null });
    if (error) throw error;
    return action.dataset.decision === 'approved' ? 'Beneficio aprobado y publicado en recompensas.' : 'Propuesta de beneficio rechazada.';
  }
  if (action.dataset.action === 'hotel-transition') {
    const { error } = await supabase.rpc('hotel_transition_reservation', { p_reservation_id: action.dataset.id, p_next_status: action.dataset.status });
    if (error) throw error;
    return action.dataset.status === 'completed' ? 'Salida registrada. El servidor acreditó los puntos si corresponde.' : action.dataset.status === 'checked_in' ? 'Entrada registrada.' : 'Reservación cancelada.';
  }
  if (action.dataset.action === 'admin-toggle-hotel') {
    const { error } = await supabase.rpc('admin_set_hotel_active', { p_hotel_id: action.dataset.id, p_is_active: action.dataset.active !== 'true' });
    if (error) throw error;
    return 'Estado del hotel actualizado.';
  }
  if (action.dataset.action === 'admin-assign-owner') {
    const email = window.prompt('Correo de la cuenta YucaPass que será dueña de este hotel:');
    if (!email) return 'Asignación cancelada.';
    const { error } = await supabase.rpc('admin_assign_hotel_member', { p_hotel_id: action.dataset.id, p_email: email.trim().toLowerCase(), p_role: 'owner' });
    if (error) throw error;
    return 'Dueño del hotel asignado correctamente.';
  }
  if (action.dataset.action === 'admin-assign-partner') {
    const email = window.prompt('Correo de la cuenta YucaPass que administrará este participante:');
    if (!email) return 'Asignación cancelada.';
    const { error } = await supabase.rpc('admin_assign_partner_member', { p_partner_id: action.dataset.id, p_email: email.trim().toLowerCase(), p_role: 'owner' });
    if (error) throw error;
    return 'Responsable del participante asignado correctamente.';
  }
  if (action.dataset.action === 'superadmin-remove-admin') {
    const email = action.dataset.email;
    if (!email || !window.confirm(`¿Retirar el acceso administrativo de ${email}?`)) return 'Operación cancelada.';
    const { error } = await supabase.rpc('superadmin_remove_platform_admin', { p_email: email });
    if (error) throw error;
    return 'Acceso administrativo retirado.';
  }
  if (action.dataset.action === 'hotel-remove-member') {
    if (!window.confirm('¿Retirar esta cuenta del equipo del hotel?')) return 'Operación cancelada.';
    const { error } = await supabase.rpc('hotel_remove_member', { p_hotel_id: action.dataset.hotelId, p_user_id: action.dataset.id });
    if (error) throw error;
    return 'Acceso al hotel retirado.';
  }
  if (action.dataset.action === 'partner-remove-member') {
    if (!window.confirm('¿Retirar esta cuenta del equipo del participante?')) return 'Operación cancelada.';
    const { error } = await supabase.rpc('partner_remove_member', { p_partner_id: action.dataset.partnerId, p_user_id: action.dataset.id });
    if (error) throw error;
    return 'Acceso al participante retirado.';
  }
  if (action.dataset.action === 'dashboard-refresh' || action.dataset.action === 'admin-refresh' || action.dataset.action === 'superadmin-refresh' || action.dataset.action === 'hotel-refresh' || action.dataset.action === 'partner-refresh' || action.dataset.action === 'analytics-refresh' || action.dataset.action === 'partner-stamp-links-refresh') return 'Actualizando panel…';
  throw new Error('Acción de panel no reconocida.');
}

export async function createHotelReservation(form) {
  const supabase = await getSupabaseClient();
  const payload = {
    p_hotel_id: form.hotelId.value,
    p_reservation_folio: form.folio.value.trim(),
    p_guest_name: form.guestName.value.trim(),
    p_room_reference: form.room.value.trim() || null,
    p_guest_count: Number(form.guestCount.value),
    p_check_in: form.checkIn.value,
    p_check_out: form.checkOut.value
  };
  const { data, error } = await supabase.rpc('create_hotel_reservation', payload);
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function submitPartnerApplication(form) {
  const supabase = await getSupabaseClient();
  let imageUrl = null;
  const file = form.image?.files?.[0];
  if (file) imageUrl = await uploadImage(supabase, file, `partners/${getAccessContext().user.id}`);
  const { error } = await supabase.rpc('submit_partner_application', {
    p_hotel_id: form.hotelId.value,
    p_name: form.name.value.trim(),
    p_partner_type: form.partnerType.value,
    p_municipality: form.municipality.value.trim(),
    p_description: form.description.value.trim(),
    p_image_url: imageUrl
  });
  if (error) throw error;
  return 'La solicitud se envió al administrador para revisión.';
}

export async function submitHotelApplication(form) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('submit_hotel_application', {
    p_hotel_name: form.hotelName.value.trim(),
    p_municipality: form.municipality.value.trim(),
    p_description: form.description.value.trim(),
    p_website_url: form.websiteUrl.value.trim() || null
  });
  if (error) throw error;
  return data;
}

export async function claimHotelOnboardingInvite(form) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('claim_hotel_onboarding_invite', {
    p_code: form.inviteCode.value.trim().toUpperCase()
  });
  if (error) throw error;
  await refreshAccessContext();
  return data;
}

export async function reviewHotelApplication(action) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('superadmin_review_hotel_application', {
    p_application_id: action.dataset.id,
    p_decision: action.dataset.decision,
    p_review_notes: null,
    p_expiry_days: 7
  });
  if (error) throw error;
  return data;
}

export async function reissueHotelInvite(action) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('superadmin_reissue_hotel_invite', {
    p_application_id: action.dataset.id,
    p_expiry_days: 7
  });
  if (error) throw error;
  return data;
}

export async function createAdminHotel(form) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('admin_create_hotel', {
    p_name: form.name.value.trim(),
    p_slug: form.slug.value.trim() || null,
    p_municipality: form.municipality.value.trim(),
    p_owner_email: form.ownerEmail.value.trim().toLowerCase()
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row?.owner_assigned ? 'Hotel creado y dueño asignado.' : 'Hotel creado. El correo aún no tiene cuenta YucaPass; crea su usuario en Auth y asigna la membresía después.';
}

export async function assignHotelMember(form) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.rpc('hotel_assign_member', {
    p_hotel_id: form.hotelId.value,
    p_email: form.email.value.trim().toLowerCase(),
    p_role: form.role.value
  });
  if (error) throw error;
  return 'Acceso del equipo actualizado.';
}

export async function submitPartnerOffer(form) {
  const supabase = await getSupabaseClient();
  let imageUrl = null;
  const file = form.image?.files?.[0];
  if (file) imageUrl = await uploadImage(supabase,file,`partner-offers/${getAccessContext().user.id}`);
  const { error } = await supabase.rpc('submit_partner_offer_application', {
    p_partner_id: form.partnerId.value,
    p_name: form.name.value.trim(),
    p_description: form.description.value.trim(),
    p_points_cost: Number(form.pointsCost.value),
    p_image_url: imageUrl
  });
  if (error) throw error;
  return 'Propuesta enviada. Se publicará si YucaPass la aprueba.';
}

export async function setPlatformAdminRole(form) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.rpc('superadmin_set_platform_role', {
    p_email: form.email.value.trim().toLowerCase(),
    p_admin_role: form.adminRole.value
  });
  if (error) throw error;
  return 'Nivel administrativo actualizado. La cuenta debe cerrar y volver a iniciar sesión para refrescar sus permisos.';
}

export async function assignPartnerMember(form) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.rpc('partner_assign_member', {
    p_partner_id: form.partnerId.value,
    p_email: form.email.value.trim().toLowerCase(),
    p_role: form.role.value
  });
  if (error) throw error;
  return 'Acceso del equipo participante actualizado.';
}

async function uploadImage(supabase, file, folder) {
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 8 MB.');
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g,'-').slice(-80);
  const path = `${folder}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('yucapass-media').upload(path,file,{upsert:false,contentType:file.type});
  if (error) throw error;
  const { data } = supabase.storage.from('yucapass-media').getPublicUrl(path);
  return data.publicUrl;
}

export async function publishExperience(form) {
  const supabase = await getSupabaseClient();
  let imageUrl = null;
  const file = form.image?.files?.[0];
  if (file) imageUrl = await uploadImage(supabase,file,`experiences/${getAccessContext().user.id}`);
  const row = {
    id: form.id.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-'),
    name: form.name.value.trim(), municipality: form.municipality.value.trim(),
    region: form.region.value.trim(), category: form.category.value,
    description: form.description.value.trim(), source_url: form.sourceUrl.value.trim() || null,
    map_query: form.mapQuery.value.trim() || `${form.name.value.trim()}, ${form.municipality.value.trim()}, Yucatán, México`,
    image_url: imageUrl, is_active: true
  };
  const { error } = await supabase.from('experiences').upsert(row,{onConflict:'id'});
  if (error) throw error;
  return 'Experiencia guardada y publicada en el catálogo.';
}

export async function hydrateGuestPortal(root) {
  const target = root.querySelector('#guest-portfolio');
  if (!target) return;
  const { loadGuestPortfolio } = await import('./access.js');
  const data = await loadGuestPortfolio();
  const ledger = data.ledger.map(row => `<div class="points-row"><span>${esc(row.description)} · ${date(row.created_at)}</span><b class="${row.points < 0 ? 'points-debit' : 'points-credit'}">${row.points > 0 ? '+' : ''}${row.points}</b></div>`).join('') || '<p class="muted-copy">Todavía no hay movimientos de puntos.</p>';
  const reservations = data.reservations.map(row => `<div class="reservation-guest-row"><div><strong>${esc(row.hotels?.name || 'Hotel participante')}</strong><small>${esc(row.reservation_folio)} · ${date(row.check_in)} → ${date(row.check_out)}</small></div><span class="state-pill state-${esc(row.status)}">${esc(statusLabel[row.status] || row.status)}</span><b>${row.points_awarded_at ? 'Puntos acreditados' : 'En proceso'}</b></div>`).join('') || '<p class="muted-copy">Todavía no tienes reservaciones vinculadas.</p>';
  const allStamps = [...data.stamps.map(row => ({name:row.experiences?.name || row.experience_id, municipality:row.experiences?.municipality || '', points:row.points_awarded, created_at:row.created_at, source:'Destino'})), ...(data.partnerStamps || []).map(row => ({name:row.destination_name, municipality:row.business_partners?.municipality || row.business_partners?.name || 'Participante YucaPass', points:row.points_awarded, created_at:row.created_at, source:row.business_partners?.name || 'Participante'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const stamps = allStamps.map(row => `<div class="dashboard-list-row"><div><strong>${esc(row.name)}</strong><small>${esc(row.municipality)} · ${esc(row.source)} · ${date(row.created_at)}</small></div><b class="points-credit">+${Number(row.points || 0)} pts</b></div>`).join('') || '<p class="muted-copy">Tus sellos aparecerán cuando un participante valide tu visita.</p>';
  const redemptions = data.redemptions.map(row => `<div class="dashboard-list-row"><div><strong>${esc(row.rewards?.name || row.reward_id)}</strong><small>Código ${esc(row.redemption_code)} · ${date(row.created_at)}</small></div><span class="state-pill state-${esc(row.status)}">${esc(statusLabel[row.status] || row.status)}</span></div>`).join('') || '<p class="muted-copy">Aún no hay canjes realizados.</p>';
  target.innerHTML = `<div class="remote-guest-metrics"><div><small>Puntos disponibles</small><strong>${Number(data.points).toLocaleString('es-MX')}</strong></div><div><small>Reservaciones</small><strong>${data.reservations.length}</strong></div><div><small>Sellos validados</small><strong>${allStamps.length}</strong></div></div><div class="remote-guest-columns"><section><h3>Tus estancias</h3>${reservations}</section><section><h3>Movimientos de puntos</h3>${ledger}</section><section><h3>Sellos de tu pasaporte</h3>${stamps}</section><section><h3>Recompensas canjeadas</h3>${redemptions}</section></div>`;
}


export async function saveAdminReward(form) {
  const supabase = await getSupabaseClient();
  const row = {
    id: form.id.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-'),
    name: form.name.value.trim(),
    description: form.description.value.trim(),
    points_cost: Number(form.pointsCost.value),
    partner_id: form.partnerId.value || null,
    is_active: form.isActive.checked
  };
  const { error } = await supabase.from('rewards').upsert(row,{onConflict:'id'});
  if (error) throw error;
  return 'Recompensa guardada en Supabase.';
}

export async function hydrateRewards(root) {
  const target = root.querySelector('#public-rewards');
  if (!target) return;
  const context = getAccessContext();
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('rewards').select('id,name,description,points_cost,image_url,partner_id,business_partners(name,municipality)').eq('is_active',true).order('points_cost');
  if (error) throw error;
  if (!(data || []).length) {
    target.innerHTML = '<div class="empty-state"><h3>Estamos preparando nuevos beneficios</h3><p>Las recompensas aparecerán aquí cuando los establecimientos participantes las publiquen y sean aprobadas.</p></div>';
    return;
  }
  target.innerHTML = `<div class="reward-grid">${data.map(r=>`<article class="reward-card"><div class="reward-card-top">${r.image_url?`<img class="reward-image" src="${esc(r.image_url)}" alt="${esc(r.name)}" loading="lazy">`:'<span class="reward-icon">✦</span>'}<span class="reward-category">${esc(r.business_partners?.name || 'YucaPass')}</span></div><span class="overline">BENEFICIO VERIFICADO</span><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p><div class="reward-card-footer"><strong>${Number(r.points_cost).toLocaleString('es-MX')} <small>pts</small></strong><button class="btn ${context.role==='guest'?'btn-forest':'btn-outline'}" data-action="redeem-reward" data-id="${esc(r.id)}" ${context.role==='guest'?'':'disabled'}>${context.role==='guest'?'Canjear':'Inicia sesión'}</button></div></article>`).join('')}</div>`;
}


export async function hydratePublicPartners(root) {
  const target = root.querySelector('#public-partners');
  if (!target) return;
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('business_partners')
    .select('id,name,partner_type,municipality,description,image_url')
    .eq('is_verified',true).eq('is_active',true).order('name').limit(60);
  if (error) throw error;
  if (!(data || []).length) {
    target.innerHTML = '<div class="empty-state"><h3>La red de participantes está creciendo</h3><p>Los comercios y experiencias aparecerán aquí cuando el equipo YucaPass los verifique.</p></div>';
    return;
  }
  target.innerHTML = `<div class="public-partner-grid">${data.map(p=>`<article class="public-partner-card">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`:'<div class="public-partner-fallback">✦</div>'}<div><span class="overline">${esc(p.partner_type)}</span><h3>${esc(p.name)}</h3><small>${esc(p.municipality)} · Yucatán</small><p>${esc(p.description)}</p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.municipality}, Yucatán, México}`)}" target="_blank" rel="noopener noreferrer">Ver ubicación ↗</a></div></article>`).join('')}</div>`;
}
