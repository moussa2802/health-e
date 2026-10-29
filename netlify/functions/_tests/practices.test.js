const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const P = require('../_practices');

// ── logique pure ──
const carnet = { type: 'carnet', title: 'Carnet du plaisir', summary: 'Chaque soir, note ce qui t\'a fait du bien.', theme: 'humeur', minutes: 2, price: 3, source: 'Activation comportementale (Lewinsohn)', script: 'secret', cautions: '',
  fields: [{ kind: 'scale', label: 'Énergie' }, { kind: 'scale', label: 'Plaisir' }, { kind: 'text', label: 'Activité agréable' }, { kind: 'check', label: 'Je l\'ai fait' }, { kind: 'choice', label: 'Moment', options: ['Matin', 'Soir'] }], status: 'published' };

test('validation : type, titre, prix, source obligatoires ; champs du carnet nettoyés', () => {
  assert.match(P.validatePractice({ ...carnet, type: 'x' }).error, /type/);
  assert.match(P.validatePractice({ ...carnet, price: 1.5 }).error, /prix/i);
  assert.match(P.validatePractice({ ...carnet, price: 501 }).error, /prix/i);
  assert.match(P.validatePractice({ ...carnet, source: '' }).error, /source/i);
  assert.match(P.validatePractice({ ...carnet, fields: [{ kind: 'choice', label: 'Moment', options: ['Seul'] }] }).error, /2 choix/);
  const { data } = P.validatePractice(carnet);
  assert.deepStrictEqual(data.fields.map((f) => f.id), ['f1', 'f2', 'f3', 'f4', 'f5']);
  assert.strictEqual(data.price, 3);
});

test('on ne publie pas une pratique vide', () => {
  assert.match(P.publishProblem({ type: 'guided', status: 'published' }), /audio/);
  assert.match(P.publishProblem({ type: 'carnet', status: 'published', fields: [] }), /champ/);
  assert.strictEqual(P.publishProblem({ type: 'guided', status: 'draft' }), null);
  assert.strictEqual(P.publishProblem({ type: 'technique', status: 'published', steps: ['Inspire 4 s'] }), null);
});

test('gratuite : prix 0, ou offerte aux membres d\'une chaîne où elle est proposée', () => {
  assert.strictEqual(P.isFreeFor({ price: 0 }, new Set()), true);
  assert.strictEqual(P.isFreeFor({ price: 3 }, new Set(['c1'])), false);
  assert.strictEqual(P.isFreeFor({ price: 3, freeForMembers: true, channelIds: ['c1'] }, new Set(['c1'])), true);
  assert.strictEqual(P.isFreeFor({ price: 3, freeForMembers: true, channelIds: ['c2'] }, new Set(['c1'])), false);
});

test('la personne ne reçoit jamais le script, et le contenu seulement si débloquée', () => {
  const { data } = P.validatePractice(carnet);
  const locked = P.publicPractice('p1', data, { unlocked: false, free: false });
  assert.strictEqual(locked.script, undefined);
  assert.strictEqual(locked.fields, undefined);
  const open = P.publicPractice('p1', data, { unlocked: true, free: false });
  assert.strictEqual(open.script, undefined);
  assert.strictEqual(open.fields.length, 5);
});

test('un jour de carnet : notes 0-10, choix connus, au moins une ligne', () => {
  const { data } = P.validatePractice(carnet);
  assert.match(P.validateLog(data.fields, {}).error, /au moins/);
  assert.match(P.validateLog(data.fields, { f1: 11 }).error, /0 à 10/);
  assert.match(P.validateLog(data.fields, { f5: 'Nuit' }).error, /choix/);
  assert.deepStrictEqual(P.validateLog(data.fields, { f1: 7, f3: '  marche  ', f4: true, f5: 'Soir', zz: 'x' }).values, { f1: 7, f3: 'marche', f4: true, f5: 'Soir' });
});

