import { destinations } from './data.js';
import { getState, patchState, updateState, clearDemoProgress } from './storage.js';
import { getActiveGuest } from './reservations.js';
import { getAccessContext, signInWithEmail, signUpGuest, signOutUser, claimReservationInvite, refreshAccessContext, setActiveHotel, setActivePartner, redeemRemoteReward, requestPasswordReset, updateAccountPassword, resendSignupConfirmation, updateGuestAccountProfile } from './access.js';
import { createHotelReservation, submitPartnerApplication, createAdminHotel, publishExperience, saveAdminReward, assignHotelMember, assignPartnerMember, submitPartnerOffer, setPlatformAdminRole, createStampLink, submitFinancialEntry, submitHotelApplication, claimHotelOnboardingInvite, reviewHotelApplication, reissueHotelInvite, handleDashboardAction } from './dashboards.js';
import { renderView, renderModal, renderProfileModal, setPage, setFilter, setQuery, setRegion, showFavorites, currentPage } from './pages.js';
import { trackEvent, setAnalyticsConsent, claimPendingVisitStamp, hasPendingStamp } from './analytics.js';

let activeModal = null;
const root = document.getElementById('view-root');
const modalRoot = document.getElementById('modal-root');
const toast = document.getElementById('toast');
let toastTimer;
let pageStack = [currentPage];
export function notify(message){
  toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'),3600);
}
export function refresh(){ renderView(root); }
function openModal(markup){ modalRoot.innerHTML=markup;modalRoot.classList.add('open');modalRoot.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'; }
function closeModal(){ activeModal=null;modalRoot.classList.remove('open');modalRoot.setAttribute('aria-hidden','true');modalRoot.innerHTML='';document.body.style.overflow=''; }
function openDetails(id){ const item=destinations.find(d=>d.id===id);if(!item)return;activeModal={type:'details',id};trackEvent('experience_view',{experienceKey:id,screen:'explorar'});openModal(renderModal(item,getState())); }
function openProfile(){activeModal={type:'profile'};openModal(renderProfileModal(getState()));}
function friendlyHotelApplicationError(error){
  const raw=String(error?.message||error?.details||error?.hint||'').toUpperCase();
  const code=String(error?.code||'').toUpperCase();
  if(raw.includes('EMAIL_CONFIRMATION_REQUIRED')) return 'Antes de enviar la solicitud, confirma tu correo electrónico desde el mensaje que recibiste.';
  if(raw.includes('AUTHENTICATION_REQUIRED')) return 'Tu sesión terminó. Inicia sesión nuevamente para enviar la solicitud.';
  if(raw.includes('ACCOUNT_ALREADY_HAS_HOTEL_ACCESS')) return 'Esta cuenta ya está vinculada a un hotel. Abre el panel del establecimiento.';
  if(raw.includes('HOTEL_APPLICATION_ALREADY_PENDING_OR_APPROVED')) return 'Ya tienes una solicitud en revisión o aprobada. Consulta su estado en esta misma página.';
  if(raw.includes('INVALID_HOTEL_APPLICATION_DATA')) return 'Revisa el nombre, municipio y descripción. La descripción debe tener al menos 20 caracteres.';
  if(raw.includes('WEBSITE_URL_MUST_USE_HTTP_OR_HTTPS')) return 'La página web debe comenzar con https:// o http://.';
  if(code==='PGRST202'||raw.includes('COULD NOT FIND THE FUNCTION')||raw.includes('FUNCTION PUBLIC.SUBMIT_HOTEL_APPLICATION')) return 'El servicio de registro no está disponible en este momento. Actualiza la página y vuelve a intentarlo.';
  if(code==='42501'||raw.includes('PERMISSION DENIED')) return 'Tu cuenta todavía no tiene permiso para enviar esta solicitud. Cierra sesión y vuelve a entrar.';
  return 'No pudimos enviar la solicitud. Comprueba tu conexión y que todos los campos estén completos. Si vuelve a ocurrir, comparte este detalle con soporte: '+(error?.message||'error no identificado');
}

function updateProfileName(){
  const ctx=getAccessContext();
  const state=getState();
  const guest=getActiveGuest(state);
  const name=ctx.guestProfile?.display_name || ctx.user?.email || guest?.guestName || state.profile.name || 'Visitante';
  document.querySelectorAll('.profile-name').forEach(el=>el.textContent=name);
  document.querySelectorAll('.profile-avatar').forEach(el=>el.textContent=(name||'V').trim().charAt(0).toUpperCase());
}
function updateBackButton(){
  const button=document.querySelector('[data-action="go-back"]');
  if(button) button.disabled=pageStack.length<=1;
}
function closeMobileMenu(){
  document.body.classList.remove('mobile-menu-open');
  const toggle=document.querySelector('[data-action="toggle-menu"]');
  if(toggle) toggle.setAttribute('aria-expanded','false');
}
async function copyTextToClipboard(value){
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(value);
    return true;
  }
  const field=document.createElement('textarea');
  field.value=value;field.setAttribute('readonly','');
  field.style.position='fixed';field.style.opacity='0';field.style.pointerEvents='none';
  document.body.appendChild(field);field.select();
  const copied=document.execCommand('copy');field.remove();
  if(!copied) throw new Error('No se pudo copiar automáticamente. Mantén pulsado el enlace para copiarlo.');
  return true;
}
function go(page, options={}){
  if(page!==currentPage && !options.replace){
    pageStack.push(page);
    window.history.pushState({yucapassPage:page},'',window.location.href);
  } else if(options.replace){
    pageStack=[page];
    window.history.replaceState({yucapassPage:page},'',window.location.href);
  }
  setPage(page);refresh();closeModalIfOpen();closeMobileMenu();updateBackButton();
  document.getElementById('view-root').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'smooth'});
  const ctx=getAccessContext();
  const details={screen:page,hotelId:ctx.role==='hotel_owner'?ctx.selectedHotelId:null,partnerId:ctx.role==='partner_owner'?ctx.selectedPartnerId:null};
  const eventType=page==='hotel'?'hotel_service_view':page==='participante'?'partner_service_view':'page_view';
  trackEvent(eventType,details);
}
function goBack(){
  if(pageStack.length>1){ window.history.back(); return; }
  if(currentPage!=='inicio') go('inicio');
}

