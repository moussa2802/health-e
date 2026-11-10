const { admin, db, verifyAuth } = require('./_firebase');
const ST = require('./_stats');
const { takeSlot, giveBack } = require('./_chatAllowance');
const { sanitizeCompanionName, companionStyleBlock } = require('./_companion');
const { VOICE } = require('./_drloVoice');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');
const CH = require('./_drloChannels');
const PR = require('./_practices');
const { rulesV2 } = require('./_drloChatRules');
const { rulesV1 } = require('./_drloChatRulesV1');
const { wantsJournal, wantsNumbers, filterNotes } = require('./_drloChatContext');
const { shouldRemember, formatMemory, catOf } = require('./_drloMemory');
const LA = require('./_launch');
const { HAIKU_4_5, HAIKU_5_5, NO_THINKING, modelFrom, textOf } = require('./_aiModel');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// ── System prompt : des blocs, assemblés dans l'ancien ordre ou dans le nouveau (A1, cache) ──────────

/**
 * opts.message : le message en cours (décide ce qui entre dans le prompt : journal, chiffres, notes sensibles).
 * opts.rules : texte de règles de remplacement (Banc d'essai seulement) ; opts.version : 'v1' (ancien jeu) ou 'v2'.
 */
function promptParts(context, opts = {}) {
  const message = typeof opts.message === 'string' ? opts.message : '';
  const withNumbers = wantsNumbers(message);
  const withJournal = wantsJournal(message);
  const prenomLabel = context.prenom || 'cette personne';
  const companionName = sanitizeCompanionName(context.companion);
  const isFemme = context.genre === 'Femme' || context.genre === 'femme';
  // Le tiroir intime : passé au compagnon quand le message touche un sujet proche (sexualité, couple, stress, fatigue, sommeil, moral, confiance)
  const allNotes = Array.isArray(context.memoire) ? context.memoire : [];
  const isIntime = (n) => catOf(typeof n === 'string' ? n : (n && n.text), n && n.cat) === 'intime';
  const INTIME_TOPIC = /sex|érect|erect|bander|désir|desir|libido|plaisir|intim|couple|copine|copain|femme|mari|épou|epou|stress|fatigu|sommeil|dormir|moral|confiance|anxi|angoiss|travail|pression|mariage|jabar|jëkkër|sonn/i;
  const intimeNotes = INTIME_TOPIC.test(message) ? allNotes.filter(isIntime) : [];
  const memSection = formatMemory([...filterNotes(allNotes.filter((n) => !isIntime(n)), message), ...intimeNotes].slice(0, 34))
    || 'Rien encore : c\'est peut-être votre première vraie discussion. Intéresse-toi à elle (une question à la fois), sans interrogatoire.';
  const testsDispo = (Array.isArray(context.tests_dispo) ? context.tests_dispo : [])
    .filter(t => t && /^[a-z0-9_]{2,40}$/i.test(String(t.id)))
    .slice(0, 60)
    .map(t => `${t.id} = ${String(t.label || '').slice(0, 50)}`)
    .join(' ; ');

  // Quand le test a été fait (pour ne pas reproposer un test fait hier) et son identifiant (pour les balises)
  const ago = (v) => {
    const c = v && v.completedAt;
    const t = !c ? 0 : typeof c === 'string' ? Date.parse(c) : typeof c === 'number' ? c : c.seconds ? c.seconds * 1000 : c._seconds ? c._seconds * 1000 : 0;
    if (!t) return '';
    const d = Math.floor((Date.now() - t) / 86400000);
    return d <= 0 ? ' · fait aujourd\'hui' : d === 1 ? ' · fait hier' : d < 60 ? ` · fait il y a ${d} jours` : ` · fait il y a ${Math.round(d / 30)} mois`;
  };
  const tag = (id, v) => `${v.scaleName} [${id}]`;

  // ── Évaluations psychologiques (compact: 1 ligne par test) ──
  const mentalSection = (() => {
    const entries = Object.entries(context.scores_mentaux || {});
    if (!entries.length) return 'Aucune évaluation complétée.';
    return entries.map(([id, v]) => {
      let line = withNumbers ? `• ${tag(id, v)} : ${v.label} (${v.score}/${v.scoreMax || '?'})${ago(v)}` : `• ${tag(id, v)} : ${v.label}${ago(v)}`;
      if (withNumbers && v.subscaleScores && Object.keys(v.subscaleScores).length) {
        const subs = Object.entries(v.subscaleScores)
          .map(([k, s]) => `${k}:${typeof s === 'number' ? s.toFixed(1) : s}`)
          .join(', ');
        line += ` [${subs}]`;
      }
      return line;
    }).join('\n');
  })();

  // ── Vie intime (compact) ──
  const intimeSection = (() => {
    const entries = Object.entries(context.scores_intimes || {});
    if (!entries.length) return 'Aucune évaluation complétée.';
    return entries.map(([id, v]) => {
      let line = withNumbers ? `• ${tag(id, v)} : ${v.label} (${v.score}/${v.scoreMax || '?'})${ago(v)}` : `• ${tag(id, v)} : ${v.label}${ago(v)}`;
      if (withNumbers && v.subscaleScores && Object.keys(v.subscaleScores).length) {
        const subs = Object.entries(v.subscaleScores)
          .map(([k, s]) => `${k}:${typeof s === 'number' ? s.toFixed(1) : s}`)
          .join(', ');
        line += ` [${subs}]`;
      }
      return line;
    }).join('\n');
  })();

  // ── Tests bonus (compact) ──
  const bonusSection = (() => {
    const entries = Object.entries(context.tests_bonus || {});
    if (!entries.length) return 'Aucun test bonus complété.';
    return entries.map(([id, v]) => `• ${tag(id, v)} : ${v.label}${ago(v)}`).join('\n');
  })();

  // ── Tests de compatibilité (compact) ──
  const compatSection = (() => {
    const tests = context.tests_compatibilite || [];
    if (!tests.length) return 'Aucun test de compatibilité effectué.';
    return tests.map((t, i) =>
      `#${i + 1} ${t.date} — ${t.type_relation} — partenaire ${t.code_partenaire} — ${t.score_global}%`
    ).join('\n');
  })();

  // ── Journal (compact) ──
  const journalSection = (() => {
    const entries = context.journal_recent || [];
    if (!entries.length) return 'Aucune entrée.';
    // Le journal est privé : son contenu n'est transmis que si le message en parle (ou demande ce que Dr Lô sait d'elle)
    if (opts.version !== 'v1' && !withJournal) return 'Elle tient un journal privé. Son contenu n\'est pas transmis pour ce message : n\'en parle pas.';
    return entries.map(e => {
      const themes = e.themes?.length ? ` (${e.themes.join(', ')})` : '';
      return `[${e.date}] ${e.humeur || '—'}${themes} "${e.contenu}"`;
    }).join('\n');
  })();

  // ── Analyses existantes ──
  const analyseLines = [
    context.analyse_mentale ? `Psy: ${context.analyse_mentale}` : null,
    context.analyse_intime ? `Intime: ${context.analyse_intime}` : null,
    context.analyse_generale ? `Globale: ${context.analyse_generale}` : null,
  ].filter(Boolean).join('\n');
  const analyseSection = analyseLines || 'Pas encore générées.';

  // ── Totem & profil 7 aspects ──
  const totemSection = context.totem_resume || 'Pas encore attribué.';

  const rulesBase = typeof opts.rules === 'string' && opts.rules.trim() ? opts.rules : (opts.version === 'v1' ? rulesV1(isFemme) : rulesV2(isFemme));
  // Lancement par vagues : on retire des règles ce qui décrit une fonctionnalité fermée pour elle
  const rulesBlock = context.open_features ? LA.pruneRules(rulesBase, context.open_features) : LA.pruneRules(rulesBase, Object.fromEntries(Object.keys(LA.FEATURES).map((k) => [k, true])));

  // Les blocs du prompt. Leur texte ne dépend pas de l'ordre : l'ancien ordre et le nouveau (A1) les assemblent tels quels.
  const style = companionStyleBlock(context.companion_style, context.companion_lang);
  return {
    intro: `Tu es ${companionName ? companionName + ', ' : ''}le compagnon de bien-être IA de Health-e${companionName ? ' (la personne t\'a donné ce nom)' : ''}. Sensibilité au contexte sénégalais et africain.
Tu parles comme un ami attentif qui connaît vraiment la personne — pas comme un chatbot. Tu es une IA : tu ne prétends jamais être un humain, ni médecin, ni un membre de l'équipe (Health-e est conçu par une équipe de professionnels de santé).`,
    style,
    profil: `━━━ PROFIL ━━━
${prenomLabel}, ${context.age || '?'} ans, ${context.genre || '?'}, ${context.situation || '?'}
Accord : ${isFemme ? 'FÉMININ (satisfaite, seule, épuisée)' : 'MASCULIN (satisfait, seul, épuisé)'}. Jamais de (e).`,
    totem: `━━━ TOTEM & PROFIL ━━━
${totemSection}`,
    mental: `━━━ TESTS PSYCHOLOGIQUES ━━━
${mentalSection}`,
    intime: `━━━ VIE INTIME ━━━
${intimeSection}`,
    bonus: `━━━ TESTS BONUS ━━━
${bonusSection}`,
    compat: `━━━ COMPATIBILITÉ ━━━
${compatSection}`,
    journal: `━━━ JOURNAL RÉCENT ━━━
${journalSection}`,
    analyses: `━━━ ANALYSES DR LÔ (arrière-plan : tu ne les cites pas) ━━━
${analyseSection}`,
    carnet: `━━━ CE QUE TU SAIS D'ELLE (ton carnet) ━━━
Sers-t'en comme un ami qui se souvient : appelle ses proches par leur prénom, relie ce qu'elle dit à ce que tu sais déjà (« comme la dernière fois avec ton chef ? »), adapte-toi à sa façon d'aimer qu'on lui parle. Jamais de liste de ce que tu sais, jamais « j'ai noté » ni « d'après mes notes ». N'en parle que si ça aide CE message.
Au début d'une discussion (peu ou pas d'échanges avant), si un point « À REPRENDRE » est d'actualité, prends-en des nouvelles en une phrase (un seul point), puis laisse-la mener.
${memSection}`,
    rules: `━━━ RÈGLES ━━━

${rulesBlock}`,
    chaines: `Chaînes de Dr Lô (ID, thème, situation de cette personne) :
${context.chaines_txt || 'Aucune pour le moment.'}`,
    outils: `Outils de Dr Lô (ID, ce qu'elle en connaît) :
${context.outils_txt || 'Aucun pour le moment.'}`,
    tests: `Tests disponibles (ID = nom) :
${testsDispo || 'Aucun.'}`,
    launch: context.launch_txt || '',
    discretion: INTIME_TOPIC.test(message) ? '' : 'DISCRÉTION : son dernier message ne parle pas de sexualité ni de vie intime. N\'en parle pas de toi-même, même si le sujet est venu plus tôt dans la discussion (ex. ne cite pas l\'érection ou le désir dans une liste). Si tu résumes ce qu\'elle vit, reste général (« ce que tu traverses »).',
    francais: 'FRANÇAIS : phrases correctes et simples (« ce que tu vis », jamais « ce que tu vivre »).',
  };
}

