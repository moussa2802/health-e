const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const store = { channels: {}, channelMembers: {}, channelPosts: {}, channelComments: {}, channelPostViews: {}, userProfiles: {}, patients: {}, staff: { drlo1: { drlo: true } } };
let seq = 0, raceOnce = false, released = [], committed = [], storageFail = false, saved = [], deleted = [];
const apply = (cur, patch) => {
  const o = { ...cur };
  for (const [k, v] of Object.entries(patch)) o[k] = v && v.__inc !== undefined ? (Number(o[k]) || 0) + v.__inc : v;
  return o;
};
const mkSnap = (col, id) => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id] });
const docRef = (col, id) => ({
  id, _col: col, get: async () => mkSnap(col, id),
  set: async (d) => { store[col][id] = { ...d }; },
  update: async (p) => { store[col][id] = apply(store[col][id] || {}, p); },
});
const db = {
  collection: (col) => ({
    doc: (id) => docRef(col, id || `auto${++seq}`),
    get: async () => { const docs = Object.keys(store[col]).map((id) => mkSnap(col, id)); return { docs, size: docs.length, empty: !docs.length }; },
    where: (k, op, v) => ({ get: async () => { const docs = Object.keys(store[col]).filter((id) => store[col][id][k] === v).map((id) => mkSnap(col, id)); return { docs, size: docs.length, empty: !docs.length }; } }),
  }),
  getAll: async (...refs) => refs.map((r) => { const col = Object.keys(store).find((c) => store[c][r.id] !== undefined && true); return null; }),
  runTransaction: async (fn) => {
    const ops = [];
    const tx = {
      get: async (ref) => { if (raceOnce && ref.id.includes('_')) { raceOnce = false; store.channelMembers[ref.id] = { uid: 'x' }; } return ref.get(); },
      set: (ref, d) => ops.push(() => ref.set(d)),
      update: (ref, p) => ops.push(() => ref.update(p)),
      delete: (ref) => ops.push(() => { const [col] = ref._col ? [ref._col] : ['channelMembers']; delete store[col][ref.id]; }),
    };
    await fn(tx);
    for (const o of ops) await o();
  },
};
// getAll : on retrouve la collection par le préfixe d'identifiant (les membres ont un id « chaîne_uid »)
db.getAll = async (...refs) => refs.map((r) => mkSnap(r._col || 'channelMembers', r.id));
const admin = {
  firestore: { FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => 1234 } },
  storage: () => ({ bucket: () => ({ file: (p) => ({
    save: async () => { if (storageFail) throw new Error('denied'); saved.push(p); },
    delete: async () => { deleted.push(p); },
    getSignedUrl: async () => [`https://signed/${p}`],
  }) }) }),
};
let uid = 'drlo1';
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { admin, db, verifyAuth: async () => ({ uid }) });
inject('../_koris.js', {
  reserveKoris: async (u, f, q) => {
    const w = store.patients[u].korisWallet;
    if (w.balance < q) return { error: 'insufficient_balance', required: q };
    w.balance -= q; return { holdId: `h${q}-${u}`, cost: q, _q: q };
  },
  commitKoris: async (h) => { if (h) committed.push(h); },
  releaseKoris: async (h) => { if (h) { released.push(h); const [q, u] = h.slice(1).split('-'); store.patients[u].korisWallet.balance += Number(q); } },
});
const { handler } = require('../drlo-channels.js');
const CH = require('../_drloChannels.js');
const call = async (body) => { const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };
const png = Buffer.from('iVBORw0KGgo=', 'base64').toString('base64');
const rules = { tests: [{ scaleId: 'gad7' }, { scaleId: 'hsp', levels: ['modere', 'eleve'] }], totems: ['lion', 'loup'], minAge: 26 };
const base = { name: 'Éducation sexuelle', description: 'Sans tabou, avec rigueur médicale.', price: 30, framingText: 'Ici on se respecte.', requireFramingAck: true, rules };

