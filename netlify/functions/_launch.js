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
Toujours là : les tests et leurs résultats, l'animal intérieur (après 7 tests psy), la respiration, l'humeur du jour, la discussion avec toi${yes.length ? `, et aussi : ${yes.join(', ')}` : ''}.
${no.length ? `PAS ENCORE OUVERT pour elle : ${no.join(', ')}. N'en parle JAMAIS, ne les propose pas, n'utilise pas leurs balises, ne dis pas « c'est dans la discussion » ou « je te l'ai préparé » pour ces choses-là. Propose à la place ce qui est ouvert (un test, la respiration, l'humeur, ou continuer à parler).` : ''}`;
}

module.exports = { FEATURES, featureOn, openFeatures, allowedAction, launchBlock };
