const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const store = { channels: {}, channelMembers: {}, channelPosts: {}, channelPostViews: {}, channelComments: {}, userProfiles: {}, patients: {}, drloState: {}, staff: { drlo1: { drlo: true } } };
let seq = 0; const pushes = [];
const num = (v) => (v instanceof Date ? v.getTime() : Number(v));
const setIn = (o, key, fn) => { const ks = key.split('.'); let t = o; ks.slice(0, -1).forEach((k) => { t[k] = t[k] && typeof t[k] === 'object' ? t[k] : {}; t = t[k]; }); const k = ks[ks.length - 1]; t[k] = fn(t[k]); };
const applyPatch = (cur, patch) => { const o = JSON.parse(JSON.stringify(cur || {})); for (const [k, v] of Object.entries(patch)) setIn(o, k, (old) => (v && v.__inc !== undefined ? (Number(old) || 0) + v.__inc : v)); return o; };
const mkSnap = (col, id) => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id], ref: ref(col, id) });
function ref(col, id) {
  return { id, _col: col, get: async () => mkSnap(col, id),
    set: async (d, opt) => { store[col][id] = opt && opt.merge ? applyPatch(store[col][id], d) : JSON.parse(JSON.stringify(d)); },
    update: async (p) => { store[col][id] = applyPatch(store[col][id], p); }, delete: async () => { delete store[col][id]; } };
}
const query = (col, f = [], after = null, lim = 1e9) => ({
  where: (k, op, v) => query(col, [...f, [k, op, v]], after, lim),
  orderBy: () => query(col, f, after, lim),
  limit: (n) => query(col, f, after, n),
  startAfter: (s) => query(col, f, s.id, lim),
  get: async () => {
    let ids = Object.keys(store[col]).filter((id) => f.every(([k, op, v]) => (op === '>' ? num(store[col][id][k]) > num(v) : store[col][id][k] === v))).sort();
    if (after) ids = ids.filter((id) => id > after);
    const docs = ids.slice(0, lim).map((id) => mkSnap(col, id));
    return { docs, empty: !docs.length, size: docs.length };
  },
});
const db = {
  collection: (col) => ({ doc: (id) => ref(col, id || `x${++seq}`), add: async (d) => { const id = `x${++seq}`; store[col][id] = JSON.parse(JSON.stringify(d)); return ref(col, id); }, ...query(col) }),
  getAll: async (...a) => a.filter((r) => r && r._col).map((r) => mkSnap(r._col, r.id)),
  runTransaction: async (fn) => { const ops = []; const res = await fn({ get: async (r) => r.get(), set: (r, d) => ops.push(() => r.set(d)), update: (r, p) => ops.push(() => r.update(p)), delete: (r) => ops.push(() => r.delete()) }); for (const o of ops) await o(); return res; },
  batch: () => { const ops = []; return { delete: (r) => ops.push(r), commit: async () => { for (const r of ops) await r.delete(); } }; },
};
const admin = {
  firestore: { FieldPath: { documentId: () => '__name__' }, FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => Date.now() } },
  storage: () => ({ bucket: () => ({ file: () => ({ save: async () => {}, delete: async () => {}, getSignedUrl: async () => ['https://x'] }), deleteFiles: async () => {} }) }),
};
let uid = 'drlo1';
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { admin, db, verifyAuth: async () => ({ uid }) });
inject('../_koris.js', { reserveKoris: async () => ({ holdId: null }), commitKoris: async () => {}, releaseKoris: async () => {} });
inject('../_push.js', { sendToUser: async (u, n) => { pushes.push({ uid: u, title: n.inboxTitle, body: n.body, link: n.link }); } });
const chans = require('../drlo-channels.js'); const postsFn = require('../drlo-channel-posts.js'); const comFn = require('../drlo-channel-comments.js'); const sched = require('../channel-push-scheduled.js');
const call = async (h, body) => { const r = await h.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };

store.channels.c1 = { name: 'Éducation sexuelle', status: 'active', memberCount: 0 };
store.channels.c2 = { name: 'Gérer ses émotions', status: 'active', memberCount: 0 };
const join = (c, u, extra = {}) => { store.channelMembers[`${c}_${u}`] = { channelId: c, uid: u, joinedAt: 1000, feedSeenAt: 1000, muted: false, ...extra }; store.userProfiles[u] = { onboardingProfile: { prenom: u } }; };
['m1', 'm2', 'm3'].forEach((u) => join('c1', u)); join('c1', 'm4', { muted: true }); join('c2', 'm1');
const mp3 = Buffer.alloc(2000, 7).toString('base64');

test('publier prévient les membres (pas ceux qui ont coupé), message neutre sans contenu', async () => {
  uid = 'drlo1';
  const r = await call(postsFn, { action: 'post_create', channelId: 'c1', text: 'Texte très confidentiel sur la sexualité' });
  assert.equal(r.status, 200);
  assert.deepEqual(pushes.map((p) => p.uid).sort(), ['m1', 'm2', 'm3']); // m4 muted
  assert.ok(pushes.every((p) => p.body === 'Dr Lô a publié dans Éducation sexuelle.'));
  assert.ok(pushes.every((p) => !p.body.includes('confidentiel') && p.link === '/chaines/c1'));
  assert.equal(store.channelPosts[r.body.post.id].pushDone, true);
  pushes.length = 0;
  await call(postsFn, { action: 'post_create', channelId: 'c1', text: 'Sans prévenir', notify: false });
  assert.equal(pushes.length, 0);
});

