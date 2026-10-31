/**
 * _drloProgramme.js — « Mon programme » : textes de l'IA (logique pure, testée dans
 * _tests/_drloProgramme.test.js).
 *
 * L'IA ne fait que : écrire le mot de Dr Lô qui présente le programme, choisir l'ordre des
 * exercices de la semaine 1 parmi la bibliothèque, et écrire le bilan de la semaine à partir
 * de comptes (jours actifs, engagements tenus, humeur moyenne). Elle n'invente aucun exercice,
 * ne diagnostique pas, ne parle jamais de médicament et ne culpabilise jamais.
 */

const AXES = {
  stress: { name: 'Programme Stress & anxiété', week1: ['SA1', 'SA2', 'SA3', 'SA4', 'SA5'] },
  humeur: { name: 'Programme Humeur', week1: ['HU1', 'HU2', 'HU3', 'HU4', 'HU5'] },
  sommeil: { name: 'Programme Sommeil', week1: ['SO1', 'SO2', 'SO3', 'SO4', 'SO5'] },
};

const WEEK1_TITLES = {
  SA1: 'Respirer 4-6', SA2: 'Repérer mon signal', SA3: 'Ma source du jour', SA4: 'Ancrage 5-4-3-2-1', SA5: 'Une pause sans écran',
  HU1: 'Sortir à la lumière', HU2: 'Ce qui m\'a fait du bien', HU3: 'Ma carte d\'énergie', HU4: 'Une petite tâche finie', HU5: 'Se laver, s\'habiller',
  SO1: 'Observer mes nuits', SO2: 'Une heure de lever fixe', SO3: 'Lumière le matin', SO4: 'Dernier café avant 14 h', SO5: 'Le téléphone hors du lit',
};

const ADVICE = ['garder', 'alleger', 'changer'];

function clean(s, max) {
  return String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').slice(0, max).trim();
}
const num = (x, min, max) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 10) / 10)) : null;
};
const genreOf = g => (g === 'femme' || g === 'homme' ? g : null);

function sanitizePropose(body) {
  const axis = AXES[body.axis] ? body.axis : null;
  if (!axis) return null;
  const signals = (Array.isArray(body.signals) ? body.signals : []).slice(0, 6)
    .map(s => ({ test: clean(s && s.test, 60), result: clean(s && s.result, 80) }))
    .filter(s => s.test);
  return {
    axis,
    prenom: clean(body.prenom, 30),
    genre: genreOf(body.genre),
    light: !!body.light,
    fragile: !!body.fragile,
    signals,
    moodLowDays: num(body.moodLowDays, 0, 31) ?? 0,
    moodDays: num(body.moodDays, 0, 31) ?? 0,
  };
}

const STYLE = `Ton style : tutoiement, chaleureux, direct, simple, sans jargon, français impeccable. Tu peux glisser un mot de wolof (ex. « ndank ndank »), sans en abuser. Accorde au genre indiqué (sinon formule neutre, jamais de « (e) »). Pas d'emoji.
Interdits absolus : diagnostic, nom de maladie posé sur la personne, médicament, promesse de guérison ou de résultat, jugement, culpabilisation (un jour manqué n'est jamais un échec). Tu n'inventes aucun exercice : tu ne cites que ceux qu'on te donne.`;

function buildProposePrompt(c) {
  const ax = AXES[c.axis];
  const system = `Tu es Dr Lô, compagnon de bien-être de Health-e (plateforme sénégalaise de santé mentale).
Tu présentes « ${ax.name} » : 28 jours, 3 petits engagements par jour (son humeur, un exercice, 30 secondes d'apprentissage), environ 10 minutes en tout.
${STYLE}

Écris "intro" : 2 ou 3 phrases, 320 caractères maximum. Dis ce que tu as remarqué dans ses résultats (avec des mots simples, sans chiffres ni nom de test) et pourquoi ce programme peut l'aider. ${c.fragile ? 'Ses résultats montrent que c\'est lourd en ce moment : dis avec douceur que le programme vient EN PLUS d\'un vrai professionnel (médecin, psychologue), pas à la place, et que tu as choisi une version légère.' : ''}
Choisis "order" : l'ordre des 5 exercices de la semaine 1 (les identifiants fournis, chacun une fois), du plus facile et utile pour cette personne au plus exigeant.

Réponds UNIQUEMENT avec un objet JSON sur une ligne :
{"intro":"...","order":["...","...","...","...","..."]}`;
  const lines = [];
  if (c.prenom) lines.push(`Prénom : ${c.prenom}`);
  lines.push(`Genre : ${c.genre ?? 'inconnu'}`);
  lines.push(`Version : ${c.light || c.fragile ? 'légère (5 minutes par jour)' : 'normale'}`);
  if (c.signals.length) lines.push(`Résultats récents : ${c.signals.map(s => `${s.test} → ${s.result}`).join(' ; ')}`);
  else lines.push('Pas de résultat de test qui le demande : la personne a choisi ce programme elle-même.');
  if (c.moodDays) lines.push(`Humeur notée : ${c.moodLowDays} jour(s) difficile(s) sur ${c.moodDays} ces deux dernières semaines`);
  lines.push(`Exercices de la semaine 1 : ${ax.week1.map(id => `${id} = ${WEEK1_TITLES[id]}`).join(' ; ')}`);
  return { system, user: lines.join('\n') };
}

