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

const LOCALE_TO_COUNTRY: Record<string, string> = {
  'fr-SN': 'SN',
  'fr-CA': 'CA',
  'fr-FR': 'FR',
  'en-CA': 'CA',
};

export function getUserCountry(): string {
  if (typeof navigator === 'undefined') return 'SN';
  const locale = navigator.language ?? '';
  if (LOCALE_TO_COUNTRY[locale]) return LOCALE_TO_COUNTRY[locale];
  if (locale.endsWith('-SN')) return 'SN';
  if (locale.endsWith('-CA')) return 'CA';
  if (locale.endsWith('-FR')) return 'FR';
  return 'SN';
}

export function getCrisisResources(countryCode?: string): CrisisResource[] {
  const code = countryCode ?? getUserCountry();
  return CRISIS_RESOURCES[code] ?? [FALLBACK_RESOURCE];
}