/** Ancien ordre (un seul bloc) : profil et carnet AVANT les règles. Gardé pour le retour en arrière et le banc d'essai. */
function buildSystemPrompt(context, opts = {}) {
  const p = promptParts(context, opts);
  return `${p.intro}

${VOICE}
${p.style ? `\n${p.style}\n` : ''}
${[p.profil, p.totem, p.mental, p.intime, p.bonus, p.compat, p.journal, p.analyses, p.carnet, p.rules, p.chaines, p.outils, p.tests].join('\n\n')}${p.launch ? `\n\n${p.launch}` : ''}${p.discretion ? `\n\n${p.discretion}` : ''}

${p.francais}`;
}

/**
 * Nouvel ordre (A1), mêmes blocs, mêmes mots :
 * - fixed : la voix et les règles, identiques pour tout le monde (au genre et aux fonctions ouvertes près) → cache partagé ;
 * - personal : ce qui est propre à la personne et ne change pas d'un message à l'autre → cache de la discussion ;
 * - dynamic : ce qui change selon le message ou le jour (tests avec dates, journal, carnet filtré, DISCRÉTION) → jamais en cache.
 */
function buildPromptLayers(context, opts = {}) {
  const p = promptParts(context, opts);
  return {
    fixed: `${VOICE}\n\n${p.rules}\n\n${p.francais}`,
    personal: [p.intro, p.style, p.profil, p.totem, p.compat, p.analyses, p.chaines, p.outils, p.tests, p.launch].filter(Boolean).join('\n\n'),
    dynamic: [p.mental, p.intime, p.bonus, p.journal, p.carnet, p.discretion].filter(Boolean).join('\n\n'),
  };
}

