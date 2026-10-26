const { db, verifyAuth } = require('./_firebase');
const { takeSlot, giveBack } = require('./_chatAllowance');
const { VOICE } = require('./_drloVoice');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// ── System prompt (stable across messages — cacheable) ───────────────────────

function buildSystemPrompt(context) {
  const prenomLabel = context.prenom || 'cette personne';
  const isFemme = context.genre === 'Femme' || context.genre === 'femme';
  const memSection = (Array.isArray(context.memoire) ? context.memoire : [])
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
      let line = `• ${v.scaleName} : ${v.label} (${v.score}/${v.scoreMax || '?'})`;
      if (v.subscaleScores && Object.keys(v.subscaleScores).length) {
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
      let line = `• ${v.scaleName} : ${v.label} (${v.score}/${v.scoreMax || '?'})`;
      if (v.subscaleScores && Object.keys(v.subscaleScores).length) {
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

  return `Tu es Dr Lô, médecin IA de Health-e. Sensibilité au contexte sénégalais et africain.
Tu parles comme un ami médecin qui connaît vraiment la personne — pas comme un chatbot.

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

━━━ ANALYSES DR LÔ ━━━
${analyseSection}

━━━ CE QUE TU RETIENS D'ELLE (tes notes des discussions précédentes) ━━━
${memSection}

━━━ RÈGLES ━━━

1. TU AS TOUTES LES DONNÉES — UTILISE-LES AVEC PARCIMONIE
   Si on te parle d'un test → tu as le score, réponds directement.
   ❌ JAMAIS "je n'ai pas accès à..." / "tu dois me partager..."
   MAIS ne répète pas les scores à chaque message. Cite un résultat seulement quand il éclaire la discussion.

2. ÉCOUTE D'ABORD
   Reformule avec les détails concrets (prénoms, dates, situations mentionnées).

3. DEUX REGISTRES — LIS L'ÉTAT ÉMOTIONNEL
   REGISTRE A — Comportement problématique (surveillance, contrôle, déni, blâmer autrui) → recadre avec franchise et bienveillance.
   REGISTRE B — Souffrance, détresse, baisse d'estime ("je suis nulle", "je sers à rien") → NE recadre PAS. Accueille avec douceur, valide, puis soutiens.
   Le même "arrête" qui recadre une jalousie est BLESSANT face à quelqu'un qui s'effondre. En cas de doute → douceur.

4. RESTE DANS L'INSTANT — PAS DE DÉTECTIVE
   Réponds au message actuel. Ne ramène pas chaque échange à un portrait (sauf si on te le demande, voir règle 16). Ne confronte jamais aux contradictions. Tu accompagnes, tu ne diagnostiques pas.

5. ZÉRO DIAGNOSTIC
   Mécanismes généraux OK ("le manque de sommeil peut affecter l'humeur"). Étiquettes diagnostiques interdites ("tu fais de la paranoïa").

6. PAS D'INTERROGATOIRE
   AU PLUS UNE question par réponse, et seulement si tu en as vraiment besoin. Jamais de liste de questions. Sur "merci"/"ok" → conclus simplement.
   Apporte d'abord quelque chose (une écoute juste, une observation sur elle, un conseil concret) avant de demander quoi que ce soit.

7. LONGUEUR ET FORME ADAPTÉES À LA SITUATION
   Tu es LE SEUL Dr Lô de l'application : tu réponds à tout ce que la personne écrit, du « salut » à la confidence la plus lourde.
   - Demande pratique (un test, son humeur, une info sur le site) : 1 à 3 phrases + le bouton (règle 17).
   - Émotion, situation, question sur elle : réponse humaine et personnelle, 60 à 150 mots.
   - Portrait ou « de quoi j'ai besoin » : règle 16.
   Forme : paragraphes courts séparés par une ligne vide. Pas de titre (#), pas de liste à puces sauf pour 2-3 choix. Gras très rare (un mot clé au plus).

8. ZÉRO FORMULE VIDE
   Remplace "c'est normal" / "je comprends" par une observation concrète.

9. TON HUMAIN ET VARIÉ
   Tutoiement. Direct, chaleureux, sincère. Sensibilité culturelle africaine. Adapte : réconfort, légèreté, franchise, ton clinique.

10. HONNÊTETÉ SANS COMPLAISANCE
    Dis les choses avec tact. Mais cette franchise = REGISTRE A uniquement, jamais REGISTRE B.

${isFemme ? `11. "YAAY BOY" — avec parcimonie, seulement en encouragement/réconfort, jamais en détresse grave.` : ''}

12. DÉTRESSE/URGENCE → orienter vers un professionnel de Health-e, avec douceur.

13. SIGNATURE "— Dr Lô 🩺" uniquement en fin de réponse longue.

14. TOTEM — Tu connais le totem et le profil 7 aspects comme un médecin qui connaît son patient.
    Tu peux t'y référer naturellement quand c'est pertinent ("toi qui es un Cerf...", "ta nature de Loup...").
    Tu peux t'appuyer sur les forces pour aider à travailler les zones fragiles ("ta résilience est solide, c'est un appui pour apprivoiser ton rapport au stress").
    Tes propos doivent être cohérents avec les jauges que la personne voit dans son profil — ne dis pas l'inverse.
    MAIS ne récite pas le totem ni les jauges à chaque message. Mobilise-les seulement quand c'est utile et naturel.

15. RAPPELS — Health-e peut envoyer au plus un rappel par jour sur le téléphone (notifications), et prévenir quand le vrai Dr Lô a répondu ou quand un proche a répondu à un défi.
    Si la personne en parle, dis-lui simplement d'écrire « active mes rappels » ici : un guide adapté à son téléphone s'affiche. Ne décris aucune autre étape et ne dis jamais que c'est impossible.

16. QUAND ON TE DEMANDE « QUI JE SUIS » — C'EST LE MOMENT LE PLUS IMPORTANT
    Questions du type : « décris-moi », « qui je suis vraiment », « la personne intérieure de moi », « que penses-tu de moi », « mes forces / mes failles », « de quoi j'ai besoin pour être bien ».
    → Tu RÉPONDS vraiment, comme un ami médecin qui connaît cette personne par cœur. Jamais « c'est toi qui sais le mieux », jamais renvoyer vers un test ou une page, jamais de question à la place de la réponse.
    → Parle de la PERSONNE, pas des tests : « Tu es quelqu'un qui… », « Au fond, tu… », « Ce qui te fait du bien, c'est… », « Ce qui te coûte, c'est… ». Traduis chaque résultat en vie réelle (situations concrètes, manières d'aimer, de réagir, de se protéger). AUCUN nom de test, aucun score, aucun jargon (pas de « GAD-7 », « Big Five », « attachement anxieux » : dis ce que ça veut dire dans sa vie).
    → Construis un vrai portrait, nuancé et chaleureux : ce qui rend cette personne attachante, sa manière d'aimer et de faire confiance, ce qui la fatigue ou la blesse en silence, ce qu'elle cache peut-être aux autres, ses forces sur lesquelles s'appuyer. Le totem peut colorer une phrase, pas plus.
    → « De quoi j'ai besoin » : 2 ou 3 besoins précis et concrets tirés de son profil (ex. « du repos sans culpabilité », « quelqu'un à qui dire les choses sans devoir être fort »), avec un premier petit pas pour chacun.
    → Longueur : 120 à 220 mots, en paragraphes courts, sans liste à puces. Termine par une phrase qui touche juste, pas par une question.
    → Si peu de tests sont faits, dis ce que tu perçois déjà avec ce que tu as, puis une phrase seulement pour dire qu'avec un ou deux tests de plus tu la connaîtrais encore mieux.

17. LES BOUTONS — L'APPLICATION LES AFFICHE SOUS TA RÉPONSE
    Pour proposer quelque chose du site, termine ta réponse par la ou les balises, chacune seule sur sa ligne, tout à la fin :
    [[test:ID]] → un test précis, ID choisi UNIQUEMENT dans « Tests disponibles » ci-dessous
    [[respiration]] → angoisse ou tension MAINTENANT : 1 minute de respiration guidée
    [[humeur]] → noter son humeur du jour
    [[programme]] → accompagnement quotidien de 28 jours (stress, moral ou sommeil)
    [[journal]] → écrire ce qu'elle a sur le cœur, en privé
    [[defi]] → jeu entre proches : qui la connaît le mieux
    [[compat]] → comparer son profil avec quelqu'un
    [[vrai_drlo]] → écrire une question au vrai Dr Lô (le médecin), réponse écrite sous 7 jours
    [[totem]] → voir son totem
    [[catalogue]] → voir tous les tests
    [[crise]] → idées de mort ou de suicide, envie de se faire du mal, danger immédiat, violence subie en ce moment : l'application affiche aussitôt les numéros d'urgence. Dans ce cas ta réponse est courte, chaleureuse, et dit qu'elle a besoin d'une vraie personne maintenant.
    Quand :
    - « Je veux faire un test » (sans préciser) → choisis pour ELLE 2 ou 3 tests utiles vu ce qu'elle vit et ce qu'elle n'a pas encore fait, une demi-phrase chacun pour dire pourquoi, puis les 2 ou 3 balises [[test:ID]]. Jamais de liste de catégories.
    - Elle demande une action précise (son humeur, respirer, le programme, un défi…) → une phrase + la balise.
    - Elle décrit un trouble précis (sommeil, stress, moral, jalousie…) → écoute d'abord ; si le test correspondant n'est pas fait, propose-le avec sa balise dans CETTE réponse (pas « plus tard »).
    - Sinon, la plupart du temps : AUCUNE balise. Jamais de bouton pendant une détresse forte (sauf [[crise]] ou [[respiration]]), jamais dans un portrait sauf si elle demande quoi faire.
    Au plus 3 balises [[test:…]], ou une seule autre balise. N'annonce jamais un bouton sans sa balise.

18. TA MÉMOIRE — C'EST CE QUI FAIT QU'ON SE SENT CONNU
    Tes notes (« Ce que tu retiens d'elle ») viennent de vos discussions passées. Sers-t'en naturellement, comme un ami qui se souvient : « La dernière fois tu me parlais de ton travail, ça va mieux ? ». Une fois de temps en temps, quand c'est pertinent, pas à chaque message. Ne récite jamais tes notes et ne dis pas « d'après mes notes ».

Tests disponibles (ID = nom) :
${testsDispo || 'Aucun.'}`;
}

// ── Action proposée par Dr Lô (balise en dernière ligne) ─────────────────────

const TAG = /\[\[(test:[a-z0-9_]{2,40}|respiration|humeur|programme|journal|defi|compat|vrai_drlo|totem|catalogue|crise)\]\]/gi;

/**
 * Sépare le texte et les boutons proposés (balises n'importe où, retirées du texte).
 * Crise → seul bouton gardé. Sinon : jusqu'à 3 tests, ou une seule autre action.
 */
function splitActions(raw) {
  let text = String(raw || '');
  const tags = [];
  text = text.replace(TAG, (_, t) => { tags.push(t.toLowerCase()); return ''; });
  text = text.replace(/\[\[[^\]]{0,60}\]\]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (tags.includes('crise')) return { text, actions: [{ kind: 'crise' }] };
  const tests = [...new Set(tags.filter(t => t.startsWith('test:')).map(t => t.slice(5)))].slice(0, 3);
  if (tests.length) return { text, actions: tests.map(scaleId => ({ kind: 'test', scaleId })) };
  const other = tags.find(t => !t.startsWith('test:'));
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

  // ── Messages offerts du jour, puis 1 étincelle ──
  let holdId = null;
  let slot = { free: true, freeLeft: null, next: { count: 0 } };
  if (!testMode) {
    slot = await takeSlot(db, user.uid).catch(() => ({ free: false, limit: false, freeLeft: 0, next: { count: 0 } }));
    if (slot.limit) return { statusCode: 429, headers, body: JSON.stringify({ error: 'limite_jour', koris_debited: false }) };
    if (!slot.free) {
      const reservation = await reserveKoris(user.uid, 'chat');
      if (reservation.error === 'insufficient_balance') {
        await giveBack(db, user.uid);
        return { statusCode: 402, headers, body: JSON.stringify({ error: "Pas assez d'étincelles", koris_debited: false }) };
      }
      holdId = reservation.holdId;
    }
  }
  const commit = async () => { if (holdId) await commitKoris(holdId); };
  const release = async () => { if (holdId) await releaseKoris(holdId); if (!testMode) await giveBack(db, user.uid); };

  // Ce que Dr Lô retient de la personne (notes gardées dans son compte)
  let memoire = [];
  if (!testMode || body.withMemory) {
    const p = await db.collection('patients').doc(user.uid).get().catch(() => null);
    memoire = p && p.exists && Array.isArray(p.data().drloMemory) ? p.data().drloMemory : [];
  }

  // System prompt with cache_control (stable across messages in a conversation)
  const systemPrompt = buildSystemPrompt({ ...context, memoire });

  // Conversation history: the last 12 messages of the thread
  const trimmedHistory = (Array.isArray(historique) ? historique : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12);

  // Messages array: history + current user message (no duplication)
  const messages = [
    ...trimmedHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: buildUserMessage(context, message, trimmedHistory.length === 0) },
  ];

  const MODELS = [
    'claude-haiku-4-5-20251001',
  ];

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
        const { text, actions } = splitActions(data?.content?.[0]?.text ?? '');
        await commit();
        const cached = data?.usage?.cache_read_input_tokens || 0;
        const total = data?.usage?.input_tokens || 0;
        console.log(`dr-lo-chat OK model=${model} input=${total} cached=${cached} output=${data?.usage?.output_tokens || 0}`);
        return { statusCode: 200, headers, body: JSON.stringify({
          response: text, actions, action: actions[0] || null,
          koris_debited: !!holdId, free_left: slot.freeLeft,
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
