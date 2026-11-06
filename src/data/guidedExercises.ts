/**
 * guidedExercises — les exercices guidés en vocal du compagnon, et les vocaux de soutien.
 * Fichiers : public/audio/<dossier>/<fichier>.mp3 (voix de femme) et public/audio/homme/<dossier>/<fichier>.mp3
 * (voix d'homme), au choix de la personne (textes : VOCAUX_compagnon.md / promo/scripts/vocaux.ts).
 *
 * Un exercice = une suite d'étapes à durée FIXE : la phrase part au début de l'étape, puis silence
 * jusqu'à la suivante. Le rythme reste exact, quelle que soit la vitesse de la voix.
 * phase : ce que fait le cercle pendant l'étape (grandit, se resserre, reste plein, ou repos).
 */

export type ExerciseId = 'coherence' | 'ancrage' | 'sommeil' | 'relacher';
export type VocalId = 'journee' | 'pensees' | 'avant';
export type Phase = 'in' | 'out' | 'hold' | 'rest';
/** Fond sonore, joué en boucle très bas sous la voix (public/audio/ambiance/fond_<id>.mp3). */
export type Ambient = 'none' | 'vagues' | 'pluie' | 'nuit';
export const AMBIENTS: { id: Ambient; label: string }[] = [
  { id: 'none', label: 'Aucun' }, { id: 'vagues', label: 'Vagues' }, { id: 'pluie', label: 'Pluie' }, { id: 'nuit', label: 'Nuit' },
];
export interface BuildOpts { minutes?: number; beginner?: boolean }

/** La voix du compagnon, au choix de la personne (gardée sur l'appareil) : femme par défaut, ou homme. */
export type VoiceGender = 'femme' | 'homme';
export const VOICES: { id: VoiceGender; label: string }[] = [{ id: 'femme', label: 'Femme' }, { id: 'homme', label: 'Homme' }];
const VOICE_GENDER_KEY = 'he_voice';
export function getVoiceGender(): VoiceGender {
  try { return localStorage.getItem(VOICE_GENDER_KEY) === 'homme' ? 'homme' : 'femme'; } catch { return 'femme'; }
}
export function setVoiceGender(v: VoiceGender) {
  try { localStorage.setItem(VOICE_GENDER_KEY, v); } catch { /* navigation privée */ }
}
/** Adresse d'un vocal : /audio/<dossier>/<fichier>.mp3 (femme) ou /audio/homme/<dossier>/<fichier>.mp3 (homme). */
export const voiceUrl = (dir: string, file: string, v: VoiceGender = getVoiceGender()) =>
  `/audio/${v === 'homme' ? 'homme/' : ''}${dir}/${file}.mp3`;

export interface Step {
  /** Fichier de voix (sans .mp3), ou null : pas de voix sur cette étape. */
  voice: string | null;
  /** Son qui guide le souffle, chemin sous /audio/ sans .mp3 (ex. 'ambiance/souffle_in_5'). */
  sound?: string;
  /** Texte affiché à l'écran (vide : on garde le précédent). */
  text: string;
  ms: number;
  phase: Phase;
}

export interface Exercise {
  id: ExerciseId;
  label: string;
  minutes: number;
  /** À quoi ça sert, en une ligne (liste et carte). */
  hint: string;
  dir: string;
  steps: Step[];
  /** Fin douce, sans message (sommeil) : l'écran s'assombrit. */
  quietEnd?: boolean;
  /** Message du compagnon à la fin. */
  done: string;
  /** Écran « Installe-toi » : la posture en une phrase. */
  setup: string;
  /** Fond sonore proposé par défaut. */
  ambient: Ambient;
  /** Durées au choix (cohérence) : les étapes sont alors construites par build(). */
  durations?: number[];
  build?: (o: BuildOpts) => Step[];
}

const s = (voice: string | null, text: string, sec: number, phase: Phase = 'rest', sound?: string): Step => ({ voice, text, ms: sec * 1000, phase, ...(sound ? { sound } : {}) });

/**
 * Cohérence cardiaque : intro, puis 6 souffles par minute (5 s / 5 s), guidés par une vague continue.
 * Débutant (première fois) : les 3 premiers cycles à 4 s / 4 s, puis 5 s / 5 s.
 * La voix ne parle qu'aux repères : 2 premiers cycles, 1 min, moitié, dernière minute, fin.
 */
