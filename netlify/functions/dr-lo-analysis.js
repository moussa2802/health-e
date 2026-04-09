const SYSTEM_PROMPT = `Tu es Dr Lô, un médecin qui accompagne les utilisateurs sur leur profil psychologique et leur vie intime.

Tu t’adresses à des jeunes adultes africains (Sénégal et diaspora).

Ton ton doit toujours être :

* bienveillant
* simple
* rassurant
* professionnel mais accessible

Tu parles comme un médecin proche, jamais comme un robot.

Règles :

* Ne jamais poser de diagnostic médical
* Ne jamais utiliser de jargon complexe
* Ne jamais être alarmant
* Toujours normaliser (ex : "c’est fréquent", "beaucoup de personnes vivent cela")
* Donner 1 à 2 conseils simples
* Finir par une phrase encourageante
* RÈGLE ABSOLUE SUR LES SCORES : Utilise TOUJOURS les scores dans leur format original (score/scoreMax). NE JAMAIS normaliser sur /100 sauf si le test est réellement noté sur 100. Exemples : "ton score de 40/50 au Big Five", "ton score de 12/27 au PHQ-9".

Limiter à 120-150 mots maximum. NE JAMAIS dépasser 160 mots.

La réponse NE DOIT PAS être un paragraphe long.

Tu dois structurer la réponse avec des sections claires utilisant ces titres exacts :

👋 [Salutation personnalisée avec le prénom]

👁️ Ce que je vois
[2-3 phrases sur les résultats observés]

💪 Tes points forts
• [point positif 1]
• [point positif 2]

⚠️ Ce qu’on doit surveiller
• [point d’attention — jamais alarmiste]

💡 Mes conseils
• [conseil concret 1]
• [conseil concret 2]

🏥 Si ça persiste
[Orientation professionnelle courte si score élevé]

[Conclusion chaleureuse]

— Dr Lô 🩺

Signer obligatoirement "— Dr Lô 🩺" à la fin.`

const FALLBACK_MESSAGE = `Salut 👋🏾
J’ai regardé tes résultats.
Tu sembles traverser une période un peu délicate, mais rien d’inhabituel.
On peut améliorer ça progressivement. 🤝🏾`

function averageScore(items) {
  const scores = items
    .map((item) => item.totalScore ?? item.score)
    .filter((v) => typeof v === 'number' && !Number.isNaN(v))
  if (scores.length === 0) return null
  const avg = scores.reduce((sum, v) => sum + v, 0) / scores.length
  return Math.round(avg)
}

function prepareStructuredAnalysis(items, bonusItems, bloc) {
  const type = bloc === 'sexual' ? 'intime' : 'psychologique'
  const score = averageScore(items)
  const concerns = items
    .filter((item) => (item.alertLevel ?? 0) >= 2)
    .map((item) => `${item.scaleName ?? item.nom ?? 'Évaluation'} : ${item.label ?? item.niveau ?? 'N/A'}`)
    .slice(0, 3)
  const strengths = items
    .filter((item) => (item.alertLevel ?? 0) <= 1)
    .map((item) => `${item.scaleName ?? item.nom ?? 'Évaluation'} : ${item.label ?? item.niveau ?? 'N/A'}`)
    .slice(0, 3)

  const label = concerns.length > 0 ? 'Points à surveiller' : 'Profil global plutôt stable'

  const bonusSummary = bonusItems
    .map((item) => `${item.nom ?? item.scaleName ?? 'Bonus'} : ${item.niveau ?? item.label ?? 'N/A'}`)
    .slice(0, 4)

  const bonusHints = []
  if (bonusItems.some((item) => /hypersensibil/i.test(String(item.nom ?? '')))) {
    bonusHints.push('Hypersensibilité détectée : possible sensibilité émotionnelle plus marquée.')
  }
  if (bonusItems.some((item) => /personnalit/i.test(String(item.nom ?? '')))) {
    bonusHints.push('Traits de personnalité détectés : possible influence sur tes relations ou comportements.')
  }

  return {
    score,
    label,
    strengths,
    concerns,
    type,
    bonusSummary,
    bonusHints
  }
}

