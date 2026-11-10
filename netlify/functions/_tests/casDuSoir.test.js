// Lancer : node --test netlify/functions/_tests/casDuSoir.test.js
// « Le cas du soir » : données, publication par date, droits, embranchement par la majorité, votes, paiement, masquage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const K = require('../_casDuSoir');

const H = K.HISTOIRES[0];
const avecDate = (fn) => async () => { H.programmee = true; try { await fn(); } finally { H.programmee = false; } };

test('données : chaque histoire est complète (5 épisodes, 3 choix, 2 à l\'embranchement, leçon et 3 questions)', () => {
  for (const h of K.HISTOIRES) assert.deepEqual(K.verifierHistoire(h), [], h.id);
  const casse = JSON.parse(JSON.stringify(H));
  casse.episodes[2].choix.push({ id: 'C', label: 'x', echo: 'y' });
  casse.fin.quiz.pop();
  assert.ok(K.verifierHistoire(casse).length >= 2);
});

test('les prix du serveur et de l\'appli sont les mêmes', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'src', 'config', 'contenusPayants.ts'), 'utf8');
  const m = src.match(/CAS_DU_SOIR_PRIX = \{ suite: (\d+), bonus: (\d+), autreFin: (\d+) \}/);
  assert.ok(m);
  assert.deepEqual({ suite: Number(m[1]), bonus: Number(m[2]), autreFin: Number(m[3]) }, K.PRIX);
});

test('« Le vu de minuit » est branché, sans date publique ; la mention et les tests liés sont ceux de la direction', () => {
  assert.equal(H.id, 'vu-de-minuit');
  assert.equal(H.programmee, false);
  assert.equal(K.episodesParus(H, Date.parse('2100-01-01')), 0); // rien ne paraît, jamais, sans date publique
  assert.equal(K.episodesParus(H, K.publication(H, 3) + 1, true), 3); // l'aperçu fonctionne
  assert.equal(H.egalite, 'B');
  assert.equal(H.minVotes, 30);
  assert.equal(H.testLie, 'ecr_r');
  assert.equal(H.testAussi, 'bonus_jalousie');
  assert.equal(H.avertissement, 'Histoire inventée. Toute ressemblance avec des personnes réelles serait une coïncidence. Si elle te touche de près, le compagnon est là pour en parler.');
  assert.deepEqual(H.episodes.map((e) => e.titre || `${e.A.titre} / ${e.B.titre}`), ['Le vu de minuit', 'Six appels', 'Le code', 'Discrets / La terrasse', 'Le cercle / Le faire-part']);
  assert.ok(H.episodes[0].texte.startsWith('Il est presque minuit aux Parcelles Assainies.'));
  assert.ok(H.episodes[0].texte.includes('IBA : Nanga def, sama soxna ? (Comment vas-tu, ma femme ?)'));
  assert.ok(!/NARRATRICE|\*/.test(JSON.stringify(H.episodes)) && !JSON.stringify(H.fin).includes('*'));
  assert.ok(H.fin.texte.startsWith('Bonsoir. C\'est Dr Lô.') && H.fin.texte.endsWith('Bonne nuit.'));
  assert.deepEqual(H.fin.quiz.map((q) => q.bonne), [1, 1, 1]);
  assert.equal(H.fin.apresQuiz, '3 sur 3 ? Tu as compris le cercle. Reste à le repérer chez toi.');
  assert.ok(!JSON.stringify(H).includes('Fatou et le groupe')); // l'histoire factice est partie
});

