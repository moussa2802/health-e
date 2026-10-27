const { verifyAuth } = require('./_firebase');
const { buildJournalSystem, buildJournalUser, cleanJournalReply } = require('./_drloJournal');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const user = await verifyAuth(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const { entry = {}, context = {} } = body;

  if (!entry.contenu) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Contenu manquant' }) };
  }

  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé API manquante', koris_debited: false }) };

  // ── Reserve Koris ──
  const reservation = await reserveKoris(user.uid, 'journal');
  if (reservation.error === 'insufficient_balance') {
    return { statusCode: 402, headers, body: JSON.stringify({ error: "Pas assez d'étincelles", koris_debited: false }) };
  }
  const { holdId } = reservation;

  const system = buildJournalSystem();
  const prompt = buildJournalUser(entry, context);

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
        },
        body: JSON.stringify({ model, max_tokens: 260, system, messages: [{ role: 'user', content: prompt }] }),
      });

      if (response.ok) {
        const data = await response.json();
        await commitKoris(holdId);
        console.log(`dr-lo-journal OK with model ${model}`);
        return { statusCode: 200, headers, body: JSON.stringify({ response: cleanJournalReply(data?.content?.[0]?.text ?? ''), koris_debited: true }) };
      }

      const err = await response.text();
      const isOverloaded = err.includes('overloaded') || response.status === 529;
      console.warn(`dr-lo-journal model ${model} failed (${response.status}): ${err.substring(0, 200)}`);

      if (!isOverloaded) {
        await releaseKoris(holdId);
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erreur API Claude', error_code: 'ai_unavailable', koris_debited: false }) };
      }

      if (attempt < MODELS.length - 1) await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`dr-lo-journal fetch error (model ${model}):`, e.message);
      if (attempt === MODELS.length - 1) {
        await releaseKoris(holdId);
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, error_code: 'ai_unavailable', koris_debited: false }) };
      }
    }
  }

  await releaseKoris(holdId);
  return { statusCode: 500, headers, body: JSON.stringify({ error: 'Tous les modèles sont indisponibles', error_code: 'ai_unavailable', koris_debited: false }) };
};
