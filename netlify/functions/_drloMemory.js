/** _drloMemory.js — règles des notes de Dr Lô (logique pure, testée dans _tests/drloMemory.test.js). */
const MAX_NOTES = 15;

function buildMemoryPrompt() {
  return `Tu tiens le carnet de Dr Lô, compagnon de bien-être de Health-e. À partir des notes actuelles et des derniers échanges, renvoie la liste À JOUR de ce que Dr Lô doit retenir de cette personne pour mieux l'accompagner la prochaine fois.

Garde : les situations de vie durables (travail, études, couple, séparation, famille, déménagement…), les personnes importantes (avec leur rôle, ex. « sa sœur Awa »), ce qui lui pèse en ce moment, ce qui l'aide, ses projets et objectifs, ses préférences pour parler (ex. « aime qu'on aille droit au but »).
Ne garde PAS : diagnostics ou étiquettes médicales, médicaments, scores de tests, détails sexuels crus, propos violents détaillés, données d'identité (adresse, numéros). Une période de grande détresse se note sobrement (« a traversé un moment très difficile en octobre, a été orienté vers une aide »), sans détail.
Règles : ${MAX_NOTES} notes au plus, une phrase courte chacune (moins de 160 caractères), écrites à la 3e personne, au présent. Mets à jour ou retire ce qui n'est plus vrai, fusionne les doublons, garde les plus utiles. Pas d'invention : seulement ce que la personne a dit.
Réponds UNIQUEMENT avec un tableau JSON de chaînes, sans texte autour. Si rien ne change, renvoie les notes actuelles.`;
}

/** Lit la réponse de l'IA ; null si inutilisable (on garde alors les anciennes notes). */
function cleanNotes(raw, current = [], now = new Date()) {
  const m = String(raw || '').match(/\[[\s\S]*\]/);
  if (!m) return null;
  let arr;
  try { arr = JSON.parse(m[0]); } catch { return null; }
  if (!Array.isArray(arr)) return null;
  const prev = new Map((current || []).map(n => (typeof n === 'string' ? [n, null] : [n && n.text, n && n.at])));
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const t = String(typeof x === 'string' ? x : (x && x.text) || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push({ text: t, at: prev.get(t) || now.toISOString() });
    if (out.length >= MAX_NOTES) break;
  }
  return out;
}

module.exports = { MAX_NOTES, buildMemoryPrompt, cleanNotes };
