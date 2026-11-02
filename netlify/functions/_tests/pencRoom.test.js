const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

process.env.LIVEKIT_URL = 'wss://demo.livekit.cloud';
process.env.LIVEKIT_API_KEY = 'APIkey';
process.env.LIVEKIT_API_SECRET = 'secret-de-test';
const store = { staff: { owner1: { drlo: true } }, pencs: { p1: { status: 'live', hostUid: 'awa', hostName: 'Awa Ndiaye', access: 'channel', channelId: 'c1' }, p2: { status: 'scheduled', hostUid: 'awa', access: 'all' } }, channelMembers: { c1_moussa: { uid: 'moussa' } }, pencRegs: {}, userProfiles: { moussa: { onboardingProfile: { prenom: 'Moussa' } } } };
const mkSnap = (col, id) => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id] });
const db = { collection: (col) => ({ doc: (id) => ({ id, get: async () => mkSnap(col, id), update: async (p) => { store[col][id] = { ...store[col][id], ...p }; } }) }) };
const lk = { participants: {}, calls: [] };
class AccessToken { constructor(k, s, o) { this.o = o; } addGrant(g) { this.g = g; } async toJwt() { return JSON.stringify({ ...this.o, grant: this.g }); } }
class RoomServiceClient {
  async getParticipant(room, id) { if (!lk.participants[id]) throw new Error('not found'); return lk.participants[id]; }
  async listParticipants() { return Object.values(lk.participants); }
  async updateParticipant(room, id, o) { lk.calls.push(['update', id, o]); const p = lk.participants[id] || (lk.participants[id] = { identity: id, attributes: {}, permission: {} }); Object.assign(p.attributes, o.attributes || {}); if (o.permission) p.permission = o.permission; return p; }
  async mutePublishedTrack(room, id, sid) { lk.calls.push(['mute', id, sid]); }
  async removeParticipant(room, id) { lk.calls.push(['kick', id]); delete lk.participants[id]; }
}
let uid = 'moussa';
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { db, verifyAuth: async () => ({ uid }) });
require.cache[require.resolve('livekit-server-sdk')] = { id: 'lk', filename: 'lk', loaded: true, exports: { AccessToken, RoomServiceClient, TrackSource: { MICROPHONE: 2 } } };
const { handler, identityOf } = require('../penc-room.js');
const call = async (body) => { const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };

test('entrée : auditeur, identité masquée, accès vérifié', async () => {
  uid = 'other';
  assert.equal((await call({ action: 'join', pencId: 'p1', mode: 'anon' })).status, 403); // pas membre de la chaîne
  uid = 'moussa';
  assert.equal((await call({ action: 'join', pencId: 'p2', mode: 'anon' })).status, 409); // pas commencé
  const r = await call({ action: 'join', pencId: 'p1', mode: 'prenom' });
  assert.equal(r.status, 200);
  const tok = JSON.parse(r.body.token);
  assert.equal(tok.name, 'Moussa');
  assert.equal(tok.grant.canPublish, false);
  assert.ok(!r.body.identity.includes('moussa'));
  assert.equal(r.body.identity, identityOf('moussa', 'p1', 'secret-de-test'));
  assert.notEqual(identityOf('moussa', 'p1', 'x'), identityOf('moussa', 'p2', 'x'));
  uid = 'awa';
  const h = await call({ action: 'join', pencId: 'p1' });
  assert.equal(JSON.parse(h.body.token).grant.canPublish, true);
  assert.equal(h.body.isHost, true);
});

test('la parole : invitation par l\'hôte, acceptation, scène limitée, exclusion', async () => {
  const me = identityOf('moussa', 'p1', 'secret-de-test');
  lk.participants[me] = { identity: me, attributes: { hand: '1' }, permission: { canPublish: false } };
  uid = 'moussa';
  assert.equal((await call({ action: 'accept', pencId: 'p1' })).status, 409); // pas invité
  assert.equal((await call({ action: 'invite', pencId: 'p1', identity: me })).status, 403); // pas l'hôte
  uid = 'awa';
  assert.equal((await call({ action: 'invite', pencId: 'p1', identity: me })).status, 200);
  uid = 'moussa';
  assert.equal((await call({ action: 'accept', pencId: 'p1' })).status, 200);
  assert.equal(lk.participants[me].permission.canPublish, true);
  assert.equal((await call({ action: 'leave_stage', pencId: 'p1' })).status, 200);
  assert.equal(lk.participants[me].permission.canPublish, false);
  // scène pleine
  for (let i = 0; i < 6; i++) lk.participants[`x${i}`] = { identity: `x${i}`, attributes: {}, permission: { canPublish: true } };
  lk.participants[me].attributes.invited = '1';
  assert.equal((await call({ action: 'accept', pencId: 'p1' })).status, 409);
  for (let i = 0; i < 6; i++) delete lk.participants[`x${i}`];
  uid = 'owner1'; // Dr Lô peut exclure
  assert.equal((await call({ action: 'kick', pencId: 'p1', identity: me })).status, 200);
  uid = 'moussa';
  assert.equal((await call({ action: 'join', pencId: 'p1', mode: 'anon' })).status, 403);
});
