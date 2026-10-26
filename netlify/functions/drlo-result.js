/**
 * drlo-result — Dr Lô commente le résultat d'un test qui vient d'être fait (quelques phrases sur la personne).
 * Gratuit pour la personne (c'est le « waouh » du premier test) : invitée ou connectée.
 * Protégé par une limite par adresse IP / compte et par jour, et un plafond global.
 * Jamais d'IA pour une alerte ou un résultat lourd (le navigateur garde ses messages validés).
 * En cas d'échec : 502/429 → le navigateur affiche son texte par défaut.
 */
const crypto = require('crypto');
const { db, admin, verifyAuth } = require('./_firebase');
const { sanitizeInput, mustUseTemplate, buildSystemPrompt, buildUserPrompt, cleanOutput } = require('./_drloResult');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const PER_KEY_PER_DAY = 40;
const GLOBAL_PER_DAY = 6000;
const SYSTEM = buildSystemPrompt();

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

async function allow(key) {
  if (!db) return true;
  const day = today();
  const hash = crypto.createHash('sha256').update(`${key}|${day}|he-result`).digest('hex').slice(0, 24);
  const keyRef = db.collection('rateLimits').doc(`result_${day}_${hash}`);
  const allRef = db.collection('rateLimits').doc(`result_${day}_all`);
  try {
    return await db.runTransaction(async tx => {
      const [a, g] = await Promise.all([tx.get(keyRef), tx.get(allRef)]);
      const n = (a.exists ? a.data().n : 0) || 0;
      const total = (g.exists ? g.data().n : 0) || 0;
      if (n >= PER_KEY_PER_DAY || total >= GLOBAL_PER_DAY) return false;
      const exp = admin.firestore.Timestamp.fromMillis(Date.now() + 3 * 864e5);
      tx.set(keyRef, { n: n + 1, expiresAt: exp }, { merge: true });
      tx.set(allRef, { n: total + 1, expiresAt: exp }, { merge: true });
      return true;
    });
  } catch (e) {
    console.warn('drlo-result rate limit unavailable:', e.message);
    return true;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) }; }
  const input = sanitizeInput(body);
  if (!input.scaleId || !input.resultLabel) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Résultat manquant' }) };
  if (mustUseTemplate(input)) return { statusCode: 200, headers, body: JSON.stringify({ text: null, reason: 'template' }) };

  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 503, headers, body: JSON.stringify({ error: 'unavailable' }) };

  let key;
  try {
    const user = await verifyAuth(event);
    key = user ? `uid:${user.uid}` : null;
  } catch { key = null; }
  if (!key) {
    const ip = event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    key = `ip:${String(ip).split(',')[0].trim()}`;
  }
  if (!(await allow(key))) return { statusCode: 429, headers, body: JSON.stringify({ error: 'rate_limited' }) };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
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
        max_tokens: 220,
        temperature: 0.6,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: buildUserPrompt(input) }],
      }),
    });
    if (!response.ok) {
      console.warn(`drlo-result API ${response.status}`);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'ai_unavailable' }) };
    }
    const data = await response.json();
    const text = cleanOutput(data?.content?.[0]?.text ?? '');
    if (!text) return { statusCode: 502, headers, body: JSON.stringify({ error: 'bad_output' }) };
    // Jamais le contenu dans les journaux : seulement le test commenté
    console.log(`drlo-result scale=${input.scaleId} guest=${input.guest}`);
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (e) {
    console.warn('drlo-result error:', e.name === 'AbortError' ? 'timeout' : e.message);
    return { statusCode: 504, headers, body: JSON.stringify({ error: 'ai_unavailable' }) };
  } finally {
    clearTimeout(timer);
  }
};