test('envoi interrompu : la tâche planifiée reprend après le curseur', async () => {
  for (let i = 0; i < 230; i++) join('big', `u${String(i).padStart(3, '0')}`);
  store.channels.big = { name: 'Grande', status: 'active' };
  store.channelPosts.pbig = { channelId: 'big', text: 'x', status: 'published', pushDone: false, pushCursor: 'big_u099', createdAt: 5 };
  pushes.length = 0;
  const r = await sched.handler();
  assert.equal(r.statusCode, 200);
  assert.equal(pushes.length, 130); // u100 … u229
  assert.equal(store.channelPosts.pbig.pushDone, true);
  assert.equal((await sched.handler()).statusCode, 200);
  assert.equal(pushes.length, 130); // rien de plus
});

test('pastilles : nouvelles publications, alertes coupées, remise à zéro à l\'ouverture du fil', async () => {
  store.channelPosts.a1 = { channelId: 'c2', status: 'published', createdAt: 2000, commentsOpen: true };
  store.channelPosts.a2 = { channelId: 'c2', status: 'published', createdAt: 3000, commentsOpen: true };
  store.channelPosts.old = { channelId: 'c2', status: 'published', createdAt: 500 }; // avant son arrivée
  uid = 'm1';
  let r = await call(chans, { action: 'news' });
  assert.equal(r.body.byChannel.c2.posts, 2);
  assert.ok(r.body.byChannel.c1.posts >= 2); // les 2 publications faites plus haut
  assert.equal(r.body.badge, r.body.byChannel.c1.posts + 2);
  r = await call(chans, { action: 'list' });
  assert.equal(r.body.items.find((i) => i.id === 'c2').news.posts, 2);
  assert.equal(r.body.badge > 0, true);
  await call(postsFn, { action: 'feed', channelId: 'c2' });
  r = await call(chans, { action: 'news' });
  assert.equal(r.body.byChannel.c2.posts, 0);
  // alertes coupées : plus de pastille « publications »
  assert.equal((await call(chans, { action: 'mute', id: 'c1', muted: true })).status, 200);
  r = await call(chans, { action: 'news' });
  assert.equal(r.body.byChannel.c1.posts, 0);
  assert.equal((await call(chans, { action: 'mute', id: 'c2', muted: false })).body.muted, false);
  uid = 'outsider';
  assert.equal((await call(chans, { action: 'mute', id: 'c1', muted: true })).status, 404);
  assert.equal((await call(chans, { action: 'news' })).body.badge, 0);
});

test('réponse de Dr Lô : notification neutre + pastille, qui disparaît quand on ouvre les commentaires', async () => {
  const pid = Object.keys(store.channelPosts).find((k) => store.channelPosts[k].channelId === 'c1' && store.channelPosts[k].text.startsWith('Texte'));
  uid = 'm2';
  const c = await call(comFn, { action: 'comment_add', postId: pid, text: 'Merci pour ce partage.', mode: 'prenom' });
  uid = 'drlo1'; pushes.length = 0;
  assert.equal((await call(comFn, { action: 'comment_reply', commentId: c.body.id, text: 'Avec plaisir, ma réponse privée.' })).status, 200);
  assert.deepEqual(pushes.map((p) => [p.uid, p.body]), [['m2', "Dr Lô t'a répondu dans Éducation sexuelle."]]);
  assert.ok(!pushes[0].body.includes('plaisir'));
  uid = 'm2';
  let r = await call(chans, { action: 'news' });
  assert.equal(r.body.byChannel.c1.replies, 1);
  await call(comFn, { action: 'comments', postId: pid });
  r = await call(chans, { action: 'news' });
  assert.equal(r.body.byChannel.c1.replies, 0);
});

test('activité Dr Lô : nouveaux membres, commentaires, réponses ; détresse comptée sans identité ; remise à zéro', async () => {
  uid = 'drlo1';
  let r = await call(chans, { action: 'drlo_activity' });
  assert.deepEqual(r.body, { badge: 0, distress: 0, byChannel: {} }); // 1re visite : point de départ
  await new Promise((res) => setTimeout(res, 5));
  const since = store.drloState.drlo1.channelsSeenAt;
  const pid = Object.keys(store.channelPosts).find((k) => store.channelPosts[k].channelId === 'c1' && store.channelPosts[k].text.startsWith('Texte'));
  store.channelMembers.c1_newbie = { channelId: 'c1', uid: 'newbie', joinedAt: since + 1 };
  store.channelComments.cA = { postId: pid, channelId: 'c1', uid: 'm3', status: 'public', hidden: false, createdAt: since + 2 };
  store.channelComments.cB = { postId: pid, channelId: 'c1', uid: 'm3', status: 'distress', hidden: true, createdAt: since + 3 };
  store.channelComments.cC = { postId: pid, channelId: 'c1', uid: 'm3', status: 'public', hidden: false, createdAt: since - 500, lastUserAt: since + 4 };
  store.channelComments.cD = { postId: pid, channelId: 'c2', uid: 'm3', status: 'public', hidden: true, createdAt: since + 5 }; // masqué : pas compté
  r = await call(chans, { action: 'drlo_activity' });
  assert.deepEqual(r.body.byChannel.c1, { members: 1, comments: 2, replies: 1 });
  assert.equal(r.body.byChannel.c2, undefined);
  assert.equal(r.body.distress, 1);
  assert.equal(r.body.badge, 4);
  assert.equal(JSON.stringify(r.body).includes('m3'), false);
  await new Promise((res) => setTimeout(res, 20));
  assert.equal((await call(chans, { action: 'drlo_seen' })).status, 200);
  r = await call(chans, { action: 'drlo_activity' });
  assert.equal(r.body.badge, 0);
  uid = 'm1';
  assert.equal((await call(chans, { action: 'drlo_activity' })).status, 403);
});
