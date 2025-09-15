export const CATEGORIES = ["mental-health", "sexual-health"] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Specialty {
  key: string;
  labels: {
    fr: string;
    en: string;
  };
  category: Category;
}

export const SPECIALTIES: Record<string, Specialty> = {
  // Mental Health Specialties
  psychiatre: {
    key: "psychiatre",
    labels: {
      fr: "Psychiatre",
      en: "Psychiatrist",
    },
    category: "mental-health",
  },
  "psychologue-clinicien": {
    key: "psychologue-clinicien",
    labels: {
      fr: "Psychologue clinicien",
      en: "Clinical Psychologist",
    },
    category: "mental-health",
  },
  "psychotherapeute-agree": {
    key: "psychotherapeute-agree",
    labels: {
      fr: "Psychothérapeute agréé",
      en: "Licensed Psychotherapist",
    },
    category: "mental-health",
  },
  neuropsychologue: {
    key: "neuropsychologue",
    labels: {
      fr: "Neuropsychologue",
      en: "Neuropsychologist",
    },
    category: "mental-health",
  },
  addictologue: {
    key: "addictologue",
    labels: {
      fr: "Addictologue",
      en: "Addiction Specialist",
    },
    category: "mental-health",
  },
  pedopsychiatre: {
    key: "pedopsychiatre",
    labels: {
      fr: "Pédopsychiatre",
      en: "Child Psychiatrist",
    },
    category: "mental-health",
  },
  gerontopsychiatre: {
    key: "gerontopsychiatre",
    labels: {
      fr: "Gérontopsychiatre",
      en: "Geriatric Psychiatrist",
    },
    category: "mental-health",
  },
  "infirmier-sante-mentale": {
    key: "infirmier-sante-mentale",
    labels: {
      fr: "Infirmier en santé mentale",
      en: "Mental Health Nurse",
    },
    category: "mental-health",
  },
  "coach-developpement-personnel": {
    key: "coach-developpement-personnel",
    labels: {
      fr: "Coach en développement personnel",
      en: "Personal Development Coach",
    },
    category: "mental-health",
  },
  "conseiller-orientation": {
    key: "conseiller-orientation",
    labels: {
      fr: "Conseiller en orientation",
      en: "Career Counselor",
    },
    category: "mental-health",
  },
  "travailleur-social-sante-mentale": {
    key: "travailleur-social-sante-mentale",
    labels: {
      fr: "Travailleur social en santé mentale",
      en: "Mental Health Social Worker",
    },
    category: "mental-health",
  },
  "pair-aidant": {
    key: "pair-aidant",
    labels: {
      fr: "Pair-aidant",
      en: "Peer Support Worker",
    },
    category: "mental-health",
  },
  "medecin-generaliste-mental": {
    key: "medecin-generaliste-mental",
    labels: {
      fr: "Médecin généraliste",
      en: "General Practitioner",
    },
    category: "mental-health",
  },

  // Sexual Health Specialties
  gynecologue: {
    key: "gynecologue",
    labels: {
      fr: "Gynécologue",
      en: "Gynecologist",
    },
    category: "sexual-health",
  },
  urologue: {
    key: "urologue",
    labels: {
      fr: "Urologue",
      en: "Urologist",
    },
    category: "sexual-health",
  },
  "sexologue-clinique": {
    key: "sexologue-clinique",
    labels: {
      fr: "Sexologue clinicien",
      en: "Clinical Sexologist",
    },
    category: "sexual-health",
  },
  "sage-femme": {
    key: "sage-femme",
    labels: {
      fr: "Sage-femme",
      en: "Midwife",
    },
    category: "sexual-health",
  },
  "dermato-venerologue": {
    key: "dermato-venerologue",
    labels: {
      fr: "Dermatologue-vénéréologue",
      en: "Dermatologist-Venereologist",
    },
    category: "sexual-health",
  },
  endocrinologue: {
    key: "endocrinologue",
    labels: {
      fr: "Endocrinologue",
      en: "Endocrinologist",
    },
    category: "sexual-health",
  },
  andrologue: {
    key: "andrologue",
    labels: {
      fr: "Andrologue",
      en: "Andrologist",
    },
    category: "sexual-health",
  },
  "medecin-generaliste-sexuelle": {
    key: "medecin-generaliste-sexuelle",
    labels: {
      fr: "Médecin généraliste",
      en: "General Practitioner",
    },
    category: "sexual-health",
  },
  "conseiller-planning-familial": {
    key: "conseiller-planning-familial",
    labels: {
      fr: "Conseiller en planning familial",
      en: "Family Planning Counselor",
    },
    category: "sexual-health",
  },
  "educateur-sante-sexuelle": {
    key: "educateur-sante-sexuelle",
    labels: {
      fr: "Éducateur en santé sexuelle",
      en: "Sexual Health Educator",
    },
    category: "sexual-health",
  },
  "psychologue-sexologie": {
    key: "psychologue-sexologie",
    labels: {
      fr: "Psychologue en sexologie",
      en: "Sexology Psychologist",
    },
    category: "sexual-health",
  },
  "travailleur-social-sante-sexuelle": {
    key: "travailleur-social-sante-sexuelle",
    labels: {
      fr: "Travailleur social en santé sexuelle",
      en: "Sexual Health Social Worker",
    },
    category: "sexual-health",
  },
  "mediateur-familial": {
    key: "mediateur-familial",
    labels: {
      fr: "Médiateur familial",
      en: "Family Mediator",
    },
    category: "sexual-health",
  },
};

