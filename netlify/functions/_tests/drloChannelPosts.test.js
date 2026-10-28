const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const store = { channels: {}, channelMembers: {}, channelPosts: {}, channelPostViews: {}, channelComments: {}, userProfiles: {}, staff: { drlo1: { drlo: true } } };
let seq = 0, storageFail = false; const saved = [], deleted = [];
const setIn = (o, key, fn) => { const ks = key.split('.'); let t = o; ks.slice(0, -1).forEach((k) => { t[k] = t[k] && typeof t[k] === 'object' ? t[k] : {}; t = t[k]; }); const k = ks[ks.length - 1]; t[k] = fn(t[k]); };
const applyPatch = (cur, patch) => { const o = JSON.parse(JSON.stringify(cur || {})); for (const [k, v] of Object.entries(patch)) setIn(o, k, (old) => (v && v.__inc !== undefined ? (Number(old) || 0) + v.__inc : v)); return o; };
const mkSnap = (col, id) => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id], ref: ref(col, id) });
function ref(col, id) {
  return {
    id, _col: col,
    get: async () => mkSnap(col, id),
    set: async (d, opt) => { store[col][id] = opt && opt.merge ? applyPatch(store[col][id], d) : JSON.parse(JSON.stringify(d)); },
    update: async (p) => { store[col][id] = applyPatch(store[col][id], p); },
    delete: async () => { delete store[col][id]; },
  };
}
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
    return { docs, empty: !docs.length, size: docs.length };
  },
});
const db = {
  collection: (col) => ({ doc: (id) => ref(col, id || `p${++seq}`), ...query(col) }),
  getAll: async (...a) => a.filter((r) => r && r._col).map((r) => mkSnap(r._col, r.id)),
  batch: () => { const ops = []; return { delete: (r) => ops.push(r), commit: async () => { for (const r of ops) await r.delete(); } }; },
};
const admin = {
  firestore: { FieldPath: { documentId: () => '__name__' }, FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => Date.now() } },
  storage: () => ({ bucket: () => ({ file: (p) => ({
    save: async () => { if (storageFail) throw new Error('denied'); saved.push(p); },
    delete: async () => { deleted.push(p); },
    getSignedUrl: async () => [`https://signed/${p}`],
  }), deleteFiles: async () => {} }) }),
};
let uid = 'drlo1';
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { admin, db, verifyAuth: async () => ({ uid }) });
const { handler } = require('../drlo-channel-posts.js');
const call = async (body) => { const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };
const mp3 = Buffer.alloc(2000, 7).toString('base64');

store.channels.c1 = { name: 'Éducation sexuelle', status: 'active', memberCount: 3 };
store.channels.c2 = { name: 'Vieille chaîne', status: 'archived', memberCount: 0 };
for (const [u, n] of [['m1', 'Awa'], ['m2', 'Moussa'], ['m3', 'Fatou']]) {
  store.channelMembers[`c1_${u}`] = { channelId: 'c1', uid: u, joinedAt: 1000 };
  store.userProfiles[u] = { onboardingProfile: { prenom: n }, scaleResults: { gad7: { score: 20 } } };
}
store.userProfiles.out = { onboardingProfile: { prenom: 'Externe' } };
let texte, vocal, apercu;