test('seul Dr Lô crée, avec photo, et les règles sont nettoyées', async () => {
  uid = 'u1';
  assert.equal((await call({ action: 'drlo_save', ...base })).status, 403);
  uid = 'drlo1';
  let r = await call({ action: 'drlo_save', ...base, name: 'ab' });
  assert.equal(r.status, 400);
  r = await call({ action: 'drlo_save', ...base, price: -3 });
  assert.equal(r.status, 400);
  r = await call({ action: 'drlo_save', ...base, rules: { ...rules, minAge: 21 } });
  assert.equal(r.status, 400);
  r = await call({ action: 'drlo_save', ...base, photo: { data: png, mime: 'image/gif' } });
  assert.equal(r.status, 400);
  storageFail = true;
  r = await call({ action: 'drlo_save', ...base, photo: { data: png, mime: 'image/png' } });
  assert.equal(r.status, 502);
  assert.equal(Object.keys(store.channels).length, 0); // rien créé si la photo échoue
  storageFail = false;
  r = await call({ action: 'drlo_save', ...base, rules: { ...rules, totems: ['lion', 'dragon'], tests: [...rules.tests, { scaleId: '../x' }] }, photo: { data: png, mime: 'image/png' } });
  assert.equal(r.status, 200);
  const ch = r.body.channel;
  assert.deepEqual(ch.rules.totems, ['lion']);
  assert.equal(ch.rules.tests.length, 2);
  assert.ok(ch.photoUrl.includes('channels/'));
  assert.equal(ch.memberCount, 0);
  // modification : nouvelle photo → l'ancienne est supprimée
  r = await call({ action: 'drlo_save', id: ch.id, price: 20, photo: { data: png, mime: 'image/png' } });
  assert.equal(r.body.channel.price, 20);
  assert.equal(r.body.channel.name, 'Éducation sexuelle');
  assert.equal(deleted.length, 1);
  r = await call({ action: 'drlo_list' });
  assert.equal(r.body.items.length, 1);
});

test('ce qui manque : test, niveau, totem, âge, étincelles', async () => {
  const id = Object.keys(store.channels)[0];
  uid = 'u2';
  store.patients.u2 = { korisWallet: { balance: 5 } };
  store.userProfiles.u2 = { onboardingProfile: { prenom: 'Awa', age: '18-25' }, scaleResults: { hsp: { interpretation: { severity: 'mild' } } } };
  let r = await call({ action: 'detail', id });
  const kinds = r.body.channel.missing.map((m) => m.kind).sort();
  assert.deepEqual(kinds, ['age', 'balance', 'level', 'test', 'totem']);
  assert.equal(r.body.channel.eligible, false);
  assert.equal(r.body.channel.framingText, 'Ici on se respecte.');
  assert.equal(r.body.channel.memberCount, 0);
  r = await call({ action: 'join', id, ack: true });
  assert.equal(r.status, 403);
  assert.equal(store.patients.u2.korisWallet.balance, 5); // rien débité
  // sans tranche d'âge connue : refus avec « known:false »
  store.userProfiles.u3 = {}; store.patients.u3 = { korisWallet: { balance: 99 } };
  uid = 'u3';
  r = await call({ action: 'detail', id });
  assert.equal(r.body.channel.missing.find((m) => m.kind === 'age').known, false);
});

test('adhésion : paiement unique, cadrage obligatoire, pas de double entrée, quitter sans remboursement', async () => {
  const id = Object.keys(store.channels)[0];
  store.userProfiles.u4 = { onboardingProfile: { prenom: 'Moussa', age: '26-35' }, totem: { animal: 'lion' },
    scaleResults: { gad7: { interpretation: { severity: 'mild' } }, hsp: { interpretation: { severity: 'moderate' } } } };
  store.patients.u4 = { korisWallet: { balance: 25 } };
  uid = 'u4';
  let r = await call({ action: 'detail', id });
  assert.equal(r.body.channel.eligible, true);
  r = await call({ action: 'join', id }); // sans « J'ai lu »
  assert.equal(r.status, 400);
  assert.equal(store.patients.u4.korisWallet.balance, 25);
  r = await call({ action: 'join', id, ack: true });
  assert.equal(r.status, 200);
  assert.equal(store.patients.u4.korisWallet.balance, 5); // 25 − 20
  assert.equal(store.channels[id].memberCount, 1);
  assert.equal(committed.length, 1);
  r = await call({ action: 'join', id, ack: true });
  assert.equal(r.status, 409);
  assert.equal(store.patients.u4.korisWallet.balance, 5);
  r = await call({ action: 'list' });
  assert.equal(r.body.items[0].member, true);
  assert.deepEqual(r.body.items[0].missing, []);
  assert.equal(r.body.items[0].memberCount, 1);
  assert.equal(JSON.stringify(r.body).includes('u4'), false); // jamais d'identifiant de membre
  r = await call({ action: 'leave', id });
  assert.equal(r.status, 200);
  assert.equal(store.channels[id].memberCount, 0);
  assert.equal(store.patients.u4.korisWallet.balance, 5); // pas de remboursement
  assert.equal((await call({ action: 'leave', id })).status, 409);
});