test('fidélité : le texte affiché est celui du fichier de la direction, mot pour mot', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'docs', 'agents', 'rapports', '2026-11-10-cas-du-soir-pilote.md'), 'utf8');
  if (!src) return;
  const words = (t) => (t.match(/[\p{L}\p{N}'’-]+/gu) || []).join(' ');
  const clean = words(src.replace(/NARRATRICE : /g, '').replace(/\*/g, ''));
  const versions = H.episodes.flatMap((e) => (e.A ? [e.A, e.B] : [e]));
  for (const v of versions) {
    assert.ok(clean.includes(words(v.texte)), v.titre);
    assert.ok(src.includes(v.question), v.titre);
    for (const c of v.choix) assert.ok(src.includes(c.label) && src.includes(c.echo), c.label);
  }
  assert.ok(clean.includes(words(H.fin.texte)));
});

test('publication : l\'épisode n paraît le jour n à l\'heure dite (Dakar = UTC)', avecDate(() => {
  const p1 = K.publication(H, 1);
  assert.equal(new Date(p1).toISOString(), `${H.depart}T${H.heure}:00.000Z`);
  assert.equal(K.publication(H, 3) - p1, 2 * 86400000);
  assert.equal(K.episodesParus(H, p1 - 1), 0);
  assert.equal(K.episodesParus(H, p1), 1);
  assert.equal(K.episodesParus(H, K.publication(H, 4) + 5), 4);
  assert.equal(K.episodesParus(H, K.publication(H, 5) + 10 * 86400000), 5);
}));

test('droits : visiteur = épisode 1 ; compte = épisodes parus + payés ; la suite de l\'embranchement ne s\'achète pas en avance', () => {
  assert.equal(K.peutLire({ n: 1, parus: 2, connecte: false }), true);
  assert.equal(K.peutLire({ n: 2, parus: 2, connecte: false }), false);
  assert.equal(K.peutLire({ n: 2, parus: 2, connecte: true }), true);
  assert.equal(K.peutLire({ n: 3, parus: 2, connecte: true }), false);
  assert.equal(K.peutLire({ n: 3, parus: 2, connecte: true, debloques: [3] }), true);
  assert.deepEqual(K.peutAvancer(H, { n: 2, parus: 1 }), { ok: true });
  assert.equal(K.peutAvancer(H, { n: 3, parus: 1 }).ok, false); // seulement le suivant
  assert.equal(K.peutAvancer(H, { n: 4, parus: 3 }).raison, 'vote_en_cours');
  assert.deepEqual(K.peutAvancer(H, { n: 5, parus: 4 }), { ok: true });
  assert.equal(K.peutAvancer(H, { n: 2, parus: 1, debloques: [2] }).ok, false); // déjà payé
});

test('embranchement : la majorité décide ; égalité ou moins de 30 votes → la fin B', () => {
  assert.equal(K.majorite(H, { A: 20, B: 25 }), 'B');
  assert.equal(K.majorite(H, { A: 25, B: 20 }), 'A');
  assert.equal(K.majorite(H, { A: 20, B: 9 }), 'B'); // 29 votes : pas assez
  assert.equal(K.majorite(H, { A: 21, B: 9 }), 'A'); // 30 votes
  assert.equal(K.majorite(H, { A: 40, B: 40 }), 'B');
  assert.equal(K.majorite(H, {}), 'B');
  assert.equal(K.autreBranche('A'), 'B');
  assert.equal(K.episodeContenu(H, 4, null), null);
  assert.equal(K.episodeContenu(H, 4, 'B').titre, H.episodes[3].B.titre);
  assert.equal(K.episodeContenu(H, 2, null).titre, H.episodes[1].titre);
});

test('résultats : pourcentages qui font 100, choix de l\'animal, détail par animal', () => {
  const e = H.episodes[0];
  assert.deepEqual(K.pourcentages(e, { A: 1, B: 1, C: 1 }), { total: 3, parChoix: { A: 34, B: 33, C: 33 } });
  assert.deepEqual(K.pourcentages(e, {}), { total: 0, parChoix: { A: 0, B: 0, C: 0 } });
  const pa = { lion: { A: 1, C: 4 }, hibou: { B: 2 } };
  assert.deepEqual(K.choixDeLAnimal(e, pa, 'lion'), { animal: 'lion', groupe: 'les lions', choix: 'C', label: e.choix[2].label });
  assert.equal(K.choixDeLAnimal(e, pa, 'cerf'), null);
  assert.equal(K.choixDeLAnimal(e, pa, null), null);
  assert.deepEqual(K.detailParAnimal(e, pa).map((d) => d.animal), ['lion', 'hibou']);
  assert.equal(K.votant(null, 'court', (s) => s), null);
  assert.match(K.votant(null, 'abcdefghijklmnop1234', (s) => `h${s}`), /^v_/);
  assert.equal(K.votant('u1', null, (s) => s), 'u_u1');
});

test('la vue d\'un épisode ne contient ni les « echo » ni l\'autre version', () => {
  const v = K.vueEpisode(H, 4, K.episodeContenu(H, 4, 'A'));
  const s = JSON.stringify(v);
  assert.ok(!s.includes('echo') && !s.includes(H.episodes[3].B.titre));
  assert.equal(K.vueEpisode(H, 3, H.episodes[2]).embranchement, true);
});

// ── La fonction Netlify, avec une base en mémoire ──
const store = { casDuSoirVotes: {}, casDuSoirResultats: {}, casDuSoirAcces: {}, userProfiles: {}, staff: { papa: { role: 'owner' } } };
const spent = [];
const setIn = (o, key, v) => { const ks = key.split('.'); let t = o; ks.slice(0, -1).forEach((k) => { t[k] = t[k] && typeof t[k] === 'object' ? t[k] : {}; t = t[k]; }); const k = ks[ks.length - 1]; t[k] = v && v.__inc !== undefined ? (Number(t[k]) || 0) + v.__inc : v && v.__union ? [...new Set([...(t[k] || []), ...v.__union])] : v; };
const apply = (cur, patch) => { const o = JSON.parse(JSON.stringify(cur || {})); for (const [k, v] of Object.entries(patch)) setIn(o, k, v); return o; };
const ref = (col, id) => ({
  id, get: async () => ({ id, exists: store[col][id] !== undefined, data: () => store[col][id] }),
  set: async (d, opt) => { store[col][id] = opt && opt.merge ? apply(store[col][id], d) : apply({}, d); },
});
const db = {
  collection: (col) => ({ doc: (id) => ref(col, id) }),
  runTransaction: async (fn) => { const ops = []; const r = await fn({ get: (x) => x.get(), set: (x, d, o) => ops.push(() => x.set(d, o)) }); for (const o of ops) await o(); return r; },
};
const admin = {
  firestore: { FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => 0, arrayUnion: (...a) => ({ __union: a }) } },
  storage: () => ({ bucket: () => ({ file: () => ({ exists: async () => [false], getSignedUrl: async () => ['x'] }) }) }),
};
let uid = null;
const inject = (rel, exp) => { const p = path.resolve(__dirname, rel); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
inject('../_firebase.js', { admin, db, verifyAuth: async () => (uid ? { uid } : null) });
inject('../_koris.js', {
  reserveKoris: async (u, feature, q) => { if (u === 'pauvre') return { error: 'insufficient_balance' }; spent.push([u, feature, q]); return { holdId: `h${spent.length}` }; },
  commitKoris: async () => {}, releaseKoris: async () => {},
});
const { handler } = require('../cas-du-soir.js');
const call = async (body) => { const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }); return { status: r.statusCode, body: JSON.parse(r.body) }; };
const realNow = Date.now;
const at = (n, extra = 60000) => { Date.now = () => K.publication(H, n) + extra; };

