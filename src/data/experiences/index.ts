import type { ScaleExperience, ResultCardConfig, ExperienceTone } from '../../types/experience';
import type { AssessmentScale } from '../../types/assessment';
import { GAD7_EXPERIENCE } from './gad7';
import { PHQ9_EXPERIENCE } from './phq9';
import { BRS_EXPERIENCE } from './brs';
import { RSES_EXPERIENCE } from './rses';
import { BIG_FIVE_EXPERIENCE } from './bigFive';
import { ECR_R_EXPERIENCE } from './ecrR';
import { BONUS_BURNOUT_EXPERIENCE } from './bonusBurnout';
import { BONUS_CONFIANCE_EXPERIENCE } from './bonusConfiance';
import { BONUS_DEPENDANCE_EXPERIENCE } from './bonusDependance';
import { BONUS_HPI_EXPERIENCE } from './bonusHpi';
import { BONUS_HSP_EXPERIENCE } from './bonusHsp';
import { BONUS_EQ_EXPERIENCE } from './bonusEq';
import { BONUS_JALOUSIE_EXPERIENCE } from './bonusJalousie';
import { BONUS_MANIPULATION_EXPERIENCE } from './bonusManipulation';
import { BONUS_NARCISSISME_EXPERIENCE } from './bonusNarcissisme';
import { BONUS_TDAH_EXPERIENCE } from './bonusTdah';
import { BONUS_PERSONNALITE_EXPERIENCE } from './bonusPersonnalite';
import { NSSS_EXPERIENCE } from './nsss';
import { SDI2_EXPERIENCE } from './sdi2';
import { SIS_SES_EXPERIENCE } from './sisSes';
import { FSFI_EXPERIENCE } from './fsfi';
import { IIEF_EXPERIENCE } from './iief';
import { TSI_BASE_EXPERIENCE } from './tsiBase';
import { PAIR_EXPERIENCE } from './pair';
import { SISE_EXPERIENCE } from './sise';
import { SOCIAL_PRESSURE_SEX_EXPERIENCE } from './socialPressureSex';
import { GRISS_BASE_EXPERIENCE } from './grissBase';
import { PSS10_EXPERIENCE } from './pss10';
import { PCL5_EXPERIENCE } from './pcl5';
import { ACE_EXPERIENCE } from './ace';
import { PG13_EXPERIENCE } from './pg13';
import { CECA_Q_EXPERIENCE } from './cecaQ';
import { SOCIAL_PRESSURE_EXPERIENCE } from './socialPressure';
import { RELIGIOUS_CULTURAL_EXPERIENCE } from './religiousCultural';
import { ECONOMIC_STRESS_EXPERIENCE } from './economicStress';

const CONFIGS: Record<string, ScaleExperience> = {
  gad7: GAD7_EXPERIENCE,
  phq9: PHQ9_EXPERIENCE,
  brs: BRS_EXPERIENCE,
  rses: RSES_EXPERIENCE,
  big_five: BIG_FIVE_EXPERIENCE,
  ecr_r: ECR_R_EXPERIENCE,

  pss10:              PSS10_EXPERIENCE,
  pcl5:               PCL5_EXPERIENCE,
  ace:                ACE_EXPERIENCE,
  pg13:               PG13_EXPERIENCE,
  ceca_q:             CECA_Q_EXPERIENCE,
  social_pressure:    SOCIAL_PRESSURE_EXPERIENCE,
  religious_cultural: RELIGIOUS_CULTURAL_EXPERIENCE,
  economic_stress:    ECONOMIC_STRESS_EXPERIENCE,

  bonus_burnout:      BONUS_BURNOUT_EXPERIENCE,
  bonus_confiance:    BONUS_CONFIANCE_EXPERIENCE,
  bonus_dependance:   BONUS_DEPENDANCE_EXPERIENCE,
  bonus_hpi:          BONUS_HPI_EXPERIENCE,
  bonus_hsp:          BONUS_HSP_EXPERIENCE,
  bonus_eq:           BONUS_EQ_EXPERIENCE,
  bonus_jalousie:     BONUS_JALOUSIE_EXPERIENCE,
  bonus_manipulation: BONUS_MANIPULATION_EXPERIENCE,
  bonus_narcissisme:  BONUS_NARCISSISME_EXPERIENCE,
  bonus_tdah:         BONUS_TDAH_EXPERIENCE,
  bonus_personnalite: BONUS_PERSONNALITE_EXPERIENCE,

  nsss:                NSSS_EXPERIENCE,
  sdi2:                SDI2_EXPERIENCE,
  sis_ses:             SIS_SES_EXPERIENCE,
  fsfi:                FSFI_EXPERIENCE,
  iief:                IIEF_EXPERIENCE,
  tsi_base:            TSI_BASE_EXPERIENCE,
  pair:                PAIR_EXPERIENCE,
  sise:                SISE_EXPERIENCE,
  social_pressure_sex: SOCIAL_PRESSURE_SEX_EXPERIENCE,
  griss_base:          GRISS_BASE_EXPERIENCE,
};

export function getExperience(scaleId: string): ScaleExperience {
  return CONFIGS[scaleId] ?? { input: 'segmented' };
}

const DEFAULT_CARD: ResultCardConfig = { variant: 'score', shareable: true };

export function getResultCardConfig(scale: AssessmentScale): { card: ResultCardConfig; tone: ExperienceTone } {
  const exp = getExperience(scale.id);
  const card = { ...(exp.resultCard ?? DEFAULT_CARD) };
  let tone: ExperienceTone = exp.tone ?? 'normal';

  if (scale.category === 'sexual_health') {
    card.shareable = false;
  }

  return { card, tone };
}
