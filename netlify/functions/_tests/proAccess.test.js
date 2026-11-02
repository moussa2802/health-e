const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Faux Firestore minimal (une seule condition where, merge sur set)
const store = { staff: { owner1: { drlo: true } }, proApplications: {}, channels: {}, channelMembers: {}, channelPosts: {}, channelComments: {}, channelPostViews: {}, userProfiles: {}, patients: {}, drloState: {} };
const pushes = [];
let seq = 0;
const apply = (cur, patch) => { const o = { ...cur }; for (const [k, v] of Object.entries(patch)) o[k] = v && v.__inc !== undefined ? (Number(o[k]) || 0) + v.__inc : v; return o; };
const mkSnap = (col, id) => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id], ref: docRef(col, id) });
function docRef(col, id) {
  return {
    id, _col: col, get: async () => mkSnap(col, id),
    set: async (d, opt) => { store[col][id] = opt && opt.merge ? { ...(store[col][id] || {}), ...d } : { ...d }; },
    update: async (p) => { store[col][id] = apply(store[col][id] || {}, p); },
  };
}
const db = {
  collection: (col) => ({
    doc: (id) => docRef(col, id || `auto${++seq}`),
    get: async () => { const docs = Object.keys(store[col]).map((id) => mkSnap(col, id)); return { docs, size: docs.length, empty: !docs.length }; },
    where: (k, op, v) => ({ get: async () => { const docs = Object.keys(store[col]).filter((id) => store[col][id][k] === v).map((id) => mkSnap(col, id)); return { docs, size: docs.length, empty: !docs.length }; } }),
  }),
};
db.getAll = async (...refs) => refs.map((r) => mkSnap(r._col || 'channelMembers', r.id));
const admin = {
  firestore: { FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => 1234 } },
  storage: () => ({ bucket: () => ({ file: () => ({ save: async () => {}, delete: async () => {}, getSignedUrl: async () => ['https://signed'] }) }) }),
};
let uid = 'owner1';
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { admin, db, verifyAuth: async () => ({ uid, email: `${uid}@x.sn` }) });
inject('../_push.js', { sendToUser: async (u, n) => { pushes.push([u, n]); } });
inject('../_koris.js', { reserveKoris: async () => ({ holdId: null }), commitKoris: async () => {}, releaseKoris: async () => {} });
const pro = require('../pro-access.js').handler;
const ch = require('../drlo-channels.js').handler;
const call = async (h, body) => { const r = await h({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };
const app = { fullName: 'Awa Ndiaye', profession: 'psychologue', license: 'ORD-1234', city: 'Dakar', bio: 'Psychologue clinicienne, dix ans auprès des couples.' };
const chan = { name: 'Couple et famille', description: 'Parler du couple sans tabou.', price: 0, rules: {} };

test('demande, validation par Dr Lô seulement, puis rôle pro', async () => {
  uid = 'awa';
  assert.equal((await call(pro, { action: 'apply', ...app, profession: '' })).status, 400); // la profession est obligatoire
  assert.equal((await call(pro, { action: 'apply', ...app })).status, 200);
  assert.equal((await call(pro, { action: 'apply', ...app })).status, 409); // déjà en attente
  assert.equal((await call(pro, { action: 'approve', uid: 'awa' })).status, 403); // pas Dr Lô
  let me = await call(pro, { action: 'me' });
  assert.equal(me.body.role, 'none');
  assert.equal(me.body.application.status, 'pending');
  uid = 'owner1';
  const list = await call(pro, { action: 'pros_list' });
  assert.equal(list.body.pending, 1);
  assert.equal((await call(pro, { action: 'approve', uid: 'awa' })).status, 200);
  assert.equal(store.staff.awa.role, 'pro');
  assert.equal(pushes.at(-1)[0], 'awa');
  uid = 'awa';
  me = await call(pro, { action: 'me' });
  assert.equal(me.body.role, 'pro');
  assert.equal(me.body.profile.title, 'Psychologue');
});

test('un pro crée librement ses chaînes et ne gère que les siennes', async () => {
  uid = 'owner1';
  const old = await call(ch, { action: 'drlo_save', ...chan, name: 'Chaîne de Dr Lô' });
  assert.equal(old.status, 200);
  assert.equal(old.body.channel.host.name, 'Dr Lô');
  uid = 'awa';
  const mine = await call(ch, { action: 'drlo_save', ...chan });
  assert.equal(mine.status, 200);
  assert.equal(store.channels[mine.body.channel.id].ownerUid, 'awa');
  assert.equal(mine.body.channel.host.name, 'Awa Ndiaye');
  const list = await call(ch, { action: 'drlo_list' });
  assert.deepEqual(list.body.items.map((i) => i.id), [mine.body.channel.id]);
  assert.equal((await call(ch, { action: 'drlo_save', id: old.body.channel.id, name: 'Piratée' })).status, 404);
  uid = 'owner1';
  const all = await call(ch, { action: 'drlo_list' });
  assert.equal(all.body.items.length, 2); // Dr Lô voit tout
});

test('suspendu : plus de gestion ; un simple membre : rien', async () => {
  uid = 'owner1';
  assert.equal((await call(pro, { action: 'suspend', uid: 'awa', suspended: true })).status, 200);
  uid = 'awa';
  assert.equal((await call(ch, { action: 'drlo_list' })).status, 403);
  assert.equal((await call(pro, { action: 'me' })).body.suspended, true);
  uid = 'random';
  assert.equal((await call(ch, { action: 'drlo_save', ...chan })).status, 403);
  assert.equal((await call(pro, { action: 'pros_list' })).status, 403);
});
