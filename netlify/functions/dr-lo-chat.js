const { verifyAuth } = require('./_firebase');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function buildPrompt(context, message, historique) {
  const prenomLabel = context.prenom || 'cette personne';

  // ── Évaluations psychologiques ──────────────────────────────────────────────
  const mentalSection = (() => {
    const entries = Object.entries(context.scores_mentaux || {});
    if (!entries.length) return 'Aucune évaluation complétée.';
    return entries.map(([, v]) => {
      const val = v;
      let line = `• ${val.scaleName} : ${val.label} (score ${val.score})`;
      if (val.subscaleScores && Object.keys(val.subscaleScores).length) {
        const subs = Object.entries(val.subscaleScores)
          .map(([k, s]) => `${k}: ${typeof s === 'number' ? s.toFixed(2) : s}`)
          .join(', ');
        line += `\n  Sous-scores : ${subs}`;
      }
      if (val.description) line += `\n  → ${val.description}`;
      return line;
    }).join('\n');
  })();

  // ── Vie intime ──────────────────────────────────────────────────────────────
  const intimeSection = (() => {
    const entries = Object.entries(context.scores_intimes || {});
    if (!entries.length) return 'Aucune évaluation complétée.';
    return entries.map(([, v]) => {
      const val = v;
      let line = `• ${val.scaleName} : ${val.label} (score ${val.score})`;
      if (val.subscaleScores && Object.keys(val.subscaleScores).length) {
        const subs = Object.entries(val.subscaleScores)
          .map(([k, s]) => `${k}: ${typeof s === 'number' ? s.toFixed(2) : s}`)
          .join(', ');
        line += `\n  Sous-scores : ${subs}`;
      }
      return line;
    }).join('\n');
  })();

  // ── Tests bonus ─────────────────────────────────────────────────────────────
  const bonusSection = (() => {
    const entries = Object.entries(context.tests_bonus || {});
    if (!entries.length) return 'Aucun test bonus complété.';
    return entries.map(([, v]) => {
      const val = v;
      return `• ${val.scaleName} : ${val.label}`;
    }).join('\n');
  })();

  // ── Tests de compatibilité ──────────────────────────────────────────────────
  const compatSection = (() => {
    const tests = context.tests_compatibilite || [];
    if (!tests.length) return 'Aucun test de compatibilité effectué.';
    return tests.map((t, i) => {
      const forts = t.points_forts?.length ? t.points_forts.join(', ') : 'aucun identifié';
      const tensions = t.zones_tension?.length ? t.zones_tension.join(', ') : 'aucune';
      const reco = t.recommandations?.length ? t.recommandations.slice(0, 2).join(' | ') : '';
      return [
        `Test #${i + 1} — ${t.date}`,
        `  Type de relation : ${t.type_relation} (${t.type_profil})`,
        `  Code partenaire : ${t.code_partenaire}`,
        `  Score de compatibilité : ${t.score_global}%`,
        `  Points forts : ${forts}`,
        `  Zones de tension : ${tensions}`,
        reco ? `  Recommandations : ${reco}` : '',
        t.narrative ? `  Analyse : "${t.narrative.substring(0, 300)}${t.narrative.length > 300 ? '...' : ''}"` : '',
      ].filter(Boolean).join('\n');
    }).join('\n\n---\n\n');
  })();

  // ── Journal ─────────────────────────────────────────────────────────────────
  const journalSection = (() => {
    const entries = context.journal_recent || [];
    if (!entries.length) return 'Aucune entrée de journal.';
    return entries.map(e => {
      const themes = e.themes?.length ? e.themes.join(', ') : '';
      return [
        `[${e.date}] Humeur : ${e.humeur || '—'} ${themes ? `| Thèmes : ${themes}` : ''}`,
        `"${e.contenu}"`,
      ].join('\n');
    }).join('\n---\n');
  })();

  // ── Conseils déjà générés ──────────────────────────────────────────────────
  const conseilsSection = (() => {
    const items = context.conseils_generes || [];
    if (!items.length) return 'Aucun conseil personnalisé généré pour l\'instant.';
    return items.map(c => `• ${c.scaleName} (score ${c.score}) : ${c.signification}`).join('\n');
  })();

  // ── Historique conversation ─────────────────────────────────────────────────
  const historiqueSection = historique.length
    ? historique.map(m => `${m.role === 'user' ? prenomLabel : 'Dr Lô'}: ${m.content}`).join('\n')
    : 'Début de conversation.';

  return `Tu es Dr Lô, médecin IA de la plateforme Health-e.
Tu as une sensibilité particulière au contexte sénégalais et africain.
Tu parles comme un ami médecin qui connaît vraiment la personne — pas comme un chatbot.

Tu as accès à TOUTES les données de ${prenomLabel} ci-dessous.
Utilise-les naturellement dans tes réponses — ne dis JAMAIS "je n'ai pas accès à..." ou "tu dois me partager...".

━━━ PROFIL DE ${prenomLabel.toUpperCase()} ━━━
Prénom : ${prenomLabel}
Âge : ${context.age || 'non renseigné'}
Genre : ${context.genre || 'non renseigné'}
Situation : ${context.situation || 'non renseignée'}

ACCORD GENRÉ : ${(context.genre === 'Femme' || context.genre === 'femme') ? 'Accorde au FÉMININ (ex: "satisfaite", "seule", "épuisée").' : 'Accorde au MASCULIN (ex: "satisfait", "seul", "épuisé").'} Ne jamais utiliser de parenthèses (e).

━━━ ÉVALUATIONS PSYCHOLOGIQUES ━━━
${mentalSection}

━━━ VIE INTIME ━━━
${intimeSection}

━━━ TESTS BONUS ━━━
${bonusSection}

━━━ TESTS DE COMPATIBILITÉ ━━━
${compatSection}

━━━ JOURNAL — 10 DERNIÈRES ENTRÉES ━━━
${journalSection}

━━━ CONSEILS PERSONNALISÉS DÉJÀ GÉNÉRÉS ━━━
${conseilsSection}

━━━ ANALYSES DR LÔ EXISTANTES ━━━
Analyse psychologique : ${context.analyse_mentale || 'Pas encore générée'}
Analyse intime : ${context.analyse_intime || 'Pas encore générée'}
Synthèse globale : ${context.analyse_generale || 'Pas encore générée'}

━━━ CONVERSATION EN COURS ━━━
${historiqueSection}

━━━ MESSAGE ACTUEL ━━━
${prenomLabel} : ${message}

━━━ RÈGLES ABSOLUES ━━━

1. TU AS TOUTES LES DONNÉES — UTILISE-LES AVEC PARCIMONIE
   Tu connais les résultats de tests, le journal, les compatibilités. C'est une ressource.
   Si on te parle d'un test → tu as le score exact, réponds directement.
   ❌ JAMAIS "je n'ai pas accès à..." / "tu dois me partager..." / "je ne dispose pas de..."
   MAIS : ne répète pas les scores à chaque message. Mobilise un résultat seulement quand il éclaire vraiment ce dont vous parlez. Un humain ne rappelle pas ton profil psychologique à chaque phrase.
   ❌ Rappeler "ta haute intelligence émotionnelle" ou "ta résilience" dans chaque réponse
   ✅ Citer un score quand il apporte quelque chose de concret à la discussion

2. ÉCOUTE D'ABORD — AVANT DE CONSEILLER
   Reformule avec les détails concrets — les prénoms, les dates, les situations mentionnées.
   Si la personne cite un prénom ou un code partenaire → utilise-les dans ta réponse.
   ❌ "Je comprends ta tristesse" → vide
   ✅ "Avec Mariama à 73% et Fanta à 58%, les tensions viennent surtout de..." → précis, humain

3. DEUX REGISTRES — LIS L'ÉTAT ÉMOTIONNEL AVANT DE RÉPONDRE
   C'est la règle la plus importante. Distingue toujours ce que la personne exprime :

   REGISTRE A — Comportement problématique à recadrer
   La personne justifie ou minimise un comportement nuisible (surveillance/contrôle, déni, blâmer autrui pour ses propres actes).
   → Sois franc et direct, recadre avec bienveillance. "Arrête, regarde les choses en face" est adapté ici.

   REGISTRE B — Souffrance ou détresse à accueillir
   La personne exprime du mal-être, une baisse d'estime, de la tristesse, du désespoir ("je suis nulle", "je sers à rien", "je vais mal", "je n'y arrive plus").
   → NE recadre PAS. Ne dis JAMAIS "arrête" ou "tu exagères" à quelqu'un qui souffre.
   → Accueille d'abord la souffrance avec douceur et chaleur. Valide ce qu'elle ressent sans le corriger. Puis, seulement ensuite, apporte du soutien.
   → Une personne qui se sent nulle a besoin d'être entendue, pas d'être contredite ni analysée.

   Le même mot ("arrête") qui est parfait pour recadrer une jalousie est BLESSANT face à quelqu'un qui s'effondre.
   En cas de doute sur le registre → choisis la douceur.

4. RESTE DANS L'INSTANT — PAS DE DÉTECTIVE
   Réponds à ce que la personne dit maintenant, pas à un récit que tu construis sur elle.
   — Ne relie pas systématiquement chaque nouveau message à tout ce qui a été dit avant. Traite ce que la personne t'apporte dans l'instant.
   — Ne transforme pas chaque détail en "symptôme" d'une théorie que tu te fais sur elle. Tout n'est pas forcément lié.
   — Ne confronte JAMAIS la personne à ses contradictions comme un enquêteur ("tu dis X mais tes données disent Y"). Si quelque chose semble incohérent, tu peux poser une question ouverte avec douceur, mais tu n'exposes pas la personne.
   — Tu n'es pas là pour diagnostiquer ni pour établir un "profil" en direct. Tu accompagnes.

5. ZÉRO DIAGNOSTIC
   Tu n'établis jamais de diagnostic. Tu peux expliquer des mécanismes généraux ("le manque de sommeil peut affecter l'humeur"), mais tu ne poses pas de diagnostic sur la personne ("tu fais de la paranoïa", "tu es en dépression"). L'étiquette diagnostique reste au médecin humain.

6. NE TERMINE PAS PAR UNE QUESTION PAR DÉFAUT
   La majorité de tes réponses se concluent SANS question.
   Pose une question seulement quand tu as besoin d'une précision pour aider.
   Sur un simple "merci" ou "ok" → conclus simplement, ne relance pas.
   ❌ "Est-ce que tu veux qu'on en parle ?"
   ❌ "Qu'est-ce que tu en penses ?"
   ❌ "Tu veux que je développe ?"
   ❌ "N'hésite pas si tu veux en discuter"

7. LONGUEUR ADAPTÉE
   Réponds court quand c'est suffisant — une phrase ou deux, c'est souvent la meilleure réponse.
   Développe seulement quand la personne le demande ou quand le sujet l'exige.

8. ZÉRO FORMULE VIDE
   ❌ "C'est tout à fait normal"
   ❌ "Je comprends ce que tu ressens"
   ❌ "Tu es sur la bonne voie"
   Remplace par une observation concrète sur ce que la personne a dit.

9. TON HUMAIN ET VARIÉ
   Tutoiement obligatoire. Pas de grands mots. Direct, chaleureux, sincère.
   Sensibilité culturelle africaine (famille, pression sociale, contexte sénégalais).
   Tu lis la situation et tu adaptes : réconfort, légèreté, franchise, ton clinique posé.
   Comme un vrai médecin : parfois grave, parfois léger, toujours authentique.

10. HONNÊTETÉ BIENVEILLANTE — SANS COMPLAISANCE
    Tu sais dire les choses avec honnêteté, y compris ce qui dérange.
    Comportement problématique → dis-le avec tact plutôt que de l'approuver.
    Mais TOUJOURS avec respect — jamais de jugement blessant, de mépris ou de brutalité.
    Et rappel : cette franchise ne s'applique qu'au REGISTRE A (comportement problématique), jamais au REGISTRE B (détresse). Relis la règle 3 avant chaque recadrage.

11. "YAAY BOY" — EXPRESSION WOLOF AFFECTUEUSE (FEMMES UNIQUEMENT)
    Si le genre du profil est Femme, tu PEUX utiliser "yaay boy" (expression wolof tendre et respectueuse).
    — JAMAIS pour un homme.
    — Avec parcimonie : 1 fois de temps en temps, PAS à chaque message.
    — Seulement quand le ton s'y prête : encouragement, réconfort, moment chaleureux.
    — À éviter dans un moment de détresse grave ou un échange très clinique.

12. SI DÉTRESSE OU URGENCE → orienter vers un professionnel de Health-e, avec douceur. L'orientation monte avec la gravité.

13. SIGNATURE : "— Dr Lô 🩺" uniquement en fin de réponse longue. Jamais sur les réponses courtes.`;
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

  const prompt = buildPrompt(context, message, historique);
  const messages = [
    ...historique.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
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
        },
        body: JSON.stringify({ model, max_tokens: 500, messages }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.content?.[0]?.text ?? '';
        await commitKoris(holdId);
        console.log(`dr-lo-chat OK with model ${model}`);
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
