const { db, verifyAuth } = require('./_firebase');
const { takeSlot, giveBack } = require('./_chatAllowance');
const { VOICE } = require('./_drloVoice');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');
const CH = require('./_drloChannels');
const PR = require('./_practices');
const { rulesV2 } = require('./_drloChatRules');
const { rulesV1 } = require('./_drloChatRulesV1');
const { wantsJournal, wantsNumbers, filterNotes } = require('./_drloChatContext');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// ── System prompt (stable across messages — cacheable) ───────────────────────

/**
 * opts.message : le message en cours (décide ce qui entre dans le prompt : journal, chiffres, notes sensibles).
 * opts.rules : texte de règles de remplacement (Banc d'essai seulement) ; opts.version : 'v1' (ancien jeu) ou 'v2'.
 */
function buildSystemPrompt(context, opts = {}) {
  const message = typeof opts.message === 'string' ? opts.message : '';
  const withNumbers = wantsNumbers(message);
  const withJournal = wantsJournal(message);
  const prenomLabel = context.prenom || 'cette personne';
  const isFemme = context.genre === 'Femme' || context.genre === 'femme';
  const memSection = filterNotes(Array.isArray(context.memoire) ? context.memoire : [], message)
    .map(m => (typeof m === 'string' ? m : m && m.text))
    .filter(Boolean)
    .slice(0, 25)
    .map(t => `• ${String(t).slice(0, 200)}`)
    .join('\n') || 'Rien encore : c\'est peut-être votre première vraie discussion.';
  const testsDispo = (Array.isArray(context.tests_dispo) ? context.tests_dispo : [])
    .filter(t => t && /^[a-z0-9_]{2,40}$/i.test(String(t.id)))
    .slice(0, 60)
    .map(t => `${t.id} = ${String(t.label || '').slice(0, 50)}`)
    .join(' ; ');

  // ── Évaluations psychologiques (compact: 1 ligne par test) ──
  const mentalSection = (() => {
    const entries = Object.entries(context.scores_mentaux || {});
    if (!entries.length) return 'Aucune évaluation complétée.';
    return entries.map(([, v]) => {
      let line = withNumbers ? `• ${v.scaleName} : ${v.label} (${v.score}/${v.scoreMax || '?'})` : `• ${v.scaleName} : ${v.label}`;
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
    return entries.map(([, v]) => {
      let line = withNumbers ? `• ${v.scaleName} : ${v.label} (${v.score}/${v.scoreMax || '?'})` : `• ${v.scaleName} : ${v.label}`;
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
    return entries.map(([, v]) => `• ${v.scaleName} : ${v.label}`).join('\n');
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

  const rulesBlock = typeof opts.rules === 'string' && opts.rules.trim() ? opts.rules : (opts.version === 'v1' ? rulesV1(isFemme) : rulesV2(isFemme));

  return `Tu es Dr Lô, médecin IA de Health-e. Sensibilité au contexte sénégalais et africain.
Tu parles comme un ami médecin qui connaît vraiment la personne — pas comme un chatbot. Tu es une IA : tu ne prétends jamais être un humain ni le vrai médecin.

${VOICE}

━━━ PROFIL ━━━
${prenomLabel}, ${context.age || '?'} ans, ${context.genre || '?'}, ${context.situation || '?'}
Accord : ${isFemme ? 'FÉMININ (satisfaite, seule, épuisée)' : 'MASCULIN (satisfait, seul, épuisé)'}. Jamais de (e).

━━━ TOTEM & PROFIL ━━━
${totemSection}

━━━ TESTS PSYCHOLOGIQUES ━━━
${mentalSection}

━━━ VIE INTIME ━━━
${intimeSection}

━━━ TESTS BONUS ━━━
${bonusSection}

━━━ COMPATIBILITÉ ━━━
${compatSection}

━━━ JOURNAL RÉCENT ━━━
${journalSection}

━━━ ANALYSES DR LÔ (arrière-plan : tu ne les cites pas) ━━━
${analyseSection}

━━━ CE QUE TU RETIENS D'ELLE (arrière-plan : tu n'en parles que si ça aide CE message) ━━━
${memSection}

━━━ RÈGLES ━━━

${rulesBlock}

Chaînes de Dr Lô (ID, thème, situation de cette personne) :
${context.chaines_txt || 'Aucune pour le moment.'}

Outils de Dr Lô (ID, ce qu'elle en connaît) :
${context.outils_txt || 'Aucun pour le moment.'}

Tests disponibles (ID = nom) :
${testsDispo || 'Aucun.'}`;
}

// ── Action proposée par Dr Lô (balise en dernière ligne) ─────────────────────

const TAG = /\[\[(test:[a-z0-9_]{2,40}|chaine:[A-Za-z0-9]{4,40}|pratique:[A-Za-z0-9]{4,40}|chaines|respiration|humeur|programme|journal|defi|compat|vrai_drlo|totem|catalogue|crise)\]\]/gi;

/**
 * Sépare le texte et les boutons proposés (balises n'importe où, retirées du texte).
 * Crise → seul bouton gardé. Sinon : jusqu'à 3 tests, ou une seule autre action.
 */
function splitActions(raw, channels = {}, tools = {}) {
  let text = String(raw || '');
  const tags = [];
  // Les identifiants de chaîne gardent leur casse ; une chaîne inconnue est ignorée
  text = text.replace(TAG, (_, t) => { tags.push(/^chaine:/i.test(t) ? `chaine:${t.slice(7)}` : /^pratique:/i.test(t) ? `pratique:${t.slice(9)}` : t.toLowerCase()); return ''; });
  text = text.replace(/\[\[[^\]]{0,60}\]\]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (tags.includes('crise')) return { text, actions: [{ kind: 'crise' }] };
  const tests = [...new Set(tags.filter(t => t.startsWith('test:')).map(t => t.slice(5)))].slice(0, 3);
  if (tests.length) return { text, actions: tests.map(scaleId => ({ kind: 'test', scaleId })) };
  const other = tags.find(t => !t.startsWith('test:') && (!t.startsWith('chaine:') || Object.prototype.hasOwnProperty.call(channels, t.slice(7))) && (!t.startsWith('pratique:') || Object.prototype.hasOwnProperty.call(tools, t.slice(9))));
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

exports._splitAction = splitAction;
exports._splitActions = splitActions;
exports._buildSystemPrompt = buildSystemPrompt;

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

  // ── Banc d'essai (console du vrai Dr Lô) : rien n'est compté ni retenu ──
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

  // Les chaînes du vrai Dr Lô, vues pour cette personne (calculé ici : jamais pris du navigateur)
  let chaines = { text: '', ids: {} };
  try {
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
  try {
    const [ps, us] = await Promise.all([
      db.collection('practices').where('status', '==', 'published').limit(40).get(),
      db.collection('practiceUnlocks').where('uid', '==', user.uid).get(),
    ]);
    const byP = Object.fromEntries(us.docs.map(d => [d.data().practiceId, d.data()]));
    outils = PR.chatTools(ps.docs.map(d => ({ id: d.id, p: d.data(), u: byP[d.id] })));
  } catch (e) { console.warn('dr-lo-chat outils', e.message); }

  // System prompt with cache_control (stable across messages in a conversation)
  // Banc d'essai seulement : on peut choisir l'ancien jeu de règles, en essayer un nouveau texte, ou un autre modèle
  const promptOpts = { message };
  let model0 = 'claude-haiku-4-5-20251001';
  if (testMode) {
    if (body.rulesVersion === 'v1') promptOpts.version = 'v1';
    if (typeof body.rules === 'string' && body.rules.trim()) promptOpts.rules = body.rules.slice(0, 40000);
    if (body.model === 'sonnet') model0 = 'claude-sonnet-4-5-20250929';
  }
  const systemPrompt = buildSystemPrompt({ ...context, memoire, chaines_txt: chaines.text, outils_txt: outils.text }, promptOpts);

  // Conversation history: the last 12 messages of the thread
  const trimmedHistory = (Array.isArray(historique) ? historique : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12);

  // Messages array: history + current user message (no duplication)
  const messages = [
    ...trimmedHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: buildUserMessage(context, message, trimmedHistory.length === 0) },
  ];

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
          'anthropic-beta': 'prompt-caching-2024-07-31',
        },
        body: JSON.stringify({
          model,
          max_tokens: 800,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const { text, actions } = splitActions(data?.content?.[0]?.text ?? '', chaines.ids, outils.ids);
        await commit();
        const cached = data?.usage?.cache_read_input_tokens || 0;
        const total = data?.usage?.input_tokens || 0;
        console.log(`dr-lo-chat OK model=${model} input=${total} cached=${cached} output=${data?.usage?.output_tokens || 0}`);
        return { statusCode: 200, headers, body: JSON.stringify({
          response: text, actions, action: actions[0] || null,
          koris_debited: !!holdId,
          // Toutes les 5 réponses : l'appli demande à Dr Lô de mettre à jour ce qu'il retient
          remember: !testMode && slot.next && slot.next.count > 0 && slot.next.count % 5 === 0,
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
