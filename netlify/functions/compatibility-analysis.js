const SYSTEM_PROMPT = `Tu es Dr Lô, médecin IA de la plateforme Health-e, spécialisé en santé mentale et sexuelle avec une sensibilité au contexte sénégalais et africain.

Tu analyses la compatibilité entre deux personnes à partir de leurs profils psychologiques et/ou intimes réels.

Règles absolues :
- Tutoiement obligatoire
- UTILISE TOUJOURS les vrais prénoms des deux personnes (fournis dans le message). JAMAIS "ton/ta partenaire", "ton/ta conjoint(e)", "l'autre personne". Toujours les prénoms.
- Adapte les pronoms au genre de chaque personne :
  • Si genre = "homme" → il, lui, son, ses
  • Si genre = "femme" → elle, son, ses
  • Si genre non précisé → utilise des formulations neutres ou le prénom
- 200-250 mots MAXIMUM
- Ton bienveillant, direct, jamais clinique ni froid
- Fais des observations CONCRÈTES basées sur les vrais scores — ne liste pas, relie les données entre elles
- Cite des noms de dimensions réels (ex : attachement, résilience, stress, désir...)
- Si tension : formule avec douceur, sans alarme
- JAMAIS de diagnostic explicite
- Signe TOUJOURS "— Dr Lô 🩺" à la fin

IMPORTANT — ANALYSE FUSIONNÉE :
Quand tu reçois les deux profils (psychologique ET intime), tu dois générer UNE SEULE analyse de compatibilité qui croise les dimensions psychologiques ET intimes. Ne sépare JAMAIS les deux — fusionne-les dans une analyse relationnelle cohérente. Montre comment le mental influence l'intime et vice-versa (ex: "l'attachement sécure de X se reflète dans une complicité intime naturelle...").

Structure obligatoire avec ces titres exacts :

💑 [Accroche personnalisée avec les deux prénoms et le type de lien]

👁️ Ce que je vois
[2-3 phrases sur les convergences et divergences réelles entre les deux profils — cite les prénoms, croise mental et intime si disponibles]

💪 Vos points forts communs
• [force partagée ou complémentarité concrète 1]
• [force partagée ou complémentarité concrète 2]

⚠️ Points de vigilance
• [tension potentielle — jamais alarmiste, toujours constructif]

💡 Mes conseils pour vous deux
• [conseil concret adapté au type de relation 1 — utilise les prénoms]
• [conseil concret adapté au type de relation 2]

[Conclusion chaleureuse et encourageante avec les prénoms]

— Dr Lô 🩺`

