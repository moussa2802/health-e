import type { CyclePhase, MoodType, ReadingGrid } from "../types";

// ⚠️ CONTENU MÉDICAL — tous les textes ci-dessous sont des EXEMPLES à valider
// et enrichir par le médecin (Papa Moussa) avant mise en production.
//
// Ton de Dr Lô : chaleureux, déculpabilisant, éducatif.
// Toujours : valider ("c'est normal"), expliquer brièvement le mécanisme,
// déculpabiliser ("ce n'est pas toi").
// JAMAIS réduire une souffrance profonde (tristesse, anxiété marquées) au
// seul cycle — les messages laissent toujours la porte ouverte à d'autres
// causes possibles, sans jamais poser de diagnostic.
// Fichier volontairement plat et éditable : une entrée = un message.

export interface DrLoResponse {
  message: string;
  suggestions: string[];
}

// ─── GRILLE CYCLIQUE : cyclicalResponses[phase][mood] ───────────────────────
export const cyclicalResponses: Record<
  CyclePhase,
  Partial<Record<MoodType, DrLoResponse>>
> = {
  menstrual: {
    serene: {
      message:
        "Tu te sens sereine pendant tes règles, et c'est très bien ainsi. On imagine souvent que cette période est forcément difficile — ce n'est pas une obligation. Profite de ce calme. 🌙",
      suggestions: ["Un moment au chaud, sans rien devoir faire"],
    },
    joyful: {
      message:
        "Tu es joyeuse aujourd'hui, même pendant tes règles — et c'est tout à fait normal. Les règles ne riment pas toujours avec inconfort. Savoure cette énergie positive. 🌸",
      suggestions: ["Profite de cette bonne humeur, sans culpabiliser"],
    },
    irritable: {
      message:
        "L'irritabilité pendant les règles est fréquente : ton corps travaille, parfois avec des douleurs, et ça peut jouer sur les nerfs. Ce n'est pas toi qui es « difficile », c'est ton corps qui te demande de la douceur. 🤍",
      suggestions: ["Une bouillotte ou une source de chaleur peut soulager", "Baisse un peu le rythme si tu peux"],
    },
    sad: {
      message:
        "Une tristesse qui pointe pendant tes règles, beaucoup de femmes la connaissent — tes hormones sont au plus bas en ce moment. Ce n'est pas dans ta tête. Si cette tristesse te semble plus lourde que d'habitude, ce n'est pas forcément « juste » le cycle : sois attentive à ce que tu ressens. 🤍",
      suggestions: ["Accorde-toi un moment de réconfort", "Parles-en à quelqu'un de confiance si le besoin se fait sentir"],
    },
    anxious: {
      message:
        "L'anxiété peut monter pendant les règles, quand tes hormones sont au plus bas. Ce n'est pas un défaut, c'est une réaction de ton corps. Respire, tu n'as rien à prouver aujourd'hui. 🤍",
      suggestions: ["Quelques respirations lentes peuvent aider", "Réduis ce qui peut attendre"],
    },
    tired: {
      message:
        "Ton corps travaille fort pendant les règles — la fatigue que tu ressens est physique, pas juste « dans ta tête ». Sois douce avec toi-même aujourd'hui. 🌙",
      suggestions: ["Repose-toi sans culpabiliser", "Hydrate-toi bien"],
    },
  },

  follicular: {
    serene: {
      message:
        "Une belle sérénité s'installe : tes hormones remontent doucement après tes règles, et ça se ressent souvent sur l'humeur. Profite de cette légèreté. 🌤️",
      suggestions: ["C'est un bon moment pour te reconnecter à toi"],
    },
    joyful: {
      message:
        "Ton énergie remonte et ça se sent dans ta joie aujourd'hui ! C'est une période où le corps a souvent plus de ressources. Profites-en pleinement. ✨",
      suggestions: ["Un bon moment pour te lancer dans quelque chose qui te fait envie"],
    },
    irritable: {
      message:
        "Tu te sens irritable alors que ton énergie remonte normalement à ce moment du cycle — c'est peut-être davantage lié à ce qui se passe autour de toi qu'à tes hormones. Prends un instant pour identifier ce qui pèse vraiment. 🤍",
      suggestions: ["Note ce qui t'agace, ça aide à y voir plus clair"],
    },
    sad: {
      message:
        "Ta tristesse aujourd'hui ne colle pas forcément avec cette phase du cycle, où l'énergie remonte plutôt — et c'est un signal à ne pas ignorer. Tes émotions ne suivent pas toujours tes hormones, et c'est normal aussi. 🤍",
      suggestions: ["Accorde-toi de la douceur, quelle qu'en soit la cause", "Si ça persiste, en parler peut aider"],
    },
    anxious: {
      message:
        "L'anxiété que tu ressens ne vient pas forcément de ton cycle en ce moment — tes hormones sont plutôt de ton côté. Ça vaut la peine de regarder ce qui, autour de toi, pourrait l'expliquer. Tu n'es pas seule avec ça. 🤍",
      suggestions: ["Respire profondément, quelques minutes", "Identifie ce qui t'inquiète vraiment"],
    },
    tired: {
      message:
        "Une fatigue qui persiste alors que ton corps a normalement plus d'énergie à ce moment du cycle mérite d'être écoutée — ton sommeil ou ta charge du moment y sont peut-être pour beaucoup. 🌙",
      suggestions: ["Vérifie la qualité de ton sommeil ces derniers jours"],
    },
  },

  ovulatory: {
    serene: {
      message:
        "Une belle harmonie aujourd'hui — c'est souvent la période du cycle où le corps se sent le plus en équilibre. Profite de ce calme. 🌸",
      suggestions: ["Un bon moment pour un temps à toi"],
    },
    joyful: {
      message:
        "Tu rayonnes aujourd'hui, et ce n'est pas un hasard : c'est souvent la phase du cycle où l'énergie et la confiance sont au plus haut. Profites-en. ✨",
      suggestions: ["C'est le bon moment pour ce qui te tient à cœur"],
    },
    irritable: {
      message:
        "L'irritabilité en pleine ovulation surprend souvent, car c'est une phase plutôt douce hormonalement. Certaines femmes ressentent aussi une petite gêne physique à ce moment (douleur ovulatoire) qui peut jouer sur l'humeur. Sois à l'écoute de ton corps. 🤍",
      suggestions: ["Une position confortable ou une chaleur douce peut aider si tu as une gêne physique"],
    },
    sad: {
      message:
        "Ressentir de la tristesse en période d'ovulation, alors que le corps est plutôt en haute énergie, peut surprendre — c'est le signe que autre chose se joue pour toi en ce moment. Tes émotions comptent, indépendamment de la phase. 🤍",
      suggestions: ["Prends un moment pour identifier ce qui te touche vraiment"],
    },
    anxious: {
      message:
        "Une pointe d'anxiété peut arriver même en période d'ovulation — certaines femmes sont sensibles au léger pic hormonal de ce moment. Ce n'est ni dans ta tête, ni une fatalité. 🤍",
      suggestions: ["Respire, accorde-toi une pause"],
    },
    tired: {
      message:
        "Une fatigue qui s'installe alors que ton corps est habituellement plus énergique à ce moment mérite ton attention — ton corps te dit peut-être qu'il a besoin de ralentir un peu, quelle qu'en soit la cause. 🌙",
      suggestions: ["Accorde-toi une vraie pause aujourd'hui"],
    },
  },

  luteal: {
    serene: {
      message:
        "Tu te sens sereine à l'approche de tes règles, et c'est très bien ainsi — la phase lutéale n'est pas systématiquement synonyme d'inconfort. Profite de ce calme sans arrière-pensée. 🌙",
      suggestions: ["Savoure ce moment tranquille"],
    },
    joyful: {
      message:
        "Une belle joie même en fin de cycle, et c'est loin d'être rare. On associe souvent cette période au syndrome prémenstruel, mais ce n'est pas systématique. Profite pleinement de cette énergie positive. 🌸",
      suggestions: ["Profite de cette bonne humeur"],
    },
    irritable: {
      message:
        "L'irritabilité qui monte avant les règles, beaucoup de femmes la vivent — c'est souvent le syndrome prémenstruel. Tes hormones chutent en ce moment et ça touche l'humeur. Ce n'est pas un trait de caractère, c'est une phase. 🤍",
      suggestions: ["Un moment au calme peut désamorcer la tension", "Préviens ceux qui t'entourent si tu en as besoin"],
    },
    sad: {
      message:
        "Une tristesse qui s'installe avant les règles est fréquente : tes hormones chutent, et ton humeur peut suivre. Ce n'est pas toi qui « exagères ». Si cette tristesse te semble profonde ou dure depuis longtemps, ce n'est pas forcément « juste » le syndrome prémenstruel — sois à l'écoute de toi-même. 🤍",
      suggestions: ["Accorde-toi de la douceur", "Écris ce que tu ressens, ça peut alléger"],
    },
    anxious: {
      message:
        "L'anxiété qui monte avant les règles, beaucoup de femmes la vivent. C'est souvent le syndrome prémenstruel. Tes hormones chutent et ça touche ton humeur. Ce n'est pas dans ta tête. 🤍",
      suggestions: ["Une marche douce peut apaiser", "Écris ce qui te pèse, ça allège"],
    },
    tired: {
      message:
        "Tu te sens fatiguée aujourd'hui, et c'est normal. Tu es dans les derniers jours de ton cycle, juste avant tes règles. Tes hormones baissent — c'est ça qui pèse sur ton énergie. Ce n'est pas toi, c'est ton corps. Sois douce avec toi-même. 🌙",
      suggestions: ["Accorde-toi du repos, sans culpabiliser", "Une boisson chaude, un moment calme"],
    },
  },
};

