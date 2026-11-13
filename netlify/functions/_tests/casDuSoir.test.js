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

test('les prix du serveur et de l\'appli sont les mêmes, table par épisode comprise ; valeurs décidées par Papa Moussa', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'src', 'config', 'contenusPayants.ts'), 'utf8');
  const bloc = src.slice(src.indexOf('CAS_DU_SOIR_PRIX'), src.indexOf('};', src.indexOf('CAS_DU_SOIR_PRIX')) + 1);
  const objet = bloc.slice(bloc.indexOf('= {') + 2).replace(/\/\/[^\n]*/g, '').replace(/([A-Za-z0-9]+)\s*:/g, '"$1":').replace(/,\s*([}\]])/g, '$1');
  const appli = JSON.parse(objet);
  assert.deepEqual(appli, JSON.parse(JSON.stringify(K.PRIX)));
  assert.deepEqual(K.PRIX, { suite: { 2: 3, 3: 6, 5: 9 }, bonus: 2, autreFin: 5 });
  assert.equal(K.prixSuite(2), 3);
  assert.equal(K.prixSuite(3), 6);
  assert.equal(K.prixSuite(5), 9);
  assert.equal(K.prixSuite(4), null); // décidé par la majorité : jamais en avance
  assert.equal(K.prixSuite(1), null);
});

