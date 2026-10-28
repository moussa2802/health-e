const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const store = { channels: {}, channelMembers: {}, channelPosts: {}, channelPostViews: {}, channelComments: {}, userProfiles: {}, staff: { drlo1: { drlo: true } } };
let seq = 0, storageFail = false; const saved = [], pushes = [], prefixes = [];
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
const query = (col, f = []) => ({
  where: (k, op, v) => query(col, [...f, [k, v]]),
  limit: () => query(col, f),
  get: async () => { const ids = Object.keys(store[col]).filter((id) => f.every(([k, v]) => store[col][id][k] === v)).sort(); const docs = ids.map((id) => mkSnap(col, id)); return { docs, empty: !docs.length, size: docs.length }; },
});
const db = {
  collection: (col) => ({ doc: (id) => ref(col, id || `x${++seq}`), add: async (d) => { const id = `x${++seq}`; store[col][id] = JSON.parse(JSON.stringify(d)); return ref(col, id); }, ...query(col) }),
  getAll: async (...a) => a.filter((r) => r && r._col).map((r) => mkSnap(r._col, r.id)),
  runTransaction: async (fn) => { const ops = []; const res = await fn({ get: async (r) => r.get(), update: (r, p) => ops.push(() => r.update(p)) }); for (const o of ops) await o(); return res; },
  batch: () => { const ops = []; return { delete: (r) => ops.push(r), commit: async () => { for (const r of ops) await r.delete(); } }; },
};
const admin = {
  firestore: { FieldPath: { documentId: () => '__name__' }, FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => Date.now() } },
  storage: () => ({ bucket: () => ({
    file: (p) => ({ save: async () => { if (storageFail) throw new Error('denied'); saved.push(p); }, delete: async () => {}, getSignedUrl: async () => [`https://signed/${p}`] }),
    deleteFiles: async ({ prefix }) => { prefixes.push(prefix); },
  }) }),
};
let uid = 'drlo1';
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { admin, db, verifyAuth: async () => ({ uid }) });
inject('../_push.js', { sendToUser: async (u, n) => { pushes.push([u, n.inboxTitle]); } });
const { handler } = require('../drlo-channel-comments.js');
const posts = require('../drlo-channel-posts.js');
const call = async (body, h = handler) => { const r = await h({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };
const mp3 = Buffer.alloc(2000, 7).toString('base64');

store.channels.c1 = { name: 'Éducation sexuelle', status: 'active' };
store.channelPosts.p1 = { channelId: 'c1', text: 'Texte', status: 'published', commentsOpen: true, stats: { comments: 0 } };
store.channelPosts.p2 = { channelId: 'c1', text: 'Fermé', status: 'published', commentsOpen: false, stats: { comments: 0 } };
for (const [u, n] of [['m1', 'Awa'], ['m2', 'Moussa']]) {
  store.channelMembers[`c1_${u}`] = { channelId: 'c1', uid: u };
  store.userProfiles[u] = { onboardingProfile: { prenom: n } };
}
store.userProfiles.out = { onboardingProfile: { prenom: 'Externe' } };
let cid;

test('réservé aux membres ; prénom par défaut ; modération ; limite de 3 ; commentaires fermés', async () => {
  uid = 'out';
  assert.equal((await call({ action: 'comment_add', postId: 'p1', text: 'Bonjour', mode: 'prenom' })).status, 403);
  assert.equal((await call({ action: 'comments', postId: 'p1' })).status, 403);
  uid = 'm1';
  assert.equal((await call({ action: 'comment_add', postId: 'zz', text: 'Bonjour', mode: 'prenom' })).status, 404);
  assert.equal((await call({ action: 'comment_add', postId: 'p2', text: 'Bonjour', mode: 'prenom' })).status, 400);
  assert.equal((await call({ action: 'comment_add', postId: 'p1', text: 'Appelle-moi au 77 123 45 67', mode: 'prenom' })).status, 400);
  assert.equal((await call({ action: 'comment_add', postId: 'p1', text: 'va sur https://x.com', mode: 'prenom' })).status, 400);
  assert.equal((await call({ action: 'comment_add', postId: 'p1', text: 'Tu es un idiot', mode: 'prenom' })).status, 400);
  let r = await call({ action: 'comment_add', postId: 'p1', text: 'Merci, ça me parle beaucoup.', mode: 'prenom' });
  assert.equal(r.status, 200); assert.equal(r.body.published, true); cid = r.body.id;
  assert.equal(store.channelComments[cid].name, 'Awa');
  assert.equal(store.channelComments[cid].postId, 'p1');
  assert.equal(store.channelPosts.p1.stats.comments, 1);
  r = await call({ action: 'comment_add', postId: 'p1', text: 'Un autre', mode: 'anon' });
  assert.equal(store.channelComments[r.body.id].name, 'Anonyme');
  r = await call({ action: 'comment_add', postId: 'p1', text: 'Encore un', mode: 'pseudo', pseudo: 'Kaw' });
  assert.equal(store.channelComments[r.body.id].name, 'Kaw');
  assert.equal((await call({ action: 'comment_add', postId: 'p1', text: 'Un quatrième', mode: 'prenom' })).status, 400);
});

test('détresse : jamais publié, message privé, signal sans identité pour Dr Lô', async () => {
  uid = 'm2';
  const r = await call({ action: 'comment_add', postId: 'p1', text: 'je veux me suicider', mode: 'prenom' });
  assert.equal(r.status, 200); assert.equal(r.body.published, false); assert.equal(r.body.support, true);
  assert.deepEqual(pushes, [['m2', 'Dr Lô pense à toi']]);
  assert.equal(store.channelPosts.p1.stats.comments, 3); // rien publié
  uid = 'm1';
  const l = await call({ action: 'comments', postId: 'p1' });
  assert.equal(l.body.items.length, 3);
  assert.ok(!l.body.items.some((c) => /suicid/.test(c.text)));
  uid = 'drlo1';
  const a = await call({ action: 'comments_list', postId: 'p1' });
  const d = a.body.items.find((c) => c.status === 'distress');
  assert.equal(d.name, 'Anonyme'); // pas d'identité
  assert.equal(JSON.stringify(a.body).includes('m2'), false);
});

test('Dr Lô répond (texte et vocal), la personne répond à tour de rôle, clôture', async () => {
  uid = 'm1';
  assert.equal((await call({ action: 'comment_followup', commentId: cid, text: 'Allô ?' })).status, 400); // Dr Lô n'a pas encore répondu
  uid = 'm2';
  assert.equal((await call({ action: 'comment_reply', commentId: cid, text: 'x' })).status, 403);
  uid = 'drlo1';
  storageFail = true;
  assert.equal((await call({ action: 'comment_reply', commentId: cid, audio: { data: mp3, mime: 'audio/mpeg', durationSec: 20 } })).status, 502);
  storageFail = false;
  assert.equal((await call({ action: 'comment_reply', commentId: cid, text: '' })).status, 400);
  assert.equal((await call({ action: 'comment_reply', commentId: cid, text: 'Content que ça te parle.' })).status, 200);
  assert.equal((await call({ action: 'comment_reply', commentId: cid, text: 'Et en vocal.', audio: { data: mp3, mime: 'audio/mpeg', durationSec: 20 } })).status, 200);
  assert.ok(saved[0].startsWith(`channels/c1/comments/${cid}-`));
  uid = 'm1';
  let r = await call({ action: 'comments', postId: 'p1' });
  const mine = r.body.items.find((c) => c.id === cid);
  assert.equal(mine.thread.length, 2);
  assert.equal(mine.thread[0].fresh, true);
  assert.ok(mine.thread[1].audioUrl.startsWith('https://signed/'));
  assert.equal(mine.canReply, true);
  r = await call({ action: 'comments', postId: 'p1' }); // 2e lecture : plus « nouveau »
  assert.equal(r.body.items.find((c) => c.id === cid).thread[0].fresh, false);
  assert.equal((await call({ action: 'comment_followup', commentId: cid, text: 'Merci Dr Lô' })).status, 200);
  assert.equal((await call({ action: 'comment_followup', commentId: cid, text: 'Encore un' })).status, 400); // à tour de rôle
  uid = 'drlo1';
  await call({ action: 'comment_reply', commentId: cid, text: 'Avec plaisir.' });
  assert.equal((await call({ action: 'comment_edit', commentId: cid, index: 0, text: 'Content que ça te parle vraiment.' })).status, 200);
  assert.equal((await call({ action: 'comment_edit', commentId: cid, index: 2, text: 'x' })).status, 400); // 2 = message de la personne
  await call({ action: 'comment_close', commentId: cid, closed: true });
  assert.equal((await call({ action: 'comment_reply', commentId: cid, text: 'Encore' })).status, 409);
  uid = 'm1';
  assert.equal((await call({ action: 'comment_followup', commentId: cid, text: 'Allô' })).status, 400);
  r = await call({ action: 'comments', postId: 'p1' });
  assert.equal(r.body.items.find((c) => c.id === cid).canReply, false);
});

test('masquer, épingler, signaler (3 signalements = masqué), supprimer son commentaire', async () => {
  uid = 'drlo1';
  const list = await call({ action: 'comments_list', postId: 'p1' });
  const other = list.body.items.find((c) => c.name === 'Kaw').id;
  await call({ action: 'comment_pin', commentId: other, pinned: true });
  uid = 'm2';
  let r = await call({ action: 'comments', postId: 'p1' });
  assert.equal(r.body.items[0].id, other); // épinglé en premier
  assert.equal((await call({ action: 'comment_report', commentId: other })).status, 200);
  assert.equal((await call({ action: 'comment_report', commentId: other })).status, 200); // même personne : compté une fois
  assert.equal(store.channelComments[other].reports, 1);
  uid = 'drlo1';
  await call({ action: 'comment_hide', commentId: other, hidden: true });
  uid = 'm2';
  r = await call({ action: 'comments', postId: 'p1' });
  assert.ok(!r.body.items.some((c) => c.id === other));
  uid = 'm2';
  assert.equal((await call({ action: 'comment_delete', commentId: cid })).status, 403);
  uid = 'm1';
  const before = store.channelPosts.p1.stats.comments;
  assert.equal((await call({ action: 'comment_delete', commentId: cid })).status, 200);
  assert.equal(store.channelPosts.p1.stats.comments, before - 1);
  assert.ok(prefixes.includes(`channels/c1/comments/${cid}-`));
});

test('supprimer une publication supprime ses commentaires seulement', async () => {
  store.channelComments.zzz = { postId: 'p2', channelId: 'c1', uid: 'm1', status: 'public' };
  uid = 'drlo1';
  const r = await call({ action: 'post_delete', id: 'p1' }, posts.handler);
  assert.equal(r.status, 200);
  assert.equal(Object.values(store.channelComments).filter((c) => c.postId === 'p1').length, 0);
  assert.ok(store.channelComments.zzz);
});

test('photo de profil : le totem révélé (même anonyme), jamais un totem non révélé', async () => {
  store.userProfiles.m2 = { ...(store.userProfiles.m2 || {}), totem: { animal: 'cerf', revealedAt: 1 } };
  store.userProfiles.m3 = { onboardingProfile: { prenom: 'Fatou' }, totem: { animal: 'lion' } };
  store.channelMembers.c1_m3 = { channelId: 'c1', uid: 'm3' };
  store.channelPosts.p9 = { channelId: 'c1', text: 'Nouveau', status: 'published', commentsOpen: true, stats: { comments: 0 } };
  uid = 'm2';
  let r = await call({ action: 'comment_add', postId: 'p9', text: 'Je me reconnais là-dedans.', mode: 'anon' });
  assert.equal(r.status, 200);
  uid = 'm3';
  r = await call({ action: 'comment_add', postId: 'p9', text: 'Moi aussi, merci.', mode: 'prenom' });
  assert.equal(r.status, 200);
  r = await call({ action: 'comments', postId: 'p9' });
  const anon = r.body.items.find((c) => c.text === 'Je me reconnais là-dedans.');
  const other = r.body.items.find((c) => c.text === 'Moi aussi, merci.');
  assert.equal(anon.totem, 'cerf'); assert.equal(anon.name, 'Anonyme');
  assert.equal(other.totem, null);
});