// ── Action proposée par Dr Lô (balise en dernière ligne) ─────────────────────

const TAG = /\[\[(test:[a-z0-9_]{2,40}|chaine:[A-Za-z0-9]{4,40}|pratique:[A-Za-z0-9]{4,40}|exercice:(?:coherence|ancrage|sommeil|relacher)|vocal:(?:journee|pensees|avant)|chaines|respiration|humeur|programme|journal|defi|compat|vrai_drlo|totem|catalogue)\]\]/gi;

/**
 * Sépare le texte et les boutons proposés (balises n'importe où, retirées du texte) : jusqu'à 3 tests, ou une seule autre action.
 * Plus de balise [[crise]] (10/11/2026, « compagnon d'abord ») : en cas de danger immédiat, le compagnon glisse un numéro
 * dans sa réponse et reste dans la conversation. Une balise [[crise]] égarée est retirée du texte comme toute balise inconnue.
 */
function splitActions(raw, channels = {}, tools = {}) {
  let text = String(raw || '');
  const tags = [];
  // Les identifiants de chaîne gardent leur casse ; une chaîne inconnue est ignorée
  text = text.replace(TAG, (_, t) => { tags.push(/^chaine:/i.test(t) ? `chaine:${t.slice(7)}` : /^pratique:/i.test(t) ? `pratique:${t.slice(9)}` : t.toLowerCase()); return ''; });
  text = text.replace(/\[\[[^\]]{0,60}\]\]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const tests = [...new Set(tags.filter(t => t.startsWith('test:')).map(t => t.slice(5)))].slice(0, 3);
  if (tests.length) return { text, actions: tests.map(scaleId => ({ kind: 'test', scaleId })) };
  const other = tags.find(t => !t.startsWith('test:') && (!t.startsWith('chaine:') || Object.prototype.hasOwnProperty.call(channels, t.slice(7))) && (!t.startsWith('pratique:') || Object.prototype.hasOwnProperty.call(tools, t.slice(9))));
  if (other && other.startsWith('exercice:')) return { text, actions: [{ kind: 'exercice', id: other.slice(9) }] };
  if (other && other.startsWith('vocal:')) return { text, actions: [{ kind: 'vocal', id: other.slice(6) }] };
  if (other && other.startsWith('pratique:')) return { text, actions: [{ kind: 'pratique', id: other.slice(9), name: tools[other.slice(9)] }] };
  if (other && other.startsWith('chaine:')) return { text, actions: [{ kind: 'chaine', id: other.slice(7), name: channels[other.slice(7)] }] };
  return { text, actions: other ? [{ kind: other }] : [] };
}
/** Compatibilité : la première action seulement. */
function splitAction(raw) { const o = splitActions(raw); return { text: o.text, action: o.actions[0] || null }; }

