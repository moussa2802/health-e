// Boîte à questions anonyme : réactions « utile » / « moi aussi » / « pas clair » (privé) et vues, avec une base en mémoire.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const store = { openQuestions: {}, openReactions: {}, openViews: {}, openBoxRate: {}, staff: { drlo1: { drlo: true } } };
const setIn = (o, key, v) => { const ks = key.split('.'); let t = o; ks.slice(0, -1).forEach((k) => { t[k] = t[k] && typeof t[k] === 'object' ? t[k] : {}; t = t[k]; }); const k = ks[ks.length - 1]; t[k] = v && v.__inc !== undefined ? (Number(t[k]) || 0) + v.__inc : v; };
const apply = (cur, patch) => { const o = JSON.parse(JSON.stringify(cur || {})); for (const [k, v] of Object.entries(patch)) setIn(o, k, v); return o; };
const ref = (col, id) => ({
  id,
  get: async () => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id] }),
  set: async (d, opt) => { store[col][id] = opt && opt.merge ? apply(store[col][id], d) : apply({}, d); },
  delete: async () => { delete store[col][id]; },
});
const docsOf = (col, conds) => Object.entries(store[col]).filter(([, d]) => conds.every(([f, v]) => d[f] === v)).map(([id, d]) => ({ id, data: () => d }));
const requete = (col, conds) => ({
  where: (f, o, v) => requete(col, [...conds, [f, v]]), limit: () => requete(col, conds), orderBy: () => requete(col, conds),
  get: async () => ({ docs: docsOf(col, conds) }),
  count: () => ({ get: async () => ({ data: () => ({ count: docsOf(col, conds).length }) }) }),
});
const db = {
  collection: (col) => ({ doc: (id) => ref(col, id), where: (f, o, v) => requete(col, [[f, v]]), orderBy: () => requete(col, []), add: async (d) => { const id = `q${Object.keys(store[col]).length + 1}`; store[col][id] = d; return { id }; } }),
  runTransaction: async (fn) => {
    const ops = [];
    const r = await fn({ get: (x) => x.get(), set: (x, d, o) => ops.push(() => x.set(d, o)), delete: (x) => ops.push(() => x.delete()) });
    for (const o of ops) await o();
    return r;
  },
};
const admin = { firestore: { FieldValue: { increment: (n) => ({ __inc: n }) }, Timestamp: { now: () => 0 } } };
let uid = null;
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { admin, db, verifyAuth: async () => (uid ? { uid } : null) });
const { handler } = require('../drlo-box.js');
const post = async (body, ip = '1.1.1.1') => { const r = await handler({ httpMethod: 'POST', headers: { 'x-nf-client-connection-ip': ip, 'user-agent': 'test' }, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };
const get = async () => { const r = await handler({ httpMethod: 'GET', headers: {} }); return { status: r.statusCode, body: JSON.parse(r.body) }; };

const V1 = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
const V2 = 'aaaaaaaa-bbbb-cccc-dddd-000000000002';
const reset = () => {
  for (const c of ['openQuestions', 'openReactions', 'openViews', 'openBoxRate']) store[c] = {};
  store.openQuestions.Qabcdefghij1 = { status: 'site', publicText: 'Une question assez longue pour passer ?', answer: 'Une réponse.', answeredAt: 5 };
  store.openQuestions.Qabcdefghij2 = { status: 'new', text: 'Une question pas encore répondue' };
  uid = null;
};
const ID = 'Qabcdefghij1';

test('une réaction par visiteur et par réponse : on peut la changer ou l\'annuler, les compteurs suivent', async () => {
  reset();
  assert.equal((await post({ action: 'react', id: ID, kind: 'utile', visiteurId: V1 })).status, 200);
  assert.deepEqual(store.openQuestions[ID].reactions, { utile: 1 });
  assert.equal((await post({ action: 'react', id: ID, kind: 'utile', visiteurId: V1 })).status, 200); // la même deux fois : rien de plus
  assert.equal(store.openQuestions[ID].reactions.utile, 1);
  assert.equal((await post({ action: 'react', id: ID, kind: 'moi', visiteurId: V1 })).status, 200); // il change d'avis
  assert.deepEqual(store.openQuestions[ID].reactions, { utile: 0, moi: 1 });
  assert.equal((await post({ action: 'react', id: ID, kind: 'utile', visiteurId: V2 })).status, 200); // un autre visiteur
  assert.deepEqual(store.openQuestions[ID].reactions, { utile: 1, moi: 1 });
  assert.equal((await post({ action: 'react', id: ID, kind: null, visiteurId: V1 })).status, 200); // il annule
  assert.deepEqual(store.openQuestions[ID].reactions, { utile: 1, moi: 0 });
  assert.equal(Object.keys(store.openReactions).length, 1);
});

test('réactions refusées : réaction inconnue, visiteur invalide, réponse inconnue ou non publiée', async () => {
  reset();
  assert.equal((await post({ action: 'react', id: ID, kind: 'dislike', visiteurId: V1 })).status, 400); // pas de « pas aimé »
  assert.equal((await post({ action: 'react', id: ID, kind: 'utile', visiteurId: 'court' })).status, 400);
  assert.equal((await post({ action: 'react', id: ID, kind: 'utile' })).status, 400);
  assert.equal((await post({ action: 'react', id: 'inconnu12345', kind: 'utile', visiteurId: V1 })).status, 404);
  assert.equal((await post({ action: 'react', id: 'Qabcdefghij2', kind: 'utile', visiteurId: V1 })).status, 404); // pas publiée
  assert.equal(store.openQuestions[ID].reactions, undefined);
});

test('vues : une seule par visiteur ; la personne qui répond (Dr Lô) ne compte pas', async () => {
  reset();
  assert.equal((await post({ action: 'view', id: ID, visiteurId: V1 })).status, 200);
  assert.equal((await post({ action: 'view', id: ID, visiteurId: V1 })).status, 200);
  assert.equal(store.openQuestions[ID].vues, 1);
  assert.equal((await post({ action: 'view', id: ID, visiteurId: V2 })).status, 200);
  assert.equal(store.openQuestions[ID].vues, 2);
  uid = 'drlo1';
  const r = await post({ action: 'react', id: ID, kind: 'utile', visiteurId: 'aaaaaaaa-bbbb-cccc-dddd-000000000003' });
  assert.equal(r.status, 200); assert.equal(r.body.ignore, true);
  assert.equal(store.openQuestions[ID].reactions, undefined);
});

test('frein : au plus 80 gestes par appareil et par jour', async () => {
  reset();
  for (let i = 0; i < 80; i++) await post({ action: 'view', id: ID, visiteurId: `aaaaaaaa-bbbb-cccc-dddd-${String(i).padStart(12, '0')}` });
  assert.equal(store.openQuestions[ID].vues, 80);
  assert.equal((await post({ action: 'view', id: ID, visiteurId: 'aaaaaaaa-bbbb-cccc-dddd-999999999999' })).status, 429);
  // un autre appareil n'est pas bloqué
  assert.equal((await post({ action: 'view', id: ID, visiteurId: 'aaaaaaaa-bbbb-cccc-dddd-888888888888' }, '2.2.2.2')).status, 200);
});

test('ce que voit le public : chiffres seulement au-dessus du seuil, « pas clair » jamais ; Dr Lô voit les chiffres bruts', async () => {
  reset();
  store.openQuestions[ID].vues = 9; store.openQuestions[ID].reactions = { utile: 9, moi: 3, pasclair: 40 };
  let a = (await get()).body.answers[0];
  assert.deepEqual([a.vues, a.utile, a.moi, 'pasclair' in a], [null, null, null, false]);
  store.openQuestions[ID].vues = 123; store.openQuestions[ID].reactions = { utile: 12, moi: 3, pasclair: 40 };
  a = (await get()).body.answers[0];
  assert.deepEqual([a.vues, a.utile, a.moi, 'pasclair' in a], ['120+', '12', null, false]);
  uid = 'drlo1';
  const l = (await post({ action: 'list' })).body.items.find((x) => x.id === ID);
  assert.equal(l.vues, 123); assert.deepEqual(l.reactions, { utile: 12, moi: 3, pasclair: 40 });
});
