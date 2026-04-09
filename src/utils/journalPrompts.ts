import {
  collection, query, where, limit, getDocs,
  doc, setDoc, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PendingPrompt {
  id: string;
  scaleId: string;
  titre: string;
  invitation: string;
  questions_suggerees: string[];
  createdAt: string;
  ignored: boolean;
  sessionId: string;
}

type RawPrompt = Pick<PendingPrompt, 'titre' | 'invitation' | 'questions_suggerees'>;

// ── Genre adaptation ──────────────────────────────────────────────────────────

function adapt(text: string, genre?: string): string {
  if (genre === 'homme') {
    return text
      .replace(/\(e\)/g, '')
      .replace(/\(ère\)/g, '')
      .replace(/fier\(ère\)/g, 'fier')
      .replace(/bienveillant\(e\)/g, 'bienveillant');
  }
  if (genre === 'femme') {
    return text
      .replace(/\(e\)/g, 'e')
      .replace(/\(ère\)/g, 'ère')
      .replace(/fier\(ère\)/g, 'fière')
      .replace(/bienveillant\(e\)/g, 'bienveillante');
  }
  return text;
}

// ── Prompt definitions ────────────────────────────────────────────────────────

type PromptDef = {
  condition: (
    score: number,
    label: string,
    subscales?: Record<string, number>
  ) => boolean;
  data: RawPrompt;
};

const PROMPT_DEFS: Record<string, PromptDef> = {
  ace_score: {
    condition: (score) => score >= 3,
    data: {
      titre: '🌱 Ton enfance...',
      invitation:
        "Ton évaluation montre que tu as peut-être traversé des moments difficiles dans ton enfance.\n\nSi tu en as envie, ton journal est là pour que tu puisses mettre des mots sur ça — à ton rythme, sans pression. Ça peut faire du bien d'en parler, même juste à toi-même 🤍",
      questions_suggerees: [
        "Quel souvenir d'enfance me revient souvent ?",
        "Comment mon enfance influence ma vie aujourd'hui ?",
        "Qu'aurais-je voulu que soit différent ?",
      ],
    },
  },

  pcl5: {
    condition: (score) => score >= 25,
    data: {
      titre: '💙 Ce que tu portes...',
      invitation:
        "Il semble que tu portes quelque chose de lourd en ce moment.\n\nParfois, écrire ce qu'on ressent peut aider à alléger ce poids. Tu n'es pas obligé(e) de tout dire — écris juste ce que tu veux bien partager avec toi-même 🤍",
      questions_suggerees: [
        "Qu'est-ce que j'ai du mal à laisser derrière moi ?",
        "Comment je me sens au quotidien avec ça ?",
        "Qu'est-ce qui m'aide à me sentir mieux ?",
      ],
    },
  },

  phq9: {
    condition: (score) => score >= 10,
    data: {
      titre: '🌧️ Ce que tu ressens...',
      invitation:
        "Ton évaluation montre que tu traverses une période un peu difficile en ce moment.\n\nLe journal peut être un espace pour poser tout ça — tes pensées, tes émotions, ce qui te pèse. Tu n'as pas à aller bien pour écrire ici 🤍",
      questions_suggerees: [
        "Qu'est-ce qui me pèse le plus en ce moment ?",
        "Quand est-ce que je me suis senti(e) bien pour la dernière fois ?",
        "Qu'est-ce qui pourrait m'aider aujourd'hui ?",
      ],
    },
  },

  gad7: {
    condition: (score) => score >= 10,
    data: {
      titre: '😰 Tes inquiétudes...',
      invitation:
        "Tu sembles porter beaucoup d'inquiétudes en ce moment.\n\nÉcrire ce qui t'inquiète peut parfois aider à voir les choses plus clairement. Qu'est-ce qui tourne dans ta tête en ce moment ? 🤍",
      questions_suggerees: [
        "Qu'est-ce qui m'inquiète le plus en ce moment ?",
        "Est-ce que mes inquiétudes sont réelles ou imaginées ?",
        "Comment je peux agir sur ce qui m'inquiète ?",
      ],
    },
  },

  ceca_q: {
    condition: (score) => score >= 27,
    data: {
      titre: '🌿 Ton histoire...',
      invitation:
        "Ton évaluation révèle que ton enfance a peut-être laissé des traces.\n\nTon journal est un espace sûr pour explorer ça — sans jugement, sans pression. Ce que tu as vécu mérite d'être reconnu 🤍",
      questions_suggerees: [
        "Qu'est-ce que j'aurais voulu recevoir et que je n'ai pas eu ?",
        "Comment mon histoire familiale me touche encore aujourd'hui ?",
        "Qu'est-ce qui m'a quand même construit(e) malgré tout ?",
      ],
    },
  },

  ecr_r: {
    condition: (_score, _label, subscales) =>
      (subscales?.anxiety ?? 0) >= 3.5,
    data: {
      titre: '❤️ Tes relations...',
      invitation:
        "Ton profil d'attachement montre que les relations sont parfois une source d'inquiétude pour toi.\n\nTu peux écrire ici sur une relation qui t'affecte — amoureuse, familiale, amicale. Mettre des mots sur ce qu'on ressent aide souvent à y voir plus clair 🤍",
      questions_suggerees: [
        "Quelle relation me préoccupe en ce moment ?",
        "Pourquoi j'ai parfois peur que les gens partent ?",
        "Comment je voudrais que mes relations soient ?",
      ],
    },
  },

  rosenberg: {
    condition: (score) => score <= 15,
    data: {
      titre: '🪞 Comment tu te vois...',
      invitation:
        "Ton évaluation suggère que tu es parfois dur(e) avec toi-même.\n\nÉcrire sur soi — ses qualités, ses forces, ce qu'on aime en soi — peut changer le regard qu'on se porte. Tu mérites d'être bienveillant(e) avec toi 🤍",
      questions_suggerees: [
        "Trois choses que j'apprécie chez moi ?",
        "Quand est-ce que je me suis senti(e) fier(ère) de moi ?",
        "Comment je me parlerais si j'étais mon meilleur ami(e) ?",
      ],
    },
  },

  pss10: {
    condition: (score) => score >= 27,
    data: {
      titre: '⚡ Ce qui te stresse...',
      invitation:
        "Ton niveau de stress est assez élevé en ce moment.\n\nÉcrire ce qui te stresse peut aider à identifier les vraies sources de tension dans ta vie. Qu'est-ce qui te pèse le plus ? 🤍",
      questions_suggerees: [
        "Qu'est-ce qui me stresse le plus en ce moment ?",
        "Sur quoi j'ai du contrôle ?",
        "Qu'est-ce qui me détend vraiment ?",
      ],
    },
  },

  dependance_affective: {
    condition: (_score, label) =>
      label.includes('Élevée') || label.includes('Modérée'),
    data: {
      titre: '💔 Tes relations amoureuses...',
      invitation:
        "Ton test montre que tu as tendance à beaucoup t'investir dans tes relations.\n\nEst-ce qu'il y a une relation qui t'a particulièrement marqué(e) ? Ton journal est là pour que tu puisses en parler librement 🤍",
      questions_suggerees: [
        "Comment je me sens dans mes relations amoureuses ?",
        "Est-ce que j'ai tendance à m'oublier pour les autres ?",
        "Qu'est-ce que j'attends vraiment d'une relation ?",
      ],
    },
  },

  pression_sociale: {
    condition: (score) => score >= 15,
    data: {
      titre: "👥 Ce qu'on attend de toi...",
      invitation:
        "Il semble que tu ressens beaucoup de pression de ton entourage.\n\nLa famille, la société, les attentes — ça peut peser lourd. Tu peux écrire ici ce que tu ressens vraiment face à tout ça, loin du regard des autres 🤍",
      questions_suggerees: [
        "Qu'est-ce qu'on attend de moi que j'ai du mal à assumer ?",
        "Qu'est-ce que je voudrais faire de ma vie si personne ne me jugeait ?",
        "Comment je gère la pression familiale au quotidien ?",
      ],
    },
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

export function getJournalPrompt(
  scaleId: string,
  score: number,
  interpretationLabel: string,
  subscaleScores?: Record<string, number>,
  genre?: string
): RawPrompt | null {
  const def = PROMPT_DEFS[scaleId];
  if (!def) return null;
  if (!def.condition(score, interpretationLabel, subscaleScores)) return null;

  return {
    titre: adapt(def.data.titre, genre),
    invitation: adapt(def.data.invitation, genre),
    questions_suggerees: def.data.questions_suggerees.map(q => adapt(q, genre)),
  };
}

export async function savePendingPrompt(
  userId: string,
  sessionId: string,
  scaleId: string,
  promptData: RawPrompt
): Promise<void> {
  const docId = `${scaleId}_${sessionId.slice(-10)}`;
  await setDoc(
    doc(db, 'users', userId, 'journal_prompts', docId),
    {
      scaleId,
      sessionId,
      ...promptData,
      createdAt: new Date().toISOString(),
      ignored: false,
    }
  );
}

export async function loadPendingPrompts(userId: string): Promise<PendingPrompt[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users', userId, 'journal_prompts'),
        where('ignored', '==', false),
        limit(5)
      )
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PendingPrompt));
  } catch {
    return [];
  }
}

export async function ignorePrompt(userId: string, promptDocId: string): Promise<void> {
  await updateDoc(
    doc(db, 'users', userId, 'journal_prompts', promptDocId),
    { ignored: true }
  );
}
