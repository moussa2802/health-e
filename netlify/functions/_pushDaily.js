/**
 * _pushDaily.js — règles des notifications (logique pure, testée dans _tests/_pushDaily.test.js).
 *
 * Principes validés par Papa Moussa (maquette « 12 · Notifications ») :
 *  - un seul rappel par jour au maximum, à l'heure choisie par la personne ;
 *  - jamais de mot sensible sur l'écran verrouillé (pas d'« anxiété », d'« humeur », de résultat) ;
 *  - rien la nuit (22 h – 7 h) si « silence la nuit » est actif (par défaut) ;
 *  - rien pendant une pause du programme (la pause est aussi déclenchée par une crise) ;
 *  - « prendre de tes nouvelles » seulement si la personne l'a activé, 1 fois par semaine au plus.
 */

/** Réglage qui commande chaque type de notification. */
const KIND_PREF = {
  programme: 'programme',
  routine: 'programme',
  bilan: 'totem',
  retest: 'totem',
  totem: 'totem',
  drlo_answer: 'drlo',
  broadcast: 'drlo',
  defi_response: 'social',
  nudge: 'nudge',
};

const DEFAULT_PREFS = { on: false, hour: 19, tz: 'Africa/Dakar', programme: true, drlo: true, social: true, totem: true, nudge: false, quiet: true };

function localParts(tz, d = new Date()) {
  try {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Africa/Dakar', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
    const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
  } catch {
    return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
  }
}

function prefsOf(p) {
  return { ...DEFAULT_PREFS, ...(p && p.notifPrefs ? p.notifPrefs : {}) };
}

/** La personne accepte-t-elle ce type de notification maintenant ? */
function allowed(prefs, kind, now = new Date()) {
  if (!prefs || !prefs.on) return false;
  if (kind === 'test') return true; // essai demandé par la personne elle-même, à l'instant
  const key = KIND_PREF[kind];
  if (key && prefs[key] === false) return false;
  if (kind === 'nudge' && prefs.nudge !== true) return false;
  if (prefs.quiet !== false) {
    const h = localParts(prefs.tz, now).hour;
    if (h >= 22 || h < 7) return false;
  }
  return true;
}

const toUtc = (d) => {
  const [y, m, dd] = String(d).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, dd || 1);
};
const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / 86400000);

/** Jour du programme (même calcul que src/utils/programme.ts). */
function programmeDay(prog, today) {
  const ref = prog.status === 'paused' && prog.pausedDay ? prog.pausedDay : today;
  return Math.max(1, daysBetween(prog.startDay, ref) + 1 - (prog.pausedDays || 0));
}

/** Engagements restants aujourd'hui : humeur + action + apprentissage + routines ajoutées. */
function remaining(prog, today, moodToday) {
  const checks = (prog.checks && prog.checks[today]) || [];
  const r = (prog.rchecks && prog.rchecks[today]) || [];
  let n = 0;
  if (!moodToday) n += 1;
  if (!checks.includes('action')) n += 1;
  if (!checks.includes('learn')) n += 1;
  n += (prog.routines || []).filter((id) => !r.includes(id)).length;
  return n;
}

const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'string' ? Date.parse(v) || 0 : Number(v) || 0);

/**
 * Le message du jour (un seul), ou null.
 * ctx = { now, moodToday, routineDue }
 */
function decideDaily(p, ctx) {
  const prefs = prefsOf(p);
  const now = ctx.now || new Date();
  const { day: today, hour } = localParts(prefs.tz, now);
  if (!prefs.on || hour !== Number(prefs.hour)) return null;
  if (p.lastPushDay === today) return null;

  const prog = p.programme;
  if (prog && prog.v === 1 && !prog.result) {
    if (prog.status !== 'active') return null; // en pause (ou après une crise) : silence
    const left = remaining(prog, today, !!ctx.moodToday);
    const dayN = programmeDay(prog, today);
    if (left > 0 && allowed(prefs, 'programme', now)) {
      return {
        kind: 'programme',
        title: 'Dr Lô',
        body: left === 1
          ? 'Un petit engagement t\'attend aujourd\'hui. Quelques minutes, et ta journée est validée.'
          : `${left} petits engagements t'attendent aujourd'hui. Quelques minutes, et ta journée est validée.`,
        link: '/?ouvrir=programme',
      };
    }
    const w = Math.min(4, Math.floor(Math.min(28, dayN) / 7));
    const bilanDone = (prog.bilans || []).some((b) => b.week === w);
    if (w >= 1 && dayN % 7 === 0 && !bilanDone && allowed(prefs, 'bilan', now)) {
      return { kind: 'bilan', title: 'Dr Lô', body: 'Ton bilan de la semaine est prêt. Ouvre-le quand tu veux.', link: '/?ouvrir=programme' };
    }
  }

  // Routine : un outil à apprendre n'a pas été fait aujourd'hui. Le message ne nomme jamais l'outil (écran verrouillé).
  const due = Number(ctx.routineDue) || 0;
  if (due > 0 && allowed(prefs, 'routine', now)) {
    return {
      kind: 'routine',
      title: 'Dr Lô',
      body: due === 1 ? 'Ton exercice du jour t\'attend. Quelques minutes, et c\'est fait.' : 'Tes exercices du jour t\'attendent. Quelques minutes, et c\'est fait.',
      link: '/routine',
    };
  }

  const defi = p.totemDefi;
  if (defi && defi.since) {
    const age = daysBetween(String(defi.since).slice(0, 10), today);
    if (age === 3 && allowed(prefs, 'totem', now)) {
      return { kind: 'totem', title: 'Dr Lô', body: 'Ton défi de la semaine, tu en es où ? Encore quelques jours pour le relever.', link: '/assessment/totem' };
    }
  }

  if (prefs.nudge && allowed(prefs, 'nudge', now)) {
    const seen = ms(p.lastSeenAt);
    const nudged = ms(p.lastNudgeAt);
    const t = now.getTime();
    if (seen && t - seen > 4 * 864e5 && (!nudged || t - nudged > 7 * 864e5)) {
      return { kind: 'nudge', title: 'Dr Lô', body: 'Ça fait quelques jours. Comment tu vas ? Je suis là si tu veux en parler.', link: '/' };
    }
  }
  return null;
}

/** Les jetons à retirer après un envoi (appareils désinscrits). */
function deadTokens(tokens, responses) {
  const dead = [];
  (responses || []).forEach((r, i) => {
    const code = (r && r.error && r.error.code) || '';
    if (r && !r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(code)) dead.push(tokens[i]);
  });
  return dead;
}

module.exports = { KIND_PREF, DEFAULT_PREFS, localParts, prefsOf, allowed, remaining, programmeDay, decideDaily, deadTokens };
