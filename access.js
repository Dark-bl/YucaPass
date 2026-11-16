import { getSupabaseClient } from './supabase-client.js';

let accessContext = {
  loading: true,
  session: null,
  user: null,
  role: 'visitor',
  adminRole: null,
  memberships: [],
  selectedHotelId: null,
  partnerMemberships: [],
  selectedPartnerId: null,
  guestProfile: null,
  recoveryMode: false,
  error: null
};
let authSubscription = null;
let passwordRecoveryMode = false;
const HOTEL_KEY = 'yucapass-active-hotel-v4';
const PARTNER_KEY = 'yucapass-active-partner-v4';

export function getAccessContext() {
  return {
    ...accessContext,
    memberships: [...(accessContext.memberships || [])],
    partnerMemberships: [...(accessContext.partnerMemberships || [])]
  };
}

export function getActiveMembership() {
  const memberships = accessContext.memberships || [];
  return memberships.find(m => m.hotel_id === accessContext.selectedHotelId) || memberships[0] || null;
}

export function getActivePartnerMembership() {
  const memberships = accessContext.partnerMemberships || [];
  return memberships.find(m => m.partner_id === accessContext.selectedPartnerId) || memberships[0] || null;
}

export function setActiveHotel(hotelId) {
  if (!(accessContext.memberships || []).some(m => m.hotel_id === hotelId)) {
    throw new Error('No tienes acceso a ese establecimiento.');
  }
  accessContext.selectedHotelId = hotelId;
  localStorage.setItem(HOTEL_KEY, hotelId);
  return getActiveMembership();
}

export function setActivePartner(partnerId) {
  if (!(accessContext.partnerMemberships || []).some(m => m.partner_id === partnerId)) {
    throw new Error('No tienes acceso a ese participante.');
  }
  accessContext.selectedPartnerId = partnerId;
  localStorage.setItem(PARTNER_KEY, partnerId);
  return getActivePartnerMembership();
}

async function readPlatformRole(supabase, userId) {
  let result = await supabase
    .from('platform_admins')
    .select('user_id,admin_role')
    .eq('user_id', userId)
    .maybeSingle();

  // Compatibilidad durante la transición si la migración de admin_role aún no se aplicó.
  if (result.error?.code === '42703' || result.error?.code === 'PGRST204') {
    result = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!result.error && result.data) return { isAdmin: true, adminRole: 'admin' };
  }
  if (result.error && !['PGRST205', '42P01'].includes(result.error.code)) throw result.error;
  if (!result.data) return { isAdmin: false, adminRole: null };
  return {
    isAdmin: true,
    adminRole: result.data.admin_role === 'superadmin' ? 'superadmin' : 'admin'
  };
}

async function resolveForSession(session) {
  if (!session?.user) {
    accessContext = {
      loading: false, session: null, user: null, role: 'visitor', adminRole: null,
      memberships: [], selectedHotelId: null, partnerMemberships: [],
      selectedPartnerId: null, guestProfile: null, recoveryMode: passwordRecoveryMode, error: null
    };
    return getAccessContext();
  }

  const user = session.user;
  let role = 'visitor';
  let adminRole = null;
  let memberships = [];
  let partnerMemberships = [];
  let guestProfile = null;
  let error = null;

  try {
    const supabase = await getSupabaseClient();
    const [platform, hotelResult, partnerResult, profileResult] = await Promise.all([
      readPlatformRole(supabase, user.id),
      supabase.from('hotel_members').select('hotel_id,role,created_at,hotels(id,name,municipality,is_active)').eq('user_id', user.id),
      supabase.from('partner_members').select('partner_id,role,created_at,business_partners(id,name,municipality,partner_type,is_verified,is_active)').eq('user_id', user.id),
      supabase.from('guest_profiles').select('user_id,display_name,login_folio_display,preferred_language,recommendations_enabled').eq('user_id', user.id).maybeSingle()
    ]);

    for (const result of [hotelResult, partnerResult, profileResult]) {
      if (result.error && !['PGRST205', '42P01'].includes(result.error.code)) throw result.error;
    }

    memberships = hotelResult.data || [];
    partnerMemberships = partnerResult.data || [];
    guestProfile = profileResult.data || null;
    adminRole = platform.adminRole;

    // Jerarquía: administración de plataforma > hotel > participante > huésped.
    if (platform.isAdmin) role = platform.adminRole;
    else if (memberships.length) role = 'hotel_owner';
    else if (partnerMemberships.length) role = 'partner_owner';
    else role = 'guest'; // Toda cuenta autenticada sin un rol operativo es una cuenta de viajero; permite reclamar sellos antes de activar un folio hotelero.
  } catch (err) {
    error = err?.message || 'No se pudo comprobar el perfil de acceso.';
  }

  const savedHotel = localStorage.getItem(HOTEL_KEY);
  const selectedHotelId = memberships.some(m => m.hotel_id === savedHotel)
    ? savedHotel : (memberships[0]?.hotel_id || null);
  const savedPartner = localStorage.getItem(PARTNER_KEY);
  const selectedPartnerId = partnerMemberships.some(m => m.partner_id === savedPartner)
    ? savedPartner : (partnerMemberships[0]?.partner_id || null);

  accessContext = {
    loading: false, session, user, role, adminRole, memberships,
    selectedHotelId, partnerMemberships, selectedPartnerId, guestProfile, recoveryMode: passwordRecoveryMode, error
  };
  return getAccessContext();
}

