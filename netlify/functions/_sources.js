/**
 * _sources — d'où arrive un visiteur (le « ?src= » des liens en bio : health-e.sn/tt → ?src=tiktok).
 * Liste fermée : on ne compte jamais une valeur libre (ni texte, ni identifiant), seulement ces réseaux.
 * Même liste côté appli : src/utils/source.ts.
 */
const SOURCES = ['tiktok', 'instagram', 'facebook', 'whatsapp', 'youtube'];
const ALIAS = { tt: 'tiktok', ig: 'instagram', insta: 'instagram', fb: 'facebook', wa: 'whatsapp', yt: 'youtube' };

/** La source reconnue (« tiktok »…), ou null. */
function sourceValide(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase().slice(0, 20);
  const x = ALIAS[s] || s;
  return SOURCES.includes(x) ? x : null;
}

module.exports = { SOURCES, sourceValide };
