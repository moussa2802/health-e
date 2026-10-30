/**
 * _drloChatContext.js — ce que Dr Lô reçoit de la vie de la personne, selon le message (logique pure,
 * testée dans _tests/drloChatPrompt.test.js).
 * Principe : l'intime n'entre dans le prompt que si le message le justifie. Un modèle qui ne voit pas
 * une information ne peut pas la citer à tort.
 */

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Le message parle-t-il du journal (ou demande-t-il ce que Dr Lô sait d'elle) ? */
function wantsJournal(message) {
  return /journal|ce que j'ai ecrit|j'ai ecrit|mes notes|ce que tu sais|ce que tu retiens|qui je suis|decris[- ]moi|de quoi j'ai besoin|que penses[- ]tu de moi|mes forces|mes failles/.test(norm(message));
}

/** Demande-t-elle un chiffre (score, résultat, pourcentage) ? */
function wantsNumbers(message) {
  return /score|resultat|note|chiffre|pourcentage|combien|sur 10|sur 21|%|niveau/.test(norm(message));
}

/** Notes de mémoire sur des sujets très privés : elles ne passent que si le message en parle. */
const SENSITIVE_NOTE = /immigr|papiers|titre de sejour|regularis|visa\b|asile|clandestin|avocat|tribunal|justice|police|garde a vue|prison|dette|huissier|divorce|separation|sida|\bvih\b|\bist\b|avort|enceinte|grossesse|viol|abus|inceste|agress|violence|suicid|tentative|medicament|traitement|antidepress|diagnostic|sexuel|sexe|erection|ejacul|orgasme|masturb|porno|infidel|tromp|maitresse|amant/;
const TOPIC_WORDS = [
  [/immigr|papiers|titre de sejour|regularis|visa\b|asile|clandestin/, /immigr|papier|sejour|regularis|visa|asile|clandestin|etranger|canada|france|pays/],
  [/avocat|tribunal|justice|police|garde a vue|prison|huissier/, /avocat|tribunal|justice|police|prison|proces|plainte|huissier/],
  [/dette/, /dette|argent|credit|rembours/],
  [/divorce|separation/, /divorce|separ|quitt|rupture|ex\b/],
  [/sida|\bvih\b|\bist\b|avort|enceinte|grossesse|medicament|traitement|antidepress|diagnostic/, /sante|medic|traitement|pilule|grossesse|enceinte|avort|maladie|diagnos|antidepress|depress|sida|vih|ist\b|docteur|medecin/],
  [/viol|abus|inceste|agress|violence/, /viol|abus|inceste|agress|violence|frappe|bat\b|harcel/],
  [/suicid|tentative/, /suicid|mourir|mort|en finir|ne plus etre la|me faire du mal/],
  [/sexuel|sexe|erection|ejacul|orgasme|masturb|porno|infidel|tromp|maitresse|amant/, /sex|erection|ejacul|orgasme|masturb|porno|infidel|tromp|desir|intim|lit\b|couple|partenaire|copin|femme|mari|jabar|jekker/],
];

/** Garde les notes ordinaires ; une note sensible n'est gardée que si le message touche à son sujet. */
function filterNotes(notes, message) {
  const m = norm(message);
  return (Array.isArray(notes) ? notes : []).filter((n) => {
    const t = norm(typeof n === 'string' ? n : n && n.text);
    if (!t) return false;
    if (!SENSITIVE_NOTE.test(t)) return true;
    return TOPIC_WORDS.some(([noteRe, msgRe]) => noteRe.test(t) && msgRe.test(m));
  });
}

module.exports = { wantsJournal, wantsNumbers, filterNotes, SENSITIVE_NOTE };
