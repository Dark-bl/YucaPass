import assert from 'node:assert/strict';

class MemoryStorage {
  #data = new Map();
  getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null; }
  setItem(key, value) { this.#data.set(key, String(value)); }
  removeItem(key) { this.#data.delete(key); }
  clear() { this.#data.clear(); }
}

globalThis.localStorage = new MemoryStorage();
const service = await import('./reservations.js');
const storage = await import('./storage.js');

const reservation = service.createDemoReservation({
  folio: 'HOTEL-RSV-000781',
  hotelName: 'Hotel Prueba Yucatán',
  guestName: 'Huésped de Prueba',
  room: '204', guests: 2,
  checkIn: '2026-12-10', checkOut: '2026-12-13'
});
assert.equal(reservation.folio, 'HOTEL-RSV-000781', 'Debe conservar el folio original del hotel.');
assert.equal(reservation.status, 'confirmed');
assert.equal(reservation.activationCode.length, 8);

assert.throws(() => service.createDemoReservation({
  folio: 'HOTEL-RSV-000781', hotelName: 'Hotel Prueba Yucatán', guestName: 'Duplicado',
  checkIn: '2026-12-10', checkOut: '2026-12-12'
}), /Ese folio ya existe/);

await assert.rejects(() => service.activateGuest({
  folio: reservation.folio, activationCode: 'INCORRECTO', pin: '123456', confirmPin: '123456'
}), /no coincide/);

service.changeReservationStatus(reservation.id, 'checked_in');
service.changeReservationStatus(reservation.id, 'completed');
await service.activateGuest({
  folio: reservation.folio,
  activationCode: reservation.activationCode,
  pin: '123456', confirmPin: '123456'
});
let state = storage.getState();
let account = service.getActiveGuest(state);
assert.ok(account, 'Debe crear una cuenta al activar el pasaporte.');
assert.equal(account.loginFolio, reservation.folio);
assert.equal(service.getAccountPoints(state, account), 100, 'Una estancia completada debe dar 100 puntos una sola vez.');

await assert.rejects(() => service.activateGuest({
  folio: reservation.folio, activationCode: reservation.activationCode, pin: '123456', confirmPin: '123456'
}), /ya fue activado/);

service.logoutGuest();
await assert.rejects(() => service.loginGuest({ folio: reservation.folio, pin: '000000' }), /PIN incorrecto/);
await service.loginGuest({ folio: reservation.folio, pin: '123456' });
state = storage.getState();
account = service.getActiveGuest(state);
assert.equal(account.loginFolio, reservation.folio, 'Debe permitir volver a iniciar sesión.');

const second = service.createDemoReservation({
  folio: 'HOTEL-RSV-000782', hotelName: 'Hotel Prueba Yucatán', guestName: 'Huésped de Prueba',
  checkIn: '2027-01-02', checkOut: '2027-01-04'
});
service.changeReservationStatus(second.id, 'checked_in');
service.changeReservationStatus(second.id, 'completed');
service.linkReservationToActiveGuest({ folio: second.folio, activationCode: second.activationCode });
state = storage.getState();
account = service.getActiveGuest(state);
assert.equal(service.getAccountReservations(state, account).length, 2, 'Debe permitir vincular otra reservación.');
assert.equal(service.getAccountPoints(state, account), 200, 'Debe reconocer puntos de una estancia que se completó antes de vincularse.');

const redemption = service.redeemReward({ rewardId: 'welcome-taste', title: 'Experiencia gastronómica', points: 150 });
assert.match(redemption.code, /^YUC-/);
state = storage.getState();
account = service.getActiveGuest(state);
assert.equal(service.getAccountPoints(state, account), 50, 'El canje debe descontar puntos del saldo.');
assert.equal(state.rewardRedemptions.length, 1, 'El canje debe quedar registrado.');
assert.throws(() => service.redeemReward({ rewardId: 'next-adventure', title: 'Próxima aventura', points: 400 }), /Necesitas 400 puntos/);

const cancelled = service.createDemoReservation({
  folio: 'HOTEL-RSV-000783', hotelName: 'Hotel Prueba Yucatán', guestName: 'Huésped Cancelado',
  checkIn: '2027-02-02', checkOut: '2027-02-04'
});
service.changeReservationStatus(cancelled.id, 'cancelled');
await assert.rejects(() => service.activateGuest({
  folio: cancelled.folio, activationCode: cancelled.activationCode, pin: '123456', confirmPin: '123456'
}), /cancelada/);

console.log('OK: folio original, duplicados, código de un solo uso, PIN, inicio de sesión, vinculación de reservaciones, estados, puntos y canje de recompensas.');