test('jour : aujourd\'hui ou les 7 jours d\'avant, jamais le futur', () => {
  const now = Date.parse('2026-10-29T15:00:00Z');
  assert.strictEqual(P.validDay('2026-10-29', now), true);
  assert.strictEqual(P.validDay('2026-10-22', now), true);
  assert.strictEqual(P.validDay('2026-10-20', now), false);
  assert.strictEqual(P.validDay('2026-11-02', now), false);
  assert.strictEqual(P.validDay('29/10/2026', now), false);
});

// ── fonction serveur ──
const store = { practices: {}, practiceUnlocks: {}, practiceRuns: {}, practiceLogs: {}, channelMembers: {}, staff: { drlo1: { drlo: true } } };
let seq = 0; let uid = 'drlo1'; const holds = { reserved: [], committed: [], released: [] }; let balance = 10;
const apply = (cur, patch) => { const o = JSON.parse(JSON.stringify(cur || {})); for (const [k, v] of Object.entries(patch)) { const keys = k.split('.'); let t = o; while (keys.length > 1) { const kk = keys.shift(); t[kk] = t[kk] || {}; t = t[kk]; } const last = keys[0]; if (v && v.__inc !== undefined) t[last] = (Number(t[last]) || 0) + v.__inc; else if (v && v.__union) t[last] = [...new Set([...(t[last] || []), ...v.__union])]; else t[last] = v; } return o; };
const snap = (col, id) => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id] });
const ref = (col, id) => ({ id, _col: col, get: async () => snap(col, id), set: async (d) => { store[col][id] = JSON.parse(JSON.stringify(d)); }, update: async (p) => { store[col][id] = apply(store[col][id], p); } });
const query = (col, filters) => ({ where: (k, _o, v) => query(col, [...filters, [k, v]]), get: async () => { const docs = Object.keys(store[col]).filter((id) => filters.every(([k, v]) => store[col][id][k] === v)).map((id) => snap(col, id)); return { docs, empty: !docs.length, size: docs.length }; } });
const db = {
  collection: (col) => ({ doc: (id) => ref(col, id || `auto${++seq}`), add: async (d) => { store[col][`auto${++seq}`] = d; }, get: async () => query(col, []).get(), where: (k, o, v) => query(col, [[k, v]]) }),
  getAll: async (...refs) => refs.map((r) => snap(r._col, r.id)),
  runTransaction: async (fn) => { const ops = []; await fn({ get: (r) => r.get(), set: (r, d) => ops.push(() => r.set(d)), update: (r, p) => ops.push(() => r.update(p)) }); for (const o of ops) await o(); },
};
const saved = [];
const admin = {
  firestore: { FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => 1, arrayUnion: (...a) => ({ __union: a }) } },
  storage: () => ({ bucket: () => ({ file: (p) => ({ save: async () => { saved.push(p); }, delete: async () => {}, getSignedUrl: async () => [`https://signed/${p}`] }) }) }),
};
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { admin, db, verifyAuth: async () => ({ uid }) });
inject('../_koris.js', {
  reserveKoris: async (u, f, q) => { assert.strictEqual(f, 'practice'); if (balance < q) return { error: 'insufficient_balance' }; balance -= q; holds.reserved.push(q); return { holdId: `h${q}` }; },
  commitKoris: async (h) => { if (h) holds.committed.push(h); },
  releaseKoris: async (h) => { if (h) holds.released.push(h); },
});
const { handler } = require('../practices.js');
const call = async (b) => { const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(b) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };

test('Dr Lô crée un carnet ; une personne ne peut pas en créer', async () => {
  uid = 'u1';
  assert.strictEqual((await call({ action: 'drlo_save', ...carnet })).status, 403);
  uid = 'drlo1';
  const r = await call({ action: 'drlo_save', ...carnet });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.practice.script, 'secret');
  store.carnetId = r.body.practice.id;
});

