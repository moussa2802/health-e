/**
 * animal-census — GET public : combien de personnes ont découvert chaque animal intérieur (totaux, jamais de personne).
 * Le résultat est gardé dans publicStats/animals et recalculé au plus toutes les 30 minutes (une lecture de tous les profils).
 */
const { admin, db } = require('./_firebase');
const A = require('./_animalCensus');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
const reply = (statusCode, body, extra = {}) => ({ statusCode, headers: { ...headers, ...extra }, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : Number(v) || 0);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Méthode non autorisée' });
  try {
    const ref = db.collection('publicStats').doc('animals');
    const snap = await ref.get();
    let data = snap.exists ? snap.data() : null;
    if (A.isStale(data)) {
      const s = await db.collection('userProfiles').select('totem').get();
      data = A.census(s.docs.map((d) => { const t = d.data().totem; return { animal: t && t.animal, revealedAtMs: ms(t && t.revealedAt) }; }));
      await ref.set({ ...data, savedAt: admin.firestore.Timestamp.now() }).catch((e) => console.warn('animal-census save', e.message));
    }
    const { savedAt, ...out } = data;
    return reply(200, out, { 'Cache-Control': 'public, max-age=300' });
  } catch (e) {
    console.error('animal-census', e);
    return reply(500, { error: 'Erreur serveur' });
  }
};
