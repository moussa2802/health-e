/**
 * accueilFlow.ts — Moteur de la conversation d'accueil de Dr Lô (page d'accueil).
 *
 * Choix de conception (étape 1) :
 *  - Conversation SCRIPTÉE par règles, sans appel IA : gratuite (0 Kori, 0 coût API),
 *    accessible aux invités, et sans risque qu'une IA improvise face à une personne fragile.
 *  - Logique pure et sérialisable (état sauvegardé en localStorage par l'interface),
 *    testable avec `node --test tests/unit/`.
 *  - Garde-fous intégrés : détection de crise à chaque saisie libre, cadre « 18 ans et plus »,
 *    jamais de diagnostic.
 */

import type { ActiveTest } from './chatTest';
import { credits } from '../config/creditName.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Need = 'stress' | 'mal' | 'couple' | 'connaitre' | 'decouvre';
export type Genre = 'homme' | 'femme';
export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '55+';

export type Step =
  | 'need'          // qu'est-ce qui t'amène ?
  | 'need_clarify'  // réponse libre non comprise : on propose les pastilles
  | 'prenom'
  | 'genre'
  | 'age'
  | 'prescribed'    // un test est proposé, on attend que la personne le fasse
  | 'crisis'        // protocole de crise affiché
  | 'minor'         // moins de 18 ans : pas de test, orientation
  | 'testing';      // un test se déroule dans la conversation

export type Card =
  | { type: 'test'; scaleId: string; resume?: boolean }
  | { type: 'crisis' }
  | { type: 'signup'; mode?: 'signup' | 'login' }
  | { type: 'link_account' }
  | { type: 'result'; path: string };

export interface Msg {
  id: string;
  from: 'drlo' | 'user';
  text: string;
  card?: Card;
}

/** Pastille de réponse rapide. `action` = géré par l'interface (navigation), pas par le moteur. */
export interface QuickReply {
  label: string;
  value: string;
  action?: 'catalogue' | 'signup' | 'free_chat';
}

export interface AccueilState {
  v: 1;
  step: Step;
  /** Étape à reprendre après le protocole de crise. */
  resumeStep?: Step;
  need?: Need;
  prenom?: string;
  genre?: Genre;
  age?: AgeRange;
  /** Test prescrit en attente (la page résultats propose « Revenir à Dr Lô »). */
  prescribed?: string;
  /** Test en cours dans la conversation. */
  activeTest?: ActiveTest;
  /** Tests déjà commentés par Dr Lô après coup (pas de double commentaire). */
  commented: string[];
  messages: Msg[];
  seq: number;
}

/** Ce que l'interface sait déjà de la personne (compte, onboarding existant). */
export interface Known {
  isAuthenticated: boolean;
  prenom?: string;
  genre?: Genre;
  age?: AgeRange;
  guestRemaining: number;
  /** Tests déjà faits (pour ne pas represcrire un test fait). */
  doneScaleIds: string[];
  /** Nom grand public d'un test, ex. gad7 → « Anxiété ». */
  labelOf: (scaleId: string) => string;
  /** Durée estimée en minutes. */
  minutesOf: (scaleId: string) => number;
}

// ── Réglages : besoin → test ──────────────────────────────────────────────────

/** Premier test prescrit selon le besoin (tous accessibles en mode invité). */
export const NEED_TO_SCALE: Record<Need, string> = {
  stress: 'gad7',      // Anxiété
  mal: 'phq9',         // Humeur & Dépression
  couple: 'ecr_r',     // Style d'attachement (les tests « vie intime » demandent un compte)
  connaitre: 'big_five', // Personnalité
  decouvre: 'big_five',
};

/** Suite logique après le premier test : d'abord les pièces du totem. */
export const NEXT_ORDER: Record<Need, string[]> = {
  stress: ['gad7', 'pss10', 'brs', 'big_five', 'rses', 'phq9', 'ecr_r'],
  mal: ['phq9', 'rses', 'brs', 'gad7', 'pss10', 'big_five', 'ecr_r'],
  couple: ['ecr_r', 'rses', 'big_five', 'brs', 'gad7', 'pss10', 'phq9'],
  connaitre: ['big_five', 'ecr_r', 'rses', 'brs', 'gad7', 'pss10', 'phq9'],
  decouvre: ['big_five', 'rses', 'ecr_r', 'brs', 'gad7', 'pss10', 'phq9'],
};