function formatProfile(prenom, scaleResults, bonusResults, label) {
  if (!scaleResults || Object.keys(scaleResults).length === 0) {
    return `${prenom} (${label}) : aucun résultat disponible`
  }
  const lines = Object.entries(scaleResults).map(([id, r]) => {
    const lbl = r.interpretation?.label ?? r.interpretation?.severity ?? 'N/A'
    const score = r.totalScore != null ? `${r.totalScore}` : ''
    const alert = (r.alertLevel ?? 0) >= 2 ? ' ⚠️' : ''
    return `  - ${id} : ${lbl}${score ? ` (${score})` : ''}${alert}`
  })
  const bonusLines = bonusResults && bonusResults.length > 0
    ? bonusResults.map(b => `  - ${b.nom ?? b.id} : ${b.niveau ?? 'N/A'}`)
    : []
  return [
    `${prenom} (${label}) :`,
    ...lines,
    ...(bonusLines.length > 0 ? ['  Bonus :', ...bonusLines] : [])
  ].join('\n')
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (!event.body) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body manquant' }) }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) }
  }

  const {
    prenom1 = 'Utilisateur 1',
    prenom2 = 'Utilisateur 2',
    genre1 = '',
    genre2 = '',
    codeType = 'mental',
    relationshipType = '',
    // Merged fields
    mentalScaleResults1 = {},
    mentalScaleResults2 = {},
    intimateScaleResults1 = {},
    intimateScaleResults2 = {},
    // Legacy single-type fields
    scaleResults1 = {},
    scaleResults2 = {},
    bonusResults1 = [],
    bonusResults2 = [],
    dimensionScores = {},
    mentalDimensionScores = null,
    intimateDimensionScores = null,
    globalScore = null,
    mentalScore = null,
    intimateScore = null,
    isPartialResult = false
  } = payload

  const hasMentalData = Object.keys(mentalScaleResults1).length > 0 || Object.keys(mentalScaleResults2).length > 0
  const hasIntimateData = Object.keys(intimateScaleResults1).length > 0 || Object.keys(intimateScaleResults2).length > 0
  const isMerged = codeType === 'merged' || (hasMentalData && hasIntimateData)

  if (!hasMentalData && !hasIntimateData && Object.keys(scaleResults1).length === 0 && Object.keys(scaleResults2).length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Aucun résultat de profil fourni' }) }
  }

  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé API manquante' }) }
  }

  const genreLabel = (g) => g === 'homme' ? 'Homme' : g === 'femme' ? 'Femme' : 'Non précisé'

  // Build dimension scores text
  let dimensionText = ''
  if (isMerged) {
    if (mentalDimensionScores && Object.keys(mentalDimensionScores).length > 0) {
      dimensionText += 'Dimensions psychologiques :\n'
      dimensionText += Object.entries(mentalDimensionScores).map(([dim, score]) => `  - ${dim} : ${score}/100`).join('\n')
      dimensionText += '\n\n'
    }
    if (intimateDimensionScores && Object.keys(intimateDimensionScores).length > 0) {
      dimensionText += 'Dimensions intimes :\n'
      dimensionText += Object.entries(intimateDimensionScores).map(([dim, score]) => `  - ${dim} : ${score}/100`).join('\n')
    }
  } else {
    dimensionText = Object.entries(dimensionScores)
      .map(([dim, score]) => `  - ${dim} : ${score}/100`)
      .join('\n') || '  (aucune dimension calculée)'
  }

  // Build profile sections
  let profileText = ''
  if (isMerged) {
    profileText = [
      '═══ PROFIL PSYCHOLOGIQUE ═══',
      formatProfile(prenom1, mentalScaleResults1, bonusResults1, 'mental'),
      '',
      formatProfile(prenom2, mentalScaleResults2, [], 'mental'),
      '',
      '═══ PROFIL INTIME ═══',
      formatProfile(prenom1, intimateScaleResults1, [], 'intime'),
      '',
      formatProfile(prenom2, intimateScaleResults2, [], 'intime'),
    ].join('\n')
  } else {
    const typeLabel = codeType === 'sexual' ? 'vie intime' : 'profil psychologique'
    profileText = [
      `Type de profil analysé : ${typeLabel}`,
      '',
      formatProfile(prenom1, scaleResults1, bonusResults1, codeType === 'sexual' ? 'intime' : 'mental'),
      '',
      formatProfile(prenom2, scaleResults2, bonusResults2, codeType === 'sexual' ? 'intime' : 'mental'),
    ].join('\n')
  }

  // Build score summary
  let scoreSummary = ''
  if (isMerged) {
    scoreSummary = `Score global de compatibilité : ${globalScore}/100`
    if (mentalScore != null) scoreSummary += `\nScore psychologique : ${mentalScore}/100`
    if (intimateScore != null) scoreSummary += `\nScore intime : ${intimateScore}/100`
  } else {
    scoreSummary = globalScore != null ? `Score de compatibilité global : ${globalScore}/100` : ''
  }

  const partialNote = isPartialResult
    ? `\n\nNOTE : Cette analyse est PARTIELLE car seul le profil ${hasMentalData ? 'psychologique' : 'intime'} est disponible. Mentionne-le brièvement dans ta conclusion en suggérant de compléter ${hasMentalData ? 'le profil intime' : 'le profil psychologique'} pour une analyse complète.`
    : ''

  const messageContent = [
    `Type de relation : ${relationshipType || 'non précisé'}`,
    isMerged ? 'ANALYSE FUSIONNÉE : Tu as les profils psychologiques ET intimes des deux personnes. Croise les deux dimensions dans une analyse relationnelle unique.' : '',
    scoreSummary,
    '',
    `IMPORTANT : Utilise UNIQUEMENT les prénoms "${prenom1}" et "${prenom2}" dans ton analyse. JAMAIS "ton/ta partenaire" ou "l'autre".`,
    `Genre de ${prenom1} : ${genreLabel(genre1)}`,
    `Genre de ${prenom2} : ${genreLabel(genre2)}`,
    '',
    'Scores par dimension :',
    dimensionText,
    '',
    profileText,
    partialNote,
  ].filter(v => v !== null && v !== '').join('\n')

  const MODELS = [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
  ]

  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt]
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 900,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: messageContent }]
        })
      })

      if (response.ok) {
        const data = await response.json()
        const narrative = data?.content?.[0]?.text ?? ''
        console.log(`compatibility-analysis OK with model ${model}`)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ narrative: narrative || '' })
        }
      }

      const errText = await response.text()
      const isOverloaded = errText.includes('overloaded') || response.status === 529
      console.warn(`compatibility-analysis model ${model} failed (${response.status}): ${errText.substring(0, 200)}`)

      if (!isOverloaded) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erreur API Anthropic', detail: errText })
        }
      }

      if (attempt < MODELS.length - 1) {
        await new Promise(r => setTimeout(r, 1000))
      }
    } catch (e) {
      console.error(`compatibility-analysis fetch error (model ${model}):`, e.message)
      if (attempt === MODELS.length - 1) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: e.message })
        }
      }
    }
  }

  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ error: 'Tous les modèles sont indisponibles. Réessaie dans quelques minutes.' })
  }
}