// ─── GRILLE ÉMOTIONNELLE : emotionalResponses[mood] (sans référence au cycle) ─
export const emotionalResponses: Partial<Record<MoodType, DrLoResponse>> = {
  serene: {
    message:
      "Tu te sens sereine aujourd'hui, et c'est précieux. Prends le temps de remarquer ce qui contribue à ce calme — ça t'aidera à le retrouver plus souvent. 🌸",
    suggestions: ["Savoure ce moment, sans rien attendre de plus"],
  },
  joyful: {
    message:
      "Ta joie aujourd'hui fait plaisir à lire. Ces moments méritent d'être remarqués et savourés pleinement, sans attendre qu'ils s'expliquent. ✨",
    suggestions: ["Profite de cette énergie pour quelque chose qui te tient à cœur"],
  },
  irritable: {
    message:
      "L'irritabilité que tu ressens est réelle, même sans cause évidente. Elle mérite d'être écoutée plutôt qu'ignorée ou combattue. 🤍",
    suggestions: ["Identifie ce qui te pèse vraiment en ce moment", "Accorde-toi un temps de pause"],
  },
  sad: {
    message:
      "La tristesse que tu ressens aujourd'hui compte, quelle qu'en soit la cause. Tu n'as pas besoin de la justifier pour qu'elle soit légitime. 🤍",
    suggestions: ["Accorde-toi un moment de réconfort", "Si cette tristesse dure, en parler peut aider"],
  },
  anxious: {
    message:
      "L'anxiété que tu ressens est réelle et mérite d'être écoutée. Prendre un moment pour respirer et ralentir peut aider. Tu n'es pas seule. 🤍",
    suggestions: ["Respire profondément, quelques minutes", "Note ce qui t'inquiète"],
  },
  tired: {
    message:
      "Tu te sens fatiguée aujourd'hui. Écoute ton corps — il te dit peut-être qu'il a besoin de repos. Sois douce avec toi-même. 🤍",
    suggestions: ["Accorde-toi une pause"],
  },
};