function coherence(o: BuildOpts = {}): Step[] {
  const minutes = o.minutes ?? 5;
  const out: Step[] = [s('coh_intro', 'Assieds-toi, le dos droit. Tu peux fermer les yeux : la vague te guide.', 19)];
  let t = 0;
  const total = minutes * 60000;
  let c = 0;
  let halfSaid = false, lastSaid = false, minSaid = false;
  while (t < total) {
    c += 1;
    const sec = o.beginner && c <= 3 ? 4 : 5;
    let say: string | null = c <= 2 ? 'coh_inspire' : null;
    let shown = 'Inspire…';
    if (!minSaid && t >= 60000 && minutes > 3) { say = 'coh_1min'; shown = 'C\'est bien. Continue, tranquillement.'; minSaid = true; }
    else if (!halfSaid && t >= total / 2) { say = 'coh_moitie'; shown = 'Tu es à la moitié.'; halfSaid = true; }
    else if (!lastSaid && t >= total - 60000 && minutes > 3) { say = 'coh_derniere'; shown = 'Encore une minute.'; lastSaid = true; }
    out.push(s(say, shown, sec, 'in', `ambiance/souffle_in_${sec}`));
    out.push(s(c <= 2 ? 'coh_expire' : null, 'Expire…', sec, 'out', `ambiance/souffle_out_${sec}`));
    t += sec * 2000;
  }
  out.push(s('coh_fin', 'Bien joué. Le mieux : trois fois par jour. L\'effet dure quelques heures.', 9));
  return out;
}

function sommeil(): Step[] {
  const out: Step[] = [s('som_1', 'Allonge-toi, lumière basse. Si la tête te tourne, reviens simplement à ta respiration normale.', 15)];
  for (let c = 0; c < 4; c++) {
    out.push(s('som_in', 'Inspire par le nez…', 4, 'in'));
    out.push(s('som_garde', 'Garde l\'air…', 7, 'hold'));
    out.push(s('som_out', 'Souffle doucement par la bouche…', 8, 'out'));
  }
  out.push(
    s('som_2', 'Laisse ta respiration redevenir naturelle. Ton corps devient lourd.', 20),
    s('som_3', 'Si des pensées arrivent, laisse-les passer, comme des nuages.', 20),
    s('som_4', 'Ta mâchoire se détend… tes épaules descendent… tes mains sont lourdes.', 20),
    s('som_5', 'Reste là, tranquillement. Bonne nuit.', 15),
  );
  return out;
}

export const EXERCISES: Record<ExerciseId, Exercise> = {
  coherence: {
    id: 'coherence', label: 'Cohérence cardiaque', minutes: 5, hint: 'Pour calmer le stress', dir: 'coherence',
    steps: coherence(), build: coherence, durations: [3, 5, 10], ambient: 'vagues',
    setup: 'Assieds-toi, le dos droit, les pieds au sol. Tu peux fermer les yeux : la vague te guide.',
    done: 'Bien joué. Le mieux, c\'est trois fois par jour : au réveil, avant midi, et en fin d\'après-midi.',
  },
  ancrage: {
    id: 'ancrage', label: 'Ancrage 5-4-3-2-1', minutes: 2, hint: 'Quand l\'angoisse monte', dir: 'ancrage', ambient: 'none',
    setup: 'Où que tu sois, tu peux le faire. Pose tes pieds bien à plat, et garde les yeux ouverts.',
    steps: [
      s('anc_1', 'On revient ici, maintenant. Pieds bien à plat, respire une fois.', 15),
      s('anc_2', 'Cinq choses que tu vois.', 20),
      s('anc_3', 'Quatre choses que tu peux toucher.', 18),
      s('anc_4', 'Trois sons que tu entends.', 16),
      s('anc_5', 'Deux odeurs.', 14),
      s('anc_6', 'Une chose que tu peux goûter.', 12),
      s('anc_7', 'Inspire lentement… et expire, plus longtemps. Tu es ici.', 16),
      s('anc_8', 'Tu peux refaire cet exercice chaque fois que ça monte.', 10),
    ],
    done: 'Te voilà ici, maintenant. Je reste là si tu veux en parler.',
  },
  sommeil: {
    id: 'sommeil', label: 'Pour s\'endormir', minutes: 3, hint: 'Quand le sommeil ne vient pas', dir: 'sommeil',
    steps: sommeil(), quietEnd: true, ambient: 'pluie',
    setup: 'Allonge-toi, lumière éteinte ou très basse. Pose le téléphone à côté de toi, écran vers le bas si tu veux.',
    done: 'Bonne nuit. Si tu te réveilles, tu peux le refaire.',
  },
  relacher: {
    id: 'relacher', label: 'Relâcher les tensions', minutes: 3, hint: 'Quand le corps est tendu', dir: 'relacher', ambient: 'none',
    setup: 'Installe-toi sur une chaise ou sur ton lit. Sans douleur : une zone blessée, on la relâche sans la serrer.',
    steps: [
      s('rel_1', 'Installe-toi confortablement. On serre, puis on relâche. Sans forcer : si une zone te fait mal, passe-la.', 18),
      s('rel_mains_a', 'Serre les poings, fort…', 7, 'in'), s('rel_mains_b', 'Relâche. La chaleur revient dans tes mains.', 12, 'out'),
      s('rel_bras_a', 'Plie les bras et serre-les contre toi…', 7, 'in'), s('rel_bras_b', 'Relâche. Laisse tes bras tomber, lourds.', 12, 'out'),
      s('rel_epaules_a', 'Monte les épaules vers les oreilles…', 7, 'in'), s('rel_epaules_b', 'Et laisse-les tomber. Tout ce poids descend.', 12, 'out'),
      s('rel_visage_a', 'Serre la mâchoire, plisse les yeux…', 7, 'in'), s('rel_visage_b', 'Relâche. Ton front se détend, ta mâchoire s\'entrouvre.', 12, 'out'),
      s('rel_ventre_a', 'Rentre le ventre, serre-le…', 7, 'in'), s('rel_ventre_b', 'Relâche. Ton ventre se gonfle librement.', 12, 'out'),
      s('rel_jambes_a', 'Tends les jambes, ramène les orteils vers toi…', 7, 'in'), s('rel_jambes_b', 'Relâche. Tes jambes sont lourdes, bien posées.', 12, 'out'),
      s('rel_2', 'Respire lentement. S\'il reste une tension, souffle dessus en expirant.', 20),
      s('rel_3', 'Ton corps sait se détendre, tu viens de le lui rappeler.', 10),
    ],
    done: 'Bien joué. Ton corps sait se détendre : tu viens de le lui rappeler.',
  },
};

