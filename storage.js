const KEY = 'pasaporte-yucatan-prototype-v2';
const defaults = {
  stamps: [], favorites: [], area: 'Todo Yucatán', stage: 'Estoy planeando', interests: ['Cultura','Naturaleza','Gastronomía','Comunidad'],
  profile: { name: 'Visitante', language: 'Español', recommendations: true }, partnerDrafts: [], partnerType: 'Hotel',
  reservations: [], guestAccounts: [], activeAccountId: null, pointsLedger: [], rewardRedemptions: []
};
function cloneDefaults(){ return JSON.parse(JSON.stringify(defaults)); }
export function getState(){
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(!saved || typeof saved !== 'object') return cloneDefaults();
    return { ...cloneDefaults(), ...saved, profile: { ...defaults.profile, ...(saved.profile || {}) } };
  } catch { return cloneDefaults(); }
}
export function patchState(patch){ const next = { ...getState(), ...patch }; localStorage.setItem(KEY, JSON.stringify(next)); return next; }
export function updateState(updater){ const next = updater(getState()); localStorage.setItem(KEY, JSON.stringify(next)); return next; }
export function clearDemoProgress(){ return updateState(state => ({ ...state, stamps: [], favorites: [] })); }
