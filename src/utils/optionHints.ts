/**
 * Descriptions concrètes pour chaque option de réponse.
 * Chaque label est traduit en langage clair pour guider l'utilisateur.
 * Les scales avec un cadre temporel précis ont des overrides spécifiques.
 */

// ── Overrides par scale ───────────────────────────────────────────────────────

const GAD7_PHQ9: Record<string, string> = {
  'jamais':                     "Ça ne m'est pas arrivé du tout ces 2 dernières semaines",
  'plusieurs jours':            "Ça m'est arrivé 1 à 6 jours sur les 14 derniers",
  'plus de la moitié du temps': "Ça m'est arrivé 7 à 11 jours — plus souvent qu'autrement",
  'presque tous les jours':     "Ça m'est arrivé 12 à 14 jours — quasi quotidiennement",
  // item fonctionnel (item 8 GAD-7)
  'pas du tout difficile':      "Je fonctionne normalement, comme d'habitude",
  'un peu difficile':           "Quelques petits défis, mais ça passe",
  'assez difficile':            "C'est vraiment compliqué au quotidien",
  'extrêmement difficile':      "J'ai beaucoup de mal à fonctionner normalement",
};

const PSS10: Record<string, string> = {
  'jamais':         "Ça ne m'est pas arrivé du tout ce dernier mois",
  'presque jamais': "1 ou 2 fois en tout sur le mois",
  'parfois':        "De temps en temps, sans régularité",
  'assez souvent':  "Ça revenait plusieurs fois par semaine",
  'très souvent':   "C'était presque quotidien",
};

const PCL5: Record<string, string> = {
  'pas du tout':  "Non, ça ne me perturbe pas",
  'un peu':       "Légèrement, mais c'est gérable",
  'modérément':   "Ça me dérange assez régulièrement",
  'beaucoup':     "C'est difficile à gérer au quotidien",
  'extrêmement':  "Ça m'envahit complètement",
};

const PG13_FREQ: Record<string, string> = {
  'jamais':   "Non, ça ne m'est pas arrivé",
  'rarement': "1 ou 2 fois — vraiment rarement",
  'parfois':  "De temps en temps, sans régularité",
  'souvent':  "Ça revenait régulièrement",
  'toujours': "C'est quasiment permanent",
};

const PG13_INTENSITY: Record<string, string> = {
  'pas du tout': "Non, pas du tout ressenti",
  'un peu':      "Légèrement, de façon passagère",
  'modérément':  "C'est présent assez souvent",
  'beaucoup':    "C'est intense et fréquent",
  'énormément':  "C'est envahissant — ça prend toute la place",
};

const CECA_Q: Record<string, string> = {
  'jamais':   "Non, ça ne s'est jamais passé",
  'rarement': "1 ou 2 fois, dans mon enfance",
  'parfois':  "Ça arrivait de temps en temps",
  'souvent':  "Ça arrivait régulièrement",
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
  'presque jamais': "Très rarement — presque jamais",

  // Intensité / perturbation générale
  'pas du tout':  "Non, pas du tout",
  'un peu':       "Légèrement, de façon passagère",
  'modérément':   "Assez présent dans ma vie",
  'beaucoup':     "C'est fort et fréquent",
  'extrêmement':  "C'est envahissant, très intense",
  'énormément':   "C'est envahissant — ça prend toute la place",

  // Difficulté
  'pas du tout difficile':  "Aucun problème à ce niveau",
  'un peu difficile':       "Un peu difficile, mais ça passe",
  'assez difficile':        "Vraiment compliqué",
  'extrêmement difficile':  "Presque impossible à gérer",

  // Binaire Oui / Non (ACE, PG-13...)
  'oui': "Oui, ça s'est passé",
  'non':  "Non, ça ne s'est pas passé",

  // Satisfaction sexuelle (NSSS)
  'pas du tout satisfait(e)':  "Vraiment pas satisfait(e) du tout",
  'un peu satisfait(e)':       "Un peu, mais vraiment pas assez",
  'modérément satisfait(e)':   "Assez bien — sans être enthousiaste",
  'très satisfait(e)':         "Vraiment bien — je suis content(e)",
  'extrêmement satisfait(e)':  "Parfait — je ne pourrais pas demander mieux",

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
  'très insatisfait(e)':                      "Vraiment pas satisfait(e) du tout",
  'modérément insatisfait(e)':                "Plutôt pas satisfait(e)",
  'également satisfait(e)/insatisfait(e)':    "Moitié-moitié — ni bien ni mal",
  'modérément satisfait(e)':                  "Assez satisfait(e) — ça va plutôt bien",
  // IIEF (masculin)
  'très insatisfait':                  "Vraiment pas satisfait du tout",
  'modérément insatisfait':            "Plutôt pas satisfait",
  'également satisfait/insatisfait':   "Moitié-moitié — ni bien ni mal",
  'modérément satisfait':              "Assez satisfait — ça va plutôt bien",
  'très satisfait':                    "Très satisfait — vraiment bien",

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

export function getOptionHint(label: string, scaleId?: string): string | null {
  const key = label.toLowerCase().trim();

  // 1. Override spécifique à la scale
  if (scaleId && SCALE_OVERRIDES[scaleId]) {
    const override = SCALE_OVERRIDES[scaleId][key];
    if (override) return override;
  }

  // 2. Hint générique
  return GENERIC[key] ?? null;
}