function formatStructuredText(structured, items) {
  const strengthsLine = structured.strengths.length > 0 ? structured.strengths.join(' | ') : 'À construire'
  const concernsLine = structured.concerns.length > 0 ? structured.concerns.join(' | ') : 'Aucun signal majeur'
  const bonusLine = structured.bonusSummary.length > 0 ? structured.bonusSummary.join(' | ') : 'Aucun'
  const bonusHintsLine = structured.bonusHints.length > 0 ? structured.bonusHints.join(' ') : 'Aucun signal bonus notable.'

  // Format each item with its real score/max
  const detailLines = items.map((item) => {
    const name = item.scaleName ?? item.nom ?? 'Évaluation'
    const score = item.totalScore ?? item.score ?? '?'
    const max = item.scoreMax ?? '?'
    const label = item.label ?? item.niveau ?? 'N/A'
    return `  - ${name} : ${score}/${max} (${label})`
  })

  return [
    'Analyse du profil :',
    '',
    'Détail des scores :',
    ...detailLines,
    '',
    `Niveau global : ${structured.label}`,
    `Points forts : ${strengthsLine}`,
    `Points à surveiller : ${concernsLine}`,
    `Tests bonus : ${bonusLine}`,
    `Notes bonus : ${bonusHintsLine}`,
    '',
    `Type : ${structured.type}`
  ].join('\n')
}

function isTooLong(text) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length > 160
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
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Body manquant' })
    }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'JSON invalide' })
    }
  }

  const {
    prenom = 'toi',
    age = '',
    genre = '',
    situation_relationnelle = '',
    items_completes = [],
    items_restants = [],
    nombre_items_faits = 0,
    nombre_items_total = 24,
    bloc = 'mental',
    bonus_completes = [],
    experience_profile = null
  } = payload

  if (!items_completes || items_completes.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'items_completes vide' })
    }
  }

  const structured = prepareStructuredAnalysis(items_completes, bonus_completes, bloc)
  const structuredText = formatStructuredText(structured, items_completes)

  let typeInstruction = bloc === 'sexual'
    ? 'Parle uniquement de la vie intime.'
    : 'Parle uniquement du profil psychologique.'

  if (bloc === 'sexual' && experience_profile) {
    if (experience_profile === 'no_experience') {
      typeInstruction += " Cette personne n'a pas encore de vie sexuelle active. Ne mentionne jamais l'absence de vie sexuelle comme un problème ou quelque chose à corriger. Adapte ton analyse à son désir, ses attirances et son identité intime."
    } else if (experience_profile === 'partial_experience') {
      typeInstruction += " Cette personne a une expérience intime partielle. Adapte ton analyse à cette réalité sans supposer une vie sexuelle complète avec partenaire."
    } else if (experience_profile === 'prefer_not_answer') {
      typeInstruction += " Cette personne préfère ne pas préciser son expérience intime. Reste général, bienveillant et respectueux. Ne fais pas de suppositions."
    }
  }

  const genderInstruction = genre === 'Femme' || genre === 'femme'
    ? 'Tu parles à une femme. Accorde TOUS tes adjectifs et participes au féminin (ex: "Tu es satisfaite", "tu te sens seule"). Ne jamais utiliser de parenthèses (e) — accorder directement.'
    : 'Tu parles à un homme. Accorde TOUS tes adjectifs et participes au masculin (ex: "Tu es satisfait", "tu te sens seul"). Ne jamais utiliser de parenthèses (e) — accorder directement.'
  const system = `${SYSTEM_PROMPT}\n\n${typeInstruction}\n\n${genderInstruction}`
  const bonusPrompt = bonus_completes.length > 0
    ? `Prends en compte les éléments suivants issus des tests bonus : ${bonus_completes.map((t) => `${t.nom ?? 'Bonus'} : ${t.niveau ?? 'N/A'}`).join(' | ')}`
    : 'Aucun test bonus disponible.'
  const messageContent = [
    `Prénom : ${prenom}.`,
    genre ? `Genre : ${genre}.` : null,
    age ? `Âge : ${age}.` : null,
    situation_relationnelle ? `Situation : ${situation_relationnelle}.` : null,
    '',
    structuredText,
    '',
    bonusPrompt
  ].filter(Boolean).join('\n')

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_KEY

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Clé API manquante' })
    }
  }

  try {
    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 350,
          system,
          messages: [{
            role: 'user',
            content: messageContent
          }]
        })
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Erreur Anthropic:', errText)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Erreur API Anthropic',
          detail: errText
        })
      }
    }

    const data = await response.json()
    const analysis = data?.content?.[0]?.text ?? ''
    const finalText = (!analysis || isTooLong(analysis)) ? FALLBACK_MESSAGE : analysis

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis: finalText })
    }

  } catch (e) {
    console.error('Erreur fetch:', e.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    }
  }
}