export async function refreshAccessContext() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return resolveForSession(data.session);
}

export async function initAccessContext() {
  try {
    const supabase = await getSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryMode = true;
        document.dispatchEvent(new CustomEvent('yucapass:password-recovery'));
      }
      if (event === 'SIGNED_OUT') passwordRecoveryMode = false;
      Promise.resolve().then(async () => {
        let context = await resolveForSession(session);
        if (event === 'SIGNED_IN' && context.role === 'guest' && !context.guestProfile) {
          try { await ensureGuestProfile(context.user?.user_metadata?.display_name || ''); context = await refreshAccessContext(); }
          catch (profileError) { accessContext.error = profileError?.message || 'No se pudo preparar el perfil de viajero.'; }
        }
        document.dispatchEvent(new CustomEvent('yucapass:access-updated'));
      }).catch(() => {});
    });
    authSubscription = data?.subscription || null;
    let context = await refreshAccessContext();
    if (context.user && context.role === 'guest' && !context.guestProfile) {
      try { await ensureGuestProfile(context.user?.user_metadata?.display_name || ''); context = await refreshAccessContext(); }
      catch (profileError) { accessContext.error = profileError?.message || 'No se pudo preparar el perfil de viajero.'; context = getAccessContext(); }
    }
    return context;
  } catch (err) {
    accessContext = {
      loading: false, session: null, user: null, role: 'visitor', adminRole: null,
      memberships: [], selectedHotelId: null, partnerMemberships: [],
      selectedPartnerId: null, guestProfile: null, recoveryMode: passwordRecoveryMode,
      error: err?.message || 'Supabase no está disponible.'
    };
    return getAccessContext();
  }
}

async function ensureGuestProfile(displayName = '') {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('ensure_guest_profile', {
    p_display_name: String(displayName || accessContext.user?.user_metadata?.display_name || '').trim() || null
  });
  if (error) throw new Error(`No se pudo preparar tu perfil de viajero: ${error.message}`);
  return data;
}

export async function signInWithEmail(email, password) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim(), password: String(password || '')
  });
  if (error) throw error;
  let context = await resolveForSession(data.session);
  if (context.role === 'guest') {
    await ensureGuestProfile(context.user?.user_metadata?.display_name || '');
    context = await refreshAccessContext();
  }
  return context;
}

export async function signUpGuest({ email, password, displayName }) {
  const supabase = await getSupabaseClient();
  const cleanName = String(displayName || '').trim();
  if (cleanName.length < 2) throw new Error('Escribe un nombre de al menos dos caracteres.');
  if (String(password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const { data, error } = await supabase.auth.signUp({
    email: String(email || '').trim(),
    password: String(password || ''),
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}#cuenta`,
      data: { display_name: cleanName, yucapass_account_type: 'guest' }
    }
  });
  if (error) throw error;
  if (data.session) {
    await resolveForSession(data.session);
    await ensureGuestProfile(cleanName);
    await refreshAccessContext();
  }
  return { session: data.session, user: data.user, needsEmailConfirmation: !data.session };
}

