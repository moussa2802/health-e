const { verifyAuth } = require('./_firebase');
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

6. PAS DE QUESTION SYSTÉMATIQUE
   Conclus SANS question sauf si tu as besoin d'une précision. Sur "merci"/"ok" → conclus simplement.

7. LONGUEUR ADAPTÉE
   Court quand c'est suffisant. Développe seulement si demandé ou nécessaire.

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

17. PROPOSER UNE ACTION — RAREMENT, SEULEMENT SI ÇA AIDE VRAIMENT
    Tu peux, à la fin de ta réponse, proposer UNE action du site. L'application affiche alors le bouton. Écris ta phrase normalement (« Si tu veux, on regarde ton sommeil de plus près. »), puis, seule sur la DERNIÈRE ligne, la balise exacte :
    [[test:ID]] → un test précis, ID choisi UNIQUEMENT dans « Tests disponibles » ci-dessous (si la personne l'a déjà fait, seulement pour voir l'évolution)
    [[respiration]] → angoisse ou tension MAINTENANT : 1 minute de respiration guidée
    [[humeur]] → noter son humeur du jour
    [[programme]] → un accompagnement quotidien de 28 jours (stress, moral ou sommeil)
    [[journal]] → écrire ce qu'elle a sur le cœur, en privé
    [[defi]] → jeu entre proches : qui la connaît le mieux
    [[compat]] → comparer son profil avec quelqu'un
    [[vrai_drlo]] → écrire une question au vrai Dr Lô (le médecin), réponse écrite sous 7 jours
    [[totem]] → voir son totem
    Règles : au plus UNE balise, et dans la plupart des réponses AUCUNE. Jamais pendant une détresse forte (écoute d'abord), jamais dans un portrait (règle 16) sauf si elle demande quoi faire, jamais deux fois de suite la même. N'annonce jamais un bouton sans la balise, ni une balise sans phrase.

Tests disponibles (ID = nom) :
${testsDispo || 'Aucun.'}`;
}

// ── Action proposée par Dr Lô (balise en dernière ligne) ─────────────────────

const ACTION_TAG = /\n?\s*\[\[(test:[a-z0-9_]{2,40}|respiration|humeur|programme|journal|defi|compat|vrai_drlo|totem)\]\]\s*$/i;

/** Sépare le texte et l'action proposée ; toute autre balise est retirée du texte. */
function splitAction(raw) {
  let text = String(raw || '').trim();
  let action = null;
  const m = text.match(ACTION_TAG);
  if (m) {
    const tag = m[1].toLowerCase();
    action = tag.startsWith('test:') ? { kind: 'test', scaleId: tag.slice(5) } : { kind: tag };
    text = text.slice(0, m.index).trim();
  }
  text = text.replace(/\[\[[^\]]{0,60}\]\]/g, '').trim();
  return { text, action };
}

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

  // ── Reserve Koris ──
  const reservation = await reserveKoris(user.uid, 'chat');
  if (reservation.error === 'insufficient_balance') {
    return { statusCode: 402, headers, body: JSON.stringify({ error: "Pas assez d'étincelles", koris_debited: false }) };
  }
  const { holdId } = reservation;

  // System prompt with cache_control (stable across messages in a conversation)
  const systemPrompt = buildSystemPrompt(context);

  // Conversation history: keep last 8 messages (4 exchanges) to limit input
  const trimmedHistory = historique.slice(-8);

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
        const { text, action } = splitAction(data?.content?.[0]?.text ?? '');
        await commitKoris(holdId);
        const cached = data?.usage?.cache_read_input_tokens || 0;
        const total = data?.usage?.input_tokens || 0;
        console.log(`dr-lo-chat OK model=${model} input=${total} cached=${cached} output=${data?.usage?.output_tokens || 0}`);
        return { statusCode: 200, headers, body: JSON.stringify({ response: text, action, koris_debited: true }) };
      }

      const err = await response.text();
      const isOverloaded = err.includes('overloaded') || response.status === 529;
      console.warn(`dr-lo-chat model ${model} failed (${response.status}): ${err.substring(0, 200)}`);

      if (!isOverloaded) {
        await releaseKoris(holdId);
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erreur API Claude', error_code: 'ai_unavailable', koris_debited: false }) };
      }

      if (attempt < MODELS.length - 1) await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`dr-lo-chat fetch error (model ${model}):`, e.message);
      if (attempt === MODELS.length - 1) {
        await releaseKoris(holdId);
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, error_code: 'ai_unavailable', koris_debited: false }) };
      }
    }
  }

  await releaseKoris(holdId);
  return { statusCode: 500, headers, body: JSON.stringify({ error: 'Tous les modèles sont indisponibles', error_code: 'ai_unavailable', koris_debited: false }) };
};
