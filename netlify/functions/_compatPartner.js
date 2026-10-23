/**
 * Ce qu'une personne a le droit de voir du profil de quelqu'un dont elle a le code de compatibilité.
 * Logique pure (testable avec node --test). Le code partagé « ouvre » seulement :
 *  - code psychologique → résultats des tests psychologiques + bonus ;
 *  - code intime        → résultats des tests de vie intime ;
 *  - prénom et genre (pour l'analyse), rien d'autre (pas d'analyses Dr Lô, pas de journal, pas d'alertes détaillées).
 */
const MENTAL_SCALE_IDS = ['ecr_r', 'rses', 'brs', 'big_five', 'pss10', 'gad7', 'phq9', 'ace', 'pcl5', 'ceca_q'];
const SEXUAL_SCALE_IDS = ['nsss', 'sdi2', 'sis_ses', 'fsfi', 'iief', 'griss_base', 'pair', 'sise', 'tsi_base', 'social_pressure_sex'];
const BONUS_SCALE_IDS = ['npi', 'daq', 'hsp', 'tdah', 'hpi', 'gse', 'pdq', 'mach', 'mbi', 'mjs', 'wleis'];

function codeType(code) {
  const c = String(code || '').trim().toUpperCase();
  if (/^HE-MNT-\d{4}-[A-Z0-9]{4}$/.test(c) || /^SM-[A-Z0-9]{4}$/.test(c)) return 'mental';
  if (/^HE-SEX-\d{4}-[A-Z0-9]{4}$/.test(c) || /^SE-[A-Z0-9]{4}$/.test(c)) return 'sexual';
  return null;
}

function slimResult(r) {
  if (!r || typeof r !== 'object') return null;
  const interp = r.interpretation || {};
  return {
    scaleId: r.scaleId,
    totalScore: r.totalScore,
    subscaleScores: r.subscaleScores || null,
    interpretation: { label: interp.label || '', severity: interp.severity || 'none', min: interp.min, max: interp.max },
  };
}

/** @param {Record<string, any>} profile  @param {('mental'|'sexual')[]} types */
function partnerView(profile, types) {
  const allowed = new Set([
    ...(types.includes('mental') ? [...MENTAL_SCALE_IDS, ...BONUS_SCALE_IDS] : []),
    ...(types.includes('sexual') ? SEXUAL_SCALE_IDS : []),
  ]);
  const scaleResults = {};
  for (const [id, r] of Object.entries(profile.scaleResults || {})) {
    if (!allowed.has(id)) continue;
    const s = slimResult(r);
    if (s) scaleResults[id] = s;
  }
  const ob = profile.onboardingProfile || {};
  const prenom = ob.prenom || (profile.displayName ? String(profile.displayName).split(' ')[0] : '') || 'Partenaire';
  return { uid: profile.uid, prenom, genre: ob.genre || '', scaleResults };
}

module.exports = { codeType, partnerView, MENTAL_SCALE_IDS, SEXUAL_SCALE_IDS, BONUS_SCALE_IDS };
