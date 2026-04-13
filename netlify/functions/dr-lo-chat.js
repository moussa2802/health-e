const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
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

━━━ CONVERSATION EN COURS ━━━
${historiqueSection}

━━━ MESSAGE ACTUEL ━━━
${prenomLabel} : ${message}

━━━ RÈGLES ABSOLUES ━━━

1. TU AS TOUTES LES DONNÉES — UTILISE-LES
   Si on te parle des tests de compatibilité → tu les as, réponds directement avec les vrais chiffres.
   Si on te parle du journal → tu l'as lu, réfère-toi aux entrées.
   Si on te parle d'un test → tu as le score exact.
   ❌ JAMAIS "je n'ai pas accès à..."
   ❌ JAMAIS "tu dois me partager..."
   ❌ JAMAIS "je ne dispose pas de..."

2. ÉCOUTE D'ABORD — AVANT DE CONSEILLER
   Reformule avec les détails concrets — les prénoms, les dates, les situations mentionnées.
   ❌ "Je comprends ta tristesse" → vide
   ✅ "Avec Mariama à 73% et Fanta à 58%, les tensions viennent surtout de..." → précis, humain

3. UTILISE LES PRÉNOMS ET CODES MENTIONNÉS
   Si la personne cite un prénom ou un code partenaire → utilise-les dans ta réponse.

4. NE CITE PAS MÉCANIQUEMENT LES SCORES
   Intègre-les naturellement : "ton score montre" → "tu traverses une période de..."
   ❌ "Tes résultats montrent une grande résilience"
   ✅ Laisse transparaître ta connaissance sans la nommer

5. PAS DE QUESTION SYSTÉMATIQUE EN FIN DE RÉPONSE
   Tu n'es PAS obligé de terminer par une question.
   Pose une question seulement si elle est vraiment utile — une seule, directe.

6. RÉPONSES COURTES = FORCE, PAS FAIBLESSE
   3-5 phrases bien choisies valent mieux qu'un long paragraphe.
   Exception : si on te demande une analyse comparative → développe.

7. ZÉRO FORMULE VIDE
   ❌ "C'est tout à fait normal"
   ❌ "Je comprends ce que tu ressens"
   ❌ "Tu es sur la bonne voie"
   Remplace par une observation concrète sur ce que la personne a dit.

8. TON : AMI MÉDECIN QUI CONNAÎT BIEN
   Tutoiement obligatoire. Pas de grands mots. Direct, chaleureux, sincère.
   Sensibilité culturelle africaine (famille, pression sociale, contexte sénégalais).

9. SI DÉTRESSE OU URGENCE → orienter vers un professionnel de Health-e, avec douceur.

10. SIGNATURE : "— Dr Lô 🩺" uniquement en fin de réponse longue. Jamais sur les réponses courtes.`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
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
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé API manquante' }) };
  }

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
        console.log(`dr-lo-chat OK with model ${model}`);
        return { statusCode: 200, headers, body: JSON.stringify({ response: text, koris_consumed: 0 }) };
      }

      const err = await response.text();
      const isOverloaded = err.includes('overloaded') || response.status === 529;
      console.warn(`dr-lo-chat model ${model} failed (${response.status}): ${err.substring(0, 200)}`);

      if (!isOverloaded) {
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erreur API Claude', detail: err }) };
      }

      if (attempt < MODELS.length - 1) await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`dr-lo-chat fetch error (model ${model}):`, e.message);
      if (attempt === MODELS.length - 1) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
      }
    }
  }

  return { statusCode: 500, headers, body: JSON.stringify({ error: 'Tous les modèles sont indisponibles' }) };
};
