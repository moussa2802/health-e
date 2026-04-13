const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function buildConseilsPrompt({ scaleName, score, scoreMax, niveau, severity, prenom, genre, interpretation }) {
  const prenomLabel = prenom || 'cette personne';
  const genreInfo = genre ? `Genre : ${genre}` : '';
  const genreAccord = (genre === 'Femme' || genre === 'femme')
    ? 'Accorde au FÉMININ (ex: "satisfaite", "épuisée"). Ne jamais utiliser de parenthèses (e).'
    : 'Accorde au MASCULIN (ex: "satisfait", "épuisé"). Ne jamais utiliser de parenthèses (e).';
  const isCritical = ['severe', 'alert'].includes(severity);

  const niveauInstruction = (() => {
    if (['severe', 'alert'].includes(severity)) {
      return "Le score est élevé. Les conseils doivent être directs, concrets et orienter vers du soutien professionnel sans alarmer.";
    }
    if (['moderate'].includes(severity)) {
      return "Le score indique des difficultés modérées. Les conseils doivent être pratiques et encourageants.";
    }
    if (['mild'].includes(severity)) {
      return "Le score indique des difficultés légères. Les conseils doivent être préventifs et renforçants.";
    }
    return "Le score est dans la zone normale. Les conseils doivent être encourageants et préventifs.";
  })();

  return `Tu es Dr Lô, médecin IA de Health-e, spécialisé en santé psychologique et vie intime.
Tu as une sensibilité particulière au contexte sénégalais et africain.

${prenomLabel} vient de compléter l'évaluation "${scaleName}".
Score obtenu : ${score} / ${scoreMax}
Niveau : ${niveau}
${genreInfo}
${genreAccord}
${interpretation ? `Interprétation clinique : ${interpretation}` : ''}

${niveauInstruction}

Génère des conseils personnalisés en français. Écris UNIQUEMENT le JSON entre les délimiteurs ci-dessous — rien avant, rien après.

---DEBUT_CONSEILS---
{
  "signification": "2-3 phrases qui expliquent concrètement ce que ce score signifie dans la vie quotidienne de ${prenomLabel}. Sans jargon, tutoiement, concret et humain.",
  "conseils": [
    {
      "titre": "Titre court du conseil (5-7 mots max)",
      "texte": "Description du conseil en 2-3 phrases. Concret, actionnable. Adapté à la réalité africaine/sénégalaise si pertinent (famille, communauté, ressources disponibles)."
    },
    {
      "titre": "Deuxième conseil — dimension différente du premier",
      "texte": "Description en 2-3 phrases. Les 3 conseils doivent couvrir des dimensions complémentaires (ex : mental, corps, social/relationnel)."
    },
    {
      "titre": "Troisième conseil — dimension différente des deux premiers",
      "texte": "Description en 2-3 phrases."
    }
  ],
  "exercice": {
    "titre": "Nom de l'exercice pratique de cette semaine",
    "description": "Explication en 3-4 phrases avec étapes concrètes. Faisable cette semaine, sans matériel particulier, adapté au contexte local."
  }${isCritical ? `,
  "avis_pro": "Une phrase bienveillante (non alarmiste) suggérant de parler à un professionnel sur Health-e. Exemple : 'Ce que tu traverses mérite un accompagnement professionnel — un spécialiste sur Health-e peut t'aider à avancer avec toi.'"` : ''}
}
---FIN_CONSEILS---

Règles absolues :
- Tutoiement obligatoire
- Zéro jargon médical
- Zéro formule vide ("c'est normal", "je comprends", "tu es sur la bonne voie")
- JSON valide uniquement — aucune explication en dehors des délimiteurs
- Les 3 conseils DOIVENT couvrir 3 dimensions différentes (ex: mental/corps/social)`;
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

  const {
    scaleName,
    score,
    scoreMax,
    niveau,
    severity = 'mild',
    prenom = '',
    genre = '',
    interpretation = '',
  } = body;

  if (!scaleName || score === undefined || score === null || !niveau) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètres manquants (scaleName, score, niveau requis)' }) };
  }

  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé API manquante' }) };
  }

  try {
    const prompt = buildConseilsPrompt({ scaleName, score, scoreMax, niveau, severity, prenom, genre, interpretation });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erreur API Claude', detail: err }) };
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '';

    // Extract JSON between delimiters
    const match = text.match(/---DEBUT_CONSEILS---\s*([\s\S]*?)\s*---FIN_CONSEILS---/);
    if (!match) {
      console.error('Réponse brute sans délimiteurs:', text.substring(0, 500));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Format de réponse invalide — délimiteurs manquants' }) };
    }

    let conseils;
    try {
      conseils = JSON.parse(match[1].trim());
    } catch (parseErr) {
      console.error('JSON invalide extrait:', match[1].substring(0, 500));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'JSON invalide dans la réponse IA' }) };
    }

    // Basic validation
    if (!conseils.signification || !Array.isArray(conseils.conseils) || conseils.conseils.length < 3 || !conseils.exercice) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Structure JSON incomplète' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(conseils),
    };
  } catch (e) {
    console.error('Erreur handler:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