function extractJson(raw) {
  const m = String(raw ?? '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function tidy(text, max) {
  let t = clean(text, max + 200).replace(/\s*\(e\)/g, '');
  if (t.length > max) t = `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
  return t;
}

function parsePropose(raw, axis) {
  const obj = extractJson(raw);
  if (!obj || typeof obj !== 'object' || !AXES[axis]) return null;
  const intro = tidy(obj.intro, 420);
  if (!intro) return null;
  const valid = AXES[axis].week1;
  const order = [];
  for (const id of Array.isArray(obj.order) ? obj.order : []) {
    if (typeof id === 'string' && valid.includes(id) && !order.includes(id)) order.push(id);
  }
  return { intro, order };
}

function sanitizeBilan(body) {
  const axis = AXES[body.axis] ? body.axis : null;
  if (!axis) return null;
  const c = body.counts && typeof body.counts === 'object' ? body.counts : {};
  const sl = body.sleep && typeof body.sleep === 'object' ? body.sleep : {};
  return {
    axis,
    prenom: clean(body.prenom, 30),
    genre: genreOf(body.genre),
    day: num(body.day, 1, 60) ?? 1,
    week: num(body.week, 1, 4) ?? 1,
    light: !!body.light,
    fragile: !!body.fragile,
    activeDays: num(body.activeDays, 0, 7) ?? 0,
    counts: { mood: num(c.mood, 0, 7) ?? 0, action: num(c.action, 0, 7) ?? 0, learn: num(c.learn, 0, 7) ?? 0 },
    moodNow: num(body.moodNow, 1, 5),
    moodBefore: num(body.moodBefore, 1, 5),
    sleep: { mal: num(sl.mal, 0, 7) ?? 0, moyen: num(sl.moyen, 0, 7) ?? 0, bien: num(sl.bien, 0, 7) ?? 0 },
    actionsDone: (Array.isArray(body.actionsDone) ? body.actionsDone : []).slice(0, 7).map(x => clean(x, 60)).filter(Boolean),
  };
}

function buildBilanPrompt(c) {
  const ax = AXES[c.axis];
  const system = `Tu es Dr Lô, compagnon de bien-être de Health-e. Tu fais le bilan de la semaine ${c.week} du « ${ax.name} » (28 jours, 3 engagements par jour).
${STYLE}

Écris "text" : 3 à 5 phrases, 600 caractères maximum. Commence par ce qui a été fait (même peu, c'est une vraie chose). Dis ce que tu remarques sur l'humeur${c.axis === 'sommeil' ? ' et les nuits' : ''} avec des mots simples (l'humeur va de 1 = très dur à 5 = très bien). Termine par UN conseil concret pour la semaine qui vient.
Choisis "advice" :
- "garder" : le rythme va bien, on continue ainsi ;
- "alleger" : peu de jours actifs (3 ou moins sur 7) ou fatigue : passer en version légère (5 minutes par jour) ;
- "changer" : la personne tient le rythme mais l'humeur ne bouge pas du tout ou baisse : proposer de changer d'axe ou de demander l'avis d'un professionnel.
${c.fragile || (c.moodNow !== null && c.moodNow <= 2) ? 'Son humeur est basse : rappelle avec douceur qu\'en parler à un médecin ou un psychologue est une vraie aide, et que le 1515 répond à toute heure en cas de besoin urgent.' : ''}

Réponds UNIQUEMENT avec un objet JSON sur une ligne :
{"text":"...","advice":"garder|alleger|changer"}`;
  const lines = [];
  if (c.prenom) lines.push(`Prénom : ${c.prenom}`);
  lines.push(`Genre : ${c.genre ?? 'inconnu'}`);
  lines.push(`Jour ${c.day} sur 28, version ${c.light ? 'légère' : 'normale'}`);
  lines.push(`Jours actifs sur les 7 derniers : ${c.activeDays}`);
  lines.push(`Engagements tenus sur 7 jours : humeur ${c.counts.mood}, exercice ${c.counts.action}, apprentissage ${c.counts.learn}`);
  lines.push(`Humeur moyenne cette semaine : ${c.moodNow ?? 'pas assez notée'} ; la semaine d'avant : ${c.moodBefore ?? 'pas assez notée'}`);
  if (c.axis === 'sommeil') lines.push(`Nuits notées cette semaine : ${c.sleep.bien} bonnes, ${c.sleep.moyen} moyennes, ${c.sleep.mal} mauvaises`);
  if (c.actionsDone.length) lines.push(`Exercices faits : ${c.actionsDone.join(' ; ')}`);
  return { system, user: lines.join('\n') };
}

function parseBilan(raw) {
  const obj = extractJson(raw);
  if (!obj || typeof obj !== 'object') return null;
  const text = tidy(obj.text, 700);
  if (!text) return null;
  return { text, advice: ADVICE.includes(obj.advice) ? obj.advice : 'garder' };
}

module.exports = { AXES, ADVICE, sanitizePropose, buildProposePrompt, parsePropose, sanitizeBilan, buildBilanPrompt, parseBilan };