// Helper functions
export const getSpecialtyByKey = (key: string): Specialty | undefined => {
  return SPECIALTIES[key];
};

export const getSpecialtiesByCategory = (category: Category): Specialty[] => {
  return Object.values(SPECIALTIES).filter(
    (specialty) => specialty.category === category
  );
};

export const getSpecialtyLabel = (
  key: string,
  language: "fr" | "en" = "fr"
): string => {
  const specialty = getSpecialtyByKey(key);
  return specialty ? specialty.labels[language] : "Non renseigné";
};

export const getCategoryLabel = (
  category: Category,
  language: "fr" | "en" = "fr"
): string => {
  const labels = {
    "mental-health": { fr: "Santé mentale", en: "Mental Health" },
    "sexual-health": { fr: "Santé sexuelle", en: "Sexual Health" },
  };
  return labels[category][language];
};

// Legacy mapping for backward compatibility
export const LEGACY_SPECIALTY_MAPPING: Record<string, string> = {
  // Santé mentale
  psychologie: "psychologue-clinicien",
  psychiatrie: "psychiatre",
  psychologue: "psychologue-clinicien",
  psychiatre: "psychiatre",
  "psychologue clinicien": "psychologue-clinicien",
  "psychologue-clinicien": "psychologue-clinicien",
  "psychologue clinicienne": "psychologue-clinicien",
  "psychologue-clinicienne": "psychologue-clinicien",
  "psychologue psychologue": "psychologue-clinicien",
  "psychologue psychiatre": "psychiatre",

  // Santé sexuelle
  sexologue: "sexologue-clinique",
  "sexologue clinique": "sexologue-clinique",
  "sexologue-clinique": "sexologue-clinique",
  gynecologie: "gynecologue",
  gynecologue: "gynecologue",
  gynécologue: "gynecologue",
  gynécologie: "gynecologue",
  urologie: "urologue",
  urologue: "urologue",

  // Autres spécialités mentales
  psychothérapeute: "psychotherapeute-agree",
  "psychothérapeute agréé": "psychotherapeute-agree",
  psychotherapeute: "psychotherapeute-agree",
  neuropsychologue: "neuropsychologue",
  addictologue: "addictologue",
  pédopsychiatre: "pedopsychiatre",
  gérontopsychiatre: "gerontopsychiatre",
  "médecin généraliste": "medecin-generaliste-mental",
  "medecin generaliste": "medecin-generaliste-mental",
  "médecin généraliste santé mentale": "medecin-generaliste-mental",
  "medecin generaliste mental": "medecin-generaliste-mental",
  "médecin généraliste mental": "medecin-generaliste-mental",

  // Autres spécialités sexuelles
  "sage-femme": "sage-femme",
  dermatologue: "dermato-venerologue",
  endocrinologue: "endocrinologue",
  andrologue: "andrologue",
};

export const mapLegacySpecialty = (legacySpecialty: string): string | null => {
  const normalized = legacySpecialty.toLowerCase().trim();
  return LEGACY_SPECIALTY_MAPPING[normalized] || null;
};

// Validation functions
export const isValidSpecialty = (key: string): boolean => {
  return key in SPECIALTIES;
};

export const isValidCategory = (category: string): boolean => {
  return CATEGORIES.includes(category as Category);
};
