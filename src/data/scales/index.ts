// Mental health
import { GAD7 } from './mentalHealth/gad7';
import { PHQ9 } from './mentalHealth/phq9';
import { BIG_FIVE } from './mentalHealth/bigFive';
import { ECR_R } from './mentalHealth/ecrR';
import { RSES } from './mentalHealth/rses';
import { BRS } from './mentalHealth/brs';
import { PSS10 } from './mentalHealth/pss10';
import { ACE } from './mentalHealth/aceScore';
import { PCL5 } from './mentalHealth/pcl5';
import { PG13 } from './mentalHealth/pg13';
import { CECA_Q } from './mentalHealth/cecaQ';
import { SOCIAL_PRESSURE } from './mentalHealth/socialPressure';
import { RELIGIOUS_CULTURAL } from './mentalHealth/religiousCultural';
import { ECONOMIC_STRESS } from './mentalHealth/economicStress';

// Sexual health
import { NSSS } from './sexualHealth/nsss';
import { SDI2 } from './sexualHealth/sdi2';
import { SIS_SES } from './sexualHealth/sisSes';
import { FSFI } from './sexualHealth/fsfi';
import { IIEF } from './sexualHealth/iief';
import { TSI_BASE } from './sexualHealth/tsiBase';
import { PAIR } from './sexualHealth/pair';
import { SISE } from './sexualHealth/sise';
import { SOCIAL_PRESSURE_SEX } from './sexualHealth/socialPressureSex';
import { GRISS_BASE } from './sexualHealth/grissBase';

import type { AssessmentScale } from '../../types/assessment';

export const MENTAL_HEALTH_SCALES: AssessmentScale[] = [
  GAD7, PHQ9, BIG_FIVE, ECR_R, RSES, BRS, PSS10, ACE, PCL5, PG13,
  CECA_Q, SOCIAL_PRESSURE, RELIGIOUS_CULTURAL, ECONOMIC_STRESS,
];

export const SEXUAL_HEALTH_SCALES: AssessmentScale[] = [
  NSSS, SDI2, SIS_SES, FSFI, IIEF, TSI_BASE, PAIR, SISE,
  SOCIAL_PRESSURE_SEX, GRISS_BASE,
];

export const ALL_SCALES: AssessmentScale[] = [
  ...MENTAL_HEALTH_SCALES,
  ...SEXUAL_HEALTH_SCALES,
];

export function getScaleById(id: string): AssessmentScale | undefined {
  return ALL_SCALES.find(s => s.id === id);
}
