const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const store = { broadcasts: {}, broadcastRecipients: {}, userProfiles: {}, staff: { drlo1: { drlo: true } } };
const mkSnap = (col, id) => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id] });
const query = (col, f = [], after = null, lim = 1e9) => ({
  where: (k, op, v) => query(col, [...f, [k, v]], after, lim),
  orderBy: () => query(col, f, after, lim),
  limit: (n) => query(col, f, after, n),
  startAfter: (s) => query(col, f, s.id, lim),
  get: async () => {
    let ids = Object.keys(store[col]).filter((id) => f.every(([k, v]) => store[col][id][k] === v)).sort();
    if (after) ids = ids.filter((id) => id > after);
    ids = ids.slice(0, lim);
    const docs = ids.map((id) => mkSnap(col, id));
    return { docs, empty: docs.length === 0, size: docs.length };
  },
});
const db = {
  collection: (col) => ({ doc: (id) => ({ id, get: async () => mkSnap(col, id) }), ...query(col) }),
  getAll: async (...args) => args.filter((a) => a && a.id).map((r) => mkSnap('userProfiles', r.id)),
};
const admin = { firestore: { FieldPath: { documentId: () => '__name__' }, FieldValue: {}, Timestamp: {} }, storage: () => ({ bucket: () => ({}) }) };
const fb = path.resolve(__dirname, '../_firebase.js');
let uid = 'drlo1';
require.cache[fb] = { id: fb, filename: fb, loaded: true, exports: { admin, db, verifyAuth: async () => ({ uid }) } };
const pu = path.resolve(__dirname, '../_push.js');
require.cache[pu] = { id: pu, filename: pu, loaded: true, exports: { sendToUser: async () => {} } };
const { handler } = require('../drlo-broadcast.js');
const call = async (body) => { const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };

test('liste des personnes qui ont vu, écouté, pas encore vu, avec pagination', async () => {
  store.broadcasts.b1 = { audience: { all: true }, audienceCount: 1200, audio: { durationSec: 30 } };
  for (let i = 0; i < 1200; i++) {
    const u = `u${String(i).padStart(4, '0')}`;
    store.broadcastRecipients[`b1_${u}`] = { broadcastId: 'b1', uid: u, seenAt: i % 2 === 0 ? 1000 + i : null, listenedAt: i % 10 === 0 ? 2000 + i : null };
    store.userProfiles[u] = { onboardingProfile: { prenom: i % 3 === 0 ? '' : `Prenom${i}` } };
  }
  let r = await call({ action: 'drlo_audience', id: 'b1', kind: 'seen' });
  assert.equal(r.status, 200);
  assert.equal(r.body.restricted, false);
  assert.ok(r.body.items.length > 0 && r.body.items.length <= 600);
  assert.ok(r.body.items.every((x) => x.name.length > 0));
  // pagination jusqu'au bout : on retrouve exactement les 600 personnes qui ont vu
  let all = [...r.body.items]; let next = r.body.next; let guard = 0;
  while (next && guard++ < 20) { r = await call({ action: 'drlo_audience', id: 'b1', kind: 'seen', after: next }); all = all.concat(r.body.items); next = r.body.next; }
  assert.equal(all.length, 600);
  r = await call({ action: 'drlo_audience', id: 'b1', kind: 'listened' });
  let listened = [...r.body.items]; next = r.body.next; guard = 0;
  while (next && guard++ < 20) { r = await call({ action: 'drlo_audience', id: 'b1', kind: 'listened', after: next }); listened = listened.concat(r.body.items); next = r.body.next; }
  assert.equal(listened.length, 120);
  r = await call({ action: 'drlo_audience', id: 'b1', kind: 'unseen' });
  let un = [...r.body.items]; next = r.body.next; guard = 0;
  while (next && guard++ < 20) { r = await call({ action: 'drlo_audience', id: 'b1', kind: 'unseen', after: next }); un = un.concat(r.body.items); next = r.body.next; }
  assert.equal(un.length, 600);
});

test('ciblage précis : aucun nom, seulement des totaux', async () => {
  store.broadcasts.b2 = { audience: { totems: ['lion'] }, audienceCount: 40 };
  const r = await call({ action: 'drlo_audience', id: 'b2', kind: 'seen' });
  assert.equal(r.body.restricted, true);
  assert.deepEqual(r.body.items, []);
});

test('réservé à Dr Lô', async () => {
  uid = 'intrus';
  const r = await call({ action: 'drlo_audience', id: 'b1', kind: 'seen' });
  assert.equal(r.status, 403);
  uid = 'drlo1';
});
