/**
 * _adminStats — calcul des statistiques d'utilisation (logique pure, testée dans _tests/adminStats.test.js).
 * Voir admin-stats.js pour les sources.
 */

/** Les N derniers jours (AAAA-MM-JJ, heure de Dakar = UTC), du plus ancien au plus récent. */
function dayList(n, now = Date.now()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
  return out;
}

/** Une date Firestore (Timestamp, objet sérialisé, texte, nombre, Date) → AAAA-MM-JJ, ou null. */
function toDay(v) {
  if (!v) return null;
  let ms = null;
  if (typeof v.toMillis === 'function') ms = v.toMillis();
  else if (typeof v.toDate === 'function') ms = v.toDate().getTime();
  else if (v instanceof Date) ms = v.getTime();
  else if (typeof v === 'number') ms = v;
  else if (typeof v === 'string') ms = Date.parse(v);
  else if (typeof v === 'object' && (v._seconds || v.seconds)) ms = (v._seconds || v.seconds) * 1000;
  return ms && Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
}

const add = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

function compute({ list, tracked = {}, profiles = [], history = [], moods = [] }) {
  const inRange = new Set(list);
  const today = list[list.length - 1];
  const signupDay = {};
  const per = Object.fromEntries(list.map((d) => [d, { d, visiteurs: null, actifs: new Set(), nouveaux: 0, inscriptions: 0, tests: 0, chatMsgs: 0, chatUsers: new Set(), humeurs: 0, exercices: 0 }]));
  const featureUsers = {};
  const fUser = (feature, uid) => { if (!uid) return; (featureUsers[feature] = featureUsers[feature] || new Set()).add(uid); };

  // Comptes, inscriptions, tests
  let totalComptes = 0; let avecTest = 0; let animal = 0;
  const testsByScale = {};
  const acquisition = {};
  for (const p of profiles) {
    totalComptes += 1;
    const sd = toDay(p.createdAt);
    if (sd) signupDay[p.uid] = sd;
    if (sd && inRange.has(sd)) {
      per[sd].inscriptions += 1;
      const src = String(p.acquisition || '').split(':')[0] || 'direct';
      add(acquisition, src);
    }
    const res = p.scaleResults && typeof p.scaleResults === 'object' ? p.scaleResults : {};
    const ids = Object.keys(res);
    if (ids.length) avecTest += 1;
    if (p.totem && p.totem.revealedAt) animal += 1;
    for (const id of ids) {
      const d = toDay(res[id] && res[id].completedAt);
      if (d && inRange.has(d)) { per[d].tests += 1; per[d].actifs.add(p.uid); add(testsByScale, id); fUser('tests', p.uid); }
    }
  }

  // Étincelles : messages au compagnon (1 message = 1 étincelle), dépenses, achats, cadeaux
  const spentByFeature = {}; const offeredByFeature = {};
  let purchases = 0; let purchased = 0;
  // Contenus payants, comptés à part même à zéro : étincelles dépensées, rendues (Pénc annulé) et acheteurs différents
  const PAID = ['penc', 'practice', 'channel', 'cas_du_soir'];
  const paid = Object.fromEntries(PAID.map((k) => [k, { spent: 0, refunded: 0, buyers: new Set() }]));
  for (const h of history) {
    const d = toDay(h.timestamp) || toDay(h.serverTimestamp);
    if (!d || !inRange.has(d)) continue;
    const amount = Number(h.amount) || 0;
    if (h.type === 'spend') {
      add(spentByFeature, h.feature || 'autre', amount);
      if (paid[h.feature]) { paid[h.feature].spent += amount; if (h.uid) paid[h.feature].buyers.add(h.uid); }
      if (h.feature === 'chat') { per[d].chatMsgs += 1; per[d].chatUsers.add(h.uid); per[d].actifs.add(h.uid); fUser('compagnon', h.uid); }
    } else if (h.type === 'refund') {
      // Seulement les vrais remboursements (Pénc annulé) : une réservation annulée avant débit n'a jamais été comptée en dépense
      if (paid[h.feature] && /annul/i.test(String(h.details || '')) && !/opération annulée/i.test(String(h.details || ''))) paid[h.feature].refunded += amount;
    }
    else if (h.type === 'purchase') { purchases += 1; purchased += amount; }
    else if (h.type === 'bonus' || h.type === 'refill' || h.type === 'welcome') add(offeredByFeature, h.feature || h.type, amount);
  }

  // Humeurs
  for (const m of moods) {
    if (!m.day || !inRange.has(m.day)) continue;
    per[m.day].humeurs += 1; per[m.day].actifs.add(m.uid); fUser('humeur', m.uid);
  }

  // Suivi d'utilisation
  const pages = {}; const goes = {}; const hours = Array(24).fill(0); const events = {};
  let trackingSince = null;
  for (const d of list) {
    const t = tracked[d];
    if (!t) continue;
    if (!trackingSince) trackingSince = d;
    per[d].visiteurs = t.visiteurs || 0;
    for (const a of t.actifs || []) {
      per[d].actifs.add(a.uid);
      for (const f of Object.keys(a.f || {})) fUser(f, a.uid);
    }
    for (const [k, n] of Object.entries(t.c || {})) {
      if (k.startsWith('page_')) add(pages, k.slice(5), n);
      else if (k.startsWith('go_')) add(goes, k.slice(3), n);
      else if (/^h_\d\d$/.test(k)) hours[Number(k.slice(2))] += n;
      else if (k.startsWith('ev_')) {
        add(events, k.slice(3), n);
        if (k.startsWith('ev_exercise_done') || k === 'ev_breath') per[d].exercices += n;
      }
    }
  }

  // Nouveaux / revenants, et le total des comptes au fil des jours
  const activeRange = new Set();
  for (const d of list) {
    for (const uid of per[d].actifs) { activeRange.add(uid); if (signupDay[uid] === d) per[d].nouveaux += 1; }
  }
  let cumul = profiles.filter((p) => { const sd = signupDay[p.uid]; return !sd || sd < list[0]; }).length;
  const daily = list.map((d) => {
    const x = per[d];
    cumul += x.inscriptions;
    return { d, visiteurs: x.visiteurs, actifs: x.actifs.size, nouveaux: x.nouveaux, revenants: x.actifs.size - x.nouveaux, inscriptions: x.inscriptions, comptes: cumul, tests: x.tests, chatMsgs: x.chatMsgs, chatUsers: x.chatUsers.size, humeurs: x.humeurs, exercices: x.exercices };
  });

  // Fidélité : parmi les personnes actives un jour J, combien reviennent le lendemain, et dans les 7 jours
  let base1 = 0; let back1 = 0; let base7 = 0; let back7 = 0;
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    const set = per[d].actifs;
    if (!set.size) continue;
    if (addDays(d, 1) <= today && per[addDays(d, 1)]) {
      base1 += set.size;
      for (const u of set) if (per[addDays(d, 1)].actifs.has(u)) back1 += 1;
    }
    if (addDays(d, 7) <= today) {
      base7 += set.size;
      for (const u of set) {
        for (let k = 1; k <= 7; k++) { const p2 = per[addDays(d, k)]; if (p2 && p2.actifs.has(u)) { back7 += 1; break; } }
      }
    }
  }

  const sum = (k) => daily.reduce((s, x) => s + (Number(x[k]) || 0), 0);
  const sortDesc = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const last7 = new Set(); for (const d of list.slice(-7)) for (const u of per[d].actifs) last7.add(u);
  return {
    daily,
    totals: {
      comptes: totalComptes, avecTest, animal,
      actifsPeriode: activeRange.size, actifs7j: last7.size, actifsAujourdhui: per[today].actifs.size,
      visiteursAujourdhui: per[today].visiteurs,
      inscriptions: sum('inscriptions'), tests: sum('tests'), chatMsgs: sum('chatMsgs'), humeurs: sum('humeurs'), exercices: sum('exercices'),
      chatUsers: featureUsers.compagnon ? featureUsers.compagnon.size : 0,
    },
    features: sortDesc(Object.fromEntries(Object.entries(featureUsers).map(([k, s]) => [k, s.size]))).map(([key, users]) => ({ key, users })),
    pages: sortDesc(pages).map(([key, n]) => ({ key, n })),
    goes: sortDesc(goes).slice(0, 15).map(([key, n]) => ({ key, n })),
    tests: sortDesc(testsByScale).map(([key, n]) => ({ key, n })),
    hours,
    funnel: {
      accueil: events.view || 0, debut: events.start || 0, testCommence: Object.entries(events).filter(([k]) => k.startsWith('test_start')).reduce((s, [, n]) => s + n, 0),
      testFini: Object.entries(events).filter(([k]) => k.startsWith('test_done')).reduce((s, [, n]) => s + n, 0),
      inscription: events.signup_done || 0,
    },
    koris: { spentByFeature: sortDesc(spentByFeature).map(([key, n]) => ({ key, n })), offeredByFeature: sortDesc(offeredByFeature).map(([key, n]) => ({ key, n })), purchases, purchased, contenus: PAID.map((key) => ({ key, spent: paid[key].spent, refunded: paid[key].refunded, buyers: paid[key].buyers.size })) },
    acquisition: sortDesc(acquisition).map(([key, n]) => ({ key, n })),
    retention: { lendemain: base1 ? back1 / base1 : null, semaine: base7 ? back7 / base7 : null },
    events: sortDesc(events).slice(0, 40).map(([key, n]) => ({ key, n })),
    trackingSince,
  };
}

/** Un compte = une fiche users (sauf administrateurs) et/ou un profil ; la date d'inscription la plus ancienne connue. */
function mergeAccounts(users, profiles) {
  const by = new Map();
  for (const u of users || []) {
    if (u.type === 'admin') continue;
    by.set(u.uid, { uid: u.uid, createdAt: u.createdAt || null });
  }
  const admins = new Set((users || []).filter((u) => u.type === 'admin').map((u) => u.uid));
  for (const p of profiles || []) {
    if (admins.has(p.uid)) continue;
    const cur = by.get(p.uid) || { uid: p.uid, createdAt: null };
    const a = toDay(cur.createdAt); const b = toDay(p.createdAt);
    by.set(p.uid, { ...p, createdAt: a && b ? (a < b ? cur.createdAt : p.createdAt) : (cur.createdAt || p.createdAt || null) });
  }
  return [...by.values()];
}

module.exports = { dayList, toDay, compute, addDays, mergeAccounts };