// ── Build user message ───────────────────────────────────────────────────────

function buildUserMessage(context, message, isFirstMessage = false) {
  const prenomLabel = context.prenom || 'cette personne';
  // Conversation ouverte par Dr Lô (accueil proactif) : l'IA doit savoir ce qu'elle a dit
  const ouverture = typeof context.ouverture === 'string' ? context.ouverture.trim().slice(0, 400) : '';
  if (isFirstMessage && ouverture) {
    return `[Tu as ouvert cette conversation en disant : « ${ouverture} »]\n${prenomLabel} : ${message}`;
  }
  return `${prenomLabel} : ${message}`;
}

// ── La requête envoyée à Claude (logique pure : le banc d'essai construit exactement la même) ──

const EPHEMERAL = { type: 'ephemeral' };
// Modèles qui acceptent un message { role: 'system' } au milieu de la conversation (doc Anthropic)
const MID_SYSTEM = /^claude-(haiku-5-5|sonnet-5-5|opus-5-5)/;
// Contexte du message quand le modèle n'accepte pas de message système au milieu (Haiku 4.5) : il va dans le message
const CONTEXT_LABEL = '[Contexte transmis par l\'application pour ce message ; elle ne le voit pas]';

/**
 * Réflexion de Claude Haiku 5.5 (active par défaut ; elle compte dans max_tokens et peut ne laisser aucun texte).
 * 'off' : coupée ; 'low' : réflexion légère, avec plus de place. Haiku 4.5 : rien n'est ajouté (requête d'aujourd'hui).
 */