test('masqué : personne d\'autre que le propriétaire ne voit rien, pas même un visiteur', async () => {
  at(5);
  uid = null;
  assert.deepEqual((await call({ action: 'etat' })).body, { visible: false });
  assert.equal((await call({ action: 'episode', n: 1 })).status, 404);
  uid = 'quelquun';
  assert.deepEqual((await call({ action: 'etat' })).body, { visible: false });
  assert.equal((await call({ action: 'vote', n: 1, choix: 'A' })).status, 404);
  assert.equal((await call({ action: 'episode', n: 1, jour: 5 })).status, 404); // l'aperçu n'est pas pour les autres
  uid = 'papa';
  const e = await call({ action: 'etat' });
  assert.equal(e.body.visible, true);
  assert.equal(e.body.histoire.parus, 0); // pas de date publique
  assert.equal(e.body.histoire.prochain, null);
  assert.equal(e.body.proprio, true);
  Date.now = realNow;
});

test('aperçu du propriétaire : il simule un jour, ses votes ne comptent pas, rien n\'est figé', async () => {
  uid = 'papa';
  const e = await call({ action: 'etat', jour: 4 });
  assert.equal(e.body.apercu, true);
  assert.equal(e.body.histoire.parus, 4);
  assert.equal(e.body.histoire.accroche, H.accroche); // pas d'accroche propre à l'épisode 4 : celle de l'histoire
  assert.equal((await call({ action: 'etat', jour: 2 })).body.histoire.accroche, H.accroches['2']);
  const v = await call({ action: 'vote', n: 2, choix: 'B', jour: 4 });
  assert.equal(v.body.apercu, true);
  assert.equal(v.body.resultats.parChoix, null); // moins de 30 votes : pas de pourcentages
  assert.deepEqual(store.casDuSoirVotes, {});
  const ep4 = await call({ action: 'episode', n: 4, jour: 4 });
  assert.equal(ep4.body.episode.titre, H.episodes[3].B.titre); // aucun vote : la fin B
  assert.equal(store.casDuSoirResultats[`${H.id}_branche`], undefined); // rien de figé en aperçu
  // Sans audio : pas de lien, le texte suffit
  assert.equal(ep4.body.audioUrl, null);
  assert.ok(ep4.body.episode.texte.length > 500);
});

