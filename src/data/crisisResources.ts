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
    // ⚠️ À VALIDER — aucune ligne nationale dédiée à la prévention du suicide
    // identifiée au Sénégal. Entrées provisoires : urgences médicales générales
    // et orientation vers un service de psychiatrie.
    {
      label: 'SAMU Sénégal',
      phone: '15',
      availability: '24h/24',
      note: 'Urgences médicales et psychiatriques.',
    },
    {
      label: 'Service de psychiatrie — Hôpital Fann (Dakar)',
      phone: '+221 33 869 18 18',
      note: 'Centre hospitalier de référence en santé mentale.',
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
