/**
 * drlo-route — Dr Lô comprend un message libre du premier écran et choisit la destination.
 * Gratuit (sans étincelle) : c'est l'accueil. Protégé par une limite par adresse IP et par jour,
 * et un plafond global journalier. En cas d'échec, le navigateur garde sa logique par mots-clés.
 */
const crypto = require('crypto');
const { db, admin } = require('./_firebase');
const { sanitizeContext, buildSystemPrompt, buildUserPrompt, parseDecision } = require('./_drloRoute');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const PER_IP_PER_DAY = 80;
const GLOBAL_PER_DAY = 8000;
const SYSTEM = buildSystemPrompt();

function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/** true si la requête est autorisée (compteurs Firestore ; si Firestore est indisponible, on laisse passer). */
async function allow(ip) {
  if (!db) return true;
  const day = today();
  const hash = crypto.createHash('sha256').update(`${ip}|${day}|he`).digest('hex').slice(0, 24);
  const ipRef = db.collection('rateLimits').doc(`route_${day}_${hash}`);
  const allRef = db.collection('rateLimits').doc(`route_${day}_all`);
  try {
    return await db.runTransaction(async tx => {
      const [a, g] = await Promise.all([tx.get(ipRef), tx.get(allRef)]);
      const n = (a.exists ? a.data().n : 0) || 0;
      const total = (g.exists ? g.data().n : 0) || 0;
      if (n >= PER_IP_PER_DAY || total >= GLOBAL_PER_DAY) return false;
      const exp = admin.firestore.Timestamp.fromMillis(Date.now() + 3 * 864e5);
      tx.set(ipRef, { n: n + 1, expiresAt: exp }, { merge: true });
      tx.set(allRef, { n: total + 1, expiresAt: exp }, { merge: true });
      return true;
    });
  } catch (e) {
    console.warn('drlo-route rate limit unavailable:', e.message);
    return true;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) }; }
  const ctx = sanitizeContext(body);
  if (!ctx.text) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message vide' }) };

  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 503, headers, body: JSON.stringify({ error: 'unavailable' }) };

  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  if (!(await allow(String(ip).split(',')[0].trim()))) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'rate_limited' }) };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 260,
        temperature: 0.3,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: buildUserPrompt(ctx) }],
      }),
    });
    if (!response.ok) {
      console.warn(`drlo-route API ${response.status}: ${(await response.text()).slice(0, 200)}`);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'ai_unavailable' }) };
    }
    const data = await response.json();
    const decision = parseDecision(data?.content?.[0]?.text ?? '', ctx);
    if (!decision) return { statusCode: 502, headers, body: JSON.stringify({ error: 'bad_output' }) };
    // Jamais le contenu du message dans les journaux : seulement la destination
    console.log(`drlo-route step=${ctx.step} action=${decision.action} then=${decision.then ?? '-'} scale=${decision.scaleId ?? '-'}`);
    return { statusCode: 200, headers, body: JSON.stringify(decision) };
  } catch (e) {
    console.warn('drlo-route error:', e.name === 'AbortError' ? 'timeout' : e.message);
    return { statusCode: 504, headers, body: JSON.stringify({ error: 'ai_unavailable' }) };
  } finally {
    clearTimeout(timer);
  }
};