test('ouvert à tous : visiteur, un vote par personne, pourcentages à partir de 30 votes, suite payée, majorité, autre fin', avecDate(async () => {
  K.CAS_DU_SOIR_PUBLIC = true;
  try {
    at(1);
    uid = null;
    const visiteurId = 'abcdefghijklmnop1234';
    let r = await call({ action: 'episode', n: 1 });
    assert.equal(r.status, 200);
    assert.equal(r.body.episode.choix.length, 3);
    assert.equal(r.body.suite.avance.raison, 'compte');
    assert.equal((await call({ action: 'episode', n: 2 })).body.compte, true);
    r = await call({ action: 'vote', n: 1, choix: 'C', visiteurId });
    assert.equal(r.body.monChoix, 'C');
    assert.equal(r.body.resultats.echo, H.episodes[0].choix[2].echo);
    assert.equal(r.body.resultats.parChoix, null); // 1 vote : pas encore de pourcentages
    r = await call({ action: 'vote', n: 1, choix: 'A', visiteurId }); // deuxième vote : ignoré
    assert.equal(r.body.monChoix, 'C');
    assert.equal(store.casDuSoirResultats[`${H.id}_1`].total, 1);

    // 30 votes : les pourcentages et le choix de l'animal apparaissent
    store.userProfiles.lion1 = { totem: { animal: 'lion', revealedAt: 1 } };
    for (let k = 0; k < 28; k += 1) { uid = `p${k}`; await call({ action: 'vote', n: 1, choix: k % 2 ? 'A' : 'B' }); }
    uid = 'lion1';
    r = await call({ action: 'vote', n: 1, choix: 'A' });
    assert.equal(r.body.resultats.total, 30);
    assert.equal(Object.values(r.body.resultats.parChoix).reduce((a, b) => a + b, 0), 100);
    assert.equal(r.body.resultats.animal.groupe, 'les lions');
    assert.equal(r.body.resultats.parAnimal, undefined); // pas de bonus

    // La suite tout de suite : 1 étincelle
    r = await call({ action: 'avancer', n: 2 });
    assert.equal(r.status, 200);
    assert.deepEqual(spent.at(-1), ['lion1', 'cas_du_soir', K.PRIX.suite]);
    assert.equal((await call({ action: 'episode', n: 2 })).status, 200);
    assert.equal((await call({ action: 'avancer', n: 2 })).status, 409);
    uid = 'pauvre';
    assert.equal((await call({ action: 'avancer', n: 2 })).status, 402);

    // Le bonus : le détail par animal
    uid = 'lion1';
    assert.equal((await call({ action: 'bonus' })).status, 200);
    assert.equal((await call({ action: 'episode', n: 1 })).body.resultats.parAnimal[0].animal, 'lion');

    // Épisode 3 : A gagne avec 30 votes ou plus ; la suite 4 ne s'achète pas avant la parution
    at(3);
    for (let k = 0; k < 31; k += 1) { uid = `q${k}`; await call({ action: 'vote', n: 3, choix: k < 20 ? 'A' : 'B' }); }
    assert.equal((await call({ action: 'avancer', n: 4 })).body.raison, 'vote_en_cours');
    at(4);
    r = await call({ action: 'episode', n: 4 });
    assert.equal(r.body.episode.titre, H.episodes[3].A.titre);
    assert.equal(store.casDuSoirResultats[`${H.id}_branche`].branche, 'A');
    uid = 'tard1'; await call({ action: 'vote', n: 3, choix: 'B' }); // un vote tardif ne change plus la suite
    assert.equal((await call({ action: 'episode', n: 4 })).body.episode.titre, H.episodes[3].A.titre);

    // L'autre fin : seulement une fois l'histoire terminée, 2 étincelles, en lecture seule
    uid = 'lion1';
    assert.equal((await call({ action: 'autreFin' })).status, 409);
    assert.equal((await call({ action: 'fin' })).status, 403);
    at(5);
    let st = (await call({ action: 'etat' })).body;
    assert.deepEqual(st.autreFin, { achetee: false, possible: true });
    assert.equal((await call({ action: 'episode', n: 4, autre: true })).status, 403);
    r = await call({ action: 'autreFin' });
    assert.equal(r.status, 200);
    assert.deepEqual(spent.at(-1), ['lion1', 'cas_du_soir', 2]);
    r = await call({ action: 'episode', n: 5, autre: true });
    assert.equal(r.body.episode.titre, H.episodes[4].B.titre);
    assert.equal(r.body.autre, true);
    assert.deepEqual(r.body.episode.choix, []);
    st = (await call({ action: 'etat' })).body;
    assert.equal(st.autreFin.achetee, true);

    // La fin : la leçon, le quiz, les deux tests
    r = await call({ action: 'fin' });
    assert.equal(r.status, 200);
    assert.equal(r.body.quiz.length, 3);
    assert.equal(r.body.testLie, 'ecr_r');
    assert.equal(r.body.testAussi, 'bonus_jalousie');
    assert.equal(r.body.apresQuiz, H.fin.apresQuiz);
    assert.equal(r.body.audioUrl, null);
  } finally {
    K.CAS_DU_SOIR_PUBLIC = false;
    Date.now = realNow;
  }
}));

