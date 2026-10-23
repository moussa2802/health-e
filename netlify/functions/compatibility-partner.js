/**
 * compatibility-partner — renvoie la partie du profil qu'un code de compatibilité permet de voir.
 * Remplace la lecture directe des profils des autres depuis le navigateur (la règle Firestore
 * `userProfiles` n'autorise plus que son propre profil). POST { codes: string[] } (1 ou 2 codes,
 * qui doivent désigner la même personne).
 */
const { db, verifyAuth } = require('./_firebase');
const { codeType, partnerView } = require('./_compatPartner');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const codes = (Array.isArray(body.codes) ? body.codes : [])
    .map((c) => String(c || '').trim().toUpperCase()).filter(Boolean).slice(0, 2);
  if (codes.length === 0) return reply(400, { error: 'Code manquant' });

  const types = [];
  let partnerDoc = null;
  for (const code of codes) {
    const t = codeType(code);
    if (!t) return reply(400, { error: 'Format invalide' });
    const field = t === 'mental' ? 'compatibilityIdMental' : 'compatibilityIdSexual';
    const snap = await db.collection('userProfiles').where(field, '==', code).limit(1).get();
    if (snap.empty) return reply(404, { error: 'Aucun profil trouvé pour ce code' });
    const d = snap.docs[0];
    if (d.id === user.uid) return reply(400, { error: 'C\'est ton propre code 😄', own: true });
    if (partnerDoc && partnerDoc.id !== d.id) return reply(400, { error: 'Les deux codes doivent appartenir à la même personne.' });
    partnerDoc = d;
    types.push(t);
  }

  const data = partnerDoc.data() || {};
  return reply(200, partnerView({ ...data, uid: partnerDoc.id }, types));
};