test('« Le vu de minuit » est branché, sans date publique ; la mention et les tests liés sont ceux de la direction', () => {
  assert.equal(H.id, 'vu-de-minuit');
  assert.equal(H.programmee, false);
  assert.equal(K.parusPour(H, { now: Date.parse('2100-01-01') }), 0); // rien ne paraît, jamais, sans date publique
  assert.equal(K.parusPour(H, { apercu: true, jour: 3 }), 3); // l'aperçu fonctionne
  assert.equal(H.egalite, 'B');
  assert.equal(H.minVotes, 30);
  assert.equal(H.testLie, 'ecr_r');
  assert.equal(H.testAussi, 'bonus_jalousie');
  assert.equal(H.avertissement, 'Histoire inventée. Toute ressemblance avec des personnes réelles serait une coïncidence. Si elle te touche de près, le compagnon est là pour en parler.');
  assert.deepEqual(H.episodes.map((e) => e.titre || `${e.A.titre} / ${e.B.titre}`), ['Quatre mots', 'Six appels', 'Le code', 'Discrets / La terrasse', 'Le cercle / Le faire-part']);
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

test('droits : visiteur = épisode 1 ; compte = épisodes parus + payés ; la suite de l\'embranchement ne s\'achète pas en avance', () => {
  assert.equal(K.peutLire({ n: 1, parus: 2, connecte: false }), true);
  assert.equal(K.peutLire({ n: 2, parus: 2, connecte: false }), false);
  assert.equal(K.peutLire({ n: 2, parus: 2, connecte: true }), true);
  assert.equal(K.peutLire({ n: 3, parus: 2, connecte: true }), false);
  assert.equal(K.peutLire({ n: 3, parus: 2, connecte: true, debloques: [3] }), true);
  const c = { commence: true };
  assert.deepEqual(K.peutAvancer(H, { ...c, n: 2, parus: 1 }), { ok: true, prix: 3 });
  assert.equal(K.peutAvancer(H, { ...c, n: 3, parus: 1 }).ok, false); // seulement le suivant
  assert.equal(K.peutAvancer(H, { ...c, n: 4, parus: 3 }).raison, 'vote_en_cours');
  assert.deepEqual(K.peutAvancer(H, { ...c, n: 5, parus: 4 }), { ok: true, prix: 9 });
  assert.equal(K.peutAvancer(H, { ...c, n: 2, parus: 1, debloques: [2] }).ok, false); // déjà payé
  assert.equal(K.peutAvancer(H, { ...c, n: 1, parus: 0 }).raison, 'pas_commence'); // rien à payer avant le premier épisode
  assert.equal(K.peutAvancer(H, { n: 2, parus: 1 }).raison, 'pas_commence'); // ni avant d'avoir ouvert l'épisode 1 avec un compte
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

// ── Rythme personnel (11/11/2026) : l'horloge de chaque lecteur, la décision commune du vote de l'épisode 3 ──
const DAY = 86400000;
const D0 = Date.parse(`${H.depart}T00:00:00Z`); // minuit, le jour de l'ouverture publique
const T = (jours, h = 0, m = 0) => D0 + jours * DAY + h * 3600000 + m * 60000; // l'instant : jour J (0 = ouverture), à h h m (UTC = Dakar)
const maintenant = (t) => { Date.now = () => t; };
const reset = () => { for (const c of ['casDuSoirVotes', 'casDuSoirResultats', 'casDuSoirAcces', 'userProfiles']) store[c] = {}; spent.length = 0; uid = null; };
const seed = (u, debut) => { store.casDuSoirAcces[`${u}_${H.id}`] = { uid: u, histoire: H.id, debut }; };
/** Exécute un test avec le cas du soir ouvert au public (ouverture : H.depart à 20 h) ; tout est remis après. */
const public_ = (fn) => async () => {
  H.programmee = true; K.CAS_DU_SOIR_PUBLIC = true; reset();
  try { await fn(); } finally { H.programmee = false; K.CAS_DU_SOIR_PUBLIC = false; Date.now = realNow; reset(); }
};

test('rythme personnel : l\'épisode n s\'ouvre le (n-1)-ième soir après le départ de CE lecteur, à 20 h', () => {
  H.programmee = true;
  try {
    assert.equal(K.ouverturePublique(H), T(0, 20));
    const debut = T(0, 21); // premier jour, 21 h
    assert.equal(K.ouvertureEpisode(H, 1, debut), T(0, 20));
    assert.equal(K.ouvertureEpisode(H, 2, debut), T(1, 20)); // le lendemain à 20 h
    assert.equal(K.ouvertureEpisode(H, 3, debut), T(2, 20));
    assert.equal(K.ouvertureEpisode(H, 5, debut), T(4, 20));
    // Avant l'ouverture publique : rien ; sans horloge : l'épisode 1 seulement, quelle que soit la date
    assert.equal(K.parusPour(H, { debut: null, now: T(0, 19) }), 0);
    assert.equal(K.parusPour(H, { debut: null, now: T(9, 12) }), 1);
    // Avec une horloge : les épisodes s'ouvrent un par soir
    assert.equal(K.parusPour(H, { debut, now: T(1, 19, 59) }), 1);
    assert.equal(K.parusPour(H, { debut, now: T(1, 20) }), 2);
    assert.equal(K.parusPour(H, { debut, now: T(3, 12) }), 3);
    assert.equal(K.parusPour(H, { debut, now: T(30, 0) }), 5);
    // Arrivée tardive : 5 jours après l'ouverture, à 10 h : épisode 1 seulement, l'épisode 2 le lendemain soir
    const tard = T(5, 10);
    assert.equal(K.parusPour(H, { debut: tard, now: tard }), 1);
    assert.equal(K.parusPour(H, { debut: tard, now: T(5, 23) }), 1);
    assert.equal(K.parusPour(H, { debut: tard, now: T(6, 19, 59) }), 1);
    assert.equal(K.parusPour(H, { debut: tard, now: T(6, 20) }), 2);
    assert.equal(K.prochaineOuverture(H, { parus: 1, debut: tard, now: T(5, 12) }), T(6, 20));
    assert.equal(K.prochaineOuverture(H, { parus: 1, debut: null, now: T(5, 12) }), null); // horloge pas démarrée : pas de date
    assert.equal(K.prochaineOuverture(H, { parus: 5, debut, now: T(30, 0) }), null);
    // Aperçu du propriétaire : il simule l'âge de sa lecture, sans horloge enregistrée
    assert.equal(K.parusPour(H, { apercu: true, jour: 3, now: T(0, 0) }), 3);
    assert.equal(K.parusPour(H, { apercu: true, jour: 9, now: T(0, 0) }), 5);
    H.programmee = false;
    assert.equal(K.parusPour(H, { debut: null, now: T(9, 12) }), 0); // sans date publique : fermé
    assert.equal(K.parusPour(H, { apercu: true, jour: 2, now: T(9, 12) }), 2); // sauf l'aperçu
  } finally { H.programmee = false; }
});

test('décision commune : figée à l\'ouverture publique + 3 jours à 20 h, pour tout le monde', () => {
  H.programmee = true;
  const d0 = H.decisionJours; H.decisionJours = 3;
  try {
    assert.equal(K.dateDecision(H), T(3, 20));
    assert.equal(K.decisionPrise(H, { now: T(3, 19, 59) }), false);
    assert.equal(K.decisionPrise(H, { now: T(3, 20) }), true);
    // Aperçu : prise à partir du jour 4 ; la date affichée suit le jour simulé (jour 3 : demain à 20 h)
    assert.equal(K.decisionPrise(H, { apercu: true, jour: 3 }), false);
    assert.equal(K.decisionPrise(H, { apercu: true, jour: 4 }), true);
    assert.equal(K.dateDecision(H, { apercu: true, jour: 3, now: T(7, 11) }), T(8, 20));
    // L'épisode 4 : jamais en avance ; l'épisode 5 s'enchaîne après le 4 ; sans horloge rien ne s'achète
    const base = { commence: true };
    assert.equal(K.peutAvancer(H, { ...base, n: 4, parus: 3 }).raison, 'vote_en_cours');
    assert.equal(K.peutAvancer(H, { ...base, n: 4, parus: 3, decisionPrise: true }).raison, 'pas_de_prix');
    assert.deepEqual(K.peutAvancer(H, { ...base, n: 5, parus: 4 }), { ok: true, prix: 9 });
    assert.equal(K.peutAvancer(H, { n: 2, parus: 1 }).raison, 'pas_commence');
    // On enchaîne : ayant payé le 2, on peut payer le 3 (6), mais pas le 4
    assert.deepEqual(K.peutAvancer(H, { ...base, n: 3, parus: 1, debloques: [2] }), { ok: true, prix: 6 });
    assert.equal(K.peutAvancer(H, { ...base, n: 3, parus: 1 }).ok, false); // sans avoir payé le 2 : non
    assert.equal(K.peutAvancer(H, { ...base, n: 4, parus: 1, debloques: [2, 3] }).raison, 'vote_en_cours');
  } finally { H.programmee = false; H.decisionJours = d0; }
});

test('arrivée tardive : 5 jours après l\'ouverture, un lecteur n\'a que l\'épisode 1, comme le premier jour', public_(async () => {
  // Premier lecteur : il ouvre l'épisode 1 le soir de l'ouverture
  uid = 'tot'; maintenant(T(0, 21));
  assert.equal((await call({ action: 'episode', n: 1 })).status, 200);
  assert.equal(store.casDuSoirAcces[`tot_${H.id}`].debut, T(0, 21));
  maintenant(T(1, 19, 59));
  assert.equal((await call({ action: 'episode', n: 2 })).status, 403); // pas encore
  maintenant(T(1, 20));
  assert.equal((await call({ action: 'episode', n: 2 })).status, 200); // le lendemain à 20 h
  // Lecteur tardif : 5 jours plus tard, l'épisode 1 seulement
  uid = 'tard'; maintenant(T(5, 10));
  const e = (await call({ action: 'episodes', histoire: H.id })).body;
  // (5 jours après l'ouverture la décision est prise : les épisodes 4 et 5 existent, mais ne se révèlent pas à qui n'y est pas)
  assert.deepEqual(e.episodes.map((x) => x.etat), ['a_lire', 'prochain', 'verrouille', 'verrouille', 'verrouille']);
  assert.equal(e.episodes[1].parution, null); // son horloge n'a pas encore démarré : pas de date
  assert.deepEqual(e.episodes[1].avance, { ok: false, raison: 'pas_commence' });
  assert.equal(store.casDuSoirAcces[`tard_${H.id}`], undefined); // lister ne démarre rien
  assert.equal((await call({ action: 'etat' })).body.histoire.parus, 1);
  assert.equal(store.casDuSoirAcces[`tard_${H.id}`], undefined); // l'état non plus
  assert.equal((await call({ action: 'episode', n: 2 })).status, 403);
  assert.equal((await call({ action: 'episode', n: 1 })).status, 200); // il ouvre l'épisode 1 : l'horloge démarre
  assert.equal(store.casDuSoirAcces[`tard_${H.id}`].debut, T(5, 10));
  maintenant(T(5, 22)); // la suite de la journée : rien de plus, et le départ ne bouge plus
  assert.equal((await call({ action: 'episode', n: 1 })).status, 200);
  assert.equal(store.casDuSoirAcces[`tard_${H.id}`].debut, T(5, 10));
  const e2 = (await call({ action: 'episodes', histoire: H.id })).body;
  assert.equal(e2.episodes[1].parution, T(6, 20)); // « demain soir à 20 h · gratuit »
  assert.equal((await call({ action: 'episode', n: 2 })).status, 403);
  maintenant(T(6, 20));
  assert.equal((await call({ action: 'episode', n: 2 })).status, 200);
  assert.equal((await call({ action: 'episode', n: 3 })).status, 403);
  // Les épisodes 4 et 5 ne révèlent rien à qui n'y est pas : pas de titre de la version choisie
  const e3 = (await call({ action: 'episodes', histoire: H.id })).body;
  assert.equal(e3.episodes[3].titre, 'À découvrir');
  assert.equal(e3.episodes[3].image, null);
  assert.ok(!JSON.stringify(e3).includes(H.episodes[3].A.titre) && !JSON.stringify(e3).includes(H.episodes[3].B.titre));
}));

test('visiteur puis compte : l\'épisode 1 et son vote sont ouverts sans compte ; l\'horloge démarre au premier appel avec compte', public_(async () => {
  maintenant(T(4, 9));
  uid = null;
  const visiteurId = 'abcdefghijklmnop1234';
  assert.equal((await call({ action: 'episode', n: 1, visiteurId })).status, 200);
  assert.equal((await call({ action: 'vote', n: 1, choix: 'A', visiteurId })).status, 200);
  assert.equal((await call({ action: 'episode', n: 2, visiteurId })).body.compte, true);
  assert.deepEqual(store.casDuSoirAcces, {}); // un visiteur n'a pas d'horloge
  // Le compte est créé plus tard : le premier appel qui ouvre l'épisode 1 avec compte démarre son horloge
  uid = 'nouveau'; maintenant(T(7, 18));
  assert.equal((await call({ action: 'liste' })).status, 200);
  assert.deepEqual(store.casDuSoirAcces, {});
  assert.equal((await call({ action: 'episode', n: 1 })).status, 200);
  assert.equal(store.casDuSoirAcces[`nouveau_${H.id}`].debut, T(7, 18));
  maintenant(T(8, 20));
  assert.equal((await call({ action: 'episode', n: 2 })).status, 200); // le lendemain soir
}));

test('paiement : « la suite tout de suite » au prix de l\'épisode, un épisode payé reste ouvert, on enchaîne ; pas sans horloge', public_(async () => {
  uid = 'payeur'; maintenant(T(5, 10));
  // Sans horloge (l'épisode 1 jamais ouvert avec ce compte) : rien ne s'achète, rien n'est débité
  let r = await call({ action: 'avancer', n: 2 });
  assert.equal(r.status, 409); assert.equal(r.body.raison, 'pas_commence'); assert.deepEqual(spent, []);
  await call({ action: 'episode', n: 1 });
  // Le 3 avant le 2 : non ; le 2 : 3 étincelles ; le 3 ensuite : 6 ; le 4 : jamais ; un prix envoyé par l'appli est ignoré
  assert.equal((await call({ action: 'avancer', n: 3 })).status, 409);
  r = await call({ action: 'avancer', n: 2, prix: 1 });
  assert.equal(r.status, 200); assert.deepEqual(spent.at(-1), ['payeur', 'cas_du_soir', 3]);
  assert.equal((await call({ action: 'avancer', n: 2 })).status, 409); // déjà payé
  assert.equal((await call({ action: 'episode', n: 2 })).status, 200);
  r = await call({ action: 'avancer', n: 3, price: 0 });
  assert.equal(r.status, 200); assert.deepEqual(spent.at(-1), ['payeur', 'cas_du_soir', 6]);
  assert.equal((await call({ action: 'episode', n: 3 })).status, 200);
  r = await call({ action: 'avancer', n: 4 });
  assert.equal(r.status, 409); assert.equal(r.body.raison, 'pas_de_prix'); // décision prise : le 4 a une suite fixe, mais jamais de prix
  assert.equal(spent.length, 2);
  // Les épisodes payés restent ouverts les jours suivants, et la liste le montre
  maintenant(T(7, 12));
  const e = (await call({ action: 'episodes', histoire: H.id })).body;
  assert.deepEqual(e.episodes.slice(0, 3).map((x) => x.etat), ['a_lire', 'a_lire', 'a_lire']);
  assert.equal((await call({ action: 'episode', n: 3 })).status, 200);
  // L'épisode 2 gratuit du lendemain n'est pas redébité : le lecteur n'a rien à payer pour un épisode déjà ouvert
  assert.equal((await call({ action: 'avancer', n: 3 })).status, 409);
  assert.equal(spent.length, 2);
  // Pas assez d'étincelles : refus, rien d'enregistré
  uid = 'pauvre'; maintenant(T(5, 10)); await call({ action: 'episode', n: 1 });
  assert.equal((await call({ action: 'avancer', n: 2 })).status, 402);
  assert.equal((store.casDuSoirAcces[`pauvre_${H.id}`].episodes || []).length, 0);
}));

test('décision du vote de l\'épisode 3 : les votes de tous s\'additionnent, figée à la date de décision, jamais recalculée après', public_(async () => {
  const d6 = H.decisionJours; H.decisionJours = 6; // ouverture + 6 jours : les lecteurs qui commencent les jours 0, 1, 2 arrivent à l'épisode 3 avant la décision
  try {
    assert.equal(K.dateDecision(H), T(6, 20));
    // Trois lecteurs, trois rythmes : ils votent à l'épisode 3 à des jours différents (jours 2, 3 et 4 au soir)
    seed('x1', T(0, 21)); seed('x2', T(1, 9)); seed('x3', T(2, 9));
    uid = 'x1'; maintenant(T(2, 21)); assert.equal((await call({ action: 'vote', n: 3, choix: 'A' })).status, 200);
    uid = 'x2'; maintenant(T(3, 21)); assert.equal((await call({ action: 'vote', n: 3, choix: 'B' })).status, 200);
    uid = 'x3'; maintenant(T(4, 21)); assert.equal((await call({ action: 'vote', n: 3, choix: 'A' })).status, 200);
    assert.equal(store.casDuSoirResultats[`${H.id}_3`].total, 3);
    assert.equal(store.casDuSoirResultats[`${H.id}_branche`], undefined); // la décision n'est pas prise
    // x1 arrive à l'épisode 4 (le soir du jour 3) AVANT la décision : « La suite dépend du vote de tous », sans rien révéler
    uid = 'x1'; maintenant(T(5, 10));
    const avant = (await call({ action: 'episodes', histoire: H.id })).body;
    assert.equal(avant.decisionPrise, false);
    assert.equal(avant.decision, T(6, 20));
    assert.deepEqual(avant.episodes.slice(3).map((x) => x.etat), ['vote', 'vote']);
    assert.ok(!JSON.stringify(avant).includes(H.episodes[3].A.titre) && !JSON.stringify(avant).includes(H.episodes[3].B.titre));
    const ep4 = await call({ action: 'episode', n: 4 });
    assert.equal(ep4.status, 409); assert.equal(ep4.body.raison, 'vote_en_cours'); assert.equal(ep4.body.decision, T(6, 20));
    // x3 est encore à l'épisode 3 : l'épisode 4 ne s'achète pas, il dépend du vote de tous
    uid = 'x3'; assert.equal((await call({ action: 'avancer', n: 4 })).body.raison, 'vote_en_cours');
    uid = 'x1';
    assert.equal(store.casDuSoirResultats[`${H.id}_branche`], undefined);
    // Des votes de plus avant la décision : 16 contre 15, la majorité est A (31 votes)
    store.casDuSoirResultats[`${H.id}_3`] = { counts: { A: 16, B: 15 }, total: 31 };
    // Le soir de la décision, personne n'a encore regardé : un vote TARDIF arrive d'abord ; le reçu est figé AVANT lui
    seed('z', T(0, 22)); uid = 'z'; maintenant(T(6, 20, 5));
    assert.equal((await call({ action: 'vote', n: 3, choix: 'B' })).status, 200);
    assert.equal(store.casDuSoirResultats[`${H.id}_branche`].branche, 'A'); // 16 A / 15 B avant ce vote ; avec lui, 16 / 16 aurait donné B
    assert.deepEqual(store.casDuSoirResultats[`${H.id}_branche`].counts, { A: 16, B: 15 });
    assert.equal(store.casDuSoirResultats[`${H.id}_3`].counts.B, 16); // le vote tardif est quand même compté dans les résultats
    // Après : tout le monde voit la même suite, même si des votes tardifs changeraient la majorité
    store.casDuSoirResultats[`${H.id}_3`] = { counts: { A: 16, B: 90 }, total: 106 };
    uid = 'x1'; maintenant(T(6, 20, 10));
    assert.equal((await call({ action: 'episode', n: 4 })).body.episode.titre, H.episodes[3].A.titre);
    seed('x4', T(2, 12)); uid = 'x4'; maintenant(T(9, 12));
    assert.equal((await call({ action: 'episode', n: 4 })).body.episode.titre, H.episodes[3].A.titre);
    const apres = (await call({ action: 'episodes', histoire: H.id })).body;
    assert.equal(apres.decisionPrise, true);
    assert.equal(apres.episodes[3].titre, H.episodes[3].A.titre);
    // Arrivée après la décision : directement la suite décidée (mais jamais payable en avance)
    seed('x5', T(5, 11)); uid = 'x5'; maintenant(T(8, 12)); // son épisode 3 est ouvert, le 4 s'ouvre ce soir
    assert.equal((await call({ action: 'avancer', n: 4 })).body.raison, 'pas_de_prix');
    maintenant(T(8, 20));
    assert.equal((await call({ action: 'episode', n: 4 })).body.episode.titre, H.episodes[3].A.titre); // la suite décidée, directement
    // Le vote d'un lecteur qui arrive à l'épisode 3 après la décision est compté dans les résultats, sans changer la suite
    seed('x6', T(7, 10)); uid = 'x6'; maintenant(T(9, 21));
    assert.equal((await call({ action: 'vote', n: 3, choix: 'B' })).status, 200);
    assert.equal(store.casDuSoirResultats[`${H.id}_branche`].branche, 'A');
  } finally { H.decisionJours = d6; }
}));

test('décision à 4 jours (la valeur de l\'histoire) : les lecteurs partis les jours 0 et 1 arrivent à l\'épisode 3 à temps', public_(async () => {
  assert.equal(K.decisionJours(H), 4);
  seed('j0', T(0, 21)); seed('j1', T(1, 9)); seed('j2', T(2, 9));
  uid = 'j0'; maintenant(T(2, 20, 30)); assert.equal((await call({ action: 'episode', n: 3 })).status, 200); // à temps
  uid = 'j1'; maintenant(T(3, 20, 30)); assert.equal((await call({ action: 'episode', n: 3 })).status, 200); // à temps (la décision est le jour 4)
  uid = 'j2'; maintenant(T(4, 19, 59)); assert.equal((await call({ action: 'episode', n: 3 })).status, 403); // pas encore ouvert pour lui
  maintenant(T(4, 20)); assert.equal((await call({ action: 'episode', n: 3 })).status, 200); // ouvert à la minute de la décision
  assert.equal((await call({ action: 'episode', n: 4 })).status, 403); // son épisode 4 s'ouvre un soir plus tard
}));

test('décision : égalité ou moins de 30 votes → la fin B, pour tout le monde', public_(async () => {
  store.casDuSoirResultats[`${H.id}_3`] = { counts: { A: 12, B: 3 }, total: 15 };
  seed('lec', T(0, 21)); uid = 'lec'; maintenant(T(4, 21)); // la décision est prise le jour 4 à 20 h
  assert.equal((await call({ action: 'episode', n: 4 })).body.episode.titre, H.episodes[3].B.titre);
  assert.equal(store.casDuSoirResultats[`${H.id}_branche`].branche, 'B');
}));

test('aperçu du propriétaire : il simule l\'âge de sa lecture, sans rien enregistrer (ni horloge, ni vote, ni reçu)', async () => {
  reset(); uid = 'papa'; maintenant(T(40, 10));
  try {
    const e = await call({ action: 'etat', jour: 4 });
    assert.equal(e.body.apercu, true);
    assert.equal(e.body.histoire.parus, 4);
    assert.equal(e.body.decisionPrise, true);
    assert.equal((await call({ action: 'etat', jour: 2 })).body.histoire.accroche, H.accroches['2']);
    const v = await call({ action: 'vote', n: 2, choix: 'B', jour: 4 });
    assert.equal(v.body.apercu, true);
    assert.equal(v.body.resultats.parChoix, null); // moins de 30 votes : pas de pourcentages
    const ep4 = await call({ action: 'episode', n: 4, jour: 4 });
    assert.equal(ep4.body.episode.titre, H.episodes[3].B.titre); // aucun vote : la fin B
    assert.equal(ep4.body.audioUrl !== undefined, true);
    // Le premier épisode en aperçu ne démarre pas d'horloge
    await call({ action: 'episode', n: 1, jour: 1 });
    // Jour 3 : l'épisode 4 dépend encore du vote ; le prochain s'ouvre « demain soir »
    const j3 = (await call({ action: 'episodes', histoire: H.id, jour: 3 })).body;
    assert.deepEqual(j3.episodes.map((x) => x.etat), ['a_lire', 'a_lire', 'a_lire', 'vote', 'vote']);
    assert.equal(j3.decisionPrise, false);
    assert.equal(j3.decision, K.debutJour(T(40, 10)) + DAY + 20 * 3600000);
    const j2 = (await call({ action: 'episodes', histoire: H.id, jour: 2 })).body;
    assert.equal(j2.episodes[2].etat, 'prochain');
    assert.equal(j2.episodes[2].parution, K.debutJour(T(40, 10)) + DAY + 20 * 3600000);
    // Jour 4 : l'épisode 5 est le prochain, payable
    const j4 = (await call({ action: 'episodes', histoire: H.id, jour: 4 })).body;
    assert.equal(j4.episodes[3].titre, H.episodes[3].B.titre);
    assert.deepEqual(j4.episodes[4].avance, { ok: true, prix: 9 });
    assert.deepEqual(store.casDuSoirVotes, {});
    assert.deepEqual(store.casDuSoirAcces, {});
    assert.equal(store.casDuSoirResultats[`${H.id}_branche`], undefined);
    // L'aperçu fonctionne aussi pour la liste des cas
    assert.equal((await call({ action: 'liste', jour: 5 })).body.histoires[0].statut, 'termine');
    assert.equal((await call({ action: 'liste' })).body.histoires[0].statut, 'bientot'); // sans date publique : fermé
  } finally { Date.now = realNow; reset(); }
});

test('masqué : personne d\'autre que le propriétaire ne voit rien, pas même un visiteur ; sans date publique, tout est fermé', async () => {
  reset(); maintenant(T(40, 10));
  try {
    uid = null;
    assert.deepEqual((await call({ action: 'etat' })).body, { visible: false });
    assert.deepEqual((await call({ action: 'liste' })).body, { visible: false });
    assert.equal((await call({ action: 'episode', n: 1 })).status, 404);
    uid = 'quelquun';
    assert.deepEqual((await call({ action: 'etat' })).body, { visible: false });
    assert.equal((await call({ action: 'vote', n: 1, choix: 'A' })).status, 404);
    assert.equal((await call({ action: 'episode', n: 1, jour: 5 })).status, 404); // l'aperçu n'est pas pour les autres
    assert.equal((await call({ action: 'episodes', histoire: H.id })).status, 404);
    assert.deepEqual(store.casDuSoirAcces, {}); // et aucune horloge n'a démarré
    // Même ouvert à tous par erreur de réglage de date (programmee: false), l'histoire reste fermée
    K.CAS_DU_SOIR_PUBLIC = true;
    assert.equal((await call({ action: 'etat' })).body.histoire.parus, 0);
    assert.equal((await call({ action: 'episode', n: 1 })).status, 403);
    assert.deepEqual(store.casDuSoirAcces, {});
    K.CAS_DU_SOIR_PUBLIC = false;
    uid = 'papa';
    const e = await call({ action: 'etat' });
    assert.equal(e.body.visible, true);
    assert.equal(e.body.histoire.parus, 0);
    assert.equal(e.body.histoire.prochain, null);
    assert.equal(e.body.proprio, true);
  } finally { K.CAS_DU_SOIR_PUBLIC = false; Date.now = realNow; reset(); }
});

test('ouvert à tous : visiteur, un vote par personne, pourcentages à partir de 30 votes, autre fin', public_(async () => {
  maintenant(T(0, 21));
  uid = null;
  const visiteurId = 'abcdefghijklmnop1234';
  let r = await call({ action: 'episode', n: 1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.episode.choix.length, 3);
  assert.equal(r.body.suite.avance.raison, 'compte');
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
  assert.equal((await call({ action: 'bonus', prix: 0 })).status, 200);
  assert.deepEqual(spent.at(-1), ['lion1', 'cas_du_soir', 2]);
  assert.equal((await call({ action: 'episode', n: 1 })).body.resultats.parAnimal[0].animal, 'lion');
  // L'autre fin : seulement une fois l'histoire terminée POUR CE LECTEUR et la décision prise, 5 étincelles, en lecture seule
  assert.equal((await call({ action: 'autreFin' })).status, 409);
  assert.equal((await call({ action: 'fin' })).status, 403);
  store.casDuSoirResultats[`${H.id}_3`] = { counts: { A: 30, B: 5 }, total: 35 };
  maintenant(T(4, 21));
  assert.equal((await call({ action: 'autreFin' })).status, 200);
  assert.deepEqual(spent.at(-1), ['lion1', 'cas_du_soir', 5]);
  const ap = await call({ action: 'episode', n: 5, autre: true });
  assert.equal(ap.body.episode.titre, H.episodes[4].B.titre); // la majorité a choisi A : l'autre fin est B
  assert.equal(ap.body.autre, true);
  assert.deepEqual(ap.body.episode.choix, []);
  assert.equal((await call({ action: 'etat' })).body.autreFin.achetee, true);
  const f = await call({ action: 'fin' });
  assert.equal(f.status, 200);
  assert.equal(f.body.quiz.length, 3);
  assert.equal(f.body.testLie, 'ecr_r');
  assert.equal(f.body.testAussi, 'bonus_jalousie');
  assert.equal(f.body.apresQuiz, H.fin.apresQuiz);
  // La leçon a son minutage (texte surligné pendant l'écoute), envoyé avec elle
  assert.deepEqual(f.body.minutage, require('../_casDuSoirMinutages')['vu-de-minuit-lecon']);
  assert.ok(f.body.minutage.lignes.length >= 30);
}));

test('leçon : le minutage reprend tout le texte écrit, dans l\'ordre, sans trou ni chevauchement ; l\'audio est dans Storage, pas en public', () => {
  const M = require('../_casDuSoirMinutages')['vu-de-minuit-lecon'];
  const mots = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  assert.equal(mots(M.lignes.map((l) => l.texte).join(' ')), mots(H.fin.texte));
  M.lignes.forEach((l, i) => {
    assert.ok(l.t1 > l.t0, `phrase ${i + 1}`);
    if (i) assert.ok(l.t0 >= M.lignes[i - 1].t1 - 0.001, `phrase ${i + 1} : chevauchement`);
    assert.ok(l.t1 <= M.duree + 0.001);
  });
  assert.ok(M.lignes[0].t0 >= 4 && M.duree > 150); // la voix arrive après la signature
  assert.equal(H.fin.audio, 'casDuSoir/vu-de-minuit/lecon.mp3');
  assert.equal(H.fin.minutage, 'vu-de-minuit-lecon');
  assert.deepEqual(K.verifierHistoire(H), []);
});

test('liste des cas : l\'état du cas est celui de CE lecteur (Bientôt, Épisode n sur 5, Terminé) ; cas inconnu : introuvable', public_(async () => {
  uid = 'lecteur'; maintenant(T(0, 19));
  assert.equal((await call({ action: 'liste' })).body.histoires[0].statut, 'bientot'); // pas encore ouvert
  assert.equal((await call({ action: 'liste' })).body.histoires[0].prochain, K.ouverturePublique(H));
  maintenant(T(0, 21));
  let l = (await call({ action: 'liste' })).body.histoires[0];
  assert.equal(l.statut, 'en_cours'); assert.equal(l.parus, 1); assert.equal(l.image, H.image);
  seed('fini', T(0, 21)); uid = 'fini'; maintenant(T(30, 12));
  l = (await call({ action: 'liste' })).body.histoires[0];
  assert.equal(l.statut, 'termine'); assert.equal(l.prochain, null);
  assert.equal((await call({ action: 'episodes', histoire: 'inconnu' })).status, 404);
  assert.equal((await call({ action: 'etat', histoire: H.id })).body.histoire.id, H.id);
}));

test('débit : le prix de l\'épisode demandé, lu dans la table du serveur ; un prix envoyé par l\'appli est ignoré', public_(async () => {
  seed('acheteur', T(0, 21)); uid = 'acheteur';
  maintenant(T(1, 21)); // il est à l'épisode 2
  let r = await call({ action: 'avancer', n: 3, prix: 1, price: 1, quantity: 1 });
  assert.equal(r.status, 200);
  assert.deepEqual(spent.at(-1), ['acheteur', 'cas_du_soir', 6]); // épisode 3 : 6, quoi que dise l'appli
  r = await call({ action: 'avancer', n: 4, prix: 1 });
  assert.equal(r.status, 409); assert.equal(r.body.raison, 'vote_en_cours'); // épisode 4 : jamais en avance
  const avant = spent.length;
  seed('acheteur2', T(0, 21)); uid = 'acheteur2'; maintenant(T(1, 21));
  assert.equal((await call({ action: 'avancer', n: 4 })).status, 409);
  assert.equal(spent.length, avant);
  // L'épisode 5, une fois le 4 ouvert : 9
  seed('acheteur4', T(0, 21)); uid = 'acheteur4'; maintenant(T(3, 21));
  assert.equal((await call({ action: 'avancer', n: 5, prix: 0 })).status, 200);
  assert.deepEqual(spent.at(-1), ['acheteur4', 'cas_du_soir', 9]);
  // Le détail par animal : 2
  seed('acheteur3', T(0, 21)); uid = 'acheteur3';
  await call({ action: 'bonus', prix: 0 });
  assert.deepEqual(spent.at(-1), ['acheteur3', 'cas_du_soir', 2]);
  // La lecture de l'épisode 2 annonce le prix de l'épisode 3
  seed('lecteur', T(0, 21)); uid = 'lecteur'; maintenant(T(1, 21));
  r = await call({ action: 'episode', n: 2 });
  assert.deepEqual(r.body.suite.avance, { ok: true, prix: 6 });
}));

test('intrigue : un audio public par cas, et le titre ne se change qu\'à un seul endroit', () => {
  assert.equal(H.intrigue, '/audio/cas-du-soir/vu-de-minuit-intrigue.mp3');
  assert.equal(K.vueHistoire(H, { parus: 0, connecte: false }).intrigue, H.intrigue);
  const casse = JSON.parse(JSON.stringify(H));
  casse.intrigue = '/audio/ailleurs.mp3';
  assert.ok(K.verifierHistoire(casse).some((e) => /intrigue/.test(e)));
  // Changer le titre ne touche ni l'id, ni les adresses, ni les images, ni les audios
  assert.equal(H.id, 'vu-de-minuit');
  const t = { ...JSON.parse(JSON.stringify(H)), titre: 'Un autre titre' };
  assert.deepEqual(K.verifierHistoire(t), []);
  // Aucun fichier de l'appli ni du serveur ne recopie le titre en dur (seulement les données)
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  const root = path.join(__dirname, '..', '..', '..');
  const files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'netlify', 'functions')).filter((f) => !f.includes('_tests') && !f.endsWith('_casDuSoirHistoires.js') && !f.endsWith('_casDuSoirMinutages.js'))]
    .filter((f) => /\.(ts|tsx|js)$/.test(f));
  const hits = files.filter((f) => fs.readFileSync(f, 'utf8').includes(H.titre));
  assert.deepEqual(hits, []);
});

test('minutage : envoyé avec l\'épisode 1 et l\'intrigue, jamais en public pour un épisode payant ; audio public seulement pour l\'épisode 1', async () => {
  const M = require('../_casDuSoirMinutages');
  const ep1 = K.vueEpisode(H, 1, H.episodes[0]);
  assert.equal(ep1.minutage, M['vu-de-minuit-ep1']);
  assert.ok(ep1.minutage.lignes.length > 10 && ep1.minutage.images.length >= 1);
  assert.equal(K.vueHistoire(H, { parus: 0 }).intrigueMinutage, M['vu-de-minuit-intrigue']);
  // L'épisode 2 a maintenant son minutage (envoyé avec l'épisode, jamais en public) ; l'épisode 3 n'en a pas encore
  assert.equal(K.vueEpisode(H, 2, H.episodes[1]).minutage, M['vu-de-minuit-ep2']);
  assert.equal(K.vueEpisode(H, 3, H.episodes[2]).minutage, M['vu-de-minuit-ep3']);
  const casse = JSON.parse(JSON.stringify(H));
  casse.episodes[1].audio = '/audio/cas-du-soir/vu-de-minuit-ep2.mp3';
  casse.episodes[2].minutage = 'inconnu';
  const err = K.verifierHistoire(casse);
  assert.ok(err.some((e) => /épisode 2 : audio payant/.test(e)) && err.some((e) => /épisode 3 : minutage/.test(e)));
  // Le serveur donne le chemin public tel quel (pas de lien signé) et le minutage avec l'épisode
  uid = 'papa';
  const r = await call({ action: 'episode', n: 1, jour: 1 });
  assert.equal(r.body.audioUrl, '/audio/cas-du-soir/vu-de-minuit-ep1.mp3');
  assert.equal(r.body.episode.minutage.duree, M['vu-de-minuit-ep1'].duree);
});

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
      // L'épisode 1 (gratuit pour tous) est un fichier public ; les autres passent par Storage (liens signés)
      assert.equal(v.audio, k === 'ep1' ? '/audio/cas-du-soir/vu-de-minuit-ep1.mp3' : `casDuSoir/vu-de-minuit/${k}.mp3`);
    }
  });
  assert.equal(H.fin.audio, 'casDuSoir/vu-de-minuit/lecon.mp3');
  assert.equal(K.vueEpisode(H, 4, H.episodes[3].B).image, H.episodes[3].B.image);
  assert.equal(K.vueHistoire(H, { parus: 0, connecte: true }).image, H.image);
  const casse = JSON.parse(JSON.stringify(H));
  casse.episodes[0].image = 'https://ailleurs/x.png';
  assert.ok(K.verifierHistoire(casse).some((e) => /image/.test(e)));
  // Les fichiers attendus existent ou non : rien ne casse (l'appli affiche un dégradé, le serveur ne donne pas de lien audio)
});

