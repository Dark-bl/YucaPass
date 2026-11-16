import { getSupabaseClient } from './supabase-client.js';

const CONSENT_KEY = 'yucapass-analytics-consent-v1';
const VISITOR_KEY = 'yucapass-visitor-key-v1';
const PENDING_STAMP_KEY = 'yucapass-pending-stamp-v1';
let pendingClaimPromise = null;

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function visitorKey() {
  let key = localStorage.getItem(VISITOR_KEY);
  if (!key) {
    key = uuid();
    localStorage.setItem(VISITOR_KEY, key);
  }
  return key;
}

export function getAnalyticsConsent() {
  return localStorage.getItem(CONSENT_KEY) || 'unset';
}

export function setAnalyticsConsent(value) {
  const normalized = value === 'granted' ? 'granted' : 'denied';
  localStorage.setItem(CONSENT_KEY, normalized);
  if (normalized === 'denied') localStorage.removeItem(VISITOR_KEY);
  const banner = document.getElementById('analytics-consent');
  if (banner) banner.hidden = true;
  return normalized;
}

export function initAnalyticsConsent() {
  const banner = document.getElementById('analytics-consent');
  if (banner) banner.hidden = getAnalyticsConsent() !== 'unset';
}

export async function trackEvent(eventType, details = {}) {
  if (getAnalyticsConsent() !== 'granted') return { skipped: true };
  try {
    const supabase = await getSupabaseClient();
    const metadata = {
      screen: String(details.screen || '').slice(0, 40) || null,
      source: String(details.source || '').slice(0, 40) || null,
      device: matchMedia('(max-width: 700px)').matches ? 'mobile' : 'desktop'
    };
    const { data, error } = await supabase.rpc('track_yucapass_event', {
      p_event_type: eventType,
      p_visitor_key: visitorKey(),
      p_experience_key: details.experienceKey || null,
      p_hotel_id: details.hotelId || null,
      p_partner_id: details.partnerId || null,
      p_metadata: metadata
    });
    if (error) throw error;
    return { data };
  } catch (error) {
    // Analytics must never block the visitor's primary journey.
    console.info('YucaPass analytics unavailable:', error?.message || error);
    return { skipped: true, error };
  }
}

export function captureIncomingStampLink() {
  try {
    const url = new URL(window.location.href);
    const token = (url.searchParams.get('stamp') || '').trim();
    if (!token) return false;
    if (token.length < 24 || token.length > 160) return false;
    localStorage.setItem(PENDING_STAMP_KEY, token);
    url.searchParams.delete('stamp');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    return true;
  } catch {
    return false;
  }
}

export function hasPendingStamp() {
  return Boolean(localStorage.getItem(PENDING_STAMP_KEY));
}

export async function claimPendingVisitStamp() {
  if (pendingClaimPromise) return pendingClaimPromise;
  const token = localStorage.getItem(PENDING_STAMP_KEY);
  if (!token) return null;
  pendingClaimPromise = (async () => {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc('claim_visit_stamp', {
      p_token: token,
      p_visitor_key: getAnalyticsConsent() === 'granted' ? visitorKey() : null
    });
    if (error) throw error;
    localStorage.removeItem(PENDING_STAMP_KEY);
    const { refreshAccessContext } = await import('./access.js');
    await refreshAccessContext();
    return data;
  })();
  try { return await pendingClaimPromise; }
  finally { pendingClaimPromise = null; }
}

export function clearPendingStamp() {
  localStorage.removeItem(PENDING_STAMP_KEY);
}