/** Ce que chaque test apporte au portrait (phrase « pourquoi la suite »). */
export const WHY_NEXT: Record<string, string> = {
  gad7: 'comprendre comment ton corps et ta tête réagissent à l\'inquiétude',
  pss10: 'mesurer la pression que tu portes au quotidien',
  phq9: 'faire le point sur ton moral de ces dernières semaines',
  big_five: 'dessiner les grands traits de ta personnalité',
  ecr_r: 'comprendre comment tu t\'attaches aux autres',
  rses: 'voir comment tu te regardes toi-même',
  brs: 'mesurer ta capacité à rebondir',
};

export const NEED_REPLIES: QuickReply[] = [
  { label: 'Je suis stressé(e)', value: 'need:stress' },
  { label: 'Je veux mieux me connaître', value: 'need:connaitre' },
  { label: 'Ça ne va pas en ce moment', value: 'need:mal' },
  { label: 'Problème de couple / vie intime', value: 'need:couple' },
  { label: 'Je découvre', value: 'need:decouvre' },
];

const AGE_REPLIES: QuickReply[] = [
  { label: 'Moins de 18 ans', value: 'age:minor' },
  { label: '18-25', value: 'age:18-25' },
  { label: '26-35', value: 'age:26-35' },
  { label: '36-45', value: 'age:36-45' },
  { label: '46-55', value: 'age:46-55' },
  { label: '55+', value: 'age:55+' },
];

// ── Détection (texte libre) ───────────────────────────────────────────────────

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Signaux de crise (idées suicidaires, automutilation). Volontairement large :
 * mieux vaut afficher les ressources à tort que les rater.
 * TODO : ajouter les formulations en wolof (liste à fournir par Dr Lô).
 */
const CRISIS_PATTERNS: RegExp[] = [
  /suicid/,
  /\bme tuer\b/,
  /\bme donner la mort\b/,
  /\ben finir\b/,
  /mettre fin a (mes jours|ma vie)/,
  /(plus|pas) envie de vivre/,
  /envie de mourir/,
  /\b(veux|voudrais|prefere|aimerais) mourir\b/,
  /me faire du mal/,
  /\bme couper\b/,
  /scarifi/,
  /automutil/,
  /\bme pendre\b/,
  /\bdisparaitre\b/,
];

export function detectCrisis(text: string): boolean {
  const t = normalize(text);
  return CRISIS_PATTERNS.some(re => re.test(t));
}

export interface NeedMatch { need: Need; scaleId?: string }

export function classifyNeed(text: string): NeedMatch | null {
  const t = normalize(text);
  if (/\bdeuil\b|\bdeces\b|(perdu|perte de) (mon|ma|mes|un|une)\b|est decede|est mort/.test(t)) {
    return { need: 'mal', scaleId: 'pg13' };
  }
  if (/couple|copain|copine|\bmari\b|epou|relation|amour|amoureu|\bsexe|sexuel|intim|jalou|rupture|tromp|crush|fiance/.test(t)) {
    return { need: 'couple' };
  }
  if (/sommeil|\bdor(s|t|mir|mais|mons)\b|insomni/.test(t)) return { need: 'stress', scaleId: 'pss10' };
  if (/stress|anxi|angoiss|panique|nerveu|inquiet|pression|\bpeur\b/.test(t)) return { need: 'stress' };
  if (/deprim|triste|tristesse|\bmal\b|ca va pas|ca ne va pas|\bvide\b|\bseule?\b|pleur|moral|decourag|epuis|fatigu/.test(t)) {
    return { need: 'mal' };
  }
  if (/connaitre|personnalite|qui je suis|comprendre|profil|caractere/.test(t)) return { need: 'connaitre' };
  if (/decouvr|curieu|\btest|regarder|essayer|voir/.test(t)) return { need: 'decouvre' };
  return null;
}

