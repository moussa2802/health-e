const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// ── Faux Firestore en mémoire (assez pour tester les discussions) ──
const store = { drloQuestions: {}, staff: {}, userProfiles: {}, drloQueue: {} };
let n = 0;
const SERVER_TS = { __ts: true };
const resolveVal = (v) => (v === SERVER_TS ? Date.now() : v);
const snap = (id, data) => ({ id, exists: data !== undefined, data: () => data, ref: docRef(snap.col, id) });
function docRef(col, id) {
  return {
    id,
    get: async () => { const s = snap(id, store[col][id]); return s; },
    set: async (d) => { store[col][id] = JSON.parse(JSON.stringify(d)); },
    update: async (d) => { const cur = store[col][id] || {}; for (const [k, v] of Object.entries(d)) { if (v && v.__del) delete cur[k]; else cur[k] = v === SERVER_TS ? Date.now() : v; } store[col][id] = cur; },
    delete: async () => { delete store[col][id]; },
  };
}
const colRef = (col) => {
  snap.col = col;
  const q = (filters = []) => ({
    where: (f, op, v) => q([...filters, [f, v]]),
    orderBy: () => q(filters), limit: () => q(filters), select: () => q(filters),
    count: () => ({ get: async () => ({ data: () => ({ count: Object.keys(store[col]).length }) }) }),
    get: async () => { const docs = Object.entries(store[col]).filter(([, d]) => filters.every(([f, v]) => d[f] === v)).map(([id, d]) => { snap.col = col; return snap(id, d); }); return { docs, empty: docs.length === 0, size: docs.length }; },
  });
  return { doc: (id) => { snap.col = col; return docRef(col, id || `auto${++n}`); }, add: async (d) => { const id = `auto${++n}`; store[col][id] = d; return { id }; }, ...q() };
};
const files = {};
const fakeAdmin = {
  firestore: { FieldValue: { serverTimestamp: () => SERVER_TS, delete: () => ({ __del: true }), increment: (x) => x }, Timestamp: { fromMillis: (x) => x } },
  storage: () => ({ bucket: () => ({ file: (p) => ({ save: async () => { files[p] = true; }, delete: async () => { delete files[p]; }, getSignedUrl: async () => [`https://signed/${p}`] }) }) }),
};
let currentUid = 'user1';
const fb = path.resolve(__dirname, '../_firebase.js');
require.cache[fb] = { id: fb, filename: fb, loaded: true, exports: { admin: fakeAdmin, db: { collection: colRef, getAll: async () => [] }, verifyAuth: async () => ({ uid: currentUid }) } };
const pushed = [];
const pu = path.resolve(__dirname, '../_push.js');
require.cache[pu] = { id: pu, filename: pu, loaded: true, exports: { sendToUser: async (u, m) => { pushed.push([u, m.kind || m.title]); } } };
const { handler } = require('../drlo-question.js');

const call = async (uid, body) => { currentUid = uid; const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };
const AUDIO = { data: Buffer.alloc(3000, 1).toString('base64'), mime: 'audio/mpeg', durationSec: 12 };