test('seul Dr Lô publie ; texte ou vocal obligatoire ; vocal refusé = rien publié', async () => {
  uid = 'm1';
  assert.equal((await call({ action: 'post_create', channelId: 'c1', text: 'Bonjour à tous' })).status, 403);
  uid = 'drlo1';
  assert.equal((await call({ action: 'post_create', channelId: 'c1', text: '' })).status, 400);
  assert.equal((await call({ action: 'post_create', channelId: 'zz', text: 'Bonjour' })).status, 404);
  assert.equal((await call({ action: 'post_create', channelId: 'c2', text: 'Bonjour' })).status, 409);
  assert.equal((await call({ action: 'post_create', channelId: 'c1', text: 'x'.repeat(4001) })).status, 400);
  assert.equal((await call({ action: 'post_create', channelId: 'c1', audio: { data: mp3, mime: 'audio/wav', durationSec: 30 } })).status, 400);
  storageFail = true;
  let r = await call({ action: 'post_create', channelId: 'c1', text: 'Avec vocal', audio: { data: mp3, mime: 'audio/mpeg', durationSec: 30 } });
  assert.equal(r.status, 502);
  assert.equal(Object.keys(store.channelPosts).length, 0);
  storageFail = false;
  r = await call({ action: 'post_create', channelId: 'c1', text: 'Les 3 mythes qui abîment un couple.' });
  assert.equal(r.status, 200); texte = r.body.post.id;
  r = await call({ action: 'post_create', channelId: 'c1', text: 'Le désir n\'est pas un interrupteur.', audio: { data: mp3, mime: 'audio/mpeg', durationSec: 45 } });
  assert.equal(r.status, 200); vocal = r.body.post.id;
  assert.equal(r.body.post.hasAudio, true);
  assert.ok(r.body.post.audioUrl.includes(`channels/c1/posts/${vocal}`));
  r = await call({ action: 'post_create', channelId: 'c1', text: 'Pourquoi on n\'en parle jamais', preview: true });
  apercu = r.body.post.id;
  assert.equal(r.body.post.preview, true);
});

test('fil : un non-membre ne voit ni texte ni lien des publications verrouillées, mais voit l\'aperçu', async () => {
  uid = 'out';
  const r = await call({ action: 'feed', channelId: 'c1' });
  assert.equal(r.status, 200);
  assert.equal(r.body.member, false);
  const by = Object.fromEntries(r.body.posts.map((p) => [p.id, p]));
  assert.equal(by[texte].locked, true);
  assert.equal(by[texte].text, undefined);
  assert.equal(by[vocal].locked, true);
  assert.equal(by[vocal].audioUrl, undefined);
  assert.equal(by[vocal].hasAudio, true); // il sait qu'il y a un vocal, pas plus
  assert.equal(by[apercu].locked, false);
  assert.ok(by[apercu].text.includes('Pourquoi'));
  assert.equal(JSON.stringify(r.body).includes('channels/c1/posts'), false);
  assert.equal((await call({ action: 'feed', channelId: 'c2' })).status, 404); // archivée, pas membre
  assert.equal((await call({ action: 'react', id: texte, reaction: 'heart' })).status, 403);
});

test('membre : tout est ouvert, vues / écoutes / réactions comptées une seule fois', async () => {
  uid = 'm1';
  let r = await call({ action: 'feed', channelId: 'c1' });
  assert.equal(r.body.member, true);
  const v = r.body.posts.find((p) => p.id === vocal);
  assert.equal(v.locked, false);
  assert.ok(v.audioUrl.startsWith('https://signed/'));
  await call({ action: 'seen', channelId: 'c1', ids: [vocal, vocal, texte, 'inconnu'] });
  await call({ action: 'seen', channelId: 'c1', ids: [vocal] });
  assert.equal(store.channelPosts[vocal].stats.views, 1);
  await call({ action: 'listen', id: vocal });
  await call({ action: 'listen', id: vocal });
  assert.equal(store.channelPosts[vocal].stats.listens, 1);
  await call({ action: 'listen', id: texte }); // pas de vocal : rien
  assert.equal(store.channelPosts[texte].stats.listens, 0);
  r = await call({ action: 'react', id: vocal, reaction: 'heart' });
  assert.equal(r.body.counts.heart, 1);
  r = await call({ action: 'react', id: vocal, reaction: 'pray' });
  assert.deepEqual(r.body.counts, { heart: 0, pray: 1, strong: 0 });
  assert.equal((await call({ action: 'react', id: vocal, reaction: 'boom' })).status, 400);
  r = await call({ action: 'react', id: vocal, reaction: null });
  assert.deepEqual(r.body.counts, { heart: 0, pray: 0, strong: 0 });
  r = await call({ action: 'react', id: vocal, reaction: 'strong' });
  r = await call({ action: 'feed', channelId: 'c1' });
  assert.equal(r.body.posts.find((p) => p.id === vocal).mine, 'strong');
  assert.equal(r.body.posts.find((p) => p.id === vocal).seen, true);
  // un 2e membre
  uid = 'm2';
  await call({ action: 'seen', channelId: 'c1', ids: [vocal] });
  assert.equal(store.channelPosts[vocal].stats.views, 2);
});

