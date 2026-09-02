const { verifyAuth } = require('./_firebase');
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
   Réponds au message actuel. Ne relie pas tout à un portrait. Ne confronte jamais aux contradictions. Tu accompagnes, tu ne diagnostiques pas.

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
    MAIS ne récite pas le totem ni les jauges à chaque message. Mobilise-les seulement quand c'est utile et naturel.`;
}

// ── Build user message ───────────────────────────────────────────────────────

function buildUserMessage(context, message) {
  const prenomLabel = context.prenom || 'cette personne';
  return `${prenomLabel} : ${message}`;
}

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
    return { statusCode: 402, headers, body: JSON.stringify({ error: 'Solde Koris insuffisant', koris_debited: false }) };
  }
  const { holdId } = reservation;

  // System prompt with cache_control (stable across messages in a conversation)
  const systemPrompt = buildSystemPrompt(context);

  // Conversation history: keep last 8 messages (4 exchanges) to limit input
  const trimmedHistory = historique.slice(-8);

  // Messages array: history + current user message (no duplication)
  const messages = [
    ...trimmedHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: buildUserMessage(context, message) },
  ];

  const MODELS = [
    'claude-haiku-4-5-20251001',
    'claude-3-5-haiku-20241022',
    'claude-3-haiku-20240307',
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
          max_tokens: 500,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.content?.[0]?.text ?? '';
        await commitKoris(holdId);
        const cached = data?.usage?.cache_read_input_tokens || 0;
        const total = data?.usage?.input_tokens || 0;
        console.log(`dr-lo-chat OK model=${model} input=${total} cached=${cached} output=${data?.usage?.output_tokens || 0}`);
        return { statusCode: 200, headers, body: JSON.stringify({ response: text, koris_debited: true }) };
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