function thinkingFor(model, mode) {
  if (!MID_SYSTEM.test(String(model))) return { max_tokens: 800 };
  if (mode === 'low') return { max_tokens: 2000, output_config: { effort: 'low' } };
  return { max_tokens: 800, thinking: NO_THINKING };
}

/**
 * Corps de la requête Anthropic.
 * layout 'a1' (par défaut) : règles fixes en premier (cache partagé), puis la personne (cache), puis l'historique
 * (cache sur son dernier message), puis le message ; ce qui change à chaque message vient après le dernier point de cache.
 * layout 'ancien' : un seul bloc système, profil et carnet avant les règles (retour en arrière).
 */
function buildChatRequest({ context = {}, message = '', historique = [], promptOpts = {}, model = HAIKU_4_5, layout = 'a1', thinking = 'off' } = {}) {
  // Conversation history: the last 12 messages of the thread
  const trimmed = (Array.isArray(historique) ? historique : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12);
  const userText = buildUserMessage(context, message, trimmed.length === 0);
  const opts = { ...promptOpts, message };
  const base = { model, ...thinkingFor(model, thinking) };

  if (layout === 'ancien') {
    return {
      ...base,
      system: [{ type: 'text', text: buildSystemPrompt(context, opts), cache_control: EPHEMERAL }],
      messages: [...trimmed.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userText }],
    };
  }

  const L = buildPromptLayers(context, opts);
  const last = trimmed.length - 1;
  const messages = trimmed.map((m, i) => (i === last
    ? { role: m.role, content: [{ type: 'text', text: m.content, cache_control: EPHEMERAL }] }
    : { role: m.role, content: m.content }));
  if (MID_SYSTEM.test(String(model))) {
    messages.push({ role: 'user', content: userText }, { role: 'system', content: L.dynamic });
  } else {
    messages.push({ role: 'user', content: [{ type: 'text', text: `${CONTEXT_LABEL}\n\n${L.dynamic}` }, { type: 'text', text: userText }] });
  }
  return {
    ...base,
    system: [
      { type: 'text', text: L.fixed, cache_control: EPHEMERAL },
      { type: 'text', text: L.personal, cache_control: EPHEMERAL },
    ],
    messages,
  };
}

/**
 * Réglages du compagnon, sans rien à régler dans Netlify : Claude Haiku 5.5, réflexion légère (effort low), nouvel ordre du prompt.
 * Retour en arrière par variables : DRLO_CHAT_MODEL=claude-haiku-4-5-20251001, DRLO_CHAT_THINKING=off, DRLO_CHAT_PROMPT=ancien.
 */
function chatSettings(env = process.env) {
  return {
    model: modelFrom('DRLO_CHAT_MODEL', HAIKU_5_5, env),
    layout: String(env.DRLO_CHAT_PROMPT || '').trim() === 'ancien' ? 'ancien' : 'a1',
    thinking: String(env.DRLO_CHAT_THINKING || '').trim() === 'off' ? 'off' : 'low',
  };
}

/** Le contexte complet du prompt : ce que l'appli envoie, plus ce que le serveur calcule (carnet, chaînes, outils, ouvertures). */
function chatContext(context, memoire, open, chaines, outils) {
  // Carnet : une note qui parle d'une fonction fermée (« a commencé un programme ») ferait croire qu'elle existe
  const memoireVue = LA.filterNotesByLaunch(memoire, open);
  return { ...context, memoire: memoireVue, chaines_txt: open.chaines ? chaines.text : 'Pas encore ouvert : n\'en parle pas.', outils_txt: open.routine ? outils.text : 'Pas encore ouvert : n\'en parle pas.', launch_txt: LA.launchBlock(open), open_features: open };
}

