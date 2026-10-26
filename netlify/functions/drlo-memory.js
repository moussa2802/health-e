/**
 * drlo-memory — ce que Dr Lô retient de la personne, d'une discussion à l'autre.
 * Appelée par l'appli toutes les 5 réponses : on met à jour quelques notes courtes
 * (patients/{uid}.drloMemory), que Dr Lô relit à chaque message. La personne les voit et
 * peut les effacer dans « Mon espace ». Gratuit pour la personne.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const { cleanNotes, buildMemoryPrompt, MAX_NOTES } = require('./_drloMemory');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const reply = (code, body) => ({ statusCode: code, headers, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, {});
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return reply(500, { error: 'Clé API manquante' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const turns = (Array.isArray(body.historique) ? body.historique : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-14)
    .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  if (!turns.some(m => m.role === 'user')) return reply(200, { ok: true, notes: null });

  const ref = db.collection('patients').doc(user.uid);
  const snap = await ref.get().catch(() => null);
  const current = snap && snap.exists && Array.isArray(snap.data().drloMemory) ? snap.data().drloMemory : [];

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system: buildMemoryPrompt(),
        messages: [{ role: 'user', content: JSON.stringify({ notes_actuelles: current.map(n => (typeof n === 'string' ? n : n.text)), echanges_recents: turns }) }],
      }),
    });
    if (!res.ok) return reply(502, { error: 'ia' });
    const data = await res.json();
    const raw = data?.content?.[0]?.text ?? '';
    const notes = cleanNotes(raw, current);
    if (!notes) return reply(200, { ok: true, notes: null });
    await ref.set({ drloMemory: notes, drloMemoryAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return reply(200, { ok: true, count: notes.length, max: MAX_NOTES });
  } catch (e) {
    console.error('drlo-memory', e && e.message);
    return reply(500, { error: 'serveur' });
  }
};
