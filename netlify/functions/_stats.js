/**
 * _stats — le suivi d'utilisation de Health-e, compté chez nous (sans service extérieur, sans donnée personnelle).
 *   statsDaily/{jour}                     → compteurs du jour : c.<clé> (événements, pages, heures)
 *   statsDaily/{jour}/actifs/{uid}        → les comptes venus ce jour-là, et ce qu'ils ont utilisé (f.<fonction>)
 *   statsDaily/{jour}/visiteurs/{anonId}  → les appareils venus ce jour-là (avec ou sans compte)
 * Jamais de texte écrit par la personne, jamais de résultat : seulement « qui est venu, et quoi a servi ».
 * Logique pure ici (testée) ; l'écriture est dans bump().
 */
const EVENTS = new Set([
  'view', 'start', 'prescription', 'test_click', 'test_done', 'crisis', 'minor', 'free_chat', 'reset',
  'mood_open', 'mood', 'mood_cancel', 'breath', 'exercise', 'exercise_done', 'vocal_play', 'mic', 'route', 'go',
  'test_start', 'test_pause', 'confier_open', 'confier_entry', 'confier_cancel', 'confier_advice',
  'signup_open', 'signup_start', 'signup_done', 'account_linked', 'cycle_set', 'cycle_period', 'mood_erase_all', 'espace_view',
  'question_sent', 'queue_join', 'invite_share', 'programme_offer', 'programme_proposed', 'programme_start', 'programme_open',
  'programme_bilan', 'programme_end', 'reminders_offer', 'result_share', 'home_view', 'page',
  // comptés par le serveur
  'chat_message', 'mot', 'mot_keep', 'gift_claim',
]);

/** À quelle « fonction » du site correspond un événement (pour compter les personnes qui l'utilisent). */
const FEATURE_OF = {
  chat_message: 'compagnon', free_chat: 'compagnon', mic: 'micro',
  test_start: 'tests', test_done: 'tests',
  mood: 'humeur', breath: 'exercices', exercise: 'exercices', exercise_done: 'exercices', vocal_play: 'exercices',
  confier_entry: 'journal', programme_start: 'programme', programme_open: 'programme',
  question_sent: 'question', invite_share: 'parrainage', result_share: 'partage',
  mot: 'mot_du_jour', mot_keep: 'mot_du_jour', gift_claim: 'cadeau', signup_done: 'inscription',
};
const PAGE_FEATURE = { penc: 'penc', animal: 'animal', chaines: 'chaines', defi: 'defi', compat: 'compat', achat: 'achat', journal: 'journal' };

const clean = (s, n = 30) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, n);

/** La rubrique d'une adresse de page. */
function sectionOf(path) {
  const p = String(path || '/').split('?')[0];
  if (p === '/' || p === '') return 'accueil';
  const rules = [
    [/^\/compagnon/, 'compagnon'], [/^\/espace/, 'moi'], [/^\/assessment\/totem/, 'animal'], [/^\/assessment\/compatibility|^\/compat\//, 'compat'],
    [/^\/assessment\/results/, 'resultats'], [/^\/assessment/, 'tests'], [/^\/penc|^\/p\//, 'penc'], [/^\/journal/, 'journal'],
    [/^\/acheter-koris/, 'achat'], [/^\/chaines|^\/c\//, 'chaines'], [/^\/question|^\/messages-dr-lo/, 'question'], [/^\/defi|^\/decouvre/, 'defi'],
    [/^\/humeur/, 'humeur'], [/^\/point-de-la-semaine/, 'bilan'], [/^\/routine|^\/boite-a-outils|^\/pratique/, 'outils'], [/^\/admin|^\/espace-pro|^\/drlo/, ''],
  ];
  for (const [re, s] of rules) if (re.test(p)) return s;
  return 'autre';
}

/**
 * Un événement → { key, feature } (ou null s'il est refusé).
 * key : le compteur du jour ; feature : la fonction utilisée (ou null).
 */
function counterOf(ev) {
  const e = clean(ev && ev.e, 24);
  if (!EVENTS.has(e)) return null;
  const p = (ev && typeof ev.p === 'object' && ev.p) || {};
  if (e === 'page') {
    const s = clean(p.s, 20);
    if (!s) return null;
    return { key: `page_${s}`, feature: PAGE_FEATURE[s] || null };
  }
  if (e === 'go') { const to = clean(p.to, 24); return { key: to ? `go_${to}` : 'ev_go', feature: null }; }
  if (e === 'exercise' || e === 'exercise_done') { const id = clean(p.id, 16); return { key: id ? `ev_${e}_${id}` : `ev_${e}`, feature: 'exercices' }; }
  if (e === 'test_done' || e === 'test_start') { const id = clean(p.scaleId || p.id, 20); return { key: id ? `ev_${e}__${id}` : `ev_${e}`, feature: 'tests' }; }
  return { key: `ev_${e}`, feature: FEATURE_OF[e] || null };
}

/** Regroupe une liste d'événements : { counts: { clé: n }, features: Set }. 60 au plus par envoi. */
function aggregate(events, hour) {
  const counts = {};
  const features = new Set();
  for (const ev of (Array.isArray(events) ? events : []).slice(0, 60)) {
    const c = counterOf(ev);
    if (!c) continue;
    counts[c.key] = (counts[c.key] || 0) + 1;
    if (c.feature) features.add(c.feature);
  }
  if (Object.keys(counts).length && Number.isInteger(hour)) counts[`h_${String(hour).padStart(2, '0')}`] = 1;
  return { counts, features };
}

const dayOf = (now = Date.now()) => new Date(now).toISOString().slice(0, 10); // heure de Dakar = UTC
const hourOf = (now = Date.now()) => new Date(now).getUTCHours();

/**
 * Écrit les compteurs du jour. uid : le compte (ou null) ; anon : l'appareil (ou null).
 * Ne lève jamais d'erreur : le suivi ne doit pas gêner l'appli.
 */
async function bump(db, admin, { uid = null, anon = null, counts = {}, features = [] }) {
  try {
    const keys = Object.keys(counts);
    if (!keys.length) return;
    const day = dayOf();
    const inc = (n) => admin.firestore.FieldValue.increment(n);
    const ref = db.collection('statsDaily').doc(day);
    const batch = db.batch();
    const c = {};
    for (const k of keys) c[k] = inc(counts[k]);
    batch.set(ref, { c, day }, { merge: true });
    const f = {};
    for (const x of features) f[x] = true;
    if (uid) batch.set(ref.collection('actifs').doc(uid), { n: inc(keys.reduce((s, k) => s + (k.startsWith('h_') ? 0 : counts[k]), 0)), ...(features.length ? { f } : {}), last: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    if (anon) batch.set(ref.collection('visiteurs').doc(anon), { n: inc(1), ...(uid ? { compte: true } : {}) }, { merge: true });
    await batch.commit();
  } catch (e) { console.warn('stats bump', e.message); }
}

module.exports = { EVENTS, FEATURE_OF, sectionOf, counterOf, aggregate, dayOf, hourOf, bump, clean };
