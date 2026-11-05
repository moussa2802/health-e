/**
 * _drloMemory.js — le carnet du compagnon (logique pure, testée dans _tests/drloMemory.test.js).
 * Plus la personne lui parle, plus il la connaît : jusqu'à MAX_NOTES notes courtes, rangées par thème.
 * Une note : { text, cat, at }. Les anciennes notes (simples chaînes, sans thème) restent lisibles.
 */
const MAX_NOTES = 30;
const CATS = ['vie', 'proches', 'pese', 'aide', 'envies', 'parler', 'suivre', 'intime'];

function buildMemoryPrompt() {
  return `Tu tiens le carnet du compagnon de Health-e (le compagnon de bien-être de Health-e). À partir des notes actuelles et des derniers échanges, renvoie le carnet À JOUR : ce que le compagnon doit savoir de cette personne pour la connaître de mieux en mieux, comme un ami attentif qui se souvient.

Thèmes (champ "c") :
- vie : sa situation durable (travail, études, ville, couple, famille, rythme de vie)
- proches : les personnes qui comptent, avec leur rôle et leur prénom s'il est donné (« sa sœur Awa », « son collègue Modou »)
- pese : ce qui lui pèse en ce moment
- aide : ce qui l'aide, ce qui la fait du bien, ce qui a marché
- envies : ses projets, objectifs, rêves, ce qu'elle aime
- parler : comment elle aime qu'on lui parle (ex. « préfère qu'on aille droit au but », « aime l'humour »)
- suivre : un événement à venir ou en cours dont il faudra prendre des nouvelles, avec la date si elle est dite (« entretien d'embauche jeudi 12 novembre », « attend les résultats de son concours »). Retire-le quand la personne a donné des nouvelles et note plutôt l'issue dans un autre thème.
- intime : sa santé et sa vie intimes, en mots sobres, seulement ce qu'elle a dit et ce qui aide à mieux l'accompagner (« parle de difficultés d'érection depuis quelques semaines, qu'il relie au stress », « désir en baisse depuis la naissance de son enfant », « vit mal la pression autour du mariage »). JAMAIS ailleurs que dans ce thème.

Ne garde PAS : diagnostics ou étiquettes médicales, médicaments, scores de tests, la sexualité HORS du thème « intime », les détails sexuels crus ou les pratiques, le nom ou tout détail permettant de reconnaître un partenaire, propos violents détaillés, données d'identité (adresse, numéros), démarches administratives ou juridiques (papiers, immigration, régularisation, avocat, justice), dettes. Une période de grande détresse se note sobrement (« a traversé un moment très difficile en octobre, a été orientée vers une aide »), sans détail.

Règles : ${MAX_NOTES} notes au plus, une phrase courte chacune (moins de 160 caractères), à la 3e personne, au présent. Ajoute ce qui est nouveau, mets à jour ce qui a changé, retire ce qui n'est plus vrai, fusionne les doublons. Garde en priorité ce qui aide à la comprendre. Pas d'invention : seulement ce que la personne a dit.
Réponds UNIQUEMENT avec un tableau JSON d'objets {"t": "la note", "c": "thème"}, sans texte autour. Si rien ne change, renvoie les notes actuelles.`;
}

const textOf = (n) => (typeof n === 'string' ? n : (n && (n.text || n.t)) || '');
const keyOf = (t) => String(t).toLowerCase().replace(/\s+/g, ' ').trim();

/** Lit la réponse de l'IA ; null si inutilisable (on garde alors les anciennes notes). */
function cleanNotes(raw, current = [], now = new Date()) {
  const m = String(raw || '').match(/\[[\s\S]*\]/);
  if (!m) return null;
  let arr;
  try { arr = JSON.parse(m[0]); } catch { return null; }
  if (!Array.isArray(arr)) return null;
  const prev = new Map((current || []).map(n => [keyOf(textOf(n)), n && typeof n === 'object' ? n.at : null]));
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const t = String(textOf(x)).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
    if (!t || seen.has(keyOf(t))) continue;
    seen.add(keyOf(t));
    const c = x && typeof x === 'object' && CATS.includes(x.c || x.cat) ? (x.c || x.cat) : 'vie';
    out.push({ text: t, cat: c, at: prev.get(keyOf(t)) || now.toISOString() });
    if (out.length >= MAX_NOTES) break;
  }
  return out;
}

/** Ce qui vient d'être appris (absent du carnet d'avant). */
function newNotes(next, current = []) {
  const before = new Set((current || []).map(n => keyOf(textOf(n))));
  return (next || []).filter(n => !before.has(keyOf(textOf(n))));
}

/** Faut-il mettre le carnet à jour après cette réponse ? (n = nombre de messages du jour) */
const shouldRemember = (n) => n === 2 || (n > 2 && n % 3 === 0);

const CAT_TITLE = { vie: 'Sa vie', proches: 'Ses proches', pese: 'Ce qui lui pèse', aide: 'Ce qui l\'aide', envies: 'Ses envies et projets', parler: 'Comment lui parler', suivre: 'À REPRENDRE (prends des nouvelles)', intime: 'INTIME (discret : tu le sais pour comprendre et faire des liens, par ex. stress ↔ érection ; tu n\'en parles de toi-même que si elle aborde un sujet proche, en mots sobres)' };

/** Le carnet tel que le compagnon le lit, rangé par thème. */
function formatMemory(notes) {
  const groups = new Map();
  for (const n of notes || []) {
    const t = String(textOf(n)).slice(0, 200);
    if (!t) continue;
    const c = n && typeof n === 'object' && CATS.includes(n.cat) ? n.cat : 'vie';
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(`• ${t}`);
  }
  return CATS.filter(c => groups.has(c)).map(c => `${CAT_TITLE[c]} :\n${groups.get(c).join('\n')}`).join('\n');
}

module.exports = { MAX_NOTES, CATS, buildMemoryPrompt, cleanNotes, newNotes, shouldRemember, formatMemory };