test('exercice guidé publié sans audio : refusé ; avec audio : enregistré', async () => {
  uid = 'drlo1';
  const g = { type: 'guided', title: 'Scan corporel', minutes: 3, price: 2, source: 'Pleine conscience (MBSR)', status: 'published' };
  assert.match((await call({ action: 'drlo_save', ...g })).body.error, /audio/);
  const audio = { data: Buffer.alloc(2000, 7).toString('base64'), mime: 'audio/mpeg', durationSec: 180 };
  const r = await call({ action: 'drlo_save', ...g, audio });
  assert.strictEqual(r.status, 200);
  assert.ok(saved.some((p) => p.startsWith(`practices/${r.body.practice.id}/`)));
});

test('une personne voit le résumé, débloque UNE fois, puis remplit son carnet', async () => {
  uid = 'u1';
  const id = store.carnetId;
  let r = await call({ action: 'get', id });
  assert.strictEqual(r.body.practice.unlocked, false);
  assert.strictEqual(r.body.practice.script, undefined);
  assert.strictEqual(r.body.practice.fields, undefined);
  assert.strictEqual((await call({ action: 'log', id, day: new Date().toISOString().slice(0, 10), values: { f1: 5 } })).status, 403);
  r = await call({ action: 'unlock', id });
  assert.deepStrictEqual(r.body, { ok: true, paid: 3 });
  assert.strictEqual(balance, 7);
  r = await call({ action: 'unlock', id });
  assert.strictEqual(r.body.already, true);
  assert.strictEqual(balance, 7, 'pas de second débit');
  const day = new Date().toISOString().slice(0, 10);
  r = await call({ action: 'log', id, day, values: { f1: 7, f2: 8 } });
  assert.strictEqual(r.status, 200);
  await call({ action: 'log', id, day, values: { f1: 6 } });
  assert.strictEqual(store.practices[id].stats.logs, 1, 'le même jour n\'est compté qu\'une fois');
  r = await call({ action: 'get', id });
  assert.strictEqual(r.body.practice.fields.length, 5);
  assert.deepStrictEqual(r.body.logs, [{ day, values: { f1: 6 } }]);
});

test('pas assez d\'étincelles : refus, rien de débloqué', async () => {
  uid = 'u2'; balance = 1;
  const r = await call({ action: 'unlock', id: store.carnetId });
  assert.strictEqual(r.status, 402);
  assert.strictEqual(store.practiceUnlocks[`u2_${store.carnetId}`], undefined);
  balance = 10;
});

test('offerte aux membres de la chaîne où elle est proposée', async () => {
  uid = 'drlo1';
  await call({ action: 'drlo_save', id: store.carnetId, freeForMembers: true });
  store.practices[store.carnetId].channelIds = ['c1'];
  store.channelMembers.c1_u3 = { channelId: 'c1' };
  uid = 'u3';
  const r = await call({ action: 'unlock', id: store.carnetId });
  assert.deepStrictEqual(r.body, { ok: true, paid: 0 });
});

test('ressenti et arrêt « ça ne va pas » comptés ; brouillon invisible', async () => {
  uid = 'u1';
  assert.strictEqual((await call({ action: 'finish', id: store.carnetId, feeling: 'mieux' })).status, 200);
  assert.strictEqual((await call({ action: 'stop', id: store.carnetId })).status, 200);
  const st = store.practices[store.carnetId].stats;
  assert.strictEqual(st.mieux, 1); assert.strictEqual(st.stops, 1);
  uid = 'drlo1';
  const d = await call({ action: 'drlo_save', type: 'technique', title: 'Respiration 4-7-8', minutes: 2, price: 0, source: 'Weil', steps: ['Inspire 4 s'] });
  uid = 'u1';
  assert.strictEqual((await call({ action: 'get', id: d.body.practice.id })).status, 404);
  const l = await call({ action: 'list', ids: [d.body.practice.id, store.carnetId] });
  assert.deepStrictEqual(l.body.items.map((i) => i.id), [store.carnetId]);
  assert.strictEqual(l.body.items[0].unlocked, true);
});