test('égalité ou moins de 30 votes à l\'épisode 3 : tout le monde lit la fin B', avecDate(async () => {
  K.CAS_DU_SOIR_PUBLIC = true;
  try {
    delete store.casDuSoirResultats[`${H.id}_branche`];
    store.casDuSoirResultats[`${H.id}_3`] = { counts: { A: 12, B: 3 }, total: 15 }; // A devant, mais 15 votes seulement
    at(4);
    uid = 'quelquun2';
    const r = await call({ action: 'episode', n: 4 });
    assert.equal(r.body.episode.titre, H.episodes[3].B.titre);
    assert.equal(store.casDuSoirResultats[`${H.id}_branche`].branche, 'B');
  } finally {
    K.CAS_DU_SOIR_PUBLIC = false;
    Date.now = realNow;
  }
}));

test('règles Firestore : les collections du cas du soir sont fermées au navigateur', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'firestore.rules'), 'utf8');
  for (const c of ['casDuSoirVotes', 'casDuSoirResultats', 'casDuSoirAcces']) {
    assert.match(rules, new RegExp(`match /${c}/\\{id\\} \\{ allow read, write: if false; \\}`), c);
  }
});

test('images et audios : chemins attendus, publics pour les images, la vue d\'épisode porte son image', () => {
  assert.equal(H.image, '/images/cas-du-soir/cas-vu-de-minuit-couverture.webp');
  const attendus = { 1: 'ep1', 2: 'ep2', 3: 'ep3' };
  H.episodes.forEach((e, i) => {
    const vs = e.A ? [['A', e.A], ['B', e.B]] : [['', e]];
    for (const [b, v] of vs) {
      const k = attendus[i + 1] || `ep${i + 1}${b}`;
      assert.equal(v.image, `/images/cas-du-soir/cas-vu-de-minuit-${k}.webp`);
      assert.equal(v.audio, `casDuSoir/vu-de-minuit/${k}.mp3`);
    }
  });
  assert.equal(H.fin.audio, 'casDuSoir/vu-de-minuit/lecon.mp3');
  assert.equal(K.vueEpisode(H, 4, H.episodes[3].B).image, H.episodes[3].B.image);
  assert.equal(K.vueHistoire(H, 0, { parus: 0, connecte: true }).image, H.image);
  const casse = JSON.parse(JSON.stringify(H));
  casse.episodes[0].image = 'https://ailleurs/x.png';
  assert.ok(K.verifierHistoire(casse).some((e) => /image/.test(e)));
  // Les fichiers attendus existent ou non : rien ne casse (l'appli affiche un dégradé, le serveur ne donne pas de lien audio)
});
