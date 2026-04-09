import type { SexualHealthFilter, SexualExperienceProfile } from '../types/onboarding';
import type { AssessmentScale, ScaleItem } from '../types/assessment';

const FILTER_KEY = 'he_sexual_filter';

// ── Persistence ───────────────────────────────────────────────────────────────

export function getSexualHealthFilter(): SexualHealthFilter | null {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    return raw ? (JSON.parse(raw) as SexualHealthFilter) : null;
  } catch {
    return null;
  }
}

export function saveSexualHealthFilter(filter: SexualHealthFilter): void {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filter));
}

export function isSexualFilterComplete(): boolean {
  return getSexualHealthFilter() !== null;
}

// ── Scale visibility ──────────────────────────────────────────────────────────

export function getHiddenSexualScaleIds(filter: SexualHealthFilter): string[] {
  const profile = filter.experienceProfile;
  let hidden: string[] = [];

  if (profile === 'no_experience' || profile === 'prefer_not_answer') {
    hidden = ['fsfi', 'iief', 'nsss', 'griss_base', 'pair'];
  } else if (profile === 'partial_experience') {
    hidden = ['griss_base'];
  }
  // full_experience: hidden stays []

  return [...new Set(hidden)];
}

export function getSexualRequired(filter: SexualHealthFilter | null): Array<{ id: string; label: string }> {
  const profile = filter?.experienceProfile;
  if (profile === 'no_experience' || profile === 'prefer_not_answer') {
    return [
      { id: 'sdi2',    label: 'Désir sexuel' },
      { id: 'sis_ses', label: 'Excitation & Inhibition' },
      { id: 'sise',    label: 'Identité & Valeurs intimes' },
    ];
  }
  if (profile === 'partial_experience') {
    return [
      { id: 'nsss',    label: 'Satisfaction sexuelle' },
      { id: 'sdi2',    label: 'Désir sexuel' },
      { id: 'sis_ses', label: 'Excitation & Inhibition' },
    ];
  }
  // full_experience or null
  return [
    { id: 'nsss', label: 'Satisfaction sexuelle' },
    { id: 'sdi2', label: 'Désir sexuel' },
    { id: 'pair', label: 'Intimité de couple' },
  ];
}

// ── Scale adaptation ──────────────────────────────────────────────────────────

/**
 * Returns an adapted version of a scale for the given sexual profile.
 * Reformulates invasive items without altering scoring structure.
 */
export function getAdaptedScale(
  scale: AssessmentScale,
  profile: SexualExperienceProfile
): AssessmentScale {
  if (profile === 'full_experience') return scale;

  if (scale.id === 'sdi2' && (profile === 'no_experience' || profile === 'partial_experience')) {
    return adaptSDI2(scale, profile);
  }

  if (scale.id === 'fsfi' && profile === 'partial_experience') {
    return adaptFSFI(scale);
  }

  if (scale.id === 'sdi2' && profile === 'prefer_not_answer') {
    return adaptSDI2Minimal(scale);
  }

  return scale;
}

// ── SDI-2 adaptation ──────────────────────────────────────────────────────────

const SDI2_DYADIC_OVERRIDES_A: Record<number, string> = {
  1:  "À quelle fréquence ressens-tu de l'attirance sexuelle pour quelqu'un (dans ta vie réelle ou dans tes pensées) ?",
  2:  "Quelle est l'intensité de ton envie d'avoir un jour des expériences intimes avec quelqu'un ?",
  3:  "À quel point aimerais-tu te rapprocher intimement de quelqu'un que tu trouves attrayant ?",
  4:  "Si quelqu'un que tu aimes bien te proposait une proximité intime, serais-tu réceptif(ve) ?",
  5:  "Idéalement, à quelle fréquence aimerais-tu vivre des moments d'intimité physique avec quelqu'un ?",
  6:  "Comment évalues-tu ton niveau d'intérêt actuel pour une intimité physique avec quelqu'un ?",
  7:  "À quelle fréquence as-tu des pensées ou des fantasmes sexuels en rapport avec une personne ?",
  8:  "À quel point es-tu attiré(e) sexuellement par des personnes de ta vie ou de tes pensées ?",
  9:  "Dans quelle mesure ces envies ou attirances influencent-elles ton humeur générale ?",
};

const SDI2_DYADIC_OVERRIDES_B: Record<number, string> = {
  1:  "À quelle fréquence ressens-tu du désir sexuel envers quelqu'un (partenaire ou personne attirante) ?",
  2:  "Quelle est l'intensité de ton désir d'avoir des expériences intimes avec quelqu'un ?",
  3:  "À quel point souhaites-tu initier une expérience intime avec quelqu'un qui te plaît ?",
  5:  "Idéalement, à quelle fréquence aimerais-tu vivre des moments d'intimité physique avec quelqu'un ?",
};

