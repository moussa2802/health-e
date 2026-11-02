const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const P = require('../_penc');

const H = 3600000;
test('validation : sujet, date à venir, durée, accès, prix', () => {
  const now = Date.now();
  const ok = { title: 'Jalousie : aimer sans surveiller', startAt: now + H, durationMin: 45, access: 'all' };
  assert.ok(P.validatePenc(ok, now).data);
  assert.ok(P.validatePenc({ ...ok, title: 'court' }, now).error);
  assert.ok(P.validatePenc({ ...ok, startAt: now - H }, now).error);
  assert.ok(P.validatePenc({ ...ok, startAt: now + 90 * 24 * H }, now).error);
  assert.ok(P.validatePenc({ ...ok, durationMin: 50 }, now).error);
  assert.ok(P.validatePenc({ ...ok, access: 'channel' }, now).error);
  assert.ok(P.validatePenc({ ...ok, access: 'paid', price: 0 }, now).error);
  assert.equal(P.validatePenc({ ...ok, access: 'paid', price: 20 }, now).data.price, 20);
  assert.deepEqual(P.validatePenc({ durationMin: 60 }, now, { partial: true }).data, { durationMin: 60 });
});
test('agenda et rappel', () => {
  const now = Date.now();
  assert.equal(P.agendaBucket({ status: 'scheduled', startAt: now + H }, now), 'upcoming');
  assert.equal(P.agendaBucket({ status: 'scheduled', startAt: now - 3 * H }, now), null);
  assert.equal(P.agendaBucket({ status: 'live', startAt: now - 3 * H }, now), 'live');
  assert.equal(P.agendaBucket({ status: 'ended', endedAt: now - H }, now), 'past');
  assert.equal(P.agendaBucket({ status: 'cancelled', startAt: now + H }, now), null);
  assert.ok(P.remindDue({ status: 'scheduled', startAt: now + 8 * 60000 }, now));
  assert.ok(!P.remindDue({ status: 'scheduled', startAt: now + 8 * 60000, remindSent: true }, now));
  assert.ok(!P.remindDue({ status: 'scheduled', startAt: now + 30 * 60000 }, now));
  assert.deepEqual(P.cleanSummary(['  Idée un  ', 'x', 'Idée deux', 'Idée trois', 'Idée quatre']), ['Idée un', 'Idée deux', 'Idée trois']);
});

// ── Le handler, avec un faux Firestore ──
const store = { staff: { owner1: { drlo: true }, awa: { role: 'pro', verified: true, fullName: 'Awa Ndiaye', title: 'Psychologue' } }, pencs: {}, pencRegs: {}, channels: { c1: { name: 'Couple', ownerUid: 'awa' }, c2: { name: 'Autre' } }, channelMembers: { c1_moussa: { uid: 'moussa' } }, patients: {} };
const pushes = []; let seq = 0; const holds = [];
const apply = (cur, patch) => { const o = { ...cur }; for (const [k, v] of Object.entries(patch)) o[k] = v && v.__inc !== undefined ? (Number(o[k]) || 0) + v.__inc : v; return o; };
const mkSnap = (col, id) => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id], ref: docRef(col, id) });
function docRef(col, id) {
  return { id, _col: col, get: async () => mkSnap(col, id), set: async (d) => { store[col][id] = { ...d }; }, update: async (p) => { store[col][id] = apply(store[col][id] || {}, p); }, delete: async () => { delete store[col][id]; }, collection: () => ({ doc: () => ({ set: async () => {} }) }) };
}
const q = (col, filter) => ({ get: async () => { const docs = Object.keys(store[col]).filter((id) => filter(store[col][id])).map((id) => mkSnap(col, id)); return { docs, size: docs.length, empty: !docs.length }; } });
const db = {
  collection: (col) => ({
    doc: (id) => docRef(col, id || `auto${++seq}`),
    get: async () => q(col, () => true).get(),
    where: (k, op, v) => q(col, (d) => (op === 'in' ? v.includes(d[k]) : d[k] === v)),
  }),
  getAll: async (...refs) => refs.map((r) => mkSnap(r._col, r.id)),
};
const admin = { firestore: { FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => 1234 } } };
let uid = 'owner1';
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { admin, db, verifyAuth: async () => ({ uid }) });
inject('../_push.js', { sendToUser: async (u, n) => { pushes.push([u, n]); } });
inject('../_koris.js', { reserveKoris: async (u, f, n) => { holds.push([u, f, n]); return { holdId: 'h1' }; }, commitKoris: async () => {}, releaseKoris: async () => {} });
const { handler } = require('../penc.js');
const call = async (body) => { const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };

test('un pro programme un Pénc dans SA chaîne ; les membres s\'inscrivent et sont prévenus', async () => {
  const start = Date.now() + 2 * H;
  uid = 'moussa';
  assert.equal((await call({ action: 'save', title: 'Le désir dans le couple', startAt: start, durationMin: 60, access: 'all' })).status, 403);
  uid = 'awa';
  assert.equal((await call({ action: 'save', title: 'Le désir dans le couple', startAt: start, durationMin: 60, access: 'channel', channelId: 'c2' })).status, 400); // pas sa chaîne
  const r = await call({ action: 'save', title: 'Le désir dans le couple', startAt: start, durationMin: 60, access: 'channel', channelId: 'c1', testScaleId: 'fsfi' });
  assert.equal(r.status, 200);
  assert.equal(r.body.penc.host.name, 'Awa Ndiaye');
  assert.equal(r.body.penc.channelName, 'Couple');
  const id = r.body.penc.id;
  uid = 'other';
  let ag = await call({ action: 'agenda' });
  assert.equal(ag.body.upcoming[0].locked, true);
  assert.equal((await call({ action: 'register', id, on: true })).status, 403);
  uid = 'moussa';
  ag = await call({ action: 'agenda' });
  assert.equal(ag.body.upcoming[0].locked, false);
  assert.equal((await call({ action: 'register', id, on: true })).body.registered, true);
  assert.equal(store.pencs[id].registeredCount, 1);
  uid = 'owner1'; // Dr Lô voit et gère tout
  assert.equal((await call({ action: 'manage_list' })).body.items.length, 1);
  uid = 'awa';
  assert.equal((await call({ action: 'start', id })).status, 200);
  assert.equal(pushes.at(-1)[0], 'moussa');
  assert.equal((await call({ action: 'save', id, title: 'Changement trop tard' })).status, 409);
  assert.equal((await call({ action: 'end', id, summary: ['Le désir varie, c\'est normal.', 'En parler aide.'] })).status, 200);
  uid = 'moussa';
  ag = await call({ action: 'agenda' });
  assert.equal(ag.body.past[0].summary.length, 2);
});

test('Pénc payant : étincelles débitées à l\'inscription', async () => {
  uid = 'owner1';
  const r = await call({ action: 'save', title: 'Séance spéciale sommeil', startAt: Date.now() + H, durationMin: 45, access: 'paid', price: 15 });
  uid = 'moussa';
  const reg = await call({ action: 'register', id: r.body.penc.id, on: true });
  assert.equal(reg.body.paid, 15);
  assert.deepEqual(holds.at(-1), ['moussa', 'penc', 15]);
  assert.equal((await call({ action: 'register', id: r.body.penc.id, on: false })).status, 409);
});
