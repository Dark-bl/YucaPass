import { getState, updateState } from './storage.js';
import { destinations } from './data.js';

export const STAY_REWARD_POINTS = 100;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomText(length=8){
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for(let i=0;i<length;i++) bytes[i]=Math.floor(Math.random()*256);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}
function makeId(prefix){ return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomText(5)}`; }
function normalizeFolio(value){ return String(value||'').trim().toUpperCase().replace(/\s+/g,''); }
function normalizeCode(value){ return String(value||'').trim().toUpperCase().replace(/\s+/g,''); }
function safeText(value,max=100){ return String(value||'').trim().replace(/[<>]/g,'').slice(0,max); }
function todayISO(){ return new Date().toISOString().slice(0,10); }

async function hashPin(pin, salt){
  if(!globalThis.crypto?.subtle) throw new Error('Abre YucaPass desde una conexión segura (HTTPS o localhost) para habilitar la verificación de PIN.');
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,'0')).join('');
}

export function createDemoReservation(input){
  const guestName=safeText(input.guestName,80);
  const hotelName=safeText(input.hotelName,90);
  const folio=safeText(input.folio,40).toUpperCase().replace(/\s+/g,'');
  const room=safeText(input.room,20);
  const checkIn=String(input.checkIn||'');
  const checkOut=String(input.checkOut||'');
  const guests=Math.max(1,Math.min(12,Number(input.guests)||1));
  if(!guestName || !hotelName || !folio) throw new Error('Completa el folio original, el nombre del huésped y el hotel.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut<=checkIn)
    throw new Error('La fecha de salida debe ser posterior a la fecha de entrada.');
  const state=getState();
  if((state.reservations||[]).some(r=>r.hotelId==='HOTEL-DEMO' && normalizeFolio(r.folio)===normalizeFolio(folio))) throw new Error('Ese folio ya existe en este hotel. Verifica el número de reservación.');
  const reservation={
    id:makeId('RES'), hotelId:'HOTEL-DEMO', hotelName, folio,
    activationCode:randomText(8), activationUsed:false, guestAccountId:null,
    guestName, room, guests, checkIn, checkOut, status:'confirmed',
    createdAt:new Date().toISOString(), pointsAwarded:false, points:0
  };
  updateState(s=>({...s,reservations:[reservation,...(s.reservations||[])]}));
  return reservation;
}

export function createSampleReservation(){
  const today=todayISO();
  const start=new Date(`${today}T12:00:00`); start.setDate(start.getDate()+1);
  const end=new Date(start); end.setDate(end.getDate()+3);
  const date=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return createDemoReservation({folio:`DEMO-${randomText(6)}`,guestName:'Huésped de prueba',hotelName:'Hotel Demostración Yucatán',room:'204',guests:2,checkIn:date(start),checkOut:date(end)});
}

function appendStayReward(state, accountId, reservation){
  if(!accountId || !reservation || reservation.pointsAwarded===false && reservation.status!=='completed') return state;
  const ledger=state.pointsLedger||[];
  if(ledger.some(item=>item.reservationId===reservation.id && item.reason==='stay_completed')) return state;
  return {...state,pointsLedger:[{id:makeId('PTS'),accountId,reservationId:reservation.id,points:STAY_REWARD_POINTS,reason:'stay_completed',description:`Estancia completada en ${reservation.hotelName}`,createdAt:new Date().toISOString()},...ledger]};
}

export async function activateGuest({folio,activationCode,pin,confirmPin}){
  const key=normalizeFolio(folio), code=normalizeCode(activationCode);
  if(!/^\d{6}$/.test(String(pin||''))) throw new Error('Crea un PIN de 6 números para tu cuenta.');
  if(pin!==confirmPin) throw new Error('Los dos PIN no coinciden.');
  let state=getState();
  const reservation=(state.reservations||[]).find(r=>normalizeFolio(r.folio)===key);
  if(!reservation) throw new Error('No encontramos ese folio. Revisa que esté escrito igual que en tu confirmación.');
  if(reservation.status==='cancelled') throw new Error('Esta reservación aparece cancelada. Solicita ayuda en recepción.');
  if(reservation.activationUsed || reservation.guestAccountId) throw new Error('Este folio ya fue activado. Usa “Ya tengo cuenta” para iniciar sesión.');
  if(normalizeCode(reservation.activationCode)!==code) throw new Error('El código de activación no coincide. Solicita al hotel una nueva invitación.');
  const salt=randomText(16), pinHash=await hashPin(String(pin),salt);
  const account={id:makeId('GUEST'),guestName:reservation.guestName,loginFolio:reservation.folio,pinSalt:salt,pinHash,createdAt:new Date().toISOString()};
  state={...state,guestAccounts:[account,...(state.guestAccounts||[])],activeAccountId:account.id,
    reservations:(state.reservations||[]).map(r=>r.id===reservation.id?{...r,activationUsed:true,activationCode:null,guestAccountId:account.id}:r)};
  const updatedReservation=state.reservations.find(r=>r.id===reservation.id);
  if(updatedReservation.status==='completed') state=appendStayReward(state,account.id,updatedReservation);
  updateState(()=>state);
  return account;
}

export async function loginGuest({folio,pin}){
  const key=normalizeFolio(folio);
  const state=getState();
  const account=(state.guestAccounts||[]).find(a=>normalizeFolio(a.loginFolio)===key);
  if(!account) throw new Error('No hay una cuenta activada con ese folio. Primero activa tu pasaporte.');
  const check=await hashPin(String(pin||''),account.pinSalt);
  if(check!==account.pinHash) throw new Error('PIN incorrecto. Verifica tus datos.');
  updateState(s=>({...s,activeAccountId:account.id}));
  return account;
}

export function linkReservationToActiveGuest({folio,activationCode}){
  const state=getState();
  const account=(state.guestAccounts||[]).find(a=>a.id===state.activeAccountId);
  if(!account) throw new Error('Primero inicia sesión en tu pasaporte.');
  const reservation=(state.reservations||[]).find(r=>normalizeFolio(r.folio)===normalizeFolio(folio));
  if(!reservation) throw new Error('No encontramos ese folio.');
  if(reservation.status==='cancelled') throw new Error('La reservación está cancelada.');
  if(reservation.guestAccountId===account.id) throw new Error('Esta reservación ya está vinculada a tu cuenta.');
  if(reservation.guestAccountId || reservation.activationUsed) throw new Error('Esta reservación ya fue vinculada a otra cuenta. Contacta a recepción para solicitar revisión.');
  if(normalizeCode(reservation.activationCode)!==normalizeCode(activationCode)) throw new Error('Código de activación incorrecto.');
  let next={...state,reservations:state.reservations.map(r=>r.id===reservation.id?{...r,activationUsed:true,activationCode:null,guestAccountId:account.id}:r)};
  const linked=next.reservations.find(r=>r.id===reservation.id);
  if(linked.status==='completed') next=appendStayReward(next,account.id,linked);
  updateState(()=>next);
  return linked;
}

export function changeReservationStatus(id,nextStatus){
  const state=getState();
  const reservation=(state.reservations||[]).find(r=>r.id===id);
  if(!reservation) throw new Error('No encontramos la reservación.');
  const allowed={confirmed:['checked_in','cancelled'],checked_in:['completed','cancelled'],completed:[],cancelled:[]};
  if(!(allowed[reservation.status]||[]).includes(nextStatus)) throw new Error('Ese cambio de estado no está permitido.');
  let next={...state,reservations:state.reservations.map(r=>r.id===id?{...r,status:nextStatus}:r)};
  const changed=next.reservations.find(r=>r.id===id);
  if(nextStatus==='completed'){
    changed.pointsAwarded=true; changed.points=STAY_REWARD_POINTS;
    if(changed.guestAccountId) next=appendStayReward(next,changed.guestAccountId,changed);
  }
  updateState(()=>next);
  return changed;
}


export function redeemReward({rewardId, title, points}){
  const state=getState();
  const account=(state.guestAccounts||[]).find(a=>a.id===state.activeAccountId);
  if(!account) throw new Error('Activa tu pasaporte e inicia sesión para canjear recompensas.');
  const cost=Math.max(1,Math.floor(Number(points)||0));
  const stayPoints=(state.pointsLedger||[]).filter(x=>x.accountId===account.id).reduce((sum,x)=>sum+Number(x.points||0),0);
  const stampPoints=destinations.filter(d=>(state.stamps||[]).includes(d.id)).reduce((sum,d)=>sum+Number(d.points||0),0);
  const available=stayPoints+stampPoints;
  if(available<cost) throw new Error(`Necesitas ${cost} puntos. Tu saldo actual es ${available}.`);
  const code=`YUC-${randomText(4)}-${randomText(4)}`;
  const redemption={id:makeId('RWD'),accountId:account.id,rewardId:String(rewardId||''),title:safeText(title,90),points:cost,code,status:'demo',createdAt:new Date().toISOString()};
  updateState(s=>({...s,rewardRedemptions:[redemption,...(s.rewardRedemptions||[])],pointsLedger:[{id:makeId('PTS'),accountId:account.id,points:-cost,reason:'reward_redemption',description:`Canje de demostración: ${redemption.title}`,createdAt:new Date().toISOString()},...(s.pointsLedger||[])]}));
  return redemption;
}

export function logoutGuest(){ updateState(s=>({...s,activeAccountId:null})); }
export function getActiveGuest(state=getState()){ return (state.guestAccounts||[]).find(a=>a.id===state.activeAccountId)||null; }
export function getAccountReservations(state,account){ return account?(state.reservations||[]).filter(r=>r.guestAccountId===account.id):[]; }
export function getAccountLedger(state,account){ return account?(state.pointsLedger||[]).filter(p=>p.accountId===account.id):[]; }
export function getAccountPoints(state,account){ return getAccountLedger(state,account).reduce((sum,item)=>sum+Number(item.points||0),0); }