// ─── GRILLE MÉNOPAUSE : menopauseResponses[mood] (enjeux spécifiques) ────────
export const menopauseResponses: Partial<Record<MoodType, DrLoResponse>> = {
  serene: {
    message:
      "Tu te sens sereine aujourd'hui, et c'est une belle chose à traverser cette période de transition. Chaque jour ne se ressemble pas, et celui-ci est un bon jour. 🌸",
    suggestions: ["Savoure ce moment de calme"],
  },
  joyful: {
    message:
      "Ta joie aujourd'hui est belle à voir. La (pré)ménopause n'efface pas les bons moments, bien au contraire — ils méritent d'être pleinement vécus. ✨",
    suggestions: ["Profite de cette énergie positive"],
  },
  irritable: {
    message:
      "L'irritabilité pendant cette période de ta vie est fréquente. Les changements hormonaux de la (pré)ménopause peuvent jouer sur l'humeur. Ce n'est pas un défaut de caractère — c'est une transition que ton corps traverse. 🌸",
    suggestions: ["Sois patiente avec toi-même", "Un moment de fraîcheur et de calme"],
  },
  sad: {
    message:
      "Une tristesse qui s'installe pendant cette transition est courante — les changements hormonaux, mais aussi tout ce que cette période bouscule dans ta vie, peuvent peser. Ce n'est pas « juste des hormones » : ce que tu vis compte. 🤍",
    suggestions: ["Accorde-toi de la douceur", "En parler à quelqu'un de confiance peut alléger"],
  },
  anxious: {
    message:
      "L'anxiété pendant la (pré)ménopause est courante — les variations hormonales peuvent l'accentuer. Ce n'est pas toi qui « dramatises ». Sois attentive à ce que tu ressens. 🤍",
    suggestions: ["Respire lentement, quelques minutes", "Un rituel calme peut aider à ancrer la journée"],
  },
  tired: {
    message:
      "La fatigue pendant cette période de transition est fréquente — le sommeil est parfois plus léger, le corps change. Ce n'est pas un manque de volonté de ta part. 🌙",
    suggestions: ["Accorde-toi du repos sans culpabiliser", "Un environnement frais peut aider à mieux dormir"],
  },
};

const fallback: DrLoResponse = {
  message:
    "Merci d'avoir pris ce moment pour toi aujourd'hui. Je suis là chaque jour pour t'accompagner. 🌸",
  suggestions: [],
};

/**
 * Sélectionne la réponse de Dr Lô selon la grille de lecture active.
 * `phase` n'est utile (et fourni) que pour la grille cyclique.
 */
export function getDrLoResponse(
  grid: ReadingGrid,
  mood: MoodType,
  phase?: CyclePhase
): DrLoResponse {
  if (grid === "cyclical" && phase) {
    return cyclicalResponses[phase]?.[mood] || emotionalResponses[mood] || fallback;
  }
  if (grid === "menopause") {
    return menopauseResponses[mood] || emotionalResponses[mood] || fallback;
  }
  return emotionalResponses[mood] || fallback;
}