exports._chatContext = chatContext;
exports._chatSettings = chatSettings;
exports._splitAction = splitAction;
exports._splitActions = splitActions;
exports._buildSystemPrompt = buildSystemPrompt;
exports._buildPromptLayers = buildPromptLayers;
exports._buildChatRequest = buildChatRequest;
exports._thinkingFor = thinkingFor;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = await verifyAuth(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const { message, historique = [], context = {} } = body;

  if (!message || !message.trim()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message manquant' }) };
  }

  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé API manquante', koris_debited: false }) };
  }

  // ── Banc d'essai (console de Dr Lô) : rien n'est compté ni retenu ──
  let testMode = false;
  if (body.test === true) {
    const staff = await db.collection('staff').doc(user.uid).get().catch(() => null);
    if (!staff || !staff.exists || staff.data().drlo !== true) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Réservé à Dr Lô' }) };
    testMode = true;
  }

  // ── Chaque réponse de l'IA coûte 1 étincelle (aucun message offert) ──
  // Ordre : garde-fou du jour, puis réservation de l'étincelle ; en cas d'échec, tout est rendu.
  let holdId = null;
  let slot = { limit: false, next: { count: 0 } };
  if (!testMode) {
    slot = await takeSlot(db, user.uid).catch(() => null);
    if (!slot) return { statusCode: 503, headers, body: JSON.stringify({ error: 'indisponible', koris_debited: false }) };
    if (slot.limit) return { statusCode: 429, headers, body: JSON.stringify({ error: 'limite_jour', koris_debited: false }) };
    const reservation = await reserveKoris(user.uid, 'chat').catch(() => null);
    if (!reservation || reservation.error) {
      await giveBack(db, user.uid);
      if (reservation && reservation.error === 'insufficient_balance') {
        return { statusCode: 402, headers, body: JSON.stringify({ error: "Pas assez d'étincelles", koris_debited: false }) };
      }
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'indisponible', koris_debited: false }) };
    }
    if (!reservation.holdId) {
      // Garde-fou : le coût de « chat » ne doit jamais être 0
      await giveBack(db, user.uid);
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'indisponible', koris_debited: false }) };
    }
    holdId = reservation.holdId;
  }
  const commit = async () => { if (holdId) await commitKoris(holdId); };
  const release = async () => { if (holdId) await releaseKoris(holdId); if (!testMode) await giveBack(db, user.uid); };

  // Ce que Dr Lô retient de la personne (notes gardées dans son compte)
  let memoire = [];
  if (!testMode || body.withMemory) {
    const p = await db.collection('patients').doc(user.uid).get().catch(() => null);
    memoire = p && p.exists && Array.isArray(p.data().drloMemory) ? p.data().drloMemory : [];
  }

  // Lancement par vagues : ce qui est ouvert pour CETTE personne (le compagnon ne propose rien d'autre)
  let open = Object.fromEntries(Object.keys(LA.FEATURES).map((k) => [k, false]));
  try {
    const [cfg, upl] = await Promise.all([db.collection('siteConfig').doc('home').get(), db.collection('userProfiles').doc(user.uid).get()]);
    open = LA.openFeatures(cfg.exists ? cfg.data().launch : null, upl.exists ? upl.data() : {});
  } catch (e) { console.warn('dr-lo-chat launch', e.message); }

  // Les chaînes de Dr Lô, vues pour cette personne (calculé ici : jamais pris du navigateur)
  let chaines = { text: '', ids: {} };
  if (open.chaines) try {
    const [cs, ms, up, pa] = await Promise.all([
      db.collection('channels').where('status', '==', 'active').limit(20).get(),
      db.collection('channelMembers').where('uid', '==', user.uid).limit(50).get(),
      db.collection('userProfiles').doc(user.uid).get(),
      db.collection('patients').doc(user.uid).get(),
    ]);
    const labels = Object.fromEntries((Array.isArray(context.tests_dispo) ? context.tests_dispo : []).filter(t => t && t.id).map(t => [String(t.id), String(t.label || '').slice(0, 50)]));
    const wallet = pa.exists ? (pa.data().korisWallet || {}) : {};
    chaines = CH.chatSummary(cs.docs.map(d => ({ id: d.id, ...d.data() })), new Set(ms.docs.map(d => d.data().channelId)), up.exists ? up.data() : {}, Number(wallet.balance) || 0, labels);
  } catch (e) { console.warn('dr-lo-chat chaines', e.message); }

  // Les outils de Dr Lô (pratiques publiées) et ce que la personne en connaît
  let outils = { text: '', ids: {} };
  if (open.routine) try {
    const [ps, us] = await Promise.all([
      db.collection('practices').where('status', '==', 'published').limit(40).get(),
      db.collection('practiceUnlocks').where('uid', '==', user.uid).get(),
    ]);
    const byP = Object.fromEntries(us.docs.map(d => [d.data().practiceId, d.data()]));
    outils = PR.chatTools(ps.docs.map(d => ({ id: d.id, p: d.data(), u: byP[d.id] })));
  } catch (e) { console.warn('dr-lo-chat outils', e.message); }

  // Banc d'essai seulement : on peut choisir l'ancien jeu de règles, en essayer un nouveau texte, ou un autre modèle
  const promptOpts = {};
  // Modèle, ordre du prompt et réflexion : voir chatSettings (Haiku 5.5 effort low par défaut, variables pour revenir en arrière)
  const settings = chatSettings();
  let model0 = settings.model;
  if (testMode) {
    if (body.rulesVersion === 'v1') promptOpts.version = 'v1';
    if (typeof body.rules === 'string' && body.rules.trim()) promptOpts.rules = body.rules.slice(0, 40000);
    if (body.model === 'sonnet') model0 = 'claude-sonnet-4-5-20250929';
  }
  const { layout, thinking } = settings;
  const fullContext = chatContext(context, memoire, open, chaines, outils);

  const MODELS = [model0];

  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt];
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(buildChatRequest({ context: fullContext, message, historique, promptOpts, model, layout, thinking })),
      });

      if (response.ok) {
        const data = await response.json();
        // Texte lu par type de bloc (Haiku 5.5 peut commencer par un bloc de réflexion)
        const raw = textOf(data);
        if (!raw.trim()) {
          // Réponse vide (ex. réflexion qui a pris toute la place) : traitée comme une panne, l'étincelle est rendue
          console.warn(`dr-lo-chat empty answer model=${model} stop=${data?.stop_reason || '?'}`);
          await release();
          return { statusCode: 502, headers, body: JSON.stringify({ error: 'Réponse vide', error_code: 'ai_unavailable', koris_debited: false }) };
        }
        const split = splitActions(raw, chaines.ids, outils.ids);
        const text = split.text;
        const actions = split.actions.filter((a) => LA.allowedAction(a, open));
        await commit();
        if (!testMode) await ST.bump(db, admin, { uid: user.uid, counts: { ev_chat_message: 1 }, features: ['compagnon'] });
        const cached = data?.usage?.cache_read_input_tokens || 0;
        const written = data?.usage?.cache_creation_input_tokens || 0;
        const total = data?.usage?.input_tokens || 0;
        console.log(`dr-lo-chat OK model=${model} layout=${layout} input=${total} cached=${cached} written=${written} output=${data?.usage?.output_tokens || 0}`);
        return { statusCode: 200, headers, body: JSON.stringify({
          response: text, actions, action: actions[0] || null,
          koris_debited: !!holdId,
          // Au 2e message du jour puis tous les 5 : l'appli demande au compagnon de mettre son carnet à jour
          remember: !testMode && !!slot.next && shouldRemember(Number(slot.next.count)),
        }) };
      }

      const err = await response.text();
      const isOverloaded = err.includes('overloaded') || response.status === 529;
      console.warn(`dr-lo-chat model ${model} failed (${response.status}): ${err.substring(0, 200)}`);

      if (!isOverloaded) {
        await release();
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erreur API Claude', error_code: 'ai_unavailable', koris_debited: false }) };
      }

      if (attempt < MODELS.length - 1) await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`dr-lo-chat fetch error (model ${model}):`, e.message);
      if (attempt === MODELS.length - 1) {
        await release();
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, error_code: 'ai_unavailable', koris_debited: false }) };
      }
    }
  }

  await release();
  return { statusCode: 500, headers, body: JSON.stringify({ error: 'Tous les modèles sont indisponibles', error_code: 'ai_unavailable', koris_debited: false }) };
};
