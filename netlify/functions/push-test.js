/**
 * push-test — « M'envoyer un essai » depuis « Mes rappels » : vérifie toute la chaîne
 * (autorisation, appareil enregistré, envoi Firebase) sur le téléphone de la personne.
 */
const { verifyAuth } = require('./_firebase');
const { sendToUser } = require('./_push');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{}' };
  const user = await verifyAuth(event);
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié' }) };
  const out = await sendToUser(user.uid, { kind: 'test', title: 'Dr Lô', body: 'C\'est bon, tes rappels marchent. À bientôt !', link: '/' }, { noInbox: true });
  return { statusCode: 200, headers, body: JSON.stringify({ sent: out.sent }) };
};