test('discussion : réponse, vocal, modification, suppression, suite de la personne, clôture', async () => {
  store.staff.drlo1 = { drlo: true };
  store.drloQuestions.q1 = { uid: 'user1', text: 'Comment gérer mon stress ?', status: 'pending', anonymous: false, snapshot: {}, createdAt: 1000, answer: null, seenAt: null };

  // Dr Lô répond par écrit
  let r = await call('drlo1', { action: 'drlo_answer', id: 'q1', answer: 'Respire, prends du recul.' });
  assert.equal(r.status, 200);
  assert.equal(store.drloQuestions.q1.status, 'answered');
  assert.equal(pushed.length, 1);

  // La personne le voit comme nouveau
  r = await call('user1', { action: 'my_threads' });
  assert.equal(r.body.news, 1);
  assert.equal(r.body.items[0].thread[0].fresh, true);
  assert.equal(r.body.items[0].canReply, true);
  await call('user1', { action: 'mark_seen' });
  r = await call('user1', { action: 'my_threads' });
  assert.equal(r.body.news, 0);

  // Dr Lô modifie : la personne voit « mise à jour »
  await new Promise((res) => setTimeout(res, 5));
  r = await call('drlo1', { action: 'drlo_entry_edit', id: 'q1', index: 0, text: 'Respire, et dors un peu plus.' });
  assert.equal(r.status, 200);
  r = await call('user1', { action: 'my_threads' });
  assert.equal(r.body.news, 1);
  assert.equal(r.body.items[0].thread[0].updated, true);
  assert.equal(r.body.items[0].thread[0].text, 'Respire, et dors un peu plus.');

  // La personne répond (une fois), puis doit attendre
  r = await call('user1', { action: 'followup', id: 'q1', text: 'Merci Doc, et pour le sommeil ?' });
  assert.equal(r.body.published, true);
  r = await call('user1', { action: 'followup', id: 'q1', text: 'Une autre question' });
  assert.equal(r.status, 409);

  // Dr Lô répond par vocal
  r = await call('drlo1', { action: 'drlo_answer', id: 'q1', answer: '', audio: AUDIO });
  assert.equal(r.status, 200);
  assert.equal(Object.keys(files).length, 1);
  r = await call('user1', { action: 'my_threads' });
  const t = r.body.items[0].thread;
  assert.equal(t.length, 3);
  assert.ok(t[2].audioUrl.startsWith('https://signed/'));

  // Suppression d'une réponse : le vocal disparaît du stockage
  r = await call('drlo1', { action: 'drlo_entry_delete', id: 'q1', index: 2 });
  assert.equal(r.status, 200);
  assert.equal(Object.keys(files).length, 0);

  // Clôture : la personne ne peut plus écrire, Dr Lô non plus tant qu'il n'a pas rouvert
  await call('drlo1', { action: 'drlo_answer', id: 'q1', answer: 'Dors bien.' });
  await call('drlo1', { action: 'drlo_close', id: 'q1', closed: true });
  r = await call('user1', { action: 'followup', id: 'q1', text: 'Encore une chose' });
  assert.equal(r.status, 409);
  r = await call('drlo1', { action: 'drlo_answer', id: 'q1', answer: 'Test' });
  assert.equal(r.status, 409);
});

test('suppression de la seule réponse : la question repasse « à répondre »', async () => {
  store.drloQuestions.q2 = { uid: 'user1', text: 'Autre question', status: 'pending', snapshot: {}, createdAt: 2000, answer: null };
  await call('drlo1', { action: 'drlo_answer', id: 'q2', answer: 'Réponse à retirer.' });
  const r = await call('drlo1', { action: 'drlo_entry_delete', id: 'q2', index: 0 });
  assert.equal(r.status, 200);
  assert.equal(store.drloQuestions.q2.status, 'pending');
  assert.equal(store.drloQuestions.q2.answer, null);
});

test('ancienne réponse (champ answer) : lue comme premier message, la personne peut continuer', async () => {
  store.drloQuestions.q3 = { uid: 'user2', text: 'Ancienne question', status: 'answered', snapshot: {}, createdAt: 3000, answer: { text: 'Ancienne réponse', at: 4000 } };
  let r = await call('user2', { action: 'my_threads' });
  assert.equal(r.body.items[0].thread[0].text, 'Ancienne réponse');
  r = await call('user2', { action: 'followup', id: 'q3', text: 'Merci beaucoup !' });
  assert.equal(r.body.published, true);
});

test('un mot de détresse n\'est jamais enregistré : message privé de soutien', async () => {
  store.drloQuestions.q4 = { uid: 'user3', text: 'Q', status: 'answered', snapshot: {}, createdAt: 5000, answer: { text: 'R', at: 6000 } };
  const r = await call('user3', { action: 'followup', id: 'q4', text: 'je veux mourir' });
  assert.equal(r.body.support, true);
  assert.equal(Array.isArray(store.drloQuestions.q4.thread), false);
});

test('seule la personne concernée peut répondre à sa discussion', async () => {
  const r = await call('intrus', { action: 'followup', id: 'q4', text: 'Je me fais passer pour lui' });
  assert.equal(r.status, 404);
});
