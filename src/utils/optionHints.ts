import { getOnboardingProfile } from './onboardingProfile';
import { resolveGender } from './gender';
/**
 * Descriptions concrètes pour chaque option de réponse.
 * Chaque label est traduit en langage clair pour guider l'utilisateur.
 * Les scales avec un cadre temporel précis ont des overrides spécifiques.
 */

// ── Overrides par scale ───────────────────────────────────────────────────────

const GAD7_PHQ9: Record<string, string> = {
  'plusieurs jours':            "Ça m'est arrivé 1 à 6 jours sur les 14 derniers",
  'plus de la moitié du temps': "Ça m'est arrivé 7 à 11 jours — plus souvent qu'autrement",
  'presque tous les jours':     "Ça m'est arrivé 12 à 14 jours — quasi quotidiennement",
  // item fonctionnel (item 8 GAD-7)
};

const PSS10: Record<string, string> = {
  'assez souvent':  "Ça revenait plusieurs fois par semaine",
};

const PCL5: Record<string, string> = {
};

const PG13_FREQ: Record<string, string> = {
};

const PG13_INTENSITY: Record<string, string> = {
};

const CECA_Q: Record<string, string> = {
};

// ── Hints génériques (toutes les scales restantes) ────────────────────────────

const GENERIC: Record<string, string> = {
  // Accord (BRS, Big Five, ECR-R partiel, PAIR, SIS-SES, SISE...)
  'pas du tout d\'accord':   "Ce n'est vraiment pas moi du tout",
  'plutôt pas d\'accord':    "Ça ne me ressemble pas vraiment",
  'neutre':                  "Je ne sais pas trop — ni oui ni non",
  'plutôt d\'accord':        "Ça me ressemble assez",
  'tout à fait d\'accord':   "C'est exactement moi",
  // Rosenberg (ordre inversé, mêmes labels)
  'd\'accord':               "Oui, ça me ressemble",
  'pas d\'accord':           "Non, ça ne me ressemble pas",

  // Fréquence générale
  'jamais':         "Non, ça ne m'arrive pas",
  'rarement':       "1 ou 2 fois — vraiment rarement",
  'parfois':        "De temps en temps, sans régularité",
  'souvent':        "Ça revient régulièrement",
  'très souvent':   "C'est presque tout le temps",
  'toujours':       "C'est quasiment permanent",

  // Intensité / perturbation générale
  'un peu':       "Légèrement, de façon passagère",
  'modérément':   "Assez présent dans ma vie",
  'beaucoup':     "C'est fort et fréquent",
  'extrêmement':  "C'est envahissant, très intense",
  'énormément':   "C'est envahissant — ça prend toute la place",

  // Difficulté
  'pas du tout difficile':  "Aucun problème à ce niveau",
  'un peu difficile':       "Un peu difficile, mais ça passe",
  'assez difficile':        "Vraiment compliqué",

  // Binaire Oui / Non (ACE, PG-13...)
  'oui': "Oui, ça s'est passé",
  'non':  "Non, ça ne s'est pas passé",

  // Satisfaction sexuelle (NSSS)
  'pas du tout satisfait':  "Vraiment pas {{satisfait|satisfaite}} du tout",
  'un peu satisfait':       "Un peu, mais vraiment pas assez",
  'extrêmement satisfait':  "Parfait — je ne pourrais pas demander mieux",

  // Pression sociale (jamais/toujours avec slash)
  'jamais / pas du tout':    "Non, ça ne me concerne pas du tout",
  'toujours / tout à fait':  "C'est quasi constant dans ma vie",

  // Désir sexuel — intensité (SDI-2)
  'très faible':  "C'est vraiment très faible, quasi absent",
  'faible':       "Plutôt faible",
  'modérée':      "Ni trop fort ni trop faible — dans la moyenne",
  'forte':        "Plutôt forte, bien présente",
  'très forte':   "C'est vraiment intense et présent",

  // Fréquence FSFI / IIEF (activité sexuelle)
  'presque jamais / jamais':  "Presque aucune fois — moins de 1 sur 10",
  'quelques fois':            "Rarement — moins d'1 fois sur 4",
  'la plupart du temps':      "La majorité des fois — environ 3 fois sur 4",
  'presque toujours / toujours': "Quasi toutes les fois",
  'presque jamais':           "Très rarement — presque aucune fois",
  'presque toujours':         "Quasi à chaque fois",

  // Difficulté FSFI (items lubrification, pénétration...)
  'extrêmement difficile':    "Vraiment presque impossible",
  'très difficile':           "Très difficile — beaucoup d'obstacle",
  'difficile':                "C'est difficile, je rencontre des obstacles",
  'légèrement difficile':     "Un peu difficile, mais ça se passe",
  'pas difficile':            "Aucun problème à ce niveau",

  // Satisfaction relation (FSFI/IIEF)
  // IIEF (masculin)
  'très insatisfait':                  "Vraiment pas {{satisfait|satisfaite}} du tout",
  'modérément insatisfait':            "Plutôt pas {{satisfait|satisfaite}}",
  'également satisfait/insatisfait':   "Moitié-moitié — ni bien ni mal",
  'modérément satisfait':              "Assez {{satisfait|satisfaite}} — ça va plutôt bien",
  'très satisfait':                    "Très {{satisfait|satisfaite}} — vraiment bien",

  // Aucune activité (FSFI/IIEF item 0)
  'aucune activité sexuelle':  "Je n'ai pas eu d'activité sexuelle ce mois-ci",
  "n'a pas tenté":             "Je n'ai pas tenté de rapport sexuel ce mois-ci",

  // Difficulté IIEF (maintien)
  'pas du tout':  "Aucun problème", // override si contexte = IIEF
};

// ── Groupes de scales ─────────────────────────────────────────────────────────

const SCALE_OVERRIDES: Record<string, Record<string, string>> = {
  gad7:   GAD7_PHQ9,
  phq9:   GAD7_PHQ9,
  pss10:  PSS10,
  pcl5:   PCL5,
  pg13:   { ...PG13_FREQ, ...PG13_INTENSITY },
  ceca_q: CECA_Q,
};

// ── Fonction principale ───────────────────────────────────────────────────────

function resolveHint(hint: string | null): string | null {
  if (hint === null) return null;
  const genre = getOnboardingProfile()?.genre === 'femme' ? 'femme' : 'homme';
  return resolveGender(hint, genre);
}

export function getOptionHint(label: string, scaleId?: string): string | null {
  // « satisfaite » et « satisfait » partagent le même indice
  const key = label.toLowerCase().trim().replace(/\b(in)?satisfaite\b/g, '$1satisfait');

  // 1. Override spécifique à la scale
  if (scaleId && SCALE_OVERRIDES[scaleId]) {
    const override = SCALE_OVERRIDES[scaleId][key];
    if (override) return resolveHint(override);
  }

  // 2. Hint générique
  return resolveHint(GENERIC[key] ?? null);
}