export const EXERCISE_IDS = Object.keys(EXERCISES) as ExerciseId[];

export const totalMs = (e: Exercise) => e.steps.reduce((n, x) => n + x.ms, 0);
/** Les étapes à jouer, selon la durée choisie (cohérence) et le mode débutant. */
export const stepsFor = (e: Exercise, o: BuildOpts = {}) => (e.build ? e.build(o) : e.steps);

/** Un vocal de soutien : public/audio/soutien/<file>.mp3 (ou homme/soutien/), voir voiceUrl. */
export interface Vocal { id: VocalId; label: string; file: string; seconds: number; text: string }

export const VOCALS: Record<VocalId, Vocal> = {
  journee: {
    id: 'journee', label: 'Après une journée lourde', file: 'sou_journee', seconds: 17,
    text: 'Ta journée a été lourde, et tu es encore là. Ça compte. Tu n\'as pas besoin de tout régler ce soir. Pose ce que tu portes, juste pour quelques minutes. Bois un peu d\'eau, relâche tes épaules, respire un peu plus lentement. Demain, tu y verras plus clair. Et si tu veux en parler, je suis là.',
  },
  pensees: {
    id: 'pensees', label: 'Quand les pensées tournent', file: 'sou_pensees', seconds: 21,
    text: 'Quand les pensées tournent en boucle, on ne les arrête pas de force. On les pose. Nomme ce qui tourne, en une phrase. Puis demande-toi : est-ce que je peux faire quelque chose maintenant ? Si oui, choisis un tout petit geste. Si non, ça peut attendre demain. Ramène ton attention sur tes pieds, sur ta respiration. Les pensées vont repasser. Tu n\'as pas à les suivre.',
  },
  avant: {
    id: 'avant', label: 'Avant un moment stressant', file: 'sou_avant', seconds: 24,
    text: 'C\'est normal d\'avoir le cœur qui bat : ton corps se prépare. Pose tes pieds au sol. Inspire sur quatre temps… et expire sur six. Encore une fois. Inspire… et expire, doucement. Pense à une chose que tu as déjà réussie, même petite. Tu as ce qu\'il faut. Vas-y à ton rythme.',
  },
};

export const isExerciseId = (x: unknown): x is ExerciseId => typeof x === 'string' && x in EXERCISES;
export const isVocalId = (x: unknown): x is VocalId => typeof x === 'string' && x in VOCALS;
