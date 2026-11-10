/**
 * _launch — le lancement par vagues côté serveur (même liste que src/utils/launch.ts) : ce qui est ouvert pour UNE personne.
 * Sert au compagnon : il ne propose jamais une fonctionnalité qui n'est pas encore là pour elle.
 */
const { cleanLaunch } = require('./_homeFeed');

const FEATURES = {
  confier: { wave: 2, unlock: 'tests1' },
  programme: { wave: 2, unlock: 'tests3' },
  routine: { wave: 2, unlock: 'tests3' },
  synthese: { wave: 2, unlock: 'animal' },
  defis: { wave: 2, unlock: 'animal' },
  compat: { wave: 3 },
  chaines: { wave: 3 },
  penc_page: { wave: 4 },
  question: { wave: 4 },
};

function featureOn(key, cfg, p) {
  const f = FEATURES[key];
  if (!f || cfg.closed.includes(key)) return false;
  if (cfg.open.includes(key)) return true;
  if (f.wave > cfg.wave) return false;
  if (!f.unlock) return true;
  if (!p) return false;
  return f.unlock === 'tests1' ? p.tests >= 1 : f.unlock === 'tests3' ? p.tests >= 3 : !!p.animal;
}

/** { confier: true, programme: false, … } pour cette personne. */
function openFeatures(rawCfg, profile) {
  const cfg = cleanLaunch(rawCfg);
  const pr = profile || {};
  const p = { tests: Object.keys(pr.scaleResults || {}).length, animal: !!(pr.totem && pr.totem.animal && pr.totem.revealedAt) };
  return Object.fromEntries(Object.keys(FEATURES).map((k) => [k, featureOn(k, cfg, p)]));
}

/** Balise du compagnon → fonctionnalité qui doit être ouverte (les autres balises sont toujours permises). */
const TAG_FEATURE = { programme: 'programme', journal: 'confier', defi: 'defis', compat: 'compat', vrai_drlo: 'question', chaines: 'chaines', chaine: 'chaines', pratique: 'routine' };
const allowedAction = (a, open) => !TAG_FEATURE[a.kind] || !!open[TAG_FEATURE[a.kind]];

const LABEL = {
  confier: '« Me confier » (le journal)', programme: 'le programme de 28 jours', routine: 'les outils / pratiques et la boîte à outils', synthese: 'la synthèse globale',
  defis: 'les défis entre proches', compat: 'la compatibilité de couple', chaines: 'les chaînes', penc_page: 'l\'agenda complet des Pénc', question: 'la question privée à un professionnel',
};

/** Le bloc du prompt : ce qui existe pour elle, et ce dont il ne faut JAMAIS parler. */
function launchBlock(open) {
  const yes = Object.keys(LABEL).filter((k) => open[k]).map((k) => LABEL[k]);
  const no = Object.keys(LABEL).filter((k) => !open[k]).map((k) => LABEL[k]);
  return `━━━ CE QUI EST OUVERT POUR ELLE AUJOURD'HUI ━━━
Toujours là : les tests et leurs résultats, l'animal intérieur (après 7 tests psy), la respiration et les exercices guidés en vocal (cohérence cardiaque, ancrage, sommeil, relâcher les tensions, vocaux de soutien), l'humeur du jour, la discussion avec toi${yes.length ? `, et aussi : ${yes.join(', ')}` : ''}.
${no.length ? `PAS ENCORE OUVERT pour elle : ${no.join(', ')}. N'en parle JAMAIS, ne les propose pas, n'utilise pas leurs balises, ne dis pas « c'est dans la discussion » ou « je te l'ai préparé » pour ces choses-là. Même si ton carnet ou tes réponses PRÉCÉDENTES dans cette discussion ont parlé d'un journal, d'un programme, d'une chaîne ou d'écrire à Dr Lô, c'était une erreur : ne le répète pas, ne dis pas qu'elle l'a commencé, et corrige-toi simplement si elle en reparle. Si elle les demande, dis simplement que ce n'est pas encore disponible, et propose ce qui est ouvert (un test, la respiration, l'humeur, ou continuer à parler ici avec toi).` : ''}`;
}

/** Ce que le compagnon dit d'un vrai professionnel, selon ce qui est ouvert. */
function drloHuman(open) {
  const q = 'Un médecin de l\'équipe, Dr Lô, répond lui-même par écrit sous 7 jours aux questions privées via [[vrai_drlo]]';
  const c = 'publie dans les chaînes';
  if (open.question && open.chaines) return `${q} et ${c} : n'en parle que pour ces deux cas.`;
  if (open.question) return `${q} : n'en parle que pour ce cas.`;
  const alt = 'Elle veut parler à un vrai professionnel : il n\'y a PAS encore de messagerie avec un médecin sur le site, ne la propose jamais. Encourage une consultation (médecin généraliste, psychologue ou psychiatre, sage-femme ou gynécologue selon le sujet), sans alarmer. Vouloir voir un médecin n\'est PAS une urgence.';
  return open.chaines ? `Dr Lô, médecin de l'équipe, ${c} : n'en parle que pour ce cas. ${alt}` : alt;
}

/** Retire des règles du compagnon tout ce qui décrit une fonctionnalité fermée (sinon il la propose quand même). */
const TAG_LINES = [['[[programme]]', 'programme'], ['[[journal]]', 'confier'], ['[[defi]]', 'defis'], ['[[compat]]', 'compat'], ['[[vrai_drlo]]', 'question'],
  ['[[chaine:ID]]', 'chaines'], ['[[chaines]]', 'chaines'], ['[[pratique:ID]]', 'routine']];
function pruneRules(text, open) {
  let lines = String(text || '').split('\n').filter((l) => !TAG_LINES.some(([tag, k]) => !open[k] && l.trim().startsWith(tag)));
  const dropBlock = (title) => {
    const i = lines.findIndex((l) => l.startsWith(title));
    if (i < 0) return;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== '') j += 1;
    lines.splice(i, j - i + 1);
  };
  if (!open.routine) dropBlock('LES OUTILS DE DR LÔ');
  if (!open.chaines) dropBlock('LES CHAÎNES DU VRAI DR LÔ');
  let out = lines.join('\n').replace('[[GRATUIT_JOURNAL]]', open.confier ? 'Écrire dans son journal est gratuit aussi.' : '').replace('[[DRLO_HUMAIN]]', drloHuman(open));
  if (!open.programme || !open.defis || !open.question) out = out.replace('(son humeur, respirer, le programme, un défi, parler à Dr Lô…)', '(son humeur, respirer, un test, son animal intérieur…)');
  return out;
}

/** Retire du carnet les notes qui parlent d'une fonction fermée pour elle. */
const NOTE_WORDS = { programme: /programme/i, confier: /journal|me confier/i, chaines: /chaîne|chaine/i, routine: /boîte à outils|pratique|outil/i, defis: /défi|defi/i, compat: /compatibilit/i, question: /question (privée|à dr)|écrit à dr lô/i };
function filterNotesByLaunch(notes, open) {
  return (Array.isArray(notes) ? notes : []).filter((n) => {
    const t = typeof n === 'string' ? n : (n && n.text) || '';
    return !Object.entries(NOTE_WORDS).some(([k, re]) => !open[k] && re.test(t));
  });
}

module.exports = { filterNotesByLaunch, FEATURES, featureOn, openFeatures, allowedAction, launchBlock, pruneRules, drloHuman };
