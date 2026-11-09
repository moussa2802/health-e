/**
 * mot-du-jour — « Ton mot du jour » (connecté).
 *   POST { action: 'today' } → { day, text, kind } : le mot d'aujourd'hui (écrit une seule fois par jour et par personne)
 *   POST { action: 'keep', text } → { ok } : le garder dans « Mes mots » (30 au plus)
 * Gratuit (pas d'étincelle) : une seule génération par jour et par personne, puis lu depuis patients/{uid}.motDuJour.
 * Rien d'intime n'est utilisé (voir _motDuJour.js). La notification du soir/matin ne montre jamais le mot lui-même.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const M = require('./_motDuJour');
const G = require('./_korisGift');
const ST = require('./_stats');
const { modelFrom, textOf, NO_THINKING } = require('./_aiModel');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

async function generate(apiKey, prompt) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      // Réglable dans Netlify (MOT_DU_JOUR_MODEL) ; retour en arrière : claude-haiku-4-5-20251001
      body: JSON.stringify({ model: modelFrom('MOT_DU_JOUR_MODEL'), max_tokens: 160, thinking: NO_THINKING, system: prompt.system, messages: [{ role: 'user', content: prompt.user }] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return M.cleanMot(textOf(data));
  } catch { return null; } finally { clearTimeout(t); }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Requête invalide' }); }
  const uid = user.uid;
  const day = G.dakarDay();
  const patRef = db.collection('patients').doc(uid);

  try {
    if (body.action === 'keep') {
      const text = String(body.text || '').trim().slice(0, 240);
      if (!text) return reply(400, { error: 'Mot vide' });
      const pat = await patRef.get();
      const kept = (pat.exists && Array.isArray(pat.data().motsGardes) ? pat.data().motsGardes : []).filter((m) => m && m.text !== text);
      await patRef.set({ motsGardes: [{ text, day }, ...kept].slice(0, 30) }, { merge: true });
      await ST.bump(db, admin, { uid, counts: { ev_mot_keep: 1 }, features: ['mot_du_jour'] });
      return reply(200, { ok: true });
    }

    if (body.action !== 'today') return reply(400, { error: 'Action inconnue' });
    const [pat, prof] = await Promise.all([patRef.get(), db.collection('userProfiles').doc(uid).get()]);
    const pd = pat.exists ? pat.data() : {};
    if (pd.motDuJour && pd.motDuJour.day === day && pd.motDuJour.text) {
      return reply(200, { day, text: pd.motDuJour.text, kind: pd.motDuJour.kind || null, kept: (pd.motsGardes || []).some((m) => m && m.text === pd.motDuJour.text) });
    }
    const profile = prof.exists ? prof.data() : {};
    const ob = profile.onboardingProfile || {};
    const genre = /^f/i.test(String(ob.genre || '')) ? 'femme' : /^h/i.test(String(ob.genre || '')) ? 'homme' : '';
    const prompt = M.buildMotPrompt({
      day,
      prenom: String(ob.prenom || '').split(/\s+/)[0].slice(0, 30),
      genre,
      companion: profile.companion && profile.companion.name ? String(profile.companion.name).slice(0, 24) : '',
      animal: profile.totem && profile.totem.revealedAt && profile.totem.animal ? String(profile.totem.animal) : '',
      memory: pd.drloMemory,
      recent: Array.isArray(pd.motHistory) ? pd.motHistory : [],
    });
    const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
    const text = (apiKey && (await generate(apiKey, prompt))) || M.fallbackFor(day, genre);
    const history = [text, ...(Array.isArray(pd.motHistory) ? pd.motHistory : [])].slice(0, 14);
    await patRef.set({ motDuJour: { day, text, kind: prompt.kind, at: admin.firestore.FieldValue.serverTimestamp() }, motHistory: history }, { merge: true });
    await ST.bump(db, admin, { uid, counts: { ev_mot: 1 }, features: ['mot_du_jour'] });
    return reply(200, { day, text, kind: prompt.kind, kept: false });
  } catch (err) {
    console.error('mot-du-jour error:', err);
    return reply(500, { error: 'Erreur serveur' });
  }
};
