export interface CrisisResource {
  label: string;
  phone?: string;
  url?: string;
  availability?: string;
  note?: string;
}

export const CRISIS_RESOURCES: Record<string, CrisisResource[]> = {
  FR: [
    {
      label: '3114 — Numéro national de prévention du suicide',
      phone: '3114',
      availability: '24h/24, 7j/7',
      note: 'Gratuit et confidentiel.',
    },
  ],
  CA: [
    {
      label: '988 — Ligne d’aide en cas de crise de suicide',
      phone: '988',
      availability: '24h/24, 7j/7',
      note: 'Service bilingue (français et anglais).',
    },
  ],
  SN: [
    // Vérifié le 22 oct. 2026 : SAMU national 1515 (sante.gouv.sn, senego.com) ;
    // CHU de Fann : standard 33 869 18 18, urgences 33 869 18 20 (liste de l'ambassade
    // d'Allemagne à Dakar, déc. 2024). Aucune ligne nationale dédiée à la prévention du
    // suicide n'a été trouvée au Sénégal.
    {
      label: 'SAMU Sénégal',
      phone: '1515',
      availability: '24h/24',
      note: 'Urgences médicales.',
    },
    {
      label: 'Urgences du CHU de Fann (Dakar)',
      phone: '+221 33 869 18 20',
      note: 'Hôpital de référence en psychiatrie. Standard : +221 33 869 18 18 (demander la psychiatrie).',
    },
  ],
};

const FALLBACK_RESOURCE: CrisisResource = {
  label: 'Urgences médicales locales',
  note: 'Contacte les urgences médicales de ton pays ou un professionnel de santé.',
};

/**
 * Pays deviné à partir du FUSEAU HORAIRE, pas de la langue : au Sénégal, beaucoup de
 * téléphones sont réglés en « Français (France) », ce qui affichait le 3114 français.
 * Par défaut : Sénégal.
 */
export function countryFromTimeZone(tz: string): string {
  if (!tz) return 'SN';
  if (tz === 'Africa/Dakar') return 'SN';
  if (tz === 'Europe/Paris') return 'FR';
  // Fuseaux canadiens (et Amérique du Nord de l'Est, où vivent la plupart des usagers canadiens)
  if (/^America\/(Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|Regina|St_Johns|Moncton|Iqaluit|Whitehorse|Yellowknife|Dawson_Creek|Glace_Bay|Goose_Bay|Swift_Current|Rankin_Inlet|Resolute|Cambridge_Bay|Inuvik|Atikokan|Blanc-Sablon|Creston|Fort_Nelson|Nipigon|Thunder_Bay|Rainy_River|Pangnirtung)$/.test(tz)) return 'CA';
  return 'SN';
}

export function getUserCountry(): string {
  try {
    return countryFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '');
  } catch {
    return 'SN';
  }
}

/**
 * Numéros à afficher : ceux du pays où se trouve la personne, puis (hors Sénégal)
 * ceux du Sénégal, pour un proche resté au pays ou si le fuseau est trompeur.
 */
export function getCrisisResources(countryCode?: string): CrisisResource[] {
  const code = countryCode ?? getUserCountry();
  const local = CRISIS_RESOURCES[code] ?? [FALLBACK_RESOURCE];
  if (code === 'SN') return local;
  return [...local, ...CRISIS_RESOURCES.SN.map(r => ({ ...r, label: `${r.label} (au Sénégal)` }))];
}
