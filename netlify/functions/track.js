/**
 * track — le suivi d'utilisation (voir _stats.js). Appelé par l'appli par petits paquets.
 *   POST { anon, events: [{ e, p? }] }   (connecté ou non : la connexion est facultative)
 * Rien de personnel n'est gardé : le nom des événements, la rubrique de la page, et qui est venu ce jour-là.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const S = require('./_stats');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{}' };
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: '{}' }; }
  const anon = /^[a-z0-9]{8,40}$/.test(String(body.anon || '')) ? String(body.anon) : null;
  const user = event.headers && (event.headers.authorization || event.headers.Authorization) ? await verifyAuth(event).catch(() => null) : null;
  const { counts, features } = S.aggregate(body.events, S.hourOf());
  await S.bump(db, admin, { uid: user ? user.uid : null, anon, counts, features: [...features] });
  return { statusCode: 204, headers, body: '' };
};
