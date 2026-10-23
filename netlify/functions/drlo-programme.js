/**
 * drlo-programme — « Mon programme Dr Lô » : les deux moments où l'IA travaille.
 *  - action "propose" : le mot de Dr Lô et l'ordre de la semaine 1 (3 étincelles) ;
 *  - action "bilan"   : le bilan de la semaine (3 étincelles).
 * Cocher chaque jour ne passe pas par ici (gratuit, enregistré par le navigateur).
 * Les étincelles ne sont débitées que si l'IA a répondu correctement.
 */
const { verifyAuth } = require('./_firebase');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');
const P = require('./_drloProgramme');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const reply = (statusCode, obj) => ({ statusCode, headers, body: JSON.stringify(obj) });

async function askClaude(apiKey, system, user, maxTokens) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!res.ok) {
      console.warn('drlo-programme API', res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data?.content?.[0]?.text ?? null;
  } catch (e) {
    console.warn('drlo-programme fetch', e.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }

  const action = body.action === 'bilan' ? 'bilan' : body.action === 'propose' ? 'propose' : null;
  if (!action) return reply(400, { error: 'Action inconnue' });
  const ctx = action === 'propose' ? P.sanitizePropose(body) : P.sanitizeBilan(body);
  if (!ctx) return reply(400, { error: 'Programme inconnu' });

  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return reply(503, { error: 'unavailable', koris_debited: false });

  const feature = action === 'propose' ? 'programme' : 'programme_bilan';
  const reservation = await reserveKoris(user.uid, feature, 1, { axis: ctx.axis });
  if (reservation.error === 'insufficient_balance') {
    return reply(402, { error: 'no_koris', required: reservation.required, koris_debited: false });
  }
  const { holdId } = reservation;

  const prompt = action === 'propose' ? P.buildProposePrompt(ctx) : P.buildBilanPrompt(ctx);
  const raw = await askClaude(apiKey, prompt.system, prompt.user, action === 'propose' ? 300 : 450);
  const out = raw ? (action === 'propose' ? P.parsePropose(raw, ctx.axis) : P.parseBilan(raw)) : null;
  if (!out) {
    await releaseKoris(holdId).catch(() => {});
    return reply(502, { error: 'ai_unavailable', koris_debited: false });
  }
  await commitKoris(holdId);
  return reply(200, { ...out, koris_debited: true, cost: reservation.cost });
};