test('Goumin (cas n° 2) : données valides, caché au public, images et audio présents, minutage fidèle au texte', () => {
  const G = K.HISTOIRES.find((h) => h.id === 'goumin');
  const MG = require('../_casDuSoirMinutagesGoumin');
  assert.ok(G);
  assert.deepEqual(K.verifierHistoire(G), []);
  assert.equal(G.programmee, false); // aucune date publique : seul le propriétaire le voit
  assert.equal(G.titre, 'Goumin');
  assert.equal(G.testLie, 'phq9');
  const pub = (p) => fs.existsSync(path.join(__dirname, '..', '..', '..', 'public', p.replace(/^\//, '')));
  assert.ok(pub(G.image));
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const sansNoms = (t) => t.split('\n').map((l) => l.replace(/^[A-ZÉÈÔ][A-ZÉÈÔ' ]*(\([^)]*\))? : /, '')).join(' ');
  const versions = [G.episodes[0], G.episodes[1], G.episodes[2], G.episodes[3].A, G.episodes[3].B, G.episodes[4].A, G.episodes[4].B];
  versions.forEach((v, i) => {
    const m = MG[v.minutage];
    assert.ok(m && m.lignes.length >= 30, `épisode ${i}: minutage`);
    assert.ok(pub(v.image), `épisode ${i}: image de tête`);
    assert.equal(m.images[0].t, 0, `épisode ${i}: une image dès le début`);
    m.images.forEach((x, k) => { assert.ok(pub(`/images/cas-du-soir/${x.image}`), x.image); if (k) assert.ok(x.t > m.images[k - 1].t); assert.ok(x.t < m.duree); });
    m.lignes.forEach((l, k) => { assert.ok(l.t1 > l.t0, `épisode ${i} phrase ${k}`); if (k) assert.ok(l.t0 >= m.lignes[k - 1].t0); assert.ok(l.t1 <= m.duree + 0.5); });
    assert.equal(norm(m.lignes.map((l) => l.texte).join(' ')), norm(sansNoms(v.texte)), `épisode ${i}: le minutage reprend tout le texte`);
  });
  assert.ok(pub(G.episodes[0].audio)); // l'épisode 1 est public ; les autres passent par Storage (vérifié par verifierHistoire)
  const lecon = MG[G.fin.minutage];
  assert.equal(norm(lecon.lignes.map((l) => l.texte).join(' ')), norm(G.fin.texte));
  assert.equal(G.fin.quiz.length, 3);
});