test('deux entrées en même temps : une seule paie, l\'autre est remboursée', async () => {
  const id = Object.keys(store.channels)[0];
  store.patients.u4.korisWallet.balance = 40;
  uid = 'u4';
  raceOnce = true;
  const r = await call({ action: 'join', id, ack: true });
  assert.equal(r.status, 409);
  assert.equal(store.patients.u4.korisWallet.balance, 40);
  assert.equal(released.length, 1);
  delete store.channelMembers[`${id}_x`];
});

test('chaîne gratuite, archivée, solde insuffisant', async () => {
  uid = 'drlo1';
  let r = await call({ action: 'drlo_save', name: 'Hypersensibilité', description: 'Pour les très sensibles.', price: 0, rules: {} });
  const free = r.body.channel.id;
  uid = 'u5'; store.patients.u5 = { korisWallet: { balance: 0 } }; store.userProfiles.u5 = {};
  r = await call({ action: 'join', id: free });
  assert.equal(r.status, 200);
  assert.equal(r.body.paid, 0);
  // solde insuffisant
  const id = Object.keys(store.channels)[0];
  store.userProfiles.u6 = { onboardingProfile: { age: '36-45' }, totem: { animal: 'lion' }, scaleResults: { gad7: { interpretation: { severity: 'mild' } }, hsp: { interpretation: { severity: 'severe' } } } };
  store.patients.u6 = { korisWallet: { balance: 10 } };
  uid = 'u6';
  r = await call({ action: 'join', id, ack: true });
  assert.equal(r.status, 403);
  assert.deepEqual(r.body.missing.map((m) => m.kind), ['balance']);
  // archivée : invisible pour qui n'est pas membre, visible pour les membres
  uid = 'drlo1';
  await call({ action: 'drlo_save', id: free, status: 'archived' });
  uid = 'u6';
  assert.equal((await call({ action: 'detail', id: free })).status, 404);
  assert.ok(!(await call({ action: 'list' })).body.items.some((i) => i.id === free));
  uid = 'u5';
  assert.ok((await call({ action: 'list' })).body.items.some((i) => i.id === free && i.archived));
});

test('âge : tranche 26-35 passe un minimum de 26 mais pas de 36', () => {
  const p = { onboardingProfile: { age: '26-35' } };
  assert.equal(CH.eligibility(p, 0, { rules: { minAge: 26 } }).eligible, true);
  assert.equal(CH.eligibility(p, 0, { rules: { minAge: 36 } }).eligible, false);
  assert.equal(CH.eligibility({}, 0, { rules: {} }).eligible, true);
  assert.equal(CH.eligibility({}, 5, { price: 0, rules: {} }).eligible, true);
});

test('supprimer une chaîne : réservé à Dr Lô, et il faut écrire le nom exact', async () => {
  uid = 'drlo1';
  storageFail = false;
  const made = await call({ action: 'drlo_save', ...base, name: 'À supprimer', price: 0 });
  const id = made.body.channel.id;
  uid = 'u1';
  assert.equal((await call({ action: 'drlo_delete', id, confirmName: 'À supprimer' })).status, 403);
  uid = 'drlo1';
  assert.equal((await call({ action: 'drlo_delete', id: 'nope', confirmName: 'x' })).status, 404);
  assert.equal((await call({ action: 'drlo_delete', id, confirmName: 'à supprimer' })).status, 400);
  assert.ok(store.channels[id], 'la chaîne est toujours là');
});