test('Dr Lô : liste, modification (aperçu), prénoms des membres, vus / pas vus / écoutes, recherche', async () => {
  uid = 'drlo1';
  let r = await call({ action: 'post_list', channelId: 'c1' });
  assert.equal(r.body.items.length, 3);
  const row = r.body.items.find((p) => p.id === vocal);
  assert.equal(row.stats.views, 2); assert.equal(row.stats.listens, 1);
  r = await call({ action: 'post_update', id: texte, preview: true });
  assert.equal(r.body.post.preview, true);
  assert.equal((await call({ action: 'post_update', id: texte, text: '' })).status, 400);
  assert.equal((await call({ action: 'post_update', id: texte })).status, 400);
  r = await call({ action: 'audience', channelId: 'c1', kind: 'all' });
  assert.deepEqual(r.body.items.map((x) => x.name).sort(), ['Awa', 'Fatou', 'Moussa']);
  assert.equal(JSON.stringify(r.body).includes('gad7'), false); // jamais de résultats
  r = await call({ action: 'audience', channelId: 'c1', postId: vocal, kind: 'seen' });
  assert.deepEqual(r.body.items.map((x) => x.name).sort(), ['Awa', 'Moussa']);
  r = await call({ action: 'audience', channelId: 'c1', postId: vocal, kind: 'unseen' });
  assert.deepEqual(r.body.items.map((x) => x.name), ['Fatou']);
  r = await call({ action: 'audience', channelId: 'c1', postId: vocal, kind: 'listened' });
  assert.deepEqual(r.body.items.map((x) => x.name), ['Awa']);
  r = await call({ action: 'audience', channelId: 'c1', kind: 'all', q: 'mou' });
  assert.deepEqual(r.body.items.map((x) => x.name), ['Moussa']);
  uid = 'm1';
  assert.equal((await call({ action: 'audience', channelId: 'c1', kind: 'all' })).status, 403);
});

test('beaucoup de membres : pagination complète', async () => {
  store.channels.big = { name: 'Grande', status: 'active' };
  for (let i = 0; i < 1300; i++) {
    const u = `b${String(i).padStart(4, '0')}`;
    store.channelMembers[`big_${u}`] = { channelId: 'big', uid: u, joinedAt: 1000 + i };
    store.userProfiles[u] = { onboardingProfile: { prenom: `P${i}` } };
  }
  uid = 'drlo1';
  let all = []; let next = null; let guard = 0;
  do {
    const r = await call({ action: 'audience', channelId: 'big', kind: 'all', after: next });
    assert.ok(r.body.items.length <= 600);
    all = all.concat(r.body.items); next = r.body.next;
  } while (next && guard++ < 30);
  assert.equal(all.length, 1300);
});

test('suppression : publication, vocal et vues disparaissent', async () => {
  uid = 'drlo1';
  const r = await call({ action: 'post_delete', id: vocal });
  assert.equal(r.status, 200);
  assert.equal(store.channelPosts[vocal], undefined);
  assert.ok(deleted.some((p) => p.includes(vocal)));
  assert.equal(Object.keys(store.channelPostViews).filter((k) => k.startsWith(vocal)).length, 0);
  assert.equal((await call({ action: 'post_delete', id: vocal })).status, 404);
});