export function parsePrenom(text: string): string | null {
  let t = text.trim().replace(/^(je m'?appelle|je m’appelle|moi c'?est|c'?est|mon (pre)?nom (c'?est|est))\s+/i, '');
  t = t.replace(/[^\p{L}\s'-]/gu, '').trim();
  const first = t.split(/\s+/)[0] ?? '';
  if (first.length < 2 || first.length > 30) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function parseGenre(text: string): Genre | null {
  const t = normalize(text);
  if (/\b(homme|garcon|mec|masculin|un gars|monsieur)\b/.test(t)) return 'homme';
  if (/\b(femme|fille|feminin|madame|meuf)\b/.test(t)) return 'femme';
  return null;
}

export function parseAge(text: string): AgeRange | 'minor' | null {
  const m = normalize(text).match(/\b(\d{1,2})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 18) return 'minor';
  if (n <= 25) return '18-25';
  if (n <= 35) return '26-35';
  if (n <= 45) return '36-45';
  if (n <= 55) return '46-55';
  return '55+';
}

// ── Outils ────────────────────────────────────────────────────────────────────

/** Accord selon le genre connu : g(state, 'stressé', 'stressée'). */
function g(s: Pick<AccueilState, 'genre'>, m: string, f: string): string {
  if (s.genre === 'homme') return m;
  if (s.genre === 'femme') return f;
  return `${m}(e)`.replace(/e\(e\)$/, 'e');
}

function push(s: AccueilState, from: Msg['from'], text: string, card?: Card): AccueilState {
  const seq = s.seq + 1;
  const msg: Msg = { id: `m${seq}`, from, text, ...(card ? { card } : {}) };
  return { ...s, seq, messages: [...s.messages, msg] };
}

/**
 * Échange hors script (humeur, respiration) : ajoute la phrase de la personne
 * (facultative) puis les réponses de Dr Lô, sans changer d'étape.
 */
export function addExchange(s: AccueilState, userText: string | null, drlo: (string | { text: string; card?: Card })[]): AccueilState {
  let out = userText ? push(s, 'user', userText) : s;
  for (const t of drlo) out = typeof t === 'string' ? push(out, 'drlo', t) : push(out, 'drlo', t.text, t.card);
  return out;
}

export function pickNextScale(need: Need, done: string[], exclude: string[] = []): string | null {
  return NEXT_ORDER[need].find(id => !done.includes(id) && !exclude.includes(id)) ?? null;
}

// ── Démarrage ─────────────────────────────────────────────────────────────────

export function startConversation(k: Known): AccueilState {
  let s: AccueilState = {
    v: 1, step: 'need', commented: [], messages: [], seq: 0,
    prenom: k.prenom, genre: k.genre, age: k.age,
  };
  const hello = k.prenom
    ? `Bonjour ${k.prenom} 👋 Content de te revoir. Comment tu vas aujourd'hui, et qu'est-ce qui t'amène ?`
    : `Salut 👋 Moi c'est Dr Lô. Comment tu vas, et qu'est-ce qui t'amène ici ?`;
  s = push(s, 'drlo', hello);
  if (!k.isAuthenticated) {
    s = push(s, 'drlo', `Ici, tu peux faire ${k.guestRemaining > 0 ? k.guestRemaining : 3} tests gratuits, sans créer de compte. Ce que tu me dis reste sur ton téléphone.`);
  }
  return s;
}

// ── Réponses rapides affichées selon l'étape ─────────────────────────────────

export function getQuickReplies(s: AccueilState, k: Known): QuickReply[] {
  switch (s.step) {
    case 'need':
    case 'need_clarify':
      return NEED_REPLIES;
    case 'prenom':
      return [{ label: 'Je préfère ne pas le dire', value: 'prenom:skip' }];
    case 'genre':
      return [{ label: 'Un homme', value: 'genre:homme' }, { label: 'Une femme', value: 'genre:femme' }];
    case 'age':
      return AGE_REPLIES;
    case 'crisis':
      return [{ label: 'Je suis en sécurité, on peut continuer', value: 'crisis:safe' }];
    case 'prescribed': {
      const r: QuickReply[] = [
        ...(s.prescribed ? [{ label: 'Pourquoi ce test ?', value: 'why' }] : []),
        { label: 'Voir tous les tests', value: 'catalogue', action: 'catalogue' as const },
      ];
      if (k.isAuthenticated) r.push({ label: `Parler librement (${credits(1)} / message)`, value: 'free_chat', action: 'free_chat' });
      else if (k.guestRemaining <= 0) r.push({ label: 'Créer mon compte', value: 'signup', action: 'signup' });
      return r;
    }
    case 'minor':
    case 'testing':
      return [];
  }
}

// ── Avancer d'une étape ───────────────────────────────────────────────────────

const ACKS: Record<Need, (s: AccueilState) => string> = {
  stress: () => `Le stress, c'est lourd à porter. Tu as bien fait de venir, on va y voir plus clair ensemble.`,
  mal: () => `Merci de me faire confiance. Je suis là pour t'écouter et t'aider à mettre des mots sur ce que tu vis.`,
  couple: () => `Les histoires de cœur et d'intimité, on en parle peu… Ici, tu peux, sans jugement.`,
  connaitre: () => `Belle démarche. Se connaître, c'est la base de tout le reste.`,
  decouvre: () => `Bienvenue ! Je vais te guider pas à pas, en douceur.`,
};

/** Pose la prochaine question d'identité manquante, ou prescrit le test. */
function askNextOrPrescribe(s: AccueilState, k: Known): AccueilState {
  if (!s.prenom && s.step !== 'genre' && s.step !== 'age' && !s.messages.some(m => m.text.startsWith('Au fait, comment tu t\'appelles'))) {
    return { ...push(s, 'drlo', `Au fait, comment tu t'appelles ? Juste ton prénom ou un surnom.`), step: 'prenom' };
  }
  if (!s.genre) {
    const hi = s.prenom ? `Enchanté ${s.prenom} ! ` : '';
    return { ...push(s, 'drlo', `${hi}Pour bien m'adresser à toi : tu es…`), step: 'genre' };
  }
  if (!s.age) {
    return { ...push(s, 'drlo', `Et tu as quel âge ?`), step: 'age' };
  }
  return prescribe(s, k);
}

function prescribe(s: AccueilState, k: Known, forcedScale?: string): AccueilState {
  const need = s.need ?? 'decouvre';
  const first = forcedScale && !k.doneScaleIds.includes(forcedScale)
    ? forcedScale
    : (!k.doneScaleIds.includes(NEED_TO_SCALE[need]) ? NEED_TO_SCALE[need] : pickNextScale(need, k.doneScaleIds));
  if (!first) {
    let out = push(s, 'drlo', `Tu as déjà fait les tests par lesquels je commence d'habitude. Va jeter un œil au catalogue, il en reste plein à découvrir.`);
    out = { ...out, step: 'prescribed' };
    return out;
  }
  const label = k.labelOf(first);
  const mins = k.minutesOf(first);
  let out = push(s, 'drlo', `Vu ce que tu m'as dit, je te propose de commencer par le test « ${label} » : environ ${mins} minutes. Ensuite on en reparle ici, et je te dirai ce que ton résultat raconte.`, { type: 'test', scaleId: first });
  out = { ...out, step: 'prescribed', prescribed: first };
  return out;
}

function enterCrisis(s: AccueilState): AccueilState {
  const resumeStep = s.step === 'crisis' ? s.resumeStep : s.step;
  let out = push(s, 'drlo', `Ce que tu viens d'écrire est important, et je suis vraiment content que tu l'aies dit. Tu n'as pas à traverser ça ${g(s, 'seul', 'seule')}.`);
  out = push(out, 'drlo', `Je suis un compagnon de bien-être, pas une équipe de secours : là, tu as besoin d'une vraie personne. Appelle un de ces numéros, ou parle tout de suite à quelqu'un de confiance autour de toi.`, { type: 'crisis' });
  return { ...out, step: 'crisis', resumeStep };
}

export interface Input {
  /** Valeur d'une pastille (ex. 'need:stress'). */
  value?: string;
  /** Texte libre tapé par la personne. */
  text?: string;
  /** Libellé de la pastille, affiché comme message de la personne. */
  label?: string;
}

export function respond(state: AccueilState, input: Input, k: Known): AccueilState {
  const text = (input.text ?? '').trim();
  const value = input.value ?? '';
  let s = push(state, 'user', input.label ?? text ?? value);

  // 1. Crise : prioritaire sur tout, à chaque saisie libre
  if (text && detectCrisis(text)) return enterCrisis(s);

  if (s.step === 'minor') return s;

  if (s.step === 'crisis') {
    if (value === 'crisis:safe') {
      s = push(s, 'drlo', `D'accord. Merci de me le dire. Les numéros restent juste au-dessus si tu en as besoin, à n'importe quel moment.`);
      const back = s.resumeStep ?? 'need';
      s = { ...s, step: back, resumeStep: undefined };
      if (back === 'need' || back === 'need_clarify') return push(s, 'drlo', `Quand tu te sens prêt(e) : qu'est-ce qui t'amène ici ?`);
      if (back === 'testing') return push(s, 'drlo', `On reprend quand tu veux, à ton rythme. Tu peux aussi mettre le test en pause.`);
      return askNextOrPrescribe(s, k);
    }
    return push(s, 'drlo', `Je reste là. Si tu es en danger maintenant, appelle le 1515 (SAMU) ou un des numéros ci-dessus.`);
  }

  switch (s.step) {
    case 'testing':
      return push(s, 'drlo', `Je t'ai lu. Pour le test, choisis plutôt une des réponses juste en dessous : c'est ce qui permet de calculer ton repère. Et si quelque chose te pèse, on en parle juste après.`);
    case 'need':
    case 'need_clarify': {
      let match: NeedMatch | null = null;
      if (value.startsWith('need:')) match = { need: value.slice(5) as Need };
      else if (text) match = classifyNeed(text);
      if (!match) {
        if (s.step === 'need_clarify') {
          match = { need: 'decouvre' };
          s = push(s, 'drlo', `Pas de souci, on va commencer simplement, et on affinera au fur et à mesure.`);
        } else {
          s = push(s, 'drlo', `Merci de me le dire. Pour bien t'orienter, ça ressemble plutôt à quoi ?`);
          return { ...s, step: 'need_clarify' };
        }
      } else {
        s = push(s, 'drlo', ACKS[match.need](s));
      }
      s = { ...s, need: match.need };
      if (match.scaleId) s = { ...s, prescribed: match.scaleId };
      const next = askNextOrPrescribe({ ...s, step: 'need' }, k);
      // Une correspondance précise (deuil, sommeil) l'emporte sur le test par défaut du besoin
      if (next.step === 'prescribed' && match.scaleId) return prescribe(s, k, match.scaleId);
      return next;
    }
    case 'prenom': {
      if (value !== 'prenom:skip' && text) {
        const p = parsePrenom(text);
        if (p) s = { ...s, prenom: p };
      }
      s = { ...s, step: 'genre' };
      const out = askNextOrPrescribeAfterIdentity(s, k);
      return out;
    }
    case 'genre': {
      const gv = value.startsWith('genre:') ? (value.slice(6) as Genre) : parseGenre(text);
      if (!gv) return push(s, 'drlo', `Je n'ai pas bien saisi : un homme ou une femme ?`);
      s = { ...s, genre: gv, step: 'age' };
      return askNextOrPrescribeAfterIdentity(s, k);
    }
    case 'age': {
      const av = value.startsWith('age:') ? value.slice(4) : parseAge(text);
      if (!av) return push(s, 'drlo', `Tu peux me donner ton âge, ou choisir une tranche juste en dessous ?`);
      if (av === 'minor') {
        s = push(s, 'drlo', `Merci pour ta franchise 🙏 Health-e est réservé aux adultes (18 ans et plus) : certains sujets ici ne sont pas adaptés avant cet âge.`);
        s = push(s, 'drlo', `Si quelque chose te pèse, parles-en à un adulte de confiance : un parent, un enseignant, l'infirmier de ton école. Et en cas d'urgence, ces numéros sont là pour toi.`, { type: 'crisis' });
        return { ...s, step: 'minor' };
      }
      s = { ...s, age: av as AgeRange };
      return prescribe(s, k, s.prescribed);
    }
    case 'prescribed': {
      if (value === 'why' && s.prescribed) {
        const why = WHY_NEXT[s.prescribed];
        return push(s, 'drlo', why
          ? `Parce que c'est le meilleur point de départ pour ${why}. Ce n'est pas un diagnostic : c'est un repère, et on le lira ensemble.`
          : `C'est un bon point de départ vu ce que tu m'as dit. Ce n'est pas un diagnostic : c'est un repère, et on le lira ensemble.`);
      }
      if (text) {
        const match = classifyNeed(text);
        if (match && match.need !== s.need) {
          s = push(s, 'drlo', ACKS[match.need](s));
          return prescribe({ ...s, need: match.need }, k, match.scaleId);
        }
        return push(s, 'drlo', k.isAuthenticated
          ? `Je t'ai bien lu. Le mieux, c'est de commencer par le test proposé : on en reparle juste après. Si tu veux discuter plus longuement maintenant, tu peux aussi ouvrir le chat libre.`
          : `Je t'ai bien lu. Le mieux, c'est de commencer par le test proposé : on en reparle juste après, ici même.`);
      }
      return s;
    }
  }
  return s;
}

/** Après prénom / genre : continuer sans reposer la question du prénom. */
function askNextOrPrescribeAfterIdentity(s: AccueilState, k: Known): AccueilState {
  if (!s.genre) {
    const hi = s.prenom ? `Enchanté ${s.prenom} ! ` : '';
    return { ...push(s, 'drlo', `${hi}Pour bien m'adresser à toi : tu es…`), step: 'genre' };
  }
  if (!s.age) return { ...push(s, 'drlo', `Et tu as quel âge ?`), step: 'age' };
  return prescribe(s, k, s.prescribed);
}

// ── Retour après le test ──────────────────────────────────────────────────────

export interface TestOutcome {
  scaleId: string;
  resultLabel: string;
  severity: string;
  referralRequired: boolean;
  /** Alerte la plus haute déclenchée par une réponse (1 vigilance, 2 alerte, 3 critique). */
  alertLevel?: number;
}

export interface AfterTestCtx {
  portraitPct: number;
  /** null = pas de limite (compte connecté). */
  guestRemaining: number | null;
  /** Lien vers le résultat détaillé (test fait dans la conversation). */
  resultPath?: string;
}

export function afterTest(state: AccueilState, o: TestOutcome, ctx: AfterTestCtx, k: Known): AccueilState {
  if (state.commented.includes(o.scaleId)) return state;
  const label = k.labelOf(o.scaleId);
  let s: AccueilState = { ...state, commented: [...state.commented, o.scaleId], prescribed: undefined, activeTest: undefined };

  const critical = (o.alertLevel ?? 0) >= 3;
  const crisisShown = state.messages.slice(-6).some(m => m.card?.type === 'crisis');
  s = push(s, 'drlo', critical
    ? `Merci d'avoir répondu jusqu'au bout. Ton repère pour « ${label} » : « ${o.resultLabel} ».`
    : `Tu as terminé le test « ${label} » 👏 Ton repère : « ${o.resultLabel} ».`,
    ctx.resultPath ? { type: 'result', path: ctx.resultPath } : undefined);

  // Une réponse critique (ex. idées noires) compte plus que le score global :
  // pas de « c'est rassurant », pas de test suivant proposé, orientation humaine.
  if (critical) {
    s = push(s, 'drlo', `Quel que soit le score, une de tes réponses compte plus que tout le reste : ce que tu as dit sur les pensées de te faire du mal. Je ne pose pas de diagnostic, mais je te demande d'en parler à un professionnel de santé, cette semaine si tu peux. Et si ça devient urgent, appelle ${crisisShown ? 'un des numéros juste au-dessus' : 'tout de suite'}.`, crisisShown ? undefined : { type: 'crisis' });
    s = push(s, 'drlo', `On ne fait pas d'autre test pour l'instant. Je suis là si tu veux écrire ce que tu ressens, ou respirer un moment avec moi.`);
    return { ...s, step: 'prescribed' };
  }

  if (o.referralRequired || o.severity === 'severe' || o.severity === 'alert') {
    s = push(s, 'drlo', `Ce résultat montre que tu traverses une période vraiment difficile. Je ne pose pas de diagnostic, mais je te conseille d'en parler à un professionnel de santé : tu mérites d'être ${g(s, 'accompagné', 'accompagnée')}.`, { type: 'crisis' });
  } else if (o.severity === 'moderate') {
    s = push(s, 'drlo', `Ça montre que ça pèse vraiment en ce moment. C'est déjà un pas de l'avoir mis en lumière.`);
  } else if ((o.alertLevel ?? 0) >= 2) {
    s = push(s, 'drlo', `Dans l'ensemble, c'est plutôt modéré. Mais une de tes réponses mérite qu'on s'y arrête : le détail est dans ton résultat, et en parler à un professionnel peut vraiment aider.`);
  } else {
    s = push(s, 'drlo', `C'est plutôt rassurant. Ça ne veut pas dire que tout est simple, mais tu as des ressources.`);
  }

  const done = [...k.doneScaleIds, o.scaleId];
  const next = pickNextScale(s.need ?? 'decouvre', done);

  if (ctx.guestRemaining !== null && ctx.guestRemaining <= 0) {
    s = push(s, 'drlo', `Ton portrait se dessine : ${ctx.portraitPct} %. Tu as utilisé tes tests gratuits : crée ton compte pour le garder et qu'on continue ensemble.`, { type: 'signup' });
    return { ...s, step: 'prescribed' };
  }
  if (!next) {
    s = push(s, 'drlo', `Ton portrait se dessine : ${ctx.portraitPct} %. Il reste encore plein de pièces à découvrir dans le catalogue.`);
    return { ...s, step: 'prescribed' };
  }
  const why = WHY_NEXT[next];
  const rest = ctx.guestRemaining !== null ? ` Il te reste ${ctx.guestRemaining} test${ctx.guestRemaining > 1 ? 's' : ''} gratuit${ctx.guestRemaining > 1 ? 's' : ''}.` : '';
  s = push(s, 'drlo', `Ton portrait se dessine : ${ctx.portraitPct} %. La prochaine pièce, c'est « ${k.labelOf(next)} »${why ? `, pour ${why}` : ''}. On en reparle juste après ?${rest}`, { type: 'test', scaleId: next });
  return { ...s, step: 'prescribed', prescribed: next };
}

// ── Test dans la conversation ─────────────────────────────────────────────────

/** Démarre (ou reprend) un test : Dr Lô l'annonce. La question suit avec `askQuestion`. */
export function beginChatTest(state: AccueilState, test: ActiveTest, intro: string): AccueilState {
  let s = push(state, 'user', Object.keys(test.answers).length > 0 ? 'On reprend le test' : 'C\'est parti');
  s = push(s, 'drlo', intro);
  return { ...s, step: 'testing', activeTest: test, prescribed: test.scaleId };
}

export function askQuestion(state: AccueilState, itemId: number, text: string): AccueilState {
  if (!state.activeTest) return state;
  const s = push(state, 'drlo', text);
  return { ...s, activeTest: { ...state.activeTest, askedItemId: itemId } };
}

export function recordChatAnswer(state: AccueilState, itemId: number, value: number, label: string): AccueilState {
  if (!state.activeTest) return state;
  const s = push(state, 'user', label);
  return { ...s, activeTest: { ...state.activeTest, answers: { ...state.activeTest.answers, [itemId]: value }, askedItemId: null } };
}

/** Réponse inquiétante pendant le test : ressources tout de suite, puis on continue si la personne veut. */
export function alertDuringTest(state: AccueilState, message: string, isLast = false): AccueilState {
  let s = push(state, 'drlo', message, { type: 'crisis' });
  s = push(s, 'drlo', isLast
    ? `Tu n'as pas à porter ça ${g(s, 'seul', 'seule')}. Je regarde l'ensemble de tes réponses avec toi.`
    : `Tu n'as pas à porter ça ${g(s, 'seul', 'seule')}. Si tu en as la force, on peut finir le test ensemble : ça m'aidera à mieux t'orienter.`);
  return s;
}

/** Pause : les réponses sont gardées, la carte permet de reprendre. */
export function pauseChatTest(state: AccueilState, doneCount: number, label: string): AccueilState {
  if (!state.activeTest) return state;
  const scaleId = state.activeTest.scaleId;
  let s = push(state, 'user', 'Je continue plus tard');
  s = push(s, 'drlo', `Pas de souci. Tes ${doneCount} réponse${doneCount > 1 ? 's sont gardées' : ' est gardée'} : on reprendra « ${label} » là où tu t'es ${g(s, 'arrêté', 'arrêtée')}, quand tu veux.`, { type: 'test', scaleId, resume: true });
  return { ...s, step: 'prescribed', activeTest: undefined, prescribed: scaleId };
}

// ── Espace personnel dans le chat ────────────────────────────────────────────

/** Dr Lô propose de créer (ou retrouver) l'espace, avec la carte d'inscription. */
export function signupInvite(state: AccueilState, mode: 'signup' | 'login', userText?: string): AccueilState {
  const p = state.prenom ? `${state.prenom}, ` : '';
  let s = userText ? push(state, 'user', userText) : state;
  s = push(s, 'drlo', mode === 'login'
    ? `On retrouve ton espace ? Connecte-toi comme d'habitude : ce qu'on vient de faire ensemble te suivra.`
    : `${p}je voudrais garder ton portrait pour la prochaine fois, avec ce qu'on vient de découvrir. On te crée ton espace ? Ça prend 10 secondes.`,
    { type: 'signup', mode });
  return s;
}

export interface WelcomeInfo {
  isNew: boolean;
  /** Noms grand public des tests invités ajoutés au compte. */
  importedTests: string[];
  journalCount: number;
  /** Ancien compte par téléphone : proposer de relier Google ou un e-mail. */
  phoneOnly: boolean;
}

export function welcomeAfterAuth(state: AccueilState, w: WelcomeInfo): AccueilState {
  const p = state.prenom ? `, ${state.prenom}` : '';
  let text = w.isNew ? `C'est fait${p} ! Bienvenue dans ton espace.` : `Content de te retrouver${p} !`;
  const added: string[] = [];
  if (w.importedTests.length === 1) added.push(`ton test « ${w.importedTests[0]} »`);
  else if (w.importedTests.length > 1) added.push(`tes ${w.importedTests.length} tests (${w.importedTests.join(', ')})`);
  if (w.journalCount > 0) added.push(`${w.journalCount > 1 ? `tes ${w.journalCount} confidences` : 'ta confidence'}`);
  if (added.length) text += ` J'ai ajouté à ton espace ${added.join(' et ')}.`;
  let s = push(state, 'drlo', text);
  if (w.phoneOnly) {
    s = push(s, 'drlo', `Une dernière chose : la connexion par SMS va bientôt s'arrêter. Relie Google ou ton e-mail à ton espace pour ne jamais le perdre. Un seul geste.`, { type: 'link_account' });
  } else {
    s = push(s, 'drlo', state.prescribed && state.step === 'prescribed'
      ? `On reprend là où on s'était arrêtés ?`
      : `Qu'est-ce qu'on regarde ensemble maintenant ?`);
  }
  return s;
}