function adaptSDI2(scale: AssessmentScale, profile: SexualExperienceProfile): AssessmentScale {
  const overrides = profile === 'no_experience' ? SDI2_DYADIC_OVERRIDES_A : SDI2_DYADIC_OVERRIDES_B;
  return {
    ...scale,
    instructions: profile === 'no_experience'
      ? "Les questions suivantes portent sur ton attirance, tes envies et tes fantasmes — pas besoin d'avoir eu des rapports pour y répondre 😊"
      : "Les questions suivantes portent sur ton désir sexuel au cours des derniers mois.",
    items: scale.items.map(item => {
      const override = overrides[item.id];
      return override ? { ...item, text: override } : item;
    }),
  };
}

function adaptSDI2Minimal(scale: AssessmentScale): AssessmentScale {
  // Profile D: only keep solitary items (10-14)
  return {
    ...scale,
    instructions: "Quelques questions générales sur ton rapport au désir. Réponds à ton rythme, sans pression 😊",
    items: scale.items.map(item =>
      item.subscale === 'dyadic' ? { ...item, noScore: true, text: item.text } : item
    ),
  };
}

// ── FSFI adaptation ───────────────────────────────────────────────────────────

const FSFI_ITEM_OVERRIDES_B: Record<number, string> = {
  // Arousal: remplacer "activité sexuelle" par "expérience intime"
  3:  "Au cours des 4 dernières semaines, à quelle fréquence as-tu ressenti de l'éveil sexuel lors d'une expérience intime ou sensuelle ?",
  4:  "Au cours des 4 dernières semaines, comment évalues-tu ton niveau d'éveil lors de tes moments intimes ou sensuels ?",
  5:  "Au cours des 4 dernières semaines, quelle confiance avais-tu de pouvoir ressentir de l'excitation dans un moment intime ?",
  6:  "Au cours des 4 dernières semaines, à quelle fréquence étais-tu satisfait(e) de ta réponse d'éveil lors de tes moments intimes ?",
  // Lubrification → réponse corporelle
  7:  "Au cours des 4 dernières semaines, à quelle fréquence as-tu ressenti une réponse physique (chaleur, sensations) lors d'une expérience intime ?",
  8:  "Au cours des 4 dernières semaines, à quel point était-il facile de ressentir une réponse physique d'excitation ?",
  9:  "Au cours des 4 dernières semaines, à quelle fréquence cette réponse physique s'est-elle maintenue tout au long de l'expérience ?",
  10: "Au cours des 4 dernières semaines, à quel point était-il facile de maintenir cette réponse physique jusqu'à la fin ?",
  // Orgasme → adapté sans mentionner pénétration
  11: "Au cours des 4 dernières semaines, à quelle fréquence as-tu pu atteindre l'orgasme lors d'une expérience intime ou seul(e) ?",
  12: "Au cours des 4 dernières semaines, quelle a été la difficulté à atteindre l'orgasme lors d'une expérience intime ou seul(e) ?",
  13: "Au cours des 4 dernières semaines, à quel point étais-tu satisfait(e) de ta capacité à atteindre l'orgasme ?",
  // Satisfaction → expériences intimes
  14: "Au cours des 4 dernières semaines, à quel point étais-tu satisfait(e) de l'intimité émotionnelle vécue dans tes expériences ?",
  15: "Au cours des 4 dernières semaines, à quel point étais-tu satisfait(e) de tes expériences intimes, telles qu'elles sont ?",
  16: "Au cours des 4 dernières semaines, à quel point étais-tu satisfait(e) de ta vie intime en général ?",
  // Douleur/pénétration → inconfort corporel général
  17: "Au cours des 4 dernières semaines, as-tu ressenti une gêne ou une douleur lors d'une expérience intime ou sensuelle ?",
  18: "Au cours des 4 dernières semaines, as-tu ressenti une gêne ou une douleur après une expérience intime ou sensuelle ?",
  19: "Au cours des 4 dernières semaines, comment évalues-tu le niveau de gêne ou d'inconfort lors de tes expériences intimes ?",
};

function adaptFSFI(scale: AssessmentScale): AssessmentScale {
  return {
    ...scale,
    instructions: "Ces questions portent sur ton vécu intime au cours des 4 dernières semaines — adapté à ton expérience telle qu'elle est 😊",
    items: scale.items.map((item: ScaleItem) => {
      const override = FSFI_ITEM_OVERRIDES_B[item.id];
      return override ? { ...item, text: override } : item;
    }),
  };
}
