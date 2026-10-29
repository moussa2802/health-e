const test = require('node:test');
const assert = require('node:assert');
const CH = require('../_drloChannels');
const { deleteChannel } = require('../_channelDelete');

const ch = (tests) => ({ price: 0, rules: { tests } });
const prof = (genre, scaleResults = {}) => ({ onboardingProfile: { genre }, scaleResults });

test('une femme ne peut pas entrer dans une chaîne qui exige la fonction érectile : « réservé », pas « test à faire »', () => {
  const r = CH.eligibility(prof('femme'), 0, ch([{ scaleId: 'iief' }]));
  assert.strictEqual(r.eligible, false);
  assert.deepStrictEqual(r.missing, [{ kind: 'reserved', scaleId: 'iief', gender: 'homme' }]);
});

test('un homme ne peut pas entrer dans une chaîne qui exige la fonction sexuelle féminine', () => {
  const r = CH.eligibility(prof('homme'), 0, ch([{ scaleId: 'fsfi' }]));
  assert.deepStrictEqual(r.missing, [{ kind: 'reserved', scaleId: 'fsfi', gender: 'femme' }]);
});

test('un homme doit faire le test de fonction érectile ; s\'il l\'a fait, il entre', () => {
  assert.deepStrictEqual(CH.eligibility(prof('homme'), 0, ch([{ scaleId: 'iief' }])).missing, [{ kind: 'test', scaleId: 'iief' }]);
  assert.strictEqual(CH.eligibility(prof('homme', { iief: { interpretation: { severity: 'mild' } } }), 0, ch([{ scaleId: 'iief' }])).eligible, true);
});

test('genre inconnu : le test reste proposé (il choisira son genre dans le filtre), les autres tests ne sont pas touchés', () => {
  assert.deepStrictEqual(CH.eligibility({ scaleResults: {} }, 0, ch([{ scaleId: 'iief' }])).missing, [{ kind: 'test', scaleId: 'iief' }]);
  assert.deepStrictEqual(CH.eligibility(prof('femme'), 0, ch([{ scaleId: 'gad7' }])).missing, [{ kind: 'test', scaleId: 'gad7' }]);
});

test('même avec un résultat enregistré par erreur, une femme reste « réservé » sur la fonction érectile', () => {
  const r = CH.eligibility(prof('femme', { iief: { interpretation: { severity: 'none' } } }), 0, ch([{ scaleId: 'iief' }]));
  assert.strictEqual(r.eligible, false);
});

test('Dr Lô IA ne propose pas une chaîne réservée à l\'autre genre', () => {
  const c = { id: 'c1', name: 'Érection', description: 'x', price: 0, ...ch([{ scaleId: 'iief' }]) };
  const { text } = CH.chatSummary([c], new Set(), prof('femme'), 0, { iief: 'Fonction érectile' });
  assert.match(text, /réservée aux hommes/);
  assert.match(text, /NE PAS/);
});

test('carte publique : seulement le nécessaire, rien pour une chaîne archivée', () => {
  const c = { name: 'A', description: 'B', price: 3, memberCount: 12, photoPath: 'p.jpg', status: 'active', framingText: 'secret', rules: { minAge: 26, tests: [{ scaleId: 'gad7' }, { scaleId: 'rses' }], totems: ['lion'] } };
  assert.deepStrictEqual(CH.publicCard('c1', c), { id: 'c1', name: 'A', description: 'B', price: 3, memberCount: 12, hasPhoto: true, minAge: 26, testCount: 2, hasTotems: true });
  assert.strictEqual(CH.publicCard('c1', { ...c, status: 'archived' }), null);
  assert.strictEqual(CH.publicCard('c1', null), null);
});

// ── suppression complète ──
function fakeDb(store) {
  const refs = [];
  const col = (name) => {
    const q = (filter, lim) => ({
      limit: (n) => q(filter, n),
      get: async () => {
        const docs = Object.keys(store[name]).filter((id) => !filter || store[name][id][filter[0]] === filter[1]).slice(0, lim || 1e9).map((id) => ({ id, ref: { col: name, id }, data: () => store[name][id] }));
        return { docs, size: docs.length, empty: !docs.length };
      },
    });
    return { where: (k, _o, v) => q([k, v]), doc: (id) => ({ delete: async () => { delete store[name][id]; } }), ...q(null) };
  };
  return { collection: col, batch: () => { const ops = []; return { delete: (r) => ops.push(r), commit: async () => ops.forEach((r) => delete store[r.col][r.id]) }; } };
}

test('supprimer une chaîne efface ses publications, commentaires, membres, vues et fichiers, et laisse les autres chaînes', async () => {
  const store = {
    channels: { c1: { name: 'A' }, c2: { name: 'B' } },
    channelPosts: { p1: { channelId: 'c1' }, p2: { channelId: 'c1' }, p3: { channelId: 'c2' } },
    channelComments: { k1: { channelId: 'c1', postId: 'p1' }, k2: { channelId: 'c2', postId: 'p3' } },
    channelMembers: { c1_u1: { channelId: 'c1' }, c1_u2: { channelId: 'c1' }, c2_u1: { channelId: 'c2' } },
    channelPostViews: { 'p1_u1': { postId: 'p1' }, 'p2_u1': { postId: 'p2' }, 'p3_u1': { postId: 'p3' } },
  };
  const prefixes = [];
  const out = await deleteChannel(fakeDb(store), { deleteFiles: async ({ prefix }) => { prefixes.push(prefix); } }, 'c1');
  assert.deepStrictEqual(out, { views: 2, comments: 1, posts: 2, members: 2 });
  assert.deepStrictEqual(Object.keys(store.channels), ['c2']);
  assert.deepStrictEqual(Object.keys(store.channelPosts), ['p3']);
  assert.deepStrictEqual(Object.keys(store.channelComments), ['k2']);
  assert.deepStrictEqual(Object.keys(store.channelMembers), ['c2_u1']);
  assert.deepStrictEqual(Object.keys(store.channelPostViews), ['p3_u1']);
  assert.deepStrictEqual(prefixes, ['channels/c1/']);
});