export async function requestPasswordReset(email) {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) throw new Error('Escribe el correo asociado a tu cuenta.');
  const supabase = await getSupabaseClient();
  const redirectTo = `${window.location.origin}${window.location.pathname}#cuenta`;
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
  if (error) throw error;
  return true;
}

export async function updateAccountPassword(password, confirmation) {
  if (String(password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: String(password) });
  if (error) throw error;
  passwordRecoveryMode = false;
  await refreshAccessContext();
  return true;
}

export async function resendSignupConfirmation(email) {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) throw new Error('Escribe el correo de tu cuenta.');
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: cleanEmail,
    options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}#cuenta` }
  });
  if (error) throw error;
  return true;
}

export async function updateGuestAccountProfile({ displayName, preferredLanguage, recommendationsEnabled }) {
  if (!accessContext.user || accessContext.role !== 'guest') throw new Error('Inicia sesión con una cuenta de viajero.');
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('guest_profiles').update({
    display_name: String(displayName || '').trim(),
    preferred_language: preferredLanguage === 'English' ? 'en' : 'es',
    recommendations_enabled: Boolean(recommendationsEnabled)
  }).eq('user_id', accessContext.user.id);
  if (error) throw error;
  return refreshAccessContext();
}

export async function signOutUser() {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  passwordRecoveryMode = false;
  await resolveForSession(null);
  localStorage.removeItem(HOTEL_KEY);
  localStorage.removeItem(PARTNER_KEY);
  localStorage.removeItem('yucapass-active-hotel-v3');
  localStorage.removeItem('yucapass-active-partner-v3');
  return true;
}

export async function claimReservationInvite({ folio, activationCode, displayName }) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('claim_reservation_invite', {
    p_reservation_folio: String(folio || '').trim(),
    p_activation_code: String(activationCode || '').trim(),
    p_display_name: String(displayName || accessContext.user?.user_metadata?.display_name || '').trim() || null
  });
  if (error) throw error;
  const context = await refreshAccessContext();
  return { data, context };
}

export async function loadGuestPortfolio() {
  const context = getAccessContext();
  if (!context.user || !context.guestProfile) throw new Error('Activa tu pasaporte de huésped para consultar tus puntos y reservaciones.');
  const supabase = await getSupabaseClient();
  const uid = context.user.id;
  const [profile, reservations, ledger, stamps, partnerStamps, redemptions] = await Promise.all([
    supabase.from('guest_profiles').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('hotel_reservations').select('id,hotel_id,reservation_folio,guest_name,check_in,check_out,status,points_awarded_at,hotels(name,municipality)').eq('guest_user_id', uid).order('created_at', { ascending: false }),
    supabase.from('loyalty_ledger').select('id,points,entry_type,description,created_at').eq('guest_user_id', uid).order('created_at', { ascending: false }),
    supabase.from('passport_stamps').select('id,experience_id,points_awarded,created_at,experiences(name,municipality)').eq('guest_user_id', uid).order('created_at', { ascending: false }),
    supabase.from('visit_stamp_claims').select('id,destination_id,destination_name,points_awarded,created_at,partner_id,business_partners(name,municipality)').eq('guest_user_id', uid).order('created_at', { ascending: false }),
    supabase.from('reward_redemptions').select('id,reward_id,points_spent,redemption_code,status,created_at,rewards(name)').eq('guest_user_id', uid).order('created_at', { ascending: false })
  ]);
  for (const item of [profile, reservations, ledger, stamps, partnerStamps, redemptions]) if (item.error) throw item.error;
  const points = (ledger.data || []).reduce((sum, row) => sum + Number(row.points || 0), 0)
    + (stamps.data || []).reduce((sum, row) => sum + Number(row.points_awarded || 0), 0)
    + (partnerStamps.data || []).reduce((sum, row) => sum + Number(row.points_awarded || 0), 0);
  return { profile: profile.data, reservations: reservations.data || [], ledger: ledger.data || [], stamps: stamps.data || [], partnerStamps: partnerStamps.data || [], redemptions: redemptions.data || [], points };
}

export async function redeemRemoteReward(rewardId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('redeem_yucapass_reward', { p_reward_id: String(rewardId) });
  if (error) throw error;
  return data;
}

export function disposeAccessContext() {
  authSubscription?.unsubscribe?.();
  authSubscription = null;
}