function closeModalIfOpen(){if(activeModal)closeModal();}
function renderActiveModal(){if(!activeModal)return;if(activeModal.type==='details'){const item=destinations.find(d=>d.id===activeModal.id);if(item)openModal(renderModal(item,getState()));}else if(activeModal.type==='profile')openModal(renderProfileModal(getState()));}
async function runAction(action){
  try {
    if (action.dataset.action === 'toggle-menu') {
      const open=!document.body.classList.contains('mobile-menu-open');
      document.body.classList.toggle('mobile-menu-open',open);
      action.setAttribute('aria-expanded',String(open));
      return;
    }
    if (action.dataset.action === 'close-menu') { closeMobileMenu(); return; }
    if (action.dataset.action === 'go-back') { goBack(); return; }
    if (action.dataset.action === 'toggle-password') {
      const input = document.getElementById(action.dataset.target);
      if (input) { const reveal = input.type === 'password'; input.type = reveal ? 'text' : 'password'; action.textContent = reveal ? 'Ocultar' : 'Mostrar'; action.setAttribute('aria-label', reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'); }
      return;
    }
    if (action.dataset.action === 'analytics-consent-yes' || action.dataset.action === 'analytics-consent-no') {
      const granted=action.dataset.action==='analytics-consent-yes';
      setAnalyticsConsent(granted?'granted':'denied');
      if(granted) trackEvent('page_view',{screen:currentPage,source:'consent_opt_in'});
      notify(granted?'Gracias. Mediremos el uso de forma agregada.':'Listo. Solo se usarán funciones necesarias.');
      return;
    }
    if (action.dataset.action === 'claim-pending-stamp') {
      const result=await claimPendingVisitStamp();
      go('pasaporte');
      notify(`Sello agregado a tu pasaporte: ${result?.destination_name || 'visita validada'} · +${Number(result?.points_awarded||0)} puntos.`);
      return;
    }
    if (action.dataset.action === 'copy-stamp-link' || action.dataset.action === 'share-stamp-link') {
      const url=action.dataset.url || document.getElementById('partner-stamp-link-url')?.value;
      if(!url) throw new Error('Genera primero un enlace de sello.');
      if(action.dataset.action==='share-stamp-link' && navigator.share){
        await navigator.share({title:'Tu sello YucaPass',text:'Guarda tu visita en tu pasaporte digital YucaPass.',url});
      } else {
        await copyTextToClipboard(url);
        notify('Enlace de sello copiado. Envíalo al visitante por el canal del establecimiento.');
      }
      return;
    }
    if (action.dataset.action === 'copy-hotel-invite-code') {
      const code = document.getElementById('hotel-invite-result-code')?.textContent?.trim();
      if (!code) throw new Error('No hay un código de hotel disponible para copiar.');
      await copyTextToClipboard(code);
      notify('Código copiado. Envíalo únicamente al correo solicitante.');
      return;
    }
    if (action.dataset.action === 'hotel-applications-refresh') {
      refresh();
      notify('Actualizando tus solicitudes…');
      return;
    }
    if (action.dataset.action === 'admin-review-hotel-application' || action.dataset.action === 'admin-reissue-hotel-invite') {
      const decision = action.dataset.decision;
      if (decision === 'rejected' && !window.confirm('¿Deseas rechazar esta solicitud de hotel?')) return;
      const result = action.dataset.action === 'admin-reissue-hotel-invite' ? await reissueHotelInvite(action) : await reviewHotelApplication(action);
      refresh();
      if (result?.invite_code) {
        const panel = document.getElementById('hotel-invite-result');
        const name = document.getElementById('hotel-invite-result-name');
        const code = document.getElementById('hotel-invite-result-code');
        const expiry = document.getElementById('hotel-invite-result-expiry');
        if (panel && name && code && expiry) {
          panel.hidden = false;
          name.textContent = action.dataset.name || 'Hotel aprobado';
          code.textContent = result.invite_code;
          expiry.textContent = `Vence: ${new Date(result.expires_at).toLocaleString('es-MX')}. El código se muestra ahora; cópialo y entrégalo al propietario.`;
        }
        notify(action.dataset.action === 'admin-reissue-hotel-invite' ? 'Código anterior invalidado. Copia y entrega el nuevo código.' : 'Hotel aprobado. Copia el código de activación para entregarlo al solicitante.');
      } else {
        notify(decision === 'rejected' ? 'Solicitud de hotel rechazada.' : 'Solicitud revisada.');
      }
      return;
    }
    if (action.dataset.action === 'staff-logout' || action.dataset.action === 'guest-logout') {
      await signOutUser();
      updateProfileName();go('inicio');notify('Sesión cerrada correctamente.');return;
    }
    if (['admin-review-partner','admin-review-offer','admin-assign-partner','hotel-transition','admin-toggle-hotel','admin-assign-owner','admin-refresh','hotel-refresh','partner-refresh','superadmin-remove-admin','superadmin-refresh','hotel-remove-member','partner-remove-member','analytics-refresh','partner-stamp-links-refresh'].includes(action.dataset.action)) {
      const message=await handleDashboardAction(action);
      if (action.dataset.action.includes('refresh')) notify('Panel actualizado.');
      else {refresh();notify(message);}
      if (action.dataset.action.includes('refresh')) refresh();
      return;
    }
    const id=action.dataset.id;
    switch(action.dataset.action){
      case 'favorites': showFavorites();refresh();window.scrollTo({top:0,behavior:'smooth'});break;
      case 'profile': openProfile();break;
      case 'redeem-reward': { const result=await redeemRemoteReward(id);go('pasaporte');notify(`Canje realizado. Tu código es ${result?.redemption_code || result?.[0]?.redemption_code || 'consulta tu pasaporte'}.`);break; }
      case 'details': openDetails(id);break;
      case 'close-modal': closeModal();break;
      case 'favorite': {
        const state=updateState(s=>({...s,favorites:s.favorites.includes(id)?s.favorites.filter(x=>x!==id):[...s.favorites,id]}));
        const saved=state.favorites.includes(id);notify(saved?'Destino guardado en tus favoritos.':'Destino eliminado de favoritos.');
        if(activeModal?.type==='details')renderActiveModal();else refresh();break;
      }
      case 'stamp': {
        const item=destinations.find(d=>d.id===id);if(!item)break;
        const state=getState();if(state.stamps.includes(id)){notify('Ya guardaste esta visita de muestra.');break;}
        updateState(s=>({...s,stamps:[...s.stamps,id]}));closeModal();refresh();notify(`Visita guardada en este dispositivo: ${item.name}. Este sello es ilustrativo; los puntos reales requieren validación de un participante.`);break;
      }
      case 'map': {
        const item=destinations.find(d=>d.id===id);if(item){trackEvent('map_opened',{experienceKey:id,screen:'experience_detail'});window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapQuery)}`,'_blank','noopener,noreferrer');}break;
      }
      case 'reset-progress': {
        if(window.confirm('¿Reiniciar los sellos y favoritos de demostración de este dispositivo?')){clearDemoProgress();refresh();notify('Se reinició el progreso local de demostración.');}break;
      }
      default: break;
    }
  } catch(err) { notify(err?.message || 'No se pudo completar la acción.'); }
}

export function initEvents(){
  window.history.replaceState({yucapassPage:currentPage},'',window.location.href);
  updateProfileName();
  updateBackButton();
  document.addEventListener('yucapass:toast',event=>{ if(event.detail?.message) notify(event.detail.message); });
  document.addEventListener('yucapass:password-recovery', () => go('cuenta', { replace: true }));
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-nav]');
    if(nav){event.preventDefault();go(nav.dataset.nav);return;}
    const category=event.target.closest('[data-category]');
    if(category){setFilter(category.dataset.category);setQuery('');go('explorar');return;}
    const filter=event.target.closest('[data-filter]');
    if(filter){setFilter(filter.dataset.filter);refresh();return;}
    const action=event.target.closest('[data-action]');
    if(action) runAction(action);
  });
  modalRoot.addEventListener('click',event=>{if(event.target===modalRoot)closeModal();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&activeModal)closeModal();
    if(event.key==='Escape'&&document.body.classList.contains('mobile-menu-open'))closeMobileMenu();
  });
  window.addEventListener('popstate',event=>{
    if(pageStack.length>1) pageStack.pop();
    const target=event.state?.yucapassPage || pageStack.at(-1) || 'inicio';
    setPage(target);refresh();closeModalIfOpen();closeMobileMenu();updateBackButton();window.scrollTo({top:0,behavior:'smooth'});
  });
  const globalSearch=document.getElementById('global-search');
  if(globalSearch){
    globalSearch.addEventListener('keydown',event=>{if(event.key==='Enter'){setQuery(globalSearch.value);setFilter('Todas');setRegion('Todas');go('explorar');}});
    globalSearch.addEventListener('input',()=>{if(!globalSearch.value.trim() && currentPage==='explorar'){setQuery('');refresh();}});
  }
  document.addEventListener('change',event=>{
    if(event.target.id==='region-filter'){setRegion(event.target.value);refresh();return;}
    if(event.target.id==='journey-area'){patchState({area:event.target.value});refresh();return;}
    if(event.target.id==='journey-stage'){patchState({stage:event.target.value});refresh();return;}
    if(event.target.id==='hotel-switch'){
      try{setActiveHotel(event.target.value);refresh();notify('Establecimiento activo actualizado.');}catch(err){notify(err.message);}return;
    }
    if(event.target.id==='partner-switch'){
      try{setActivePartner(event.target.value);refresh();notify('Participante activo actualizado.');}catch(err){notify(err.message);}return;
    }
    if(event.target.matches('[data-interest]')){
      const name=event.target.dataset.interest;
      updateState(s=>({...s,interests:event.target.checked?[...new Set([...s.interests,name])]:s.interests.filter(x=>x!==name)}));
      refresh();return;
    }
  });
  document.addEventListener('submit',async event=>{
    const form=event.target;
    try {
      if(form.id==='profile-form'){
        event.preventDefault();
        const name=document.getElementById('profile-name').value.trim()||'Visitante';
        const language=document.getElementById('profile-language').value;
        const recommendations=document.getElementById('profile-recommendations').checked;
        patchState({profile:{name,language,recommendations}});updateProfileName();closeModal();notify('Preferencias guardadas en este dispositivo.');return;
      }
      if(form.id==='staff-login-form'){
        event.preventDefault();
        const ctx=await signInWithEmail(form.email.value,form.password.value);
        if(ctx.role==='admin' || ctx.role==='superadmin'){updateProfileName();go('inicio');notify(ctx.role==='superadmin'?'Bienvenido. Tu experiencia pública y centro de superadministración están habilitados.':'Acceso administrativo autorizado. Puedes abrir Administración desde el menú.');}
        else if(ctx.role==='hotel_owner'){updateProfileName();go('hotel');notify('Acceso al panel del hotel autorizado.');}
        else if(ctx.role==='partner_owner'){updateProfileName();go('participante');notify('Acceso al panel del participante autorizado.');}
        else {await signOutUser();throw new Error('Esta cuenta no tiene permisos de administrador ni de personal de hotel. Solicita que te asignen una membresía.');}
        return;
      }
      if(form.id==='guest-signup-form'){
        event.preventDefault();
        if(form.password.value !== form.passwordConfirm.value) throw new Error('Las contraseñas no coinciden.');
        const result=await signUpGuest({email:form.email.value,password:form.password.value,displayName:form.displayName.value});
        form.reset();
        if(result.needsEmailConfirmation){
          go('cuenta');
          notify('Cuenta creada. Revisa tu correo y confirma la dirección antes de iniciar sesión.');
        } else {
          await refreshAccessContext();
          if(hasPendingStamp()){
            try{const stamp=await claimPendingVisitStamp();notify(`Cuenta creada y sello guardado: ${stamp?.destination_name||'visita validada'}.`);}
            catch(err){notify(`Cuenta creada. El enlace de sello sigue pendiente: ${err.message}`);}
          } else notify('Cuenta creada correctamente. Ya puedes vincular el folio que te entregó el hotel.');
          updateProfileName();go('cuenta');
        }
        return;
      }
      if(form.id==='guest-login-form'){
        event.preventDefault();
        const ctx=await signInWithEmail(form.email.value,form.password.value);
        if(ctx.role==='admin' || ctx.role==='superadmin'){updateProfileName();go('inicio');notify(ctx.role==='superadmin'?'Bienvenido a YucaPass. Tu centro de superadministración está disponible en el menú.':'Acceso administrativo autorizado.');}
        else if(ctx.role==='hotel_owner'){go('hotel');notify('Acceso al panel del hotel autorizado.');}
        else if(ctx.role==='partner_owner'){go('participante');notify('Acceso al panel del participante autorizado.');}
        else {
          if(hasPendingStamp()){
            try{const stamp=await claimPendingVisitStamp();notify(`Sello guardado: ${stamp?.destination_name||'visita validada'} · +${Number(stamp?.points_awarded||0)} puntos.`);}
            catch(err){notify(`Sesión iniciada. El sello permanece pendiente: ${err.message}`);}
          }
          updateProfileName();go('cuenta');
          if(!hasPendingStamp()) notify(ctx.role==='guest'?'Bienvenido a tu cuenta YucaPass.':'Sesión iniciada. Ahora vincula tu folio de reservación.');
        }
        return;
      }
      if(form.id==='guest-reset-form' || form.id==='staff-reset-form'){
        event.preventDefault();
        await requestPasswordReset(form.email.value);
        form.reset();
        notify('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también spam.');
        return;
      }
      if(form.id==='guest-resend-form'){
        event.preventDefault();
        await resendSignupConfirmation(form.email.value);
        form.reset();
        notify('Si la cuenta está pendiente de confirmación, recibirás un nuevo correo.');
        return;
      }
      if(form.id==='account-password-update-form'){
        event.preventDefault();
        await updateAccountPassword(form.password.value, form.passwordConfirm.value);
        form.reset();
        go('cuenta', { replace: true });
        notify('Contraseña actualizada correctamente.');
        return;
      }
      if(form.id==='guest-profile-update-form'){
        event.preventDefault();
        await updateGuestAccountProfile({
          displayName: form.displayName.value,
          preferredLanguage: form.preferredLanguage.value,
          recommendationsEnabled: form.recommendationsEnabled.checked
        });
        updateProfileName();refresh();notify('Datos de tu cuenta actualizados.');return;
      }
      if(form.id==='guest-claim-form'){
        event.preventDefault();
        await claimReservationInvite({folio:form.folio.value,activationCode:form.activationCode.value,displayName:getAccessContext().guestProfile?.display_name});
        if(hasPendingStamp()){
          try{const stamp=await claimPendingVisitStamp();notify(`Reservación vinculada y sello guardado: ${stamp?.destination_name||'visita validada'}.`);}
          catch(err){notify(`Reservación vinculada. El sello sigue pendiente: ${err.message}`);}
        } else notify('Reservación vinculada correctamente a tu pasaporte.');
        updateProfileName();go('pasaporte');return;
      }
      if(form.id==='hotel-reservation-form'){
        event.preventDefault();
        const row=await createHotelReservation(form);
        refresh();
        const invite=`Folio: ${row.reservation_folio}\nCódigo de activación: ${row.activation_code}\nVence: ${row.invite_expires_at}`;
        try{await navigator.clipboard?.writeText(invite);}catch{}
        notify(`Reservación creada. Código de un solo uso: ${row.activation_code}. Entrégalo al huésped ahora.`);return;
      }
      if(form.id==='hotel-application-form'){
        event.preventDefault();
        if(!form.reportValidity()) return;
        const button=form.querySelector('button[type="submit"]');
        const previousText=button?.innerHTML;
        if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Enviando solicitud…';}
        try{
          await submitHotelApplication(form);
          form.reset();
          refresh();
          notify('¡Solicitud recibida! Podrás consultar aquí su estado. Si es aprobada, te enviaremos el código para activar tu hotel.');
        }catch(error){
          notify(friendlyHotelApplicationError(error));
        }finally{
          if(button){button.disabled=false;button.removeAttribute('aria-busy');if(previousText)button.innerHTML=previousText;}
        }
        return;
      }
      if(form.id==='hotel-invite-claim-form'){
        event.preventDefault();
        const result = await claimHotelOnboardingInvite(form);
        updateProfileName();
        go('hotel');
        notify(`Hotel ${result?.hotel_name || ''} activado. Ya puedes administrar tu establecimiento.`);
        return;
      }
      if(form.id==='partner-application-form'){
        event.preventDefault();const message=await submitPartnerApplication(form);refresh();notify(message);return;
      }
      if(form.id==='hotel-team-form'){
        event.preventDefault();const message=await assignHotelMember(form);form.reset();refresh();notify(message);return;
      }
      if(form.id==='partner-offer-form'){
        event.preventDefault();const message=await submitPartnerOffer(form);form.reset();refresh();notify(message);return;
      }
      if(form.id==='partner-team-form'){
        event.preventDefault();const message=await assignPartnerMember(form);form.reset();refresh();notify(message);return;
      }
      if(form.id==='partner-stamp-link-form'){
        event.preventDefault();const message=await createStampLink(form);notify(message);return;
      }
      if(form.id==='financial-entry-form'){
        event.preventDefault();const message=await submitFinancialEntry(form);form.reset();refresh();notify(message);return;
      }
      if(form.id==='superadmin-role-form'){
        event.preventDefault();const message=await setPlatformAdminRole(form);form.reset();refresh();notify(message);return;
      }
      if(form.id==='admin-hotel-form'){
        event.preventDefault();const message=await createAdminHotel(form);form.reset();refresh();notify(message);return;
      }
      if(form.id==='admin-experience-form'){
        event.preventDefault();const message=await publishExperience(form);form.reset();refresh();notify(message);return;
      }
      if(form.id==='admin-reward-form'){
        event.preventDefault();const message=await saveAdminReward(form);form.reset();refresh();notify(message);return;
      }
    } catch(err) { console.error('YucaPass: acción no completada.',err); notify('No pudimos completar esta acción. Revisa los datos e inténtalo de nuevo.'); }
  });
  document.addEventListener('yucapass:access-updated',()=>{updateProfileName();refresh();});
  window.addEventListener('online',()=>notify('Conexión recuperada.'));
}
