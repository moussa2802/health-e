/**
 * admin-stats — les statistiques d'utilisation détaillées (administrateurs seulement).
 *   GET ?days=30 (7 à 120)
 * Deux sources :
 *  1. le suivi d'utilisation (statsDaily, voir _stats.js) : visiteurs, pages, fonctions utilisées, heures, entonnoir…
 *     (depuis sa mise en ligne) ;
 *  2. ce que le site enregistre déjà (donc aussi AVANT le suivi) : inscriptions et tests (userProfiles),
 *     messages au compagnon et étincelles (korisHistory : chaque message coûte 1 étincelle), humeurs (moods).
 * « Personnes actives » = comptes vus par le suivi ∪ comptes qui ont écrit au compagnon, fait un test ou noté leur humeur.
 * Aucune donnée individuelle n'est renvoyée : seulement des totaux.
 */
const { db, verifyAuth } = require('./_firebase');
const A = require('./_adminStats');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Méthode non autorisée' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  const me = await db.collection('users').doc(user.uid).get();
  if (!me.exists || me.data().type !== 'admin') return reply(403, { error: 'Accès réservé aux administrateurs' });

  const days = Math.max(7, Math.min(120, parseInt((event.queryStringParameters || {}).days, 10) || 30));
  const list = A.dayList(days);
  const since = list[0];

  try {
    // 1. Suivi d'utilisation
    const statRefs = list.map((d) => db.collection('statsDaily').doc(d));
    const statDocs = await db.getAll(...statRefs);
    const tracked = {};
    await Promise.all(statDocs.map(async (s, i) => {
      if (!s.exists) return;
      const d = list[i];
      const [act, vis] = await Promise.all([
        s.ref.collection('actifs').get(),
        s.ref.collection('visiteurs').count().get().then((c) => c.data().count).catch(() => 0),
      ]);
      tracked[d] = { c: s.data().c || {}, actifs: act.docs.map((x) => ({ uid: x.id, f: x.data().f || {} })), visiteurs: vis };
    }));

    // 2. Ce que le site enregistre déjà
    const [users, profiles, history, moods, notifOn] = await Promise.all([
      db.collection('users').select('createdAt', 'type').get().catch(() => ({ docs: [] })),
      db.collection('userProfiles').select('createdAt', 'scaleResults', 'acquisition', 'totem').get(),
      db.collectionGroup('korisHistory').select('type', 'feature', 'amount', 'details', 'timestamp', 'serverTimestamp').get().catch(() => ({ docs: [] })),
      db.collectionGroup('moods').select().get().catch(() => ({ docs: [] })),
      db.collection('patients').where('notifPrefs.on', '==', true).count().get().then((c) => c.data().count).catch(() => null),
    ]);

    const out = A.compute({
      list,
      tracked,
      // Les comptes : la fiche « users » (date d'inscription) complétée par le profil (tests, animal) ; sans les administrateurs
      profiles: A.mergeAccounts(users.docs.map((d) => ({ uid: d.id, ...d.data() })), profiles.docs.map((d) => ({ uid: d.id, ...d.data() }))),
      history: history.docs.map((d) => ({ uid: d.ref.parent.parent ? d.ref.parent.parent.id : null, ...d.data() })),
      moods: moods.docs.map((d) => ({ uid: d.ref.parent.parent ? d.ref.parent.parent.id : null, day: d.id })),
    });
    out.notifOn = notifOn;
    out.since = since;
    return reply(200, out);
  } catch (err) {
    console.error('admin-stats error:', err);
    return reply(500, { error: 'Erreur serveur', detail: String(err.message || err).slice(0, 200) });
  }
};
