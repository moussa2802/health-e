/**
 * ConversationAccueil — Le premier écran vivant : la page d'accueil EST Dr Lô.
 *
 *  - conversation scriptée (src/utils/accueilFlow.ts) ; le texte libre est compris par l'IA (drlo-route, gratuit)
 *  - Dr Lô montre ce qu'il fait réellement : il lit, réfléchit, écrit (DrLoAvatar)
 *  - ambiance selon le moment de la journée (src/utils/drloMoment.ts)
 *  - on répond directement : pastilles + champ libre + dictée (Web Speech, rien n'est gardé)
 *  - « Noter mon humeur · 30 s » (src/utils/moodLog.ts) et « Respirer avec moi · 1 min »
 * L'état est gardé dans le navigateur (localStorage) : rien n'est envoyé au serveur.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, Heart, Mail, PawPrint, Users, Check, ChevronDown, ChevronLeft, ClipboardCheck, Clock, CloudSun, Copy, EyeOff, ListChecks, Lock, MessagesSquare, Mic, Pencil, Phone, Plus, Send, Sparkles, Sprout, Trash2, Wind } from 'lucide-react';
import './accueil.css';
import DrLoAvatar, { type DrLoState } from './DrLoAvatar';
import DrLoIsland from './DrLoIsland';
import MoodIcon from './MoodIcon';
import ConfierPanel, { CONFIER } from './ConfierPanel';
import SignupCard, { LinkAccountCard, SIGNUP_PENDING_KEY } from './SignupCard';
import { migrateGuestData } from '../../services/guestMigration';
import { recordMood, deleteMood, fetchMoods } from '../../services/moodService';
import { captureReferral, registerReferralIfAny } from '../../services/drloQuestionService';
import { AURA_FULL, CREDIT, LOW_CREDIT, credits } from '../../config/creditName';
import { useAuth } from '../../contexts/AuthContext';
import { useKoris } from '../../contexts/KorisContext';
import {
  addExchange, addOpener,
  enterCrisis,
  afterTest,
  pickNextScale,
  alertDuringTest,
  askQuestion,
  beginChatTest,
  pauseChatTest,
  recordChatAnswer,
  signupInvite,
  welcomeAfterAuth,
  getQuickReplies,
  respond,
  routeDecision,
  newDay,
  firstName,
  detectCrisis,
  parseAge,
  parseGenre,
  GO,
  startConversation,
  type AccueilState,
  type Card,
  type Known,
  type Msg,
  type QuickReply,
} from '../../utils/accueilFlow';
import { computePortrait } from '../../utils/drLoGuide';
import ResultShareCard from './ResultShareCard';
import TotemTeaserCard from './TotemTeaserCard';
import { getMoment, greetingFor, PALETTES, type MomentPalette } from '../../utils/drloMoment';
import {
  dayKey, loadMoods, MOOD_STORAGE_PREFIX, moodById, moodReply, MOODS, type MoodId,
} from '../../utils/moodLog';
import { trackAccueil, setAccueilPrescribed } from '../../utils/accueilTracking';
import { getOnboardingProfile, saveOnboardingProfile, savePartialOnboarding } from '../../utils/onboardingProfile';
import { mergeIndex, pickNewer, trimForCloud } from '../../utils/threadSync';
import RichText from './RichText';
import { deleteThread, pullThread, pushIndex, pushThread } from '../../services/threadSyncService';
import { getAllGuestResults, getGuestCount, GUEST_MAX_TESTS } from '../../utils/guestSession';
import { getProfileProgress, saveOnboardingToProfile } from '../../services/evaluationService';
import { ALL_SCALES, getScaleById, MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import { getScaleMeta } from '../../utils/scaleMeta';
import { getCrisisResources } from '../../data/crisisResources';
import { invalidateTalkContext, rememberNow, talk as talkToDrLo, type TalkAction } from '../../services/drloTalk';

import { useDictation } from '../../hooks/useDictation';
import { useDiscretHint } from '../../utils/discretHint';
import { ShowcaseCards, DiscoveryRow } from './ShowcaseCards';
import { fetchResultComment } from '../../services/drloResultService';
import { startChatTest, recordAnswer, finishChatTest, loadScale } from '../../services/chatTestRunner';
import { routeText } from '../../services/drloRouteService';
import { checkCompatCode, defiCreate, defiPreview, defiUrl, loadSocialProfile, runCompat, type DefiInput } from '../../services/socialChat';
import {
  addPerso, cleanCustom, cleanDisplayName, cleanTitre, defiNext, flowChips, flowWantsText, OPTIN_LABELS, parseCompatCode,
  previewItems, replaceQuestion, SAY, startCompat, startDefi, titreFor, toggleOptin, withPreview,
  type DefiAudience, type SocialFlow,
} from '../../utils/socialFlow';
import { RELATIONSHIP_CATEGORIES } from '../../utils/relationshipTypes';
import { getTotemProgress, getTotemSignature, totemWords, type TotemAnimal } from '../../utils/totemAlgorithm';
import {
  convStorageKey, createConv, deleteConv, loadIndex, MAIN_ID, renameConv, saveIndex, sortedConvs, touchConv, type ConvIndex,
} from '../../utils/conversations';
import { KORIS_COSTS, isTestFreeRetake, isFirstTestFree } from '../../services/korisService';
import ProgrammePanel from './ProgrammePanel';
import CompanionNaming from './CompanionNaming';
import { COMPANION_DEFAULT, companionAsked, getCompanionName, markCompanionAsked, saveCompanionName } from '../../utils/companion';
import NotificationsPanel, { NotifOptinCard, type LiveItem } from './NotificationsPanel';
import { loadInbox, type InboxItem } from '../../services/inboxService';
import { canProposeReminders, loadPrefs, markSeen, noteProposed, permissionState, pushSupport } from '../../services/pushService';
import { isReminderRequest, shouldResume } from '../../utils/pushGuide';
import { ProgrammeInviteCard, ProgrammeOfferCard, ProgrammeOpenCard, type ProgCardEnv } from './ProgrammeCards';
import {
  addDays, bilanDue, bilanSummary, dayNumber, daysBetween, hardStreak, MIN_DAYS_BEFORE_RETEST, newProgramme,
  pause as pauseProg, planFor, retestInfo, programmeSignals, remainingToday, resume as resumeProg, setRoutine, setSleep, toggleCheck, toggleRoutine, withResult,
  type AxisSignal, type EngKey, type Programme, type SleepNote,
} from '../../utils/programme';
import { AXES, type ProgAxis } from '../../data/programmeLibrary';
import { TOTEM_ROUTINES } from '../../data/totemGuide';
import { addCarnet, saveConfidence } from '../../services/confierService';
import { bilanProgramme, closeProgramme, loadProgramme, proposeProgramme, saveProgramme } from '../../services/programmeService';
import {
  nextItem, previousItem, progress, introText, questionText, fullItemText, criticalAlert, visibleItems,
} from '../../utils/chatTest';
import type { AssessmentScale, AnswerOption } from '../../types/assessment';
import type { ScaleResult } from '../../types/assessment';

import CompanionMark from './CompanionMark';
const STORAGE_PREFIX = 'he_accueil_v1:';
/** Les traces écrites des exercices du programme vont dans ce carnet du journal. */
const PROGRAMME_CARNET = 'Programme';

/** Date d'un résultat (Date, texte ou Timestamp Firestore) en ISO. */
function toIso(c: unknown): string {
  if (c instanceof Date) return c.toISOString();
  if (typeof c === 'string') return c;
  if (c && typeof (c as { toDate?: () => Date }).toDate === 'function') return (c as { toDate: () => Date }).toDate().toISOString();
  return new Date().toISOString();
}

/** Invitation au programme juste après un test qui le justifie. */
function programmeInvite(sig: AxisSignal) {
  return {
    text: sig.fragile
      ? 'En plus de l\'avis d\'un professionnel, je peux t\'accompagner chaque jour pendant 4 semaines, en douceur : quelques minutes d\'exercices choisis pour toi.'
      : 'Si tu veux, je peux aussi t\'accompagner chaque jour pendant 4 semaines : quelques minutes d\'exercices choisis pour toi.',
    card: { type: 'programme_invite' as const, axes: [sig.axis] },
  };
}
const TOTAL_CORE = MENTAL_HEALTH_SCALES.length + SEXUAL_HEALTH_SCALES.length;
const BREATH_MS = 4000;
const BREATH_TOTAL_MS = 60000;

// Couleurs du thème chaud sombre (maquettes « Mon Dr Lô »)
const C = {
  text: '#F4EEE4', soft: '#DCD3C5', muted: '#CFC6B8', faint: '#A79E90', title: '#FBF5EA',
  sage: '#9DBFAF', line: 'rgba(255,255,255,.14)', glass: 'rgba(255,255,255,.05)', ink: '#1C140D',
};

function loadState(key: string): AccueilState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as AccueilState;
    return s && s.v === 1 && Array.isArray(s.messages) ? s : null;
  } catch { return null; }
}
function saveState(key: string, s: AccueilState) {
  try { localStorage.setItem(key, JSON.stringify({ ...s, savedAt: new Date().toISOString() })); } catch { /* stockage indisponible */ }
}
/** Copie venue du compte : gardée telle quelle (avec sa date). */
function saveRaw(key: string, s: AccueilState) {
  try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* stockage indisponible */ }
}
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Phase = 'idle' | 'thinking' | 'reading' | 'writing';
type Hint = 'thinking' | 'reading' | 'quick';

/**
 * Révélation progressive des nouveaux messages de Dr Lô :
 * il réfléchit (ou relit), puis écrit mot à mot. Instantané si « réduire les animations ».
 */
function useReveal(messages: Msg[], nonce: number, from: number, hint: Hint) {
  const [shown, setShown] = useState(messages.length);
  const [partial, setPartial] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const msgsRef = useRef(messages);
  msgsRef.current = messages;

  useEffect(() => {
    const list = msgsRef.current;
    // Crise : tout s'affiche immédiatement, sans « réflexion » ni écriture mot à mot
    const urgent = list.slice(from).some(m => m.card?.type === 'crisis');
    if (nonce === 0 || urgent || prefersReducedMotion() || from >= list.length) {
      setShown(list.length); setPartial(null); setPhase('idle');
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>(r => { timers.push(window.setTimeout(r, ms)); });
    (async () => {
      let i = from;
      let first = true;
      setShown(from); setPartial(null);
      while (i < list.length) {
        const m = list[i];
        if (m.from === 'user') { i += 1; setShown(i); continue; }
        if (first) {
          // « quick » : question de test, Dr Lô enchaîne sans longue réflexion
          if (hint !== 'quick') setPhase(hint);
          await wait(hint === 'reading' ? 1700 : hint === 'quick' ? 250 : 850);
          first = false;
        } else {
          await wait(350);
        }
        if (cancelled) return;
        setPhase('writing');
        const words = m.text.split(' ');
        // Au plus ~45 étapes d'affichage : une longue réponse s'écrit en 2 à 3 secondes, pas en une minute
        const step = Math.max(1, Math.ceil(words.length / 45));
        for (let w = step; w < words.length + step; w += step) {
          setPartial(words.slice(0, Math.min(w, words.length)).join(' '));
          await wait(hint === 'quick' ? 30 : words.length > 40 ? 40 : 55);
          if (cancelled) return;
        }
        i += 1;
        setShown(i); setPartial(null);
      }
      if (!cancelled) setPhase('idle');
    })();
    return () => { cancelled = true; timers.forEach(t => window.clearTimeout(t)); };
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  return { shown, partial, phase };
}

/** Pose la prochaine question du test en cours (ou rien s'il est fini). */
function askNextQuestion(s: AccueilState, sc: AssessmentScale): AccueilState {
  if (!s.activeTest) return s;
  const item = nextItem(sc, s.activeTest.answers);
  if (!item) return s;
  const p = progress(sc, s.activeTest.answers);
  return askQuestion(s, item.id, questionText(item, p.done, p.total, sc.instructions));
}

const ConversationAccueil: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, isPhoneOnlyUser, authReady } = useAuth();
  const { balance, loading: korisLoading, refreshBalance, openNoKorisModal } = useKoris();
  const uidKey = currentUser?.id ?? 'guest';
  // Les discussions : une principale + des secondaires, nommées (gardées sur ce téléphone)
  const [convState, setConvState] = useState<{ uidKey: string; idx: ConvIndex }>(() => ({ uidKey, idx: loadIndex(uidKey) }));
  const convIdx = convState.uidKey === uidKey ? convState.idx : loadIndex(uidKey);
  const setConvIdx = useCallback((fn: (i: ConvIndex) => ConvIndex) => {
    setConvState(cs => {
      const base = cs.uidKey === uidKey ? cs.idx : loadIndex(uidKey);
      const next = fn(base);
      saveIndex(uidKey, next);
      return { uidKey, idx: next };
    });
  }, [uidKey]);
  const convId = convIdx.current;
  const convMeta = convIdx.list.find(c => c.id === convId);
  const storageKey = convStorageKey(STORAGE_PREFIX, uidKey, convId);
  const moodKey = `${MOOD_STORAGE_PREFIX}${uidKey}`;

  const [moment] = useState(() => getMoment());
  const [tab, setTab] = useState<'discuter' | 'confier'>('discuter');
  const [confierStatus, setConfierStatus] = useState<{ state: DrLoState; label: string | null }>({ state: 'idle', label: null });
  const onConfierStatus = useCallback((st: DrLoState, label: string | null) => setConfierStatus({ state: st, label }), []);
  // « Me confier » : ambiance plus tamisée, violet doux
  const palette: MomentPalette = tab === 'confier'
    ? {
        ...PALETTES[moment],
        accent: CONFIER.accent,
        accentSoft: CONFIER.soft,
        bg: 'radial-gradient(110% 50% at 50% -6%, rgba(160,130,210,.28), rgba(160,130,210,0) 62%), linear-gradient(180deg, #19141C 0%, #110E13 100%)',
        bokeh1: 'rgba(160,130,210,.20)',
        bokeh2: 'rgba(201,184,228,.12)',
      }
    : PALETTES[moment];

  const [results, setResults] = useState<Record<string, ScaleResult> | null>(null);
  const [companion, setCompanion] = useState(() => getCompanionName());
  const [naming, setNaming] = useState(false);
  const companionName = companion || COMPANION_DEFAULT;
  const toCompanion = companion || 'ton compagnon';
  const [totemAnimal, setTotemAnimal] = useState<TotemAnimal | null>(null);
  const [totemPending, setTotemPending] = useState(false);
  // Notifications : la cloche, « Mes rappels », et la demande dans le chat
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [notifView, setNotifView] = useState<'list' | 'settings' | null>(null);
  const [pushOn, setPushOn] = useState<boolean | null>(null);
  const [pushHour, setPushHour] = useState(19);
  /** Reprendre l'activation des rappels dans le chat (retour depuis TikTok, l'écran d'accueil…). */
  const [resumeAsk, setResumeAsk] = useState<null | 'link' | `auto:${string}`>(null);
  const [state, setState] = useState<AccueilState | null>(null);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'home' | 'mood'>('home');
  const [showHistory, setShowHistory] = useState(false);
  const [veiled, setVeiled] = useState(false);
  const discret = useDiscretHint();
  const [noted, setNoted] = useState<{ day: string; cancelled: boolean } | null>(null);
  const [breath, setBreath] = useState<{ inhale: boolean } | null>(null);
  const [reveal, setReveal] = useState({ nonce: 0, from: 0, hint: 'thinking' as Hint });
  const [testBusy, setTestBusy] = useState<null | 'starting' | 'finishing'>(null);
  /** Dr Lô lit un message libre (appel à drlo-route en cours). */
  /** Dr Lô travaille (appel en cours) : ce qu'il fait, affiché dans sa bulle d'activité. */
  const [routing, setRouting] = useState<string | false>(false);
  /** Dr Lô se réjouit brièvement (test terminé, défi lancé, compatibilité prête). Jamais sur un résultat difficile. */
  const [joyUntil, setJoyUntil] = useState(0);
  const [joyPending, setJoyPending] = useState(false);
  const cheer = () => { setJoyUntil(Date.now() + 2600); window.setTimeout(() => setJoyUntil(0), 2700); };
  const initKeyRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<AccueilState | null>(null);
  stateRef.current = state;

  const dictation = useDictation(setInput);

  // 1. Charger ce qu'on sait déjà (résultats)
  useEffect(() => {
    let cancelled = false;
    // On attend de savoir si la personne est connectée : sinon la conversation d'invité
    // démarrait une seconde, puis se retrouvait dans le compte.
    if (!authReady) return;
    if (!isAuthenticated || !currentUser) {
      setResults(getAllGuestResults());
      return;
    }
    setResults(null); // pas de résultats d'invité mélangés à ceux du compte pendant le chargement
    getProfileProgress(currentUser.id)
      .then(p => {
        if (cancelled) return;
        // Prénom, genre, âge : le compte fait foi (nouveau téléphone, icône de l'iPhone, autre navigateur)
        accountOnboardingRef.current = !!p.onboardingProfile;
        if (p.onboardingProfile) saveOnboardingProfile(p.onboardingProfile as unknown as Parameters<typeof saveOnboardingProfile>[0]);
        setResults(p.scaleResults ?? {});
        setTotemAnimal(p.totem?.revealedAt && p.totem.animal ? (p.totem.animal as TotemAnimal) : null);
        setTotemPending(!!(p.totem?.revealedAt && p.totem.pendingAnimal && p.totem.pendingAnimal !== p.totem.animal));
      })
      .catch(() => { if (!cancelled) setResults({}); });
    return () => { cancelled = true; };
  }, [authReady, isAuthenticated, currentUser?.id]);

  const guestRemaining = Math.max(0, GUEST_MAX_TESTS - getGuestCount());

  const known: Known | null = useMemo(() => {
    if (!results) return null;
    const ob = getOnboardingProfile();
    return {
      isAuthenticated,
      prenom: firstName(ob?.prenom || currentUser?.name),
      genre: ob?.genre,
      age: ob?.age,
      guestRemaining,
      doneScaleIds: Object.keys(results),
      labelOf: (id: string) => getScaleMeta(id).label,
      minutesOf: (id: string) => getScaleById(id)?.timeEstimateMinutes ?? 3,
    };
  }, [results, isAuthenticated, currentUser?.name, guestRemaining]);

  // Nouveau résultat de test : Dr Lô relira tout le profil au prochain message
  useEffect(() => { invalidateTalkContext(); }, [results]);

  // 1 bis. Récupérer la discussion gardée dans le compte (avant de l'afficher)
  const [hydrated, setHydrated] = useState<string | null>(null);
  /** Discussions dont la copie du compte a bien été lue : seules celles-là y sont renvoyées. */
  const syncOkRef = useRef<Set<string>>(new Set());
  const accountOnboardingRef = useRef<boolean | null>(null);
  /** La discussion (clé de stockage) à laquelle appartient `state`. */
  const stateKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated || !currentUser) { setHydrated(storageKey); return; }
    const key = storageKey;
    let done = false;
    const finish = () => { if (!done) { done = true; setHydrated(key); } };
    // Réseau lent : on n'attend pas plus de 6 s (et on ne renverra rien par-dessus le compte)
    const timer = window.setTimeout(finish, 6000);
    pullThread<AccueilState>(convId).then(r => {
      if (!r || done) return;
      const remote = r.thread && r.thread.v === 1 && Array.isArray(r.thread.messages) ? r.thread : null;
      if (remote && pickNewer(loadState(key), remote) === 'remote') saveRaw(key, remote);
      if (r.index) setConvIdx(i => mergeIndex(i, r.index));
      syncOkRef.current.add(key);
    }).finally(() => { window.clearTimeout(timer); finish(); });
    return () => { window.clearTimeout(timer); };
  }, [authReady, isAuthenticated, currentUser?.id, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Démarrer ou reprendre la conversation, puis commenter un test terminé
  useEffect(() => {
    if (!known || !results || hydrated !== storageKey) return;
    if (initKeyRef.current === storageKey) return; // une seule fois par personne (les résultats peuvent changer ensuite)
    initKeyRef.current = storageKey;
    // Inscription / connexion depuis le chat : la conversation de l'invité continue dans le compte
    let pendingSignup = false;
    if (isAuthenticated && currentUser) {
      try {
        const t = Number(localStorage.getItem(SIGNUP_PENDING_KEY) ?? 0);
        pendingSignup = t > 0 && Date.now() - t < 60 * 60 * 1000;
        localStorage.removeItem(SIGNUP_PENDING_KEY);
      } catch { /* ignore */ }
      if (pendingSignup) {
        const guestKey = `${STORAGE_PREFIX}guest`;
        const guestState = loadState(guestKey);
        if (guestState) {
          saveState(storageKey, guestState);
          try { localStorage.removeItem(guestKey); } catch { /* ignore */ }
        }
      }
    }
    let saved = loadState(storageKey);
    // Un compte ne doit jamais garder les messages réservés aux invités
    if (saved && isAuthenticated) {
      const msgs = saved.messages.filter(m => !(m.from === 'drlo' && /^Ici, tu peux faire \d+ tests? gratuits?/.test(m.text)));
      if (msgs.length !== saved.messages.length) saved = { ...saved, messages: msgs };
    }
    let s = saved ? newDay(saved, dayKey(), known)
      : convId === MAIN_ID ? { ...startConversation(known), day: dayKey() }
      // Discussion secondaire toute neuve : Dr Lô ouvre le sujet
      : addExchange({ ...startConversation(known), messages: [], seq: 0, day: dayKey() }, null, [
        `« ${convMeta?.title ?? 'Nouvelle discussion'} » : c'est noté, on en parle ici, à part. Qu'est-ce que tu veux aborder ?`,
      ]);
    const before = saved ? saved.messages.length : 0;
    let hint: Hint = 'thinking';

    if (s.step !== 'testing' && s.prescribed && results[s.prescribed] && !s.commented.includes(s.prescribed)) {
      const r = results[s.prescribed];
      const doneCore = [...MENTAL_HEALTH_SCALES, ...SEXUAL_HEALTH_SCALES].filter(x => results[x.id]).length;
      s = afterTest(s, {
        scaleId: s.prescribed,
        resultLabel: r.interpretation?.label ?? '',
        severity: r.interpretation?.severity ?? 'none',
        referralRequired: !!r.interpretation?.referralRequired,
        alertLevel: r.alertLevel ?? 0,
      }, {
        portraitPct: computePortrait({ doneCore, totalCore: TOTAL_CORE, journalCount: 0, chatCount: 0 }),
        guestRemaining: isAuthenticated ? null : guestRemaining,
      }, known);
      if (isAuthenticated && !progRef.current) {
        const sig = programmeSignals(results).find(x => x.scaleId === s.prescribed);
        if (sig) s = addExchange(s, null, [programmeInvite(sig)]);
      }
      hint = 'reading'; // il relit vraiment le résultat qui vient d'arriver
      setInChat(true); // retour d'un test : on reprend la discussion là où elle en était
    }
    // Test en cours dans la conversation : on repose la question où on en était
    if (s.step === 'testing' && s.activeTest) {
      const sc = loadScale(s.activeTest.scaleId);
      if (!sc) s = { ...s, step: 'prescribed', activeTest: undefined };
      else if (s.activeTest.askedItemId === null) s = askNextQuestion(s, sc);
    }
    stateKeyRef.current = storageKey;
    setState(s);
    setReveal(r => ({ nonce: r.nonce + 1, from: Math.min(before, s.messages.length), hint }));
    if (pendingSignup && currentUser) void finishSignup(currentUser.id, currentUser.name ?? s.prenom ?? '');
    else if (isAuthenticated && isPhoneOnlyUser()) {
      // Ancien compte par téléphone : proposer de relier Google ou un e-mail (une fois par visite)
      let asked = false;
      try { asked = sessionStorage.getItem('he_link_prompted') === '1'; sessionStorage.setItem('he_link_prompted', '1'); } catch { /* ignore */ }
      if (!asked && !s.messages.slice(-4).some(m => m.card?.type === 'link_account')) {
        const prev = s;
        const next = addExchange(prev, null, [{ text: 'Une dernière chose : la connexion par SMS va bientôt s\'arrêter. Relie Google ou ton e-mail à ton espace pour ne jamais le perdre. Un seul geste.', card: { type: 'link_account' } }]);
        setState(next);
        setReveal(r => ({ nonce: r.nonce + 1, from: Math.min(before, prev.messages.length), hint }));
      }
    }
    if (!startedRef.current) {
      startedRef.current = true;
      trackAccueil('view', { guest: !isAuthenticated, returning: !!saved, moment });
    }
  }, [known, results, storageKey, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Persister + exposer le test prescrit à la page de résultats
  const lastLenRef = useRef(0);
  useEffect(() => { lastLenRef.current = 0; }, [storageKey]);
  useEffect(() => {
    // La discussion affichée n'est pas encore celle de cette clé (on vient d'en changer) : on n'écrit rien,
    // sinon « Nouvelle discussion » recopiait l'ancienne.
    if (!state || stateKeyRef.current !== storageKey) return;
    saveState(storageKey, state);
    if (state.messages.length > lastLenRef.current && lastLenRef.current > 0) {
      const lastUser = [...state.messages].reverse().find(m => m.from === 'user');
      if (lastUser) setConvIdx(i => touchConv(i, convId, lastUser.text));
    }
    lastLenRef.current = state.messages.length;
    setAccueilPrescribed(state.prescribed ?? null);
    if (state.prenom || state.genre || state.age) {
      savePartialOnboarding({ prenom: state.prenom, genre: state.genre, age: state.age });
      // Le compte n'avait rien : on y garde ce que la personne vient de dire (une fois)
      if (isAuthenticated && currentUser && accountOnboardingRef.current === false && state.genre && state.age) {
        accountOnboardingRef.current = true;
        const ob = getOnboardingProfile();
        if (ob) saveOnboardingToProfile(currentUser.id, ob as unknown as Record<string, string>).catch(() => { accountOnboardingRef.current = false; });
      }
    }
  }, [state, storageKey]);

  // 3 bis. Copie dans le compte (quelques secondes après le dernier changement, ou en quittant l'appli)
  const pendingPushRef = useRef<{ key: string; id: string } | null>(null);
  const flushPush = useCallback(() => {
    const p = pendingPushRef.current;
    pendingPushRef.current = null;
    if (!p) return;
    const cur = loadState(p.key);
    if (cur) void pushThread(p.id, trimForCloud(cur), cur.savedAt ?? new Date().toISOString());
  }, []);
  useEffect(() => {
    if (!state || !isAuthenticated || !currentUser || !syncOkRef.current.has(storageKey) || stateKeyRef.current !== storageKey) return;
    pendingPushRef.current = { key: storageKey, id: convId };
    const t = window.setTimeout(flushPush, 3000);
    return () => window.clearTimeout(t);
  }, [state, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushPush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushPush);
    return () => { flushPush(); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flushPush); };
  }, [flushPush, storageKey]);
  // La liste des discussions (titres, supprimées) suit aussi le compte
  const idxSigRef = useRef('');
  useEffect(() => {
    if (!isAuthenticated || !currentUser || syncOkRef.current.size === 0) return;
    const sig = JSON.stringify({ l: convIdx.list, d: convIdx.deleted ?? [] });
    if (sig === idxSigRef.current) return;
    const ix = convIdx;
    const t = window.setTimeout(() => { idxSigRef.current = sig; void pushIndex(ix); }, 4000);
    return () => window.clearTimeout(t);
  }, [convIdx, isAuthenticated, currentUser?.id, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Demandes venant des autres écrans (tableau de bord, humeur) : test, humeur, confier, inscription
  const intentRef = useRef<string | null>(null);
  // Peu de crédits : Dr Lô le dit une seule fois par jour, avec douceur (jamais de culpabilisation)
  useEffect(() => {
    if (!isAuthenticated || korisLoading || balance >= LOW_CREDIT || !state || !known || state.step === 'testing' || tab !== 'discuter') return;
    const k = `he_low_credit_said:${dayKey()}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch { return; }
    const prev = state;
    apply(addExchange(prev, null, [CREDIT.low]), prev, 'thinking', false);
  }, [isAuthenticated, korisLoading, balance, !!state, !!known]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lien d'invitation d'un proche (?ref=CODE) : gardé jusqu'à la création de l'espace
  useEffect(() => { captureReferral(location.search); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const st = location.state as { prescribe?: string; openMood?: boolean; tab?: 'confier'; journal?: boolean; signup?: boolean; flow?: 'defi' | 'compat'; programme?: boolean; breath?: boolean; talk?: { greeting?: string | null; draft?: string | null } } | null;
    if (!st || !state || !known || state.step === 'testing') return;
    const sig = JSON.stringify(st) + location.key;
    if (intentRef.current === sig) return;
    intentRef.current = sig;
    navigate('.', { replace: true, state: null }); // une seule fois, même après rechargement
    if (st.tab === 'confier') { setTab('confier'); setConfierView(st.journal ? 'journal' : 'write'); return; }
    if (st.talk) { setTimeout(() => talkRef.current?.(st.talk!.greeting ?? null, st.talk!.draft ?? null), 0); return; }
    if (st.openMood) { setTab('discuter'); setMode('mood'); return; }
    if (st.signup && !isAuthenticated) { setTimeout(() => openSignupRef.current?.('signup'), 0); return; }
    if (st.flow) { setTab('discuter'); setTimeout(() => startFlowRef.current?.(st.flow!), 0); return; }
    if (st.programme) { setTab('discuter'); setTimeout(() => programmeRef.current?.(), 0); return; }
    if (st.breath) { setTab('discuter'); setTimeout(() => breathRef.current?.(), 0); return; }
    if (st.prescribe && getScaleById(st.prescribe) && !state.messages.slice(-2).some(m => m.card?.type === 'test' && m.card.scaleId === st.prescribe)) {
      const meta = getScaleMeta(st.prescribe);
      const prev = state;
      apply(addExchange(prev, null, [{
        text: `On regarde ça ensemble ? Je te propose « ${meta.label} » : environ ${getScaleById(st.prescribe)?.timeEstimateMinutes ?? 3} minutes, ici, avec moi.`,
        card: { type: 'test', scaleId: st.prescribe },
      }]), prev);
    }
  }, [location.key, state?.messages.length, known]); // eslint-disable-line react-hooks/exhaustive-deps
  const openSignupRef = useRef<((m: 'signup' | 'login', t?: string) => void) | null>(null);
  const startFlowRef = useRef<((k: 'defi' | 'compat', userText?: string) => void) | null>(null);
  const programmeRef = useRef<(() => void) | null>(null);
  const breathRef = useRef<(() => void) | null>(null);
  const talkRef = useRef<((opening: string | null, draft: string | null) => void) | null>(null);
  const [confierView, setConfierView] = useState<'write' | 'journal'>('write');
  /** Retour au premier écran (flèche) ; la conversation reprend en plein écran dès qu'on écrit. */
  /** Mode discussion (plein écran). À l'arrivée, l'accueil reste une page de salutation. */
  const [inChat, setInChat] = useState(false);
  const [showConvs, setShowConvs] = useState(false);
  const [editingConv, setEditingConv] = useState<{ id: string; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // « Mon programme » (compte uniquement)
  const [prog, setProg] = useState<Programme | null>(null);
  const progRef = useRef<Programme | null>(null);
  progRef.current = prog;
  const [progOpen, setProgOpen] = useState(false);
  const [progBusy, setProgBusy] = useState<'bilan' | null>(null);
  const [, setMoodsVer] = useState(0);
  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated || !currentUser) { setProg(null); return; }
    let cancelled = false;
    loadProgramme(currentUser.id).then(p => { if (!cancelled) setProg(p); }).catch(() => {});
    loadInbox(currentUser.id).then(list => { if (!cancelled) setInbox(list); }).catch(() => {});
    loadPrefs(currentUser.id).then(pr => {
      if (cancelled) return;
      setPushOn(pr.on);
      setPushHour(pr.hour);
      if (shouldResume(pr, pushSupport(), Date.now())) setResumeAsk(r => r ?? `auto:${pr.setupFrom ?? ''}`);
    }).catch(() => {});
    markSeen(currentUser.id);
    // Humeurs des 5 dernières semaines (jours actifs, bilan) : synchronisées avec le compte
    fetchMoods(currentUser.id, addDays(dayKey(), -35)).then(() => { if (!cancelled) setMoodsVer(v => v + 1); }).catch(() => {});
    return () => { cancelled = true; };
  }, [authReady, isAuthenticated, currentUser?.id]);
  const persistProg = useCallback((next: Programme) => {
    setProg(next);
    if (currentUser) saveProgramme(currentUser.id, next).catch(() => { /* copie locale gardée */ });
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Toucher une notification : /?ouvrir=programme | notifications | rappels
  useEffect(() => {
    const what = new URLSearchParams(location.search).get('ouvrir');
    if (!what || !isAuthenticated) return;
    if (what === 'programme') { if (!prog) return; setProgOpen(true); }
    else if (what === 'notifications') setNotifView('list');
    else if (what === 'rappels') setResumeAsk('link'); // Dr Lô reprend dans la conversation, avec le guide
    navigate({ pathname: '/compagnon', search: '' }, { replace: true });
  }, [location.search, isAuthenticated, prog?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Retour après avoir ouvert Health-e ailleurs (Chrome, Safari, icône de l'écran d'accueil) : on termine les rappels
  useEffect(() => {
    if (!resumeAsk || !state || !currentUser || pushOn === null) return;
    if (state.step === 'crisis' || state.step === 'minor' || state.step === 'testing') { setResumeAsk(null); return; }
    // Une fois par jour et par étape au plus (TikTok → Safari, puis Safari → icône, ce sont deux étapes)
    const k = `he_push_resume:${currentUser.id}:${dayKey()}:${resumeAsk}`;
    try {
      if (resumeAsk !== 'link' && localStorage.getItem(k)) { setResumeAsk(null); return; }
      localStorage.setItem(k, '1');
    } catch { /* ignore */ }
    setResumeAsk(null);
    offerReminders(null, undefined, 'resume');
  }, [resumeAsk, !!state, currentUser?.id, pushOn]); // eslint-disable-line react-hooks/exhaustive-deps
  // Protocole de crise : le programme se met en pause (il ne réclame rien pendant ce temps)
  useEffect(() => {
    const p = progRef.current;
    if (state?.step === 'crisis' && p?.status === 'active') persistProg(pauseProg(p, dayKey()));
  }, [state?.step]); // eslint-disable-line react-hooks/exhaustive-deps
  // Le nouveau test est arrivé (à partir du jour 21, au moins 14 jours après le premier) : avant / après
  useEffect(() => {
    const p = progRef.current;
    if (!p || !p.baseline || p.result || !results) return;
    const r = results[p.baseline.scaleId];
    if (!r) return;
    const at = toIso(r.completedAt);
    if (daysBetween(p.baseline.at.slice(0, 10), at.slice(0, 10)) < MIN_DAYS_BEFORE_RETEST || dayNumber(p, dayKey()) < 21) return;
    persistProg(withResult(p, { totalScore: r.totalScore, label: r.interpretation?.label ?? '', at }));
  }, [results, prog?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const scrollRef = useRef<HTMLDivElement>(null);

  const testScale = useMemo<AssessmentScale | null>(
    () => (state?.activeTest ? loadScale(state.activeTest.scaleId) : null),
    [state?.activeTest?.scaleId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const messages = state?.messages ?? [];
  const { shown, partial, phase } = useReveal(messages, reveal.nonce, reveal.from, reveal.hint);
  const revealing = phase !== 'idle' || shown < messages.length;
  // La joie vient après que Dr Lô a fini d'écrire son message
  useEffect(() => {
    if (!revealing && joyPending) { setJoyPending(false); cheer(); }
  }, [revealing, joyPending]); // eslint-disable-line react-hooks/exhaustive-deps
  // Mode discussion : l'écran est la discussion, la page derrière ne défile plus
  const chatActive = inChat;
  useEffect(() => {
    if (!chatActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => { document.body.style.overflow = prev; };
  }, [chatActive]);
  // Mode discussion : on suit toujours le dernier message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, partial, messages.length, routing, phase, mode, tab, testBusy]);

  /** Affiche tout de suite le message de la personne (pendant que Dr Lô travaille). */
  const showNow = (s: AccueilState) => setReveal(r => ({ nonce: r.nonce + 1, from: s.messages.length, hint: 'thinking' }));
  const apply = useCallback((next: AccueilState, prev: AccueilState, hint: Hint = 'thinking', open = true) => {
    setState(next);
    if (open) setInChat(true);
    setReveal(r => ({ nonce: r.nonce + 1, from: prev.messages.length, hint }));
    setShowHistory(false);
    if (prev.messages.every(m => m.from === 'drlo')) trackAccueil('start', { guest: !isAuthenticated });
    if (next.step === 'crisis' && prev.step !== 'crisis') trackAccueil('crisis', { at: prev.step });
    if (next.step === 'minor' && prev.step !== 'minor') trackAccueil('minor');
    if (next.prescribed && next.prescribed !== prev.prescribed) {
      trackAccueil('prescription', { scale: next.prescribed, need: next.need ?? '' });
    }
  }, [isAuthenticated]);

  /** Après connexion depuis le chat : transfert des données invité, puis accueil dans l'espace. */
  const finishSignup = async (uid: string, displayName: string) => {
    let isNew = false;
    try { isNew = localStorage.getItem('he_new_account') === 'true'; localStorage.removeItem('he_new_account'); } catch { /* ignore */ }
    let report = { importedScaleIds: [] as string[], journalCount: 0, moodDays: 0 };
    try { report = await migrateGuestData(uid, displayName); } catch { /* on garde ce qui est en local */ }
    registerReferralIfAny().catch(() => {});
    try {
      const p = await getProfileProgress(uid);
      setResults(p.scaleResults ?? {});
    } catch { /* ignore */ }
    trackAccueil('signup_done', { isNew, imported: report.importedScaleIds.length, journal: report.journalCount });
    const prev = stateRef.current;
    if (!prev) return;
    apply(welcomeAfterAuth(prev, {
      isNew,
      importedTests: report.importedScaleIds.map(id => getScaleMeta(id).label),
      journalCount: report.journalCount,
      phoneOnly: isPhoneOnlyUser(),
    }), prev);
  };

  const stopBreathing = useCallback((completed: boolean) => {
    setBreath(null);
    const prev = stateRef.current;
    if (!prev) return;
    apply(addExchange(prev, null, [completed
      ? 'Bien joué. Une minute pour toi, ça compte. Je suis là quand tu veux en parler.'
      : 'D\'accord, on s\'arrête là. Même quelques respirations, ça compte.']), prev);
    // Programme : la respiration du jour (version légère) se coche toute seule
    const p = progRef.current;
    if (completed && p?.status === 'active' && planFor(p, dayNumber(p, dayKey()))[1].kind === 'breath') persistProg(toggleCheck(p, dayKey(), 'action', true));
  }, [apply, persistProg]);

  // 4. Respiration guidée : 1 minute, le halo grandit (inspire) puis se resserre (expire)
  const breathing = breath !== null;
  useEffect(() => {
    if (!breathing) return;
    const iv = window.setInterval(() => setBreath(b => (b ? { inhale: !b.inhale } : b)), BREATH_MS);
    const end = window.setTimeout(() => stopBreathing(true), BREATH_TOTAL_MS);
    return () => { window.clearInterval(iv); window.clearTimeout(end); };
  }, [breathing, stopBreathing]);

  if (!state || !known) {
    return (
      <div className="drl-screen" style={{ minHeight: '100svh', background: palette.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <DrLoAvatar state="thinking" palette={palette} />
      </div>
    );
  }

  const prenom = firstName(state.prenom ?? known.prenom);
  const genreKnown = state.genre ?? known.genre;
  const fem = genreKnown === 'femme';
  const listening = dictation.listening || (!!input.trim() && !revealing && !breathing);
  const avatarState: DrLoState = tab === 'confier' ? confierStatus.state
    : breathing ? 'breathing'
    : joyUntil > Date.now() && !revealing ? 'joy'
    : testBusy === 'finishing' || phase === 'reading' ? 'reading'
    : testBusy === 'starting' || routing ? 'thinking'
    : phase === 'thinking' ? 'thinking'
    : phase === 'writing' ? 'writing'
    : listening ? 'listening' : 'idle';
  const statusLabel = tab === 'confier' ? confierStatus.label
    : breathing ? (breath!.inhale ? 'Inspire…' : 'Expire…')
    : testBusy === 'finishing' || phase === 'reading' ? 'Je regarde ton résultat…'
    : testBusy === 'starting' ? 'Je prépare le test…'
    : phase === 'thinking' || routing ? 'Je réfléchis…'
    : phase === 'writing' ? 'Écrit…'
    : listening ? 'Je t\'écoute…' : null;
  // La bulle d'activité : ce que Dr Lô fait précisément, seulement quand il travaille
  const activityLabel: string | null = tab === 'confier' || breathing ? null
    : routing ? routing
    : testBusy === 'starting' ? 'Prépare le test'
    : testBusy === 'finishing' || phase === 'reading' ? 'Regarde ton résultat'
    : phase === 'thinking' ? 'Réfléchit'
    : phase === 'writing' ? 'Écrit'
    : avatarState === 'joy' ? 'Content pour toi'
    : null;

  // Le fil « focal » : le dernier message de la personne et la réponse de Dr Lô
  const visible = messages.slice(0, shown);
  let lastUser = -1;
  for (let i = visible.length - 1; i >= 0; i -= 1) if (visible[i].from === 'user') { lastUser = i; break; }
  const focal = lastUser >= 0 ? visible.slice(lastUser) : visible;
  const history = lastUser > 0 ? visible.slice(0, lastUser) : [];

  const today = dayKey();
  const moodToday = loadMoods(moodKey)[today];
  const extrasAllowed = ['need', 'need_clarify', 'prescribed'].includes(state.step);
  const flowReplies: QuickReply[] = state.flow
    ? flowChips(state.flow, { prenom, categories: RELATIONSHIP_CATEGORIES }).map(c => ({ label: c.label, value: c.value }))
    : getQuickReplies(state, known);
  type Chip = { label: string; kind: 'flow' | 'mood' | 'breath' | 'home'; q?: QuickReply };
  const chips: Chip[] = [
    ...flowReplies.map(q => ({ label: q.label, kind: 'flow' as const, q })),
    // Premier écran léger : pas plus d'une pastille « extra » tant que la personne n'a rien dit.
    // L'humeur se note une fois par jour (la page Humeur permettra de la modifier).
    // Une seule pastille « extra », sur le premier écran tant que la personne n'a rien dit ;
    // ensuite les raccourcis passent dans le menu « + » pour garder la discussion claire.
    ...(extrasAllowed && !state.flow && !moodToday && lastUser < 0 && !breathing ? [{ label: 'Noter mon humeur · 30 s', kind: 'mood' as const }] : []),
    ...(state.step === 'need' && !state.flow && lastUser < 0 && !breathing ? [{ label: 'Mon couple', kind: 'home' as const, q: { label: 'Mon couple', value: 'home:couple' } }] : []),
    ...(breathing ? [{ label: 'Arrêter l\'exercice', kind: 'breath' as const }] : []),
  ];
  const chatModeNow = inChat;

  // ── Mon programme ──
  const moodsNow = loadMoods(moodKey);
  const totemInfo = totemAnimal ? { animal: totemAnimal, label: getTotemSignature(totemAnimal).label, words: totemWords(totemAnimal) } : null;
  const progRemaining = prog ? remainingToday(prog, today, moodsNow) : 0;

  // ── Page d'accueil : toujours une salutation et une recommandation, jamais les derniers messages ──
  const hasTalked = messages.some(m => m.from === 'user');
  const nextDiscoveries = (() => {
    const done = Object.keys(results ?? {});
    const need = state.need ?? 'decouvre';
    const a = pickNextScale(need, done);
    const b = a ? pickNextScale(need, [...done], [a]) : null;
    return [a, b].filter((x): x is string => !!x);
  })();
  const homeTestLabel = state.activeTest ? getScaleMeta(state.activeTest.scaleId).label : state.prescribed ? getScaleMeta(state.prescribed).label : '';
  const testing = state.step === 'testing' && !!state.activeTest;
  const progActive = !!prog && prog.status === 'active' && !prog.result;
  /** La seule phrase sous la salutation : ce qui compte le plus maintenant. */
  const focusLine = testing
    ? `Ton test « ${homeTestLabel} » t'attend : on le reprend où tu t'étais arrêté${genreKnown === 'femme' ? 'e' : ''}.`
    : progActive && progRemaining > 0
      ? `${progRemaining} engagement${progRemaining > 1 ? 's t\'attendent' : ' t\'attend'} aujourd'hui. Ou dis-moi simplement comment tu vas.`
      : 'Comment tu vas aujourd\'hui ? Écris-moi, je t\'écoute.';

  /** La cloche : ce qui attend maintenant (calculé sur place) + ce que Dr Lô a envoyé. */
  const liveItems: LiveItem[] = [];
  if (prog && progActive) {
    const dueW = bilanDue(prog, today);
    const rt = retestInfo(prog, today, moodsNow);
    if (progRemaining > 0) liveItems.push({ key: 'prog', title: 'Ton programme', body: `${progRemaining} engagement${progRemaining > 1 ? 's t\'attendent' : ' t\'attend'} aujourd'hui`, onOpen: () => setProgOpen(true) });
    if (dueW) liveItems.push({ key: 'bilan', title: 'Ton bilan de la semaine est prêt', body: `Semaine ${dueW} · à ouvrir quand tu veux`, onOpen: () => setProgOpen(true) });
    if (rt?.available) liveItems.push({ key: 'retest', title: 'Ton nouveau test est prêt', body: 'Pour voir le chemin parcouru', onOpen: () => setProgOpen(true) });
  }
  if (totemPending) liveItems.push({ key: 'totem', title: 'Ton animal intérieur a évolué', body: 'Viens découvrir le nouveau', onOpen: () => navigate('/assessment/totem') });
  const unreadCount = inbox.filter(i => !i.read).length;
  const bellCount = liveItems.length + unreadCount;

  // ── Actions ────────────────────────────────────────────────────────────────

  const startBreathing = () => {
    if (breathing) { stopBreathing(false); return; }
    trackAccueil('breath');
    apply(addExchange(state, 'Respirer avec moi', [
      'Suis le cercle autour de moi : il grandit, tu inspires ; il se resserre, tu expires. Une minute, rien de plus.',
    ]), state);
    setBreath({ inhale: true });
  };

  const openSignup = (m: 'signup' | 'login', userText?: string) => {
    setTab('discuter');
    setMode('home');
    trackAccueil('signup_open', { mode: m });
    const cur = stateRef.current ?? state;
    // pas de deuxième carte si elle est déjà affichée juste au-dessus
    if (cur.messages.slice(-2).some(x => x.card?.type === 'signup')) return;
    apply(signupInvite(cur, m, userText), cur);
  };

  openSignupRef.current = openSignup;
  breathRef.current = () => { if (!breathing) startBreathing(); };

  const onChip = (c: Chip) => {
    if (c.kind === 'mood') { trackAccueil('mood_open'); setMode('mood'); return; }
    if (c.kind === 'home') {
      const v = c.q!.value;
      if (v === 'home:couple') { navigate('/assessment/compatibility'); return; }
      setInChat(true);
      if (v.startsWith('home:test:')) void startTest(v.slice(10));
      if (v === 'home:programme') offerProgramme(state, 'Mon programme');
      return;
    }
    // Depuis l'accueil, un besoin ouvre un nouveau sujet dans la discussion en cours
    if (!inChat && c.q?.value.startsWith('need:') && !['need', 'need_clarify', 'testing'].includes(state.step)) {
      const base = { ...state, step: 'need' as const, flow: undefined };
      apply(respond(base, { value: c.q.value, label: c.q.label }, known), state);
      return;
    }
    if (c.kind === 'breath') { startBreathing(); return; }
    const q = c.q!;
    if (q.value.startsWith('flow:')) { void onFlowChip(q.value, q.label); return; }
    if (q.action === 'catalogue') { navigate('/espace'); return; }
    if (q.action === 'signup') { openSignup('signup', q.label); return; }
    if (q.action === 'free_chat') { void enterTalk(null, null); return; }
    let next = respond(state, { value: q.value, label: q.label }, known);
    // Retour au test après le protocole de crise : on repose la question en cours
    if (state.step === 'crisis' && next.step === 'testing' && next.activeTest && testScale) {
      const t = next.activeTest;
      const item = testScale.items.find(i => i.id === t.askedItemId) ?? nextItem(testScale, t.answers);
      if (item) {
        const p = progress(testScale, t.answers);
        next = askQuestion(next, item.id, questionText(item, p.done, p.total, testScale.instructions));
      }
    }
    apply(next, state);
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || routing) return; // on peut répondre même pendant que Dr Lô écrit : son message s'affiche alors en entier
    if (dictation.listening) dictation.stop();
    setInput('');
    setInChat(true);
    setMenuOpen(false);
    if (breathing) setBreath(null);
    // Défi / compatibilité en préparation : le nom ou le code s'écrivent ici
    if (flowWantsText(state.flow) && !detectCrisis(text)) { void onFlowText(text); return; }
    // « Active mes rappels », « je reçois pas les notifs »… : géré ici, même en pleine discussion
    if (isReminderRequest(text) && !detectCrisis(text) && state.step !== 'testing' && state.step !== 'minor') { offerReminders(text); return; }
    // Gérés sur place, sans IA : la crise (messages validés, immédiats), le mode mineur,
    // et les réponses simples aux questions d'identité.
    const local = detectCrisis(text)
      || state.step === 'minor' || state.step === 'prenom'
      || (state.step === 'genre' && !!parseGenre(text))
      || (state.step === 'age' && !!parseAge(text))
      || (state.step === 'crisis' && text.length < 4);
    if (local) { apply(respond(state, { text }, known), state); return; }
    // Personne connectée : c'est toujours LE Dr Lô qui la connaît qui répond (sauf pendant un test)
    if (isAuthenticated && currentUser && state.step !== 'testing') {
      const base = { ...addExchange(state, text, []), flow: undefined };
      setShowHistory(false);
      trackAccueil('route', { action: 'drlo', then: '', step: state.step });
      void askDeep(text, base);
      return;
    }

    // Autre sujet en pleine préparation d'un défi : on laisse tomber la préparation
    const base = { ...addExchange(state, text, []), flow: undefined };
    setState(base);
    showNow(base);
    setShowHistory(false);
    setRouting('Lit ton message');
    const t = state.activeTest;
    const sc = testScale;
    const item = t && sc ? (sc.items.find(i => i.id === t.askedItemId) ?? nextItem(sc, t.answers)) : null;
    const p = t && sc ? progress(sc, t.answers) : null;
    const lastDrlo = [...state.messages].reverse().find(m => m.from === 'drlo')?.text;
    const d = await routeText({
      text,
      step: state.step,
      prenom,
      genre: genreKnown,
      isAuthenticated,
      done: Object.keys(results ?? {}),
      scales: ALL_SCALES.map(x => ({ id: x.id, label: getScaleMeta(x.id).label })),
      activeTest: t && sc && item ? {
        label: label(t.scaleId),
        question: fullItemText(item.text, sc.instructions),
        options: item.options.map(o => o.label),
      } : null,
      lastDrlo,
      profil: isAuthenticated ? routeProfile() : undefined,
    });
    setRouting(false);
    // La personne a fait autre chose pendant ce temps (pastille, réponse au test) : on n'écrase rien
    if (stateRef.current !== base) return;
    if (!d) {
      // Secours : la logique par mots-clés
      apply(respond(state, { text }, known), base);
      trackAccueil('route', { action: 'fallback', step: state.step });
      return;
    }
    const r = routeDecision(base, d, known, item && p && sc ? {
      currentQuestion: { itemId: item.id, text: questionText(item, p.done, p.total, sc.instructions) },
      doneCount: p.done,
      testLabel: t ? label(t.scaleId) : undefined,
    } : {});
    apply(r.state, base, d.action === 'explain' || d.action === 'continue' ? 'quick' : 'thinking');
    trackAccueil('route', { action: d.action, then: d.then ?? '', step: state.step }); // jamais le texte
    if (r.ui === 'mood') setMode('mood');
    if (r.ui === 'defi' || r.ui === 'compat') void startFlow(r.ui, undefined, r.state);
    // Pendant un test, une question de fond : le test est mis en pause (réponses gardées), puis Dr Lô répond
    if (r.ui === 'talk') void askDeep(text, r.state, false);
    if (r.ui === 'breath') setBreath({ inhale: true });
    if (r.ui === 'programme') offerProgramme(r.state);
    if (r.ui === 'rappels') offerReminders(null, r.state);
  };

  /** Bouton d'une carte « go » : une autre partie du site, le chat libre ou « Me confier ». */
  const onGo = (to: keyof typeof GO, pathOverride?: string) => {
    trackAccueil('go', { to });
    if (to === 'confier') { setTab('confier'); setMode('home'); return; }
    if ((to === 'defi' || to === 'compat') && isAuthenticated) { void startFlow(to, GO[to].label); return; }
    if (to === 'chat') { void enterTalk(null, null); return; }
    const path = pathOverride ?? GO[to].path;
    if (path) navigate(path);
  };

  /**
   * Ce que Dr Lô sait de la personne, en quelques lignes, pour que ses réponses courtes sonnent
   * comme le même Dr Lô qui la connaît (sans l'intime, sans scores).
   */
  const routeProfile = (): string => {
    const parts: string[] = [];
    if (totemAnimal) parts.push(`Animal intérieur : ${getTotemSignature(totemAnimal).label}.`);
    const sexual = new Set(SEXUAL_HEALTH_SCALES.map(x => x.id));
    const lines = Object.entries(results ?? {})
      .filter(([id, r]) => !sexual.has(id) && r?.interpretation?.label)
      .slice(0, 12)
      .map(([id, r]) => `${getScaleMeta(id).label} : ${r.interpretation!.label}`);
    if (lines.length) parts.push(`Ce qui ressort de ses tests : ${lines.join(' ; ')}.`);
    const p = progRef.current;
    if (p && !p.result) parts.push(`Programme en cours : ${AXES[p.axis].short}${p.status === 'paused' ? ' (en pause)' : ''}.`);
    return parts.join(' ').slice(0, 900);
  };

  /** L'action proposée par Dr Lô à la fin de sa réponse devient un vrai bouton. */
  const actionCard = (a: TalkAction | null): Card | undefined => {
    if (!a) return undefined;
    switch (a.kind) {
      case 'test': return getScaleById(a.scaleId) ? { type: 'test', scaleId: a.scaleId } : undefined;
      case 'respiration': return { type: 'quick', what: 'breath' };
      case 'humeur': return { type: 'quick', what: 'mood' };
      case 'programme': return progRef.current ? { type: 'programme_open' } : { type: 'quick', what: 'programme' };
      case 'journal': return { type: 'go', to: 'confier' };
      case 'defi': return { type: 'go', to: 'defi' };
      case 'compat': return { type: 'go', to: 'compat' };
      case 'vrai_drlo': return { type: 'go', to: 'question_drlo' };
      case 'totem': return totemAnimal ? { type: 'go', to: 'totem' } : undefined;
      case 'catalogue': return { type: 'go', to: 'catalogue' };
      case 'chaines': return { type: 'go', to: 'chaines' };
      case 'chaine': return { type: 'go', to: 'chaines', path: `/chaines/${a.id}`, label: a.name ? `Voir la chaîne « ${a.name} »` : 'Voir la chaîne' };
      case 'pratique': return { type: 'go', to: 'outils', path: `/pratique/${a.id}?from=/espace`, label: a.name ? `Ouvrir « ${a.name} »` : 'Ouvrir l\'outil' };
      default: return undefined;
    }
  };
  const onQuick = (what: 'breath' | 'mood' | 'programme') => {
    trackAccueil('go', { to: `quick_${what}` });
    if (what === 'breath') { setTab('discuter'); setBreath({ inhale: true }); return; }
    if (what === 'mood') { setTab('discuter'); setMode('mood'); return; }
    offerProgramme();
  };

  // ── Les rappels, proposés dans la conversation ─────────────────────────────

  /** La personne demande les rappels (ou revient les terminer) : Dr Lô propose, avec le guide si besoin. */
  const offerReminders = (userText: string | null, from?: AccueilState, why: 'ask' | 'resume' = 'ask') => {
    const cur = from ?? stateRef.current ?? state;
    if (!cur) return;
    setTab('discuter');
    setMode('home');
    trackAccueil('reminders_offer', { why });
    const add = (items: (string | { text: string; card?: Card })[]) => apply(addExchange(cur, from ? null : userText, items), cur);
    if (!isAuthenticated || !currentUser) {
      add([{ text: 'Les rappels arrivent sur ton téléphone grâce à ton espace (gratuit, 10 secondes). Crée-le, et je te les active juste après.', card: { type: 'signup' } }]);
      return;
    }
    if (pushOn && permissionState() === 'granted') {
      add([{ text: `Tes rappels sont déjà activés, vers ${pushHour} h. Si rien n'arrive, fais un essai ou change l'heure ici :`, card: { type: 'notif_settings' } }]);
      return;
    }
    add([{
      text: why === 'resume'
        ? `Te revoilà${prenom ? `, ${prenom}` : ''} ! On termine d'activer tes rappels ?`
        : `Bien sûr. Je te fais signe une fois par jour au plus, et seulement s'il te reste quelque chose à faire.`,
      card: { type: 'notif_optin', reason: why },
    }]);
    noteProposed(currentUser.id);
  };

  // ── Mon programme ────────────────────────────────────────────────────

  /** Dr Lô regarde le profil : il invite (axe conseillé), propose un test d'abord, ou rouvre le programme. */
  const offerProgramme = (from?: AccueilState, userText?: string) => {
    const cur = from ?? stateRef.current ?? state;
    setTab('discuter');
    setMode('home');
    trackAccueil('programme_offer');
    const add = (items: (string | { text: string; card?: Card })[]) => apply(addExchange(cur, from ? null : userText ?? null, items), cur);
    if (cur.step === 'minor') { add(['Le programme est réservé aux 18 ans et plus. Je reste là pour t\'écouter.']); return; }
    if (!isAuthenticated) {
      add([{ text: 'Le programme se suit jour après jour : il te faut ton espace (gratuit, 10 secondes). Ensuite je te le prépare.', card: { type: 'signup' } }]);
      return;
    }
    if (prog) { add([{ text: 'Ton programme est en cours : tes engagements du jour t\'attendent.', card: { type: 'programme_open' } }]); return; }
    const sigs = programmeSignals(results ?? {});
    if (sigs.length) {
      const first = sigs[0];
      const words: Record<ProgAxis, string> = { stress: 'le stress et l\'inquiétude', humeur: 'le moral', sommeil: 'le sommeil' };
      add([{
        text: first.fragile
          ? `Avant tout : ce que montrent tes résultats mérite l'avis d'un professionnel (médecin, psychologue). En plus, je peux t'accompagner chaque jour sur ${words[first.axis]}, en version légère.`
          : `D'après tes résultats, je te propose de travailler sur ${words[first.axis]}${sigs.length > 1 ? `, ou sur ${sigs.slice(1).map(x => words[x.axis]).join(' ou ')}` : ''}.`,
        card: { type: 'programme_invite', axes: sigs.map(x => x.axis) },
      }]);
      return;
    }
    const done = ['gad7', 'phq9', 'pss10', 'bonus_sommeil', 'bonus_burnout'].some(id => results?.[id]);
    if (!done) {
      const entry = cur.need === 'mal' ? 'phq9' : 'gad7';
      add([
        { text: `Pour te préparer un programme juste, je dois d'abord savoir où tu en es. Commence par un test court : « ${label(entry)} ».`, card: { type: 'test', scaleId: entry } },
        { text: 'Ou choisis directement ton programme :', card: { type: 'programme_invite', axes: ['stress', 'humeur', 'sommeil'] } },
      ]);
      return;
    }
    add([{ text: 'Tes derniers résultats sont plutôt bons : pas besoin d\'un programme pour l\'instant. Si tu veux quand même prendre soin de toi chaque jour, choisis :', card: { type: 'programme_invite', axes: ['stress', 'humeur', 'sommeil'] } }]);
  };

  /** 3 étincelles : Dr Lô lit le profil et écrit sa proposition. */
  const prepareProgramme = async (axis: ProgAxis) => {
    if (routing || !currentUser) return;
    const cost = KORIS_COSTS.programme;
    if (!korisLoading && balance < cost) { openNoKorisModal('Mon programme', cost); return; }
    const sigs = programmeSignals(results ?? {});
    const sig = sigs.find(x => x.axis === axis);
    const fragile = !!sig?.fragile;
    const base = addExchange(stateRef.current ?? state, AXES[axis].name, []);
    setState(base);
    showNow(base);
    setRouting('Prépare ton programme');
    const moods = loadMoods(moodKey);
    const last14 = Array.from({ length: 14 }, (_, i) => moods[addDays(today, -i)]).filter(Boolean);
    const out = await proposeProgramme({
      axis, prenom, genre: genreKnown, light: fragile, fragile,
      signals: sigs.map(x => ({ test: label(x.scaleId), result: x.label })),
      moodLowDays: last14.filter(m => m && (m.mood === 'pas_bien' || m.mood === 'tres_dur')).length,
      moodDays: last14.length,
    });
    setRouting(false);
    refreshBalance();
    const cur = stateRef.current ?? base;
    if (!out.ok && out.reason === 'no_koris') { openNoKorisModal('Mon programme', out.required ?? cost); return; }
    const intro = out.ok ? out.intro : `${AXES[axis].goal} Je n'ai pas pu l'écrire sur mesure cette fois (rien n'a été débité), mais voici le programme.`;
    apply(addExchange(cur, null, [{ text: intro, card: { type: 'programme_offer', axis, intro, order: out.ok ? out.order : [], light: fragile, fragile } }]), cur);
    trackAccueil('programme_proposed', { axis, ai: out.ok });
  };

  const acceptProgramme = (axis: ProgAxis, light: boolean, intro: string, order: string[]) => {
    if (!currentUser || prog) return;
    const sig = programmeSignals(results ?? {}).find(x => x.axis === axis) ?? null;
    const p = newProgramme({ axis, today, light, intro, order1: order, signal: sig, routines: totemAnimal ? TOTEM_ROUTINES[totemAnimal].slice(0, 2).map(r => r.id) : [] });
    persistProg(p);
    const cur = stateRef.current ?? state;
    const showOptin = !!currentUser && pushOn === false && canProposeReminders(currentUser.id) && pushSupport() !== 'unsupported';
    apply(addExchange(cur, 'J\'accepte', [{
      text: `C'est parti${prenom ? `, ${prenom}` : ''} ! Chaque jour, ${p.light ? '5' : '10'} minutes et 3 petits engagements à cocher, c'est gratuit.${totemInfo ? ` J'ai ajouté 2 routines de ${totemInfo.words.ton} : tu peux les retirer quand tu veux.` : ''} Je mets tout sur ton accueil. Ndank ndank.`,
      card: { type: 'programme_open' },
    }, ...(showOptin
      ? [{ text: 'Une dernière chose : tu veux que je te fasse signe chaque jour, pour ne pas oublier ?', card: { type: 'notif_optin' as const, reason: 'programme' as const } }]
      : [])]), cur);
    if (showOptin && currentUser) noteProposed(currentUser.id);
    setJoyPending(true);
    trackAccueil('programme_start', { axis, light: p.light });
  };

  /** « Adapter » → un autre axe : présentation fixe de la bibliothèque, sans nouvel appel payant. */
  const altProgramme = (axis: ProgAxis, light: boolean) => {
    const cur = stateRef.current ?? state;
    const sig = programmeSignals(results ?? {}).find(x => x.axis === axis);
    apply(addExchange(cur, `Plutôt : ${AXES[axis].short}`, [{ text: AXES[axis].goal, card: { type: 'programme_offer', axis, intro: AXES[axis].goal, order: [], light: light || !!sig?.fragile, fragile: !!sig?.fragile } }]), cur);
  };

  const laterProgramme = () => {
    const cur = stateRef.current ?? state;
    apply(addExchange(cur, 'Pas maintenant', ['D\'accord. Quand tu veux, écris-moi « mon programme » et je te le ressors.']), cur);
  };

  const runBilan = async () => {
    const p = progRef.current;
    if (!p || !currentUser || progBusy) return;
    const week = bilanDue(p, today);
    if (!week) return;
    const cost = KORIS_COSTS.programme_bilan;
    if (!korisLoading && balance < cost) { openNoKorisModal('Le bilan de la semaine', cost); return; }
    setProgBusy('bilan');
    const out = await bilanProgramme({ ...bilanSummary(p, today, loadMoods(moodKey)), prenom, genre: genreKnown, fragile: !!p.fragile });
    setProgBusy(null);
    refreshBalance();
    if (!out.ok) {
      if (out.reason === 'no_koris') openNoKorisModal('Le bilan de la semaine', out.required ?? cost);
      return;
    }
    const latest = progRef.current ?? p;
    persistProg({ ...latest, bilans: [...latest.bilans, { week, text: out.text, at: new Date().toISOString(), advice: out.advice }] });
    trackAccueil('programme_bilan', { week, advice: out.advice });
  };

  /** Arrêt ou fin : un résumé reste dans l'historique du compte. */
  const endProgramme = async () => {
    const p = progRef.current;
    if (!p || !currentUser) return;
    setProg(null);
    setProgOpen(false);
    trackAccueil('programme_end', { status: p.result ? 'done' : 'stopped' });
    await closeProgramme(currentUser.id, { ...p, status: p.result ? 'done' : 'stopped' }).catch(() => {});
  };

  /** « Continuer 4 semaines » : même axe, le dernier test devient le nouveau point de départ (gratuit). */
  const restartProgramme = async () => {
    const p = progRef.current;
    if (!p || !currentUser) return;
    const r = p.result;
    await closeProgramme(currentUser.id, { ...p, status: 'done' }).catch(() => {});
    const sig: AxisSignal | null = r ? { axis: p.axis, scaleId: r.scaleId, score: r.after, label: r.afterLabel, rank: 1, fragile: !!p.fragile, at: r.at } : null;
    persistProg(newProgramme({ axis: p.axis, today, light: p.light, intro: p.intro, order1: p.order1, signal: sig }));
  };

  programmeRef.current = () => { if (prog) setProgOpen(true); else offerProgramme(stateRef.current ?? state, 'Mon programme'); };

  const progEnv: ProgCardEnv = {
    palette,
    activeAxis: prog ? prog.axis : null,
    busy: !!routing,
    proposeCost: credits(KORIS_COSTS.programme),
    onPrepare: a => { void prepareProgramme(a); },
    onAccept: acceptProgramme,
    onAlt: altProgramme,
    onLater: laterProgramme,
    onOpen: () => { setProgOpen(true); trackAccueil('programme_open'); },
  };

  const onMic = () => {
    if (dictation.listening) { dictation.stop(); return; }
    trackAccueil('mic');
    dictation.start(input);
    inputRef.current?.focus();
  };

  const pickMood = (id: MoodId) => {
    const already = !!loadMoods(moodKey)[today];
    const uid = isAuthenticated && currentUser ? currentUser.id : null;
    recordMood(uid, today, id).catch(() => { /* la copie locale est gardée, synchro au prochain affichage */ });
    setNoted({ day: today, cancelled: false });
    setMode('home');
    trackAccueil('mood', { guest: !isAuthenticated }); // jamais la valeur de l'humeur dans Analytics
    const lines = [moodReply(id, prenom, already)];
    // Programme en cours et 3 jours « très dur » d'affilée : Dr Lô prend des nouvelles et allège
    const p = progRef.current;
    if (p && p.status === 'active' && id === 'tres_dur' && hardStreak(loadMoods(moodKey), today) >= 3) {
      lines.push('Ça fait trois jours que c\'est très dur. Je passe ton programme en version douce. Et je te le redis : parler à quelqu\'un aide vraiment. Le 1515 répond à toute heure, et les urgences psychiatriques du CHU Fann au +221 33 869 18 20.');
      if (!p.light) persistProg({ ...p, light: true });
    }
    apply(addExchange(state, `Mon humeur : ${moodById(id).label.toLowerCase()}`, lines), state);
  };

  /** Humeur notée depuis le programme : on reste dans le programme, Dr Lô répond par un petit mot. */
  const pickMoodInProgramme = (id: MoodId): string => {
    const already = !!loadMoods(moodKey)[today];
    const uid = isAuthenticated && currentUser ? currentUser.id : null;
    recordMood(uid, today, id).catch(() => { /* la copie locale est gardée */ });
    setNoted({ day: today, cancelled: false });
    trackAccueil('mood', { guest: !isAuthenticated, from: 'programme' });
    const p = progRef.current;
    if (p && p.status === 'active' && id === 'tres_dur' && hardStreak(loadMoods(moodKey), today) >= 3) {
      if (!p.light) persistProg({ ...p, light: true });
      return 'Trois jours très durs d\'affilée : je passe ton programme en version douce. Parler à quelqu\'un aide vraiment, le 1515 répond à toute heure.';
    }
    return moodReply(id, prenom, already);
  };

  const cancelMood = () => {
    if (!noted) return;
    deleteMood(isAuthenticated && currentUser ? currentUser.id : null, noted.day).catch(() => {});
    setNoted({ ...noted, cancelled: true });
    trackAccueil('mood_cancel');
  };

  // ── Test dans la conversation (mêmes questions, même calcul, même enregistrement) ──

  const label = (id: string) => getScaleMeta(id).label;

  const startTest = async (scaleId: string) => {
    if (testBusy) return;
    trackAccueil('test_click', { scale: scaleId, guest: !isAuthenticated });
    setTestBusy('starting');
    const out = await startChatTest(scaleId, isAuthenticated && currentUser ? currentUser.id : null, results?.[scaleId]?.completedAt ?? null);
    setTestBusy(null);
    if (isAuthenticated) refreshBalance();
    const cur = stateRef.current;
    if (!cur) return;
    if (!out.ok) {
      switch (out.reason) {
        case 'needs_page':
          navigate(`/assessment/test/${scaleId}`);
          return;
        case 'no_koris':
          openNoKorisModal('Ce test', out.required ?? KORIS_COSTS.test);
          apply(addExchange(cur, null, [`Il te manque des ${CREDIT.many} pour ce test. Tu peux recharger, ou revenir demain avec tes ${CREDIT.many} du jour. En attendant, je reste là pour discuter ou noter ton humeur, c'est gratuit.`]), cur);
          return;
        case 'guest_limit':
          apply(addExchange(cur, null, [{ text: 'Tu as utilisé tes 3 tests gratuits. Crée ton espace (c\'est gratuit) pour continuer : tes résultats te suivent.', card: { type: 'signup' } }]), cur);
          return;
        case 'needs_account':
          apply(addExchange(cur, null, [{ text: 'Ce test-là demande un espace personnel, pour protéger ce qui est intime. C\'est gratuit et ça prend une minute.', card: { type: 'signup' } }]), cur);
          return;
        default:
          apply(addExchange(cur, null, ['La connexion est instable, je n\'ai pas pu lancer le test. Réessaie dans quelques secondes.']), cur);
          return;
      }
    }
    const sc = loadScale(scaleId);
    if (!sc) return;
    const p = progress(sc, out.test.answers);
    let next = beginChatTest(cur, out.test, introText(label(scaleId), p.total, out.resumed ? p.done : 0));
    next = askNextQuestion(next, sc);
    apply(next, cur);
    trackAccueil('test_start', { scale: scaleId, resumed: out.resumed, guest: !isAuthenticated });
  };

  const finishTest = async (s: AccueilState, sc: AssessmentScale) => {
    const t = s.activeTest;
    if (!t) return;
    setTestBusy('finishing');
    try {
      const { result, resultsPath } = await finishChatTest(t, sc, isAuthenticated && currentUser ? currentUser.id : null);
      const newResults = { ...(results ?? {}), [t.scaleId]: result };
      setResults(newResults);
      const doneCore = [...MENTAL_HEALTH_SCALES, ...SEXUAL_HEALTH_SCALES].filter(x => newResults[x.id]).length;
      const remaining = Math.max(0, GUEST_MAX_TESTS - getGuestCount());
      const aiComment = await fetchResultComment({
        scaleId: t.scaleId,
        scaleLabel: label(t.scaleId),
        resultLabel: result.interpretation?.label ?? '',
        severity: result.interpretation?.severity ?? 'none',
        description: result.interpretation?.description,
        subscales: result.subscaleScores,
        prenom: known.prenom,
        genre: known.genre,
        guest: !isAuthenticated,
        alertLevel: result.alertLevel ?? 0,
        referralRequired: !!result.interpretation?.referralRequired,
      }) ?? undefined;
      const cur = stateRef.current ?? s;
      const next = afterTest(cur, {
        scaleId: t.scaleId,
        resultLabel: result.interpretation?.label ?? '',
        severity: result.interpretation?.severity ?? 'none',
        referralRequired: !!result.interpretation?.referralRequired,
        alertLevel: result.alertLevel ?? 0,
      }, {
        portraitPct: computePortrait({ doneCore, totalCore: TOTAL_CORE, journalCount: 0, chatCount: 0 }),
        guestRemaining: isAuthenticated ? null : remaining,
        resultPath: resultsPath,
        aiComment,
      }, { ...known, doneScaleIds: Object.keys(newResults), guestRemaining: remaining });
      const sig = isAuthenticated && !progRef.current ? programmeSignals(newResults).find(x => x.scaleId === t.scaleId) : undefined;
      apply(sig ? addExchange(next, null, [programmeInvite(sig)]) : next, cur, 'reading');
      trackAccueil('test_done', { scale: t.scaleId, via: 'chat', guest: !isAuthenticated });
      const sev = result.interpretation?.severity ?? 'none';
      if ((result.alertLevel ?? 0) < 2 && !['moderate', 'severe', 'alert'].includes(sev) && !result.interpretation?.referralRequired) setJoyPending(true);
    } catch {
      const cur = stateRef.current ?? s;
      apply(addExchange(cur, null, ['Je n\'ai pas réussi à enregistrer ton résultat (connexion instable). Tes réponses sont gardées : touche « Voir mon résultat » pour réessayer.']), cur);
    } finally {
      setTestBusy(null);
      if (isAuthenticated) refreshBalance();
    }
  };

  const onAnswer = (opt: AnswerOption) => {
    const t = state.activeTest;
    const sc = testScale;
    if (!t || !sc || testBusy) return;
    const item = sc.items.find(i => i.id === t.askedItemId) ?? nextItem(sc, t.answers);
    if (!item) return;
    let s = recordChatAnswer(state, item.id, opt.value, opt.label);
    void recordAnswer(s.activeTest!, item.id, opt.value);
    const alert = criticalAlert(sc, item.id, opt.value, state.genre);
    if (alert) {
      s = alertDuringTest(s, alert, !nextItem(sc, s.activeTest!.answers));
      trackAccueil('crisis', { at: 'test' });
    }
    if (nextItem(sc, s.activeTest!.answers)) {
      apply(askNextQuestion(s, sc), state, alert ? 'thinking' : 'quick');
    } else {
      apply(s, state, 'quick');
      void finishTest(s, sc);
    }
  };

  const onPrevQuestion = () => {
    const t = state.activeTest;
    if (!t || !testScale || testBusy) return;
    const prev = previousItem(testScale, t.answers, t.askedItemId);
    if (!prev) return;
    const s = addExchange(state, 'Revenir à la question précédente', []);
    const chosen = prev.options.find(o => o.value === t.answers[prev.id]);
    apply(askQuestion(s, prev.id, `${fullItemText(prev.text, testScale.instructions)}${chosen ? ` (tu avais répondu « ${chosen.label} »)` : ''}`), state, 'quick');
  };

  const onPauseTest = () => {
    const t = state.activeTest;
    if (!t || !testScale || testBusy) return;
    trackAccueil('test_pause', { scale: t.scaleId });
    apply(pauseChatTest(state, progress(testScale, t.answers).done, label(t.scaleId)), state);
  };

  // ── Défi et compatibilité, en conversation ─────────────────────────────────

  /** Dr Lô parle (et la préparation avance) ; `user` = ce que la personne a choisi ou écrit. */
  const say = (items: (string | { text: string; card?: Card })[], user: string | null, flow: SocialFlow | undefined, from?: AccueilState) => {
    const cur = from ?? stateRef.current ?? state;
    const next = { ...addExchange(cur, user, items), flow, step: cur.step === 'testing' ? cur.step : 'prescribed' as const };
    apply(next, cur);
    return next;
  };

  const startFlow = async (kind: 'defi' | 'compat', userText?: string, from?: AccueilState) => {
    setInChat(true);
    if (!isAuthenticated || !currentUser) { openSignup('signup', userText); return; }
    const base = from ?? stateRef.current ?? state;
    const withUser = userText ? addExchange(base, userText, []) : base;
    if (userText) { setState(withUser); showNow(withUser); }
    setRouting('Regarde ton profil');
    let prof;
    try { prof = await loadSocialProfile(currentUser.id); } catch { prof = null; }
    setRouting(false);
    const cur = stateRef.current ?? withUser;
    if (!prof) { say(['La connexion est instable, je n\'arrive pas à préparer ça. Réessaie dans un instant.'], null, undefined, cur); return; }
    trackAccueil('go', { to: `flow_${kind}` });
    if (kind === 'defi') {
      if (!prof.totemRevealed) {
        if (prof.totemMissing > 0) {
          const next = getTotemNext();
          say([next ? { text: SAY.defiNeedTotem(prof.totemMissing), card: { type: 'test', scaleId: next } } : SAY.defiNeedTotem(prof.totemMissing)], null, undefined, cur);
        } else say([{ text: SAY.defiRevealTotem, card: { type: 'go', to: 'totem' } }], null, undefined, cur);
        return;
      }
      if (prof.activeDefis >= 3) { say([{ text: SAY.defiTooMany, card: { type: 'go', to: 'defi_list' } }], null, undefined, cur); return; }
      const f = startDefi();
      say([SAY.defiStart], null, { ...f, data: { genre: prof.genre ?? undefined, availableOptins: prof.availableOptins } }, cur);
      return;
    }
    if (!prof.codeMental) {
      const next = getTotemNext();
      say([next ? { text: SAY.compatNeedProfile(Math.max(1, prof.totemMissing)), card: { type: 'test', scaleId: next } } : SAY.compatNeedProfile(Math.max(1, prof.totemMissing))], null, undefined, cur);
      return;
    }
    say([SAY.compatStart], null, { ...startCompat(), data: { myCode: prof.codeMental } }, cur);
  };
  startFlowRef.current = (k, t) => { void startFlow(k, t); };
  talkRef.current = (o, d) => { void enterTalk(o, d); };

  /** Premier test de l'animal intérieur qui manque encore. */
  function getTotemNext(): string | null {
    return getTotemProgress(results ?? {}).missing[0] ?? null;
  }

  const defiInput = (f: SocialFlow): DefiInput => ({
    displayName: f.data.displayName!, audience: f.data.audience!, genre: f.data.genre!,
    duration: f.data.duration!, devoilement: f.data.devoilement!, titre: f.data.titre ?? titreFor(f.data.audience),
    optinScales: f.data.optins ?? [], petitsMots: f.data.petitsMots ?? true,
  });

  /** La carte d'aperçu : toutes les questions, numérotées (personnalité, perso, totem). */
  const previewCard = (f: SocialFlow): Card => ({ type: 'defi_preview', items: previewItems(f.data) });

  /** Avance le Défi après une réponse ; prépare l'aperçu des questions quand tout est connu. */
  const advanceDefi = async (f: SocialFlow, user: string) => {
    const n = defiNext(f);
    if (n.flow.step !== 'defi_creating') { say([n.say], user, n.flow); return; }
    const shown = say([n.say], user, n.flow);
    setRouting('Prépare tes questions');
    const out = await defiPreview(defiInput(n.flow));
    setRouting(false);
    const cur = stateRef.current ?? shown;
    if (!out.ok) { say([SAY.defiError(out.error)], null, undefined, cur); return; }
    const pf = withPreview(n.flow, out);
    say([{ text: SAY.defiPreview(previewItems(pf.data).length), card: previewCard(pf) }], null, pf, cur);
  };

  /** Retour à l'aperçu après un changement (question remplacée, question perso ajoutée). */
  const backToPreview = (f: SocialFlow, user: string, changed: boolean) => {
    const pf: SocialFlow = { ...f, step: 'defi_preview', data: { ...f.data, replaceIdx: null, persoId: null } };
    const n = previewItems(pf.data).length;
    say([changed ? { text: SAY.defiPreviewAgain(n), card: previewCard(pf) } : 'D\'accord.'], user, pf);
  };

  const onFlowChip = async (value: string, label: string) => {
    const f = state.flow;
    if (!f || routing) return;
    const [, key, ...rest] = value.split(':');
    const v = rest.join(':');
    switch (key) {
      case 'aud': return advanceDefi({ ...f, data: { ...f.data, audience: v as DefiAudience } }, label);
      case 'titre': return advanceDefi({ ...f, data: { ...f.data, titre: titreFor(f.data.audience) } }, label);
      case 'name': return advanceDefi({ ...f, data: { ...f.data, displayName: v } }, label);
      case 'genre': return advanceDefi({ ...f, data: { ...f.data, genre: v as 'masculin' | 'feminin' } }, label);
      case 'opt': {
        // Cocher / décocher un test sensible : on reste à l'étape, sans message
        const nf = toggleOptin(f, v);
        setState({ ...state, flow: nf });
        return;
      }
      case 'optdone': {
        const chosen = f.data.optins ?? [];
        const lbl = chosen.length ? `Avec : ${chosen.map(id => OPTIN_LABELS[id] ?? id).join(', ')}` : label;
        return advanceDefi({ ...f, data: { ...f.data, optinsDone: true } }, lbl);
      }
      case 'dur': return advanceDefi({ ...f, data: { ...f.data, duration: Number(v) } }, label);
      case 'rev': return advanceDefi({ ...f, data: { ...f.data, devoilement: v as 'auto' | 'aucun' } }, label);
      case 'mots': return advanceDefi({ ...f, data: { ...f.data, petitsMots: v === '1' } }, label);
      case 'rep': say([SAY.defiReplacePick], label, { ...f, step: 'defi_replace_pick' }); return;
      case 'repi': say([SAY.defiReplaceWith], label, { ...f, step: 'defi_replace_with', data: { ...f.data, replaceIdx: Number(v) } }); return;
      case 'repw': return backToPreview(replaceQuestion(f, f.data.replaceIdx ?? 0, v), label, true);
      case 'perso': say([SAY.defiPersoPick], label, { ...f, step: 'defi_perso_pick' }); return;
      case 'pp': {
        const p = f.data.persoPool?.find(x => x.id === v);
        if (!p) return;
        say([SAY.defiPersoAnswer(p.stem, !!p.allowOther)], label, { ...f, step: 'defi_perso_answer', data: { ...f.data, persoId: v } });
        return;
      }
      case 'pa': {
        const p = f.data.persoPool?.find(x => x.id === f.data.persoId);
        const o = p?.options.find(x => x.idx === Number(v));
        if (!p || !o) return;
        return backToPreview(addPerso(f, { questionId: p.id, answerIdx: o.idx, displayLabel: o.label }), label, true);
      }
      case 'back': return backToPreview(f, label, false);
      case 'launch': {
        const shown = say(['Je lance ton défi…'], label, { ...f, step: 'defi_creating' });
        setRouting('Lance ton défi');
        const out = await defiCreate(defiInput(f), (f.data.selected ?? []).map(q => q.key), f.data.selectedPerso ?? []);
        setRouting(false);
        const cur = stateRef.current ?? shown;
        if (!out.ok) { say([SAY.defiError(out.error)], null, { ...f, step: 'defi_preview' }, cur); return; }
        trackAccueil('go', { to: 'defi_created' });
        setJoyPending(true);
        // Proposer d'être prévenu des réponses (1 fois par semaine au plus, jamais après 2 refus)
        const askNotif = !!currentUser && pushOn === false && canProposeReminders(currentUser.id) && pushSupport() !== 'unsupported';
        say([{ text: SAY.defiCreated, card: { type: 'defi_share', slug: out.slug } },
          ...(askNotif ? [{ text: 'Je peux aussi te prévenir dès qu\'un proche a répondu.', card: { type: 'notif_optin' as const, reason: 'defi' as const } }] : [])], null, undefined, cur);
        if (askNotif && currentUser) noteProposed(currentUser.id);
        return;
      }
      case 'cat': {
        const cat = RELATIONSHIP_CATEGORIES.find(c => c.id === v);
        if (cat && cat.subTypes.length === 1) {
          const nf: SocialFlow = { ...f, step: 'compat_code', data: { ...f.data, relCategory: v, relType: cat.subTypes[0].id } };
          say([{ text: SAY.compatCode, card: { type: 'compat_share', code: f.data.myCode ?? '' } }], label, nf);
          return;
        }
        say([SAY.compatSub], label, { ...f, step: 'compat_sub', data: { ...f.data, relCategory: v } });
        return;
      }
      case 'sub':
        say([{ text: SAY.compatCode, card: { type: 'compat_share', code: f.data.myCode ?? '' } }], label, { ...f, step: 'compat_code', data: { ...f.data, relType: v } });
        return;
      case 'recode':
        say(['D\'accord. Écris-moi le bon code.'], label, { ...f, step: 'compat_code' });
        return;
      case 'compare': {
        if (!currentUser) return;
        if (balance < KORIS_COSTS.compatibility) {
          openNoKorisModal('La compatibilité', KORIS_COSTS.compatibility);
          say([`Il te faut ${credits(KORIS_COSTS.compatibility)} pour comparer. Recharge, ou reviens demain avec tes ${CREDIT.many} du jour : je garde le code.`], label, f);
          return;
        }
        const shown = say([SAY.compatRunning], label, { ...f, step: 'compat_running' });
        setRouting('Compare vos profils');
        const pc = parseCompatCode(f.data.partnerCode ?? '');
        const out = pc
          ? await runCompat(currentUser.id, f.data.relType ?? 'meilleur_ami', f.data.relCategory === 'amoureux', pc.code, pc.type, f.data.partnerPrenom ?? '')
          : { ok: false as const, error: 'Code manquant.' };
        setRouting(false);
        refreshBalance();
        const cur = stateRef.current ?? shown;
        if (!out.ok) { say([SAY.compatError(out.error)], null, undefined, cur); return; }
        trackAccueil('go', { to: 'compat_done' });
        const r = out.result;
        if (r.globalScore >= 60) setJoyPending(true);
        say([{ text: SAY.compatDone(f.data.partnerPrenom ?? 'cette personne'), card: {
          type: 'compat_result', score: Math.round(r.globalScore), prenom: f.data.partnerPrenom ?? '',
          strengths: (r.strengths ?? []).slice(0, 2), tensions: (r.tensions ?? []).slice(0, 1),
        } }], null, undefined, cur);
        return;
      }
    }
  };

  const onFlowText = async (text: string) => {
    const f = state.flow!;
    if (f.step === 'defi_titre') {
      const t = cleanTitre(text);
      if (!t) { say([SAY.defiTitreBad], text, f); return; }
      return advanceDefi({ ...f, data: { ...f.data, titre: t } }, text);
    }
    if (f.step === 'defi_name') {
      const n = cleanDisplayName(text);
      if (!n) { say([SAY.defiNameBad], text, f); return; }
      return advanceDefi({ ...f, data: { ...f.data, displayName: n } }, text);
    }
    if (f.step === 'defi_perso_answer') {
      const c = cleanCustom(text);
      const p = f.data.persoPool?.find(x => x.id === f.data.persoId);
      if (!c || !p) { say(['Une réponse courte (30 caractères maximum), s\'il te plaît.'], text, f); return; }
      return backToPreview(addPerso(f, { questionId: p.id, customAnswer: c, displayLabel: `✍️ ${c}` }), text, true);
    }
    if (f.step === 'compat_code' && currentUser) {
      const pc = parseCompatCode(text);
      if (!pc) { say([SAY.compatCodeBad], text, f); return; }
      const shown = { ...addExchange(state, text, []), flow: f };
      setState(shown);
      showNow(shown);
      setRouting('Vérifie le code');
      const v = await checkCompatCode(pc.code, currentUser.id);
      setRouting(false);
      const cur = stateRef.current ?? shown;
      if (!v.ok) { say([`${v.error} Tu peux me réécrire le code ?`], null, f, cur); return; }
      say([SAY.compatConfirm(v.prenom, credits(KORIS_COSTS.compatibility))], null,
        { ...f, step: 'compat_confirm', data: { ...f.data, partnerCode: pc.code, partnerPrenom: v.prenom } }, cur);
    }
  };

  // ── Discussion approfondie (IA) dans ce même fil ───────────────────────────

  const talkIntro = () => `Je t'écoute${prenom ? `, ${prenom}` : ''}. Dis-moi ce que tu as sur le cœur, ou pose-moi ta question.`;

  /** « Discuter avec Dr Lô » (bouton, autre écran) : même fil, même Dr Lô. `draft` pré-remplit le champ. */
  const enterTalk = async (opening: string | null, draft: string | null, from?: AccueilState) => {
    setInChat(true);
    setTab('discuter');
    setMode('home');
    const cur0 = from ?? stateRef.current ?? state;
    if (!isAuthenticated || !currentUser) { openSignup('signup'); return; }
    trackAccueil('free_chat');
    const cur = stateRef.current ?? cur0;
    const next = { ...addOpener(cur, opening ?? talkIntro()), flow: undefined };
    const withTalk = { ...next, talk: cur.talk ?? { conv: `conv_${Date.now()}`, start: 0, opening } };
    apply(withTalk, cur);
    if (draft) setInput(draft);
  };


  /**
   * LE Dr Lô : chaque message d'une personne connectée lui arrive, avec son profil, sa mémoire
   * et les derniers échanges. Il répond court ou en profondeur, et propose le bon bouton.
   * `base` contient déjà le message de la personne.
   */
  const askDeep = async (text: string, base: AccueilState, endsWithUserMsg = true) => {
    if (!currentUser) return;
    const t = base.talk ?? { conv: `conv_${Date.now()}`, start: 0, opening: null };
    const withTalk: AccueilState = { ...base, talk: t, step: base.step === 'need' || base.step === 'need_clarify' ? 'prescribed' : base.step };
    setState(withTalk);
    showNow(withTalk);
    setRouting('Lit ton message');
    const prior = endsWithUserMsg ? withTalk.messages.slice(0, -1) : withTalk.messages.filter(m => !(m.from === 'user' && m.text === text));
    const turns = prior.slice(-12).map(m => ({ role: m.from === 'user' ? 'user' as const : 'assistant' as const, content: m.text }));
    const out = await talkToDrLo(currentUser.id, t.conv, text, turns, t.opening ?? null);
    setRouting(false);
    const cur = stateRef.current ?? withTalk;
    if (!out.ok) {
      if (out.reason === 'no_koris') {
        openNoKorisModal('Un message au compagnon', KORIS_COSTS.chat);
        apply(addExchange(cur, null, ['Il te manque une étincelle pour ce message. En attendant, écrire dans ton journal et noter ton humeur restent gratuits.']), cur);
      } else if (out.reason === 'limit') {
        apply(addExchange(cur, null, ['On a beaucoup parlé aujourd\'hui, on reprend demain. En attendant, tu peux écrire dans ton journal : je le garde pour toi.']), cur);
      } else {
        apply(addExchange(cur, null, ['Je n\'arrive pas à te répondre maintenant (connexion instable). Réessaie dans un instant.']), cur);
      }
      return;
    }
    refreshBalance();
    // Urgence repérée par Dr Lô : messages validés (1515, Fann), jamais le texte de l'IA seul
    if (out.actions.some(a => a.kind === 'crise')) {
      apply(enterCrisis(cur), cur);
      return;
    }
    const cards = out.actions.map(actionCard).filter((c): c is Card => !!c);
    const items: (string | { text: string; card?: Card })[] = cards.length
      ? [{ text: out.text, card: cards[0] }, ...cards.slice(1).map(card => ({ text: '', card }))]
      : [out.text];
    apply(addExchange(cur, null, items), cur);
    if (out.remember) rememberNow([...turns, { role: 'user', content: text }, { role: 'assistant', content: out.text }]);
  };

  // ── Discussions : changer, créer, renommer, supprimer ─────────────────────
  const switchConversation = (id: string) => {
    setShowConvs(false);
    setMode('home');
    setBreath(null);
    setNoted(null);
    setInChat(true);
    if (id === convId) return;
    setConvIdx(i => ({ ...i, current: id }));
  };
  const newConversation = () => {
    setShowConvs(false);
    setMode('home');
    setBreath(null);
    setNoted(null);
    setInChat(true);
    setConvIdx(i => createConv(i).idx);
    trackAccueil('go', { to: 'new_conversation' });
  };
  const removeConversation = (id: string) => {
    if (confirmDel !== id) { setConfirmDel(id); return; }
    try { localStorage.removeItem(convStorageKey(STORAGE_PREFIX, uidKey, id)); } catch { /* ignore */ }
    if (isAuthenticated) void deleteThread(id); // supprimée aussi du compte
    setConvIdx(i => deleteConv(i, id));
    setConfirmDel(null);
  };

  const resetConversation = () => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    trackAccueil('reset');
    setNoted(null);
    setBreath(null);
    setState(startConversation(known));
    setReveal(r => ({ nonce: r.nonce + 1, from: 0, hint: 'thinking' }));
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────

  const glassBtn: React.CSSProperties = {
    minHeight: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${C.line}`, background: C.glass,
    color: C.text, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
  };
  const pill: React.CSSProperties = {
    minHeight: 36, padding: '0 12px', borderRadius: 999, background: C.glass, fontSize: 13, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
  };
  const linkBtn: React.CSSProperties = {
    border: 0, background: 'transparent', color: C.faint, fontWeight: 600, cursor: 'pointer', minHeight: 32,
    textDecoration: 'underline', textUnderlineOffset: 3,
  };

  const renderCard = (m: Msg) => (
    <ChatCard
                    card={m.card!}
                    palette={palette}
                    busy={!!testBusy || state.step === 'testing'}
                    costLabel={(id: string) => (!isAuthenticated || isTestFreeRetake(results?.[id]?.completedAt as Date | undefined) || isFirstTestFree(Object.keys(results ?? {}).length, !!results?.[id]) ? 'gratuit' : credits(KORIS_COSTS.test))}
                    onStart={startTest}
                    results={results}
                    onOpen={(path: string) => navigate(path)}
                    prenom={state.prenom}
                    genre={state.genre}
                    onLinked={() => { const cur = stateRef.current ?? state; apply(addExchange(cur, null, ['Parfait. Ton espace est en sécurité.']), cur); }}
                    onGo={onGo}
                    onQuick={onQuick}
                    prog={progEnv}
                    notif={currentUser ? { uid: currentUser.id, onDone: (text: string) => {
                      const cur = stateRef.current ?? state;
                      apply(addExchange(cur, null, [text]), cur);
                      loadPrefs(currentUser.id).then(pr => { setPushOn(pr.on); setPushHour(pr.hour); }).catch(() => {});
                    }, onSettings: () => setNotifView('settings') } : undefined}
                  />
  );

  const controls = (
    <>
          {mode === 'mood' ? (
            <div className="drl-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>Comment tu te sens, là, maintenant ?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
                {MOODS.map(md => (
                  <button key={md.id} onClick={() => pickMood(md.id)} className="drl-mood"
                    style={{ minHeight: 72, borderRadius: 14, border: `1px solid ${C.line}`, background: C.glass, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    <MoodIcon id={md.id} color={md.color} />
                    {md.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setMode('home')} style={{ minHeight: 44, border: 0, background: 'transparent', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Plus tard
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatModeNow && state.step === 'testing' && state.activeTest && testScale && (
                <TestPanel
                  scale={testScale}
                  answers={state.activeTest.answers}
                  askedItemId={state.activeTest.askedItemId}
                  label={label(state.activeTest.scaleId)}
                  palette={palette}
                  hidden={revealing || testBusy === 'finishing'}
                  busy={!!testBusy}
                  onAnswer={onAnswer}
                  onPrev={onPrevQuestion}
                  onPause={onPauseTest}
                  onFinish={() => { void finishTest(state, testScale); }}
                />
              )}
              {!chatModeNow && !revealing && !routing && (hasTalked ? [] : chips).length > 0 && (
                <div className="drl-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {(hasTalked ? [] : chips).map(c => (
                    <button key={c.label} onClick={() => onChip(c)} className="drl-btn"
                      style={{
                        ...glassBtn,
                        ...(c.kind === 'flow' ? { background: 'rgba(242,182,109,.10)', border: '1px solid rgba(242,182,109,.4)' } : {}),
                        ...(c.kind === 'breath' ? { color: palette.accent } : {}),
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              {isAuthenticated && chatModeNow && state.step !== 'testing' && (
                <p className="drl-in" style={{ margin: '0 0 2px', fontSize: 13, color: C.faint, textAlign: 'center' }}>
                  Chaque message coûte {credits(KORIS_COSTS.chat)}.
                </p>
              )}
              {state.step !== 'minor' && (<>
                  {menuOpen && chatModeNow && (
                  <div role="menu" className="drl-in" style={{ marginBottom: 8, padding: 6, borderRadius: 16, background: '#221B16', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 12px 30px rgba(0,0,0,.45)' }}>
                    {[
                      ...(!moodToday ? [{ label: 'Noter mon humeur', hint: '30 s', icon: CloudSun, go: () => { trackAccueil('mood_open'); setMode('mood'); } }] : []),
                      { label: 'Respirer avec moi', hint: '1 min', icon: Wind, go: () => startBreathing() },
                      ...(isAuthenticated ? [{ label: 'Mon programme', hint: prog && prog.status === 'active' && progRemaining ? `${progRemaining} à faire` : '', icon: ClipboardCheck, go: () => (prog ? setProgOpen(true) : offerProgramme(state, 'Mon programme')) }] : []),
                      { label: 'Mon animal intérieur', hint: '', icon: PawPrint, go: () => navigate('/assessment/totem') },
                      { label: 'Compatibilité de couple', hint: '', icon: Heart, go: () => navigate('/assessment/compatibility') },
                      { label: 'Défi : tes proches te connaissent ?', hint: '', icon: Users, go: () => navigate(isAuthenticated ? '/defi' : '/decouvre') },
                      { label: 'Écrire à Dr Lô', hint: '', icon: Mail, go: () => navigate('/question') },
                      ...(isAuthenticated ? [{ label: 'Les messages de Dr Lô', hint: '', icon: MessagesSquare, go: () => navigate('/messages-dr-lo') }] : []),
                      { label: 'Tous les tests', hint: '', icon: ListChecks, go: () => navigate('/espace') },
                      { label: isAuthenticated ? 'Mon espace bien-être' : 'Ce que propose Health-e', hint: '', icon: Sprout, go: () => navigate('/espace') },
                    ].map(it => (
                      <button key={it.label} type="button" role="menuitem" onClick={() => { setMenuOpen(false); it.go(); }} className="drl-btn"
                        style={{ width: '100%', minHeight: 46, padding: '0 12px', border: 0, borderRadius: 12, background: 'transparent', color: C.text, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                        <it.icon size={18} color={palette.accent} aria-hidden="true" />
                        <span style={{ flex: 1 }}>{it.label}</span>
                        {it.hint && <span style={{ fontSize: 13, color: C.faint }}>{it.hint}</span>}
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={onSend} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                  {chatModeNow && state.step !== 'testing' && (
                    <button type="button" onClick={() => setMenuOpen(v => !v)} aria-expanded={menuOpen} aria-label="Plus d'options" className="drl-btn"
                      style={{ width: 44, height: 44, borderRadius: '50%', border: `1px solid ${menuOpen ? palette.accent : 'rgba(255,255,255,.18)'}`, background: menuOpen ? 'rgba(242,182,109,.14)' : 'rgba(255,255,255,.04)', color: menuOpen ? palette.accent : '#E9E1D4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Plus size={20} aria-hidden="true" style={{ transform: menuOpen ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }} />
                    </button>
                  )}
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    maxLength={500}
                    placeholder={dictation.listening ? 'Parle, je t\'écoute…' : state.step === 'testing' ? 'Si quelque chose te pèse, écris-le-moi…' : state.talk || !chatModeNow ? `Écris à ${toCompanion}…` : `Réponds à ${toCompanion}…`}
                    aria-label="Répondre"
                    className="drl-input"
                    style={{
                      flex: 1, minWidth: 0, minHeight: 54, boxSizing: 'border-box', borderRadius: 27,
                      border: `1.5px solid ${listening ? palette.accent : 'rgba(255,255,255,.18)'}`,
                      boxShadow: listening ? `0 0 0 4px ${palette.glow}` : 'none',
                      background: 'rgba(255,255,255,.06)', padding: '0 18px', fontFamily: 'inherit', fontSize: 16, color: C.text, outline: 'none',
                    }}
                  />
                  {dictation.supported && (
                    <button type="button" onClick={onMic} aria-pressed={dictation.listening}
                      aria-label={dictation.listening ? 'Arrêter la dictée' : 'Dicter ma réponse'} className={`drl-btn${dictation.listening ? ' drl-halo' : ''}`}
                      style={{ width: 50, height: 50, borderRadius: '50%', border: `1px solid ${dictation.listening ? palette.accent : 'rgba(255,255,255,.18)'}`, background: dictation.listening ? 'rgba(242,182,109,.16)' : 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: dictation.listening ? palette.accent : '#E9E1D4' }}>
                      <Mic size={20} aria-hidden="true" />
                    </button>
                  )}
                  <button type="submit" aria-label="Envoyer" className="drl-btn" disabled={!input.trim()}
                    style={{ width: 50, height: 50, borderRadius: '50%', border: 0, background: palette.primary, boxShadow: `0 8px 24px ${palette.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: !input.trim() ? 0.55 : 1, color: C.ink }}>
                    <Send size={19} aria-hidden="true" />
                  </button>
                </form>
              </>)}
              {dictation.error && (
                <p role="alert" style={{ margin: 0, fontSize: 13, color: C.muted, textAlign: 'center' }}>{dictation.error}</p>
              )}
              {dictation.listening && (
                <p style={{ margin: 0, fontSize: 13, color: C.faint, textAlign: 'center' }}>
                  Tu relis avant d'envoyer. Aucun audio n'est gardé par Health-e.
                </p>
              )}
            </div>
          )}
    </>
  );


  const notifPanel = notifView && currentUser ? (
    <NotificationsPanel uid={currentUser.id} palette={palette} live={liveItems} startView={notifView}
      onClose={() => { setNotifView(null); loadPrefs(currentUser.id).then(pr => setPushOn(pr.on)).catch(() => {}); }}
      onLink={(link: string) => (link.startsWith('/?ouvrir=programme') ? setProgOpen(true) : navigate(link))}
      onInboxChange={setInbox} />
  ) : null;

  const progPanel = progOpen && prog ? (
        <ProgrammePanel
          p={prog} today={today} moods={moodsNow} palette={palette}
          testLabel={label}
          bilanCost={credits(KORIS_COSTS.programme_bilan)}
          testCost={credits(KORIS_COSTS.test)}
          busy={progBusy}
          onClose={() => setProgOpen(false)}
          prenom={prenom}
          onToggle={(k: EngKey, on?: boolean) => persistProg(toggleCheck(progRef.current ?? prog, today, k, on))}
          onCommit={() => { const cur = progRef.current ?? prog; persistProg({ ...cur, commits: { ...(cur.commits ?? {}), [today]: true } }); }}
          onNote={(t: string) => {
            if (!currentUser) return;
            addCarnet(currentUser.id, PROGRAMME_CARNET);
            saveConfidence(currentUser.id, t, PROGRAMME_CARNET).catch(() => { /* l'exercice reste coché */ });
          }}
          onCrisis={(t: string) => {
            setProgOpen(false);
            setTab('discuter');
            const cur = stateRef.current ?? state;
            apply(respond(cur, { text: t }, known), cur);
          }}
          onSleep={(n: SleepNote) => persistProg(setSleep(prog, today, n))}
          genre={genreKnown}
          totem={totemInfo}
          onRoutineCheck={(id: string, on?: boolean) => persistProg(toggleRoutine(progRef.current ?? prog, today, id, on))}
          onRoutineSet={(id: string, on: boolean) => persistProg(setRoutine(progRef.current ?? prog, id, on))}
          onMood={pickMoodInProgramme}
          onBilan={() => { void runBilan(); }}
          onRetest={(id: string) => { setProgOpen(false); setTab('discuter'); setInChat(true); void startTest(id); }}
          onLight={(on: boolean) => persistProg({ ...prog, light: on || !!prog.fragile })}
          onPause={() => persistProg(pauseProg(prog, today))}
          onResume={() => persistProg(resumeProg(prog, today))}
          onStop={() => { void endProgramme(); }}
          onRestart={() => { void restartProgramme(); }}
          onOther={() => { void endProgramme().then(() => offerProgramme(stateRef.current ?? state, 'Un autre programme')); }}
        />
  ) : null;

  // ── Mode discussion : dès que la personne a écrit, l'écran devient une vraie conversation ──
  const chatMode = inChat;
  if (chatMode) {
    const statusText = statusLabel ?? (listening ? 'Je t\'écoute…' : 'En ligne');
    const online = !statusLabel && !listening;
    const shownMsgs = messages.slice(0, shown);
    return (
      <section aria-label="Conversation avec ton compagnon" aria-busy={revealing} className="drl-screen font-sans"
        style={{ position: 'fixed', inset: 0, zIndex: 40, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: palette.bg, color: C.text }}>
        <div className="drl-wrap-chat" style={{ width: '100%', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* En-tête de discussion */}
          <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(20,16,13,.6)' }}>
            <button onClick={() => { setInChat(false); setMode('home'); setShowConvs(false); }} aria-label="Revenir à l'accueil" className="drl-btn"
              style={{ width: 40, height: 40, borderRadius: 12, border: 0, background: 'transparent', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <div aria-hidden="true" style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ transform: 'scale(.7)' }}><DrLoAvatar state={avatarState} palette={palette} size={38} /></div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{companionName}</p>
              <p role="status" style={{ margin: '1px 0 0', fontSize: 13, fontWeight: 600, color: online ? '#7FD1A0' : palette.accent, fontStyle: online ? 'normal' : 'italic' }}>{statusText}</p>
            </div>
            {isAuthenticated ? (!korisLoading && (
              <Link to="/acheter-koris" aria-label={`Tes ${CREDIT.many} : ${balance}. Recharger`} className="drl-btn"
                style={{ ...pill, border: '1px solid rgba(242,182,109,.45)', color: palette.accent }}>
                <Sparkles size={13} aria-hidden="true" /> {balance}
              </Link>
            )) : (
              <button onClick={() => openSignup('login', 'Me connecter')} className="drl-btn" style={{ ...pill, border: `1px solid ${C.line}`, color: C.text, cursor: 'pointer' }}>Se connecter</button>
            )}
            <button onClick={() => { discret.dismiss(); setVeiled(true); }} aria-label="Masquer l'écran" className="drl-btn"
              style={{ width: 40, height: 40, padding: 0, borderRadius: 12, border: `1px solid ${C.line}`, background: 'transparent', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <EyeOff size={17} aria-hidden="true" />
            </button>
          </header>

          {/* Discuter / Me confier */}
          <nav aria-label="Mode de conversation" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4, margin: '10px 14px 0', padding: 4, borderRadius: 14, background: 'rgba(255,255,255,.05)' }}>
            {(['discuter', 'confier'] as const).map(t => (
              <button key={t} onClick={() => { if (t === tab) return; setTab(t); setMode('home'); if (t === 'confier') { setBreath(null); trackAccueil('confier_open', { guest: !isAuthenticated }); } }}
                aria-current={tab === t ? 'page' : undefined} className="drl-btn"
                style={{ minHeight: 36, borderRadius: 11, border: 0, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: tab === t ? (t === 'confier' ? CONFIER.accent : palette.accent) : 'transparent', color: tab === t ? C.ink : C.muted }}>
                {t === 'confier' && <Lock size={13} aria-hidden="true" />}{t === 'discuter' ? 'Discuter' : 'Me confier'}
              </button>
            ))}
          </nav>

          {/* La discussion en cours (principale ou secondaire) et l'accès à l'historique */}
          {tab === 'discuter' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 14px 0' }}>
              <button onClick={() => setShowConvs(v => !v)} aria-expanded={showConvs} className="drl-btn"
                style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '0 12px', borderRadius: 11, border: `1px solid ${C.line}`, background: showConvs ? 'rgba(242,182,109,.12)' : 'transparent', color: C.text, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <MessagesSquare size={15} color={palette.accent} aria-hidden="true" />
                <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{convMeta?.title ?? 'Discussion principale'}</span>
                <ChevronDown size={15} aria-hidden="true" style={{ transform: showConvs ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
              <button onClick={newConversation} aria-label="Nouvelle discussion" className="drl-btn"
                style={{ minHeight: 36, padding: '0 12px', borderRadius: 11, border: `1px solid ${C.line}`, background: 'transparent', color: C.text, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', flexShrink: 0 }}>
                <Plus size={14} aria-hidden="true" /> Nouvelle
              </button>
            </div>
          )}

          {tab === 'discuter' && showConvs ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: '0 0 2px', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: palette.accent }}>Mes discussions</p>
              {sortedConvs(convIdx).map(c => {
                const current = c.id === convId;
                const isEditing = editingConv?.id === c.id;
                const d = new Date(c.updatedAt);
                return (
                  <div key={c.id} style={{ borderRadius: 14, border: `1px solid ${current ? 'rgba(242,182,109,.45)' : C.line}`, background: current ? 'rgba(242,182,109,.08)' : C.glass, padding: '10px 12px' }}>
                    {isEditing ? (
                      <form onSubmit={e => { e.preventDefault(); setConvIdx(i => renameConv(i, c.id, editingConv!.text)); setEditingConv(null); }} style={{ display: 'flex', gap: 8 }}>
                        <input autoFocus value={editingConv!.text} maxLength={40} onChange={e => setEditingConv({ id: c.id, text: e.target.value })} aria-label="Nom de la discussion"
                          className="drl-input" style={{ flex: 1, minWidth: 0, minHeight: 40, borderRadius: 10, border: `1px solid ${palette.accent}`, background: 'rgba(255,255,255,.06)', color: C.text, padding: '0 10px', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
                        <button type="submit" style={{ ...pill, border: 0, background: palette.primary, color: C.ink, cursor: 'pointer' }}>OK</button>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => switchConversation(c.id)} style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: C.text, textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                          <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{c.title}{current ? ' · en cours' : ''}</span>
                          <span style={{ display: 'block', fontSize: 13, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{c.preview ? ` · « ${c.preview} »` : ''}
                          </span>
                        </button>
                        <button onClick={() => setEditingConv({ id: c.id, text: c.title })} aria-label={`Renommer ${c.title}`} style={{ border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        {c.id !== MAIN_ID && (
                          <button onClick={() => removeConversation(c.id)} aria-label={confirmDel === c.id ? 'Confirmer la suppression' : `Supprimer ${c.title}`}
                            style={{ border: 0, background: 'transparent', color: confirmDel === c.id ? '#E8A0A0' : C.muted, cursor: 'pointer', minWidth: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}>
                            <Trash2 size={15} aria-hidden="true" />{confirmDel === c.id ? 'Supprimer ?' : ''}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={newConversation} className="drl-btn"
                style={{ marginTop: 4, minHeight: 46, borderRadius: 14, border: `1px dashed ${C.line}`, background: 'transparent', color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus size={16} aria-hidden="true" /> Nouvelle discussion
              </button>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: C.faint, textAlign: 'center' }}>{isAuthenticated ? 'Tes discussions sont gardées dans ton compte : tu les retrouves sur tous tes appareils.' : 'Tes discussions restent sur ce téléphone.'} Touche le crayon pour les renommer.</p>
            </div>
          ) : tab === 'confier' ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 16px' }}>
              <ConfierPanel userId={isAuthenticated && currentUser ? currentUser.id : null} genre={state.genre} onStatus={onConfierStatus} onSignup={() => openSignup('signup')} view={confierView} onView={setConfierView} />
            </div>
          ) : (<>
            {/* Les messages, avec la bulle d'activité de Dr Lô par-dessus */}
            <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <DrLoIsland state={avatarState} label={activityLabel} palette={palette} />
            <div ref={scrollRef} aria-live="polite" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 14px 10px' }}>
              <div style={{ flex: 1 }} />
              {shownMsgs.map((m, i) => (
                <div key={m.id} className="drl-in">
                  {m.from === 'user' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', background: palette.primary, color: C.ink, fontSize: 15, fontWeight: 600, lineHeight: 1.45 }}>{m.text}</div>
                    </div>
                  ) : !m.text ? null : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '92%' }}>
                      <CompanionMark size={28} style={{ opacity: shownMsgs[i + 1]?.from === 'drlo' ? 0 : 1 }} />
                      <div style={{ padding: '11px 14px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)', fontSize: 15, lineHeight: 1.5, color: C.text }}><RichText text={m.text} /></div>
                    </div>
                  )}
                  {m.card && <div style={{ marginLeft: 36, maxWidth: 340 }}>{renderCard(m)}</div>}
                </div>
              ))}
              {partial !== null && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '92%' }}>
                  <CompanionMark size={28} />
                  <div style={{ padding: '11px 14px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)', fontSize: 15, lineHeight: 1.5, color: C.text }}><RichText text={partial} /></div>
                </div>
              )}
              {(phase === 'thinking' || phase === 'reading' || routing || testBusy) && partial === null && (
                <div role="status" aria-label="Ton compagnon écrit" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <CompanionMark size={28} />
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,.07)' }}>
                    <span style={{ display: 'inline-flex', gap: 5 }}>
                      {[0, 0.15, 0.3].map(d => <span key={d} className="drl-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: C.muted, animationDelay: `${d}s` }} />)}
                    </span>
                    {typeof routing === 'string' && routing && (
                      <span style={{ fontSize: 13, color: C.muted }}>{companionName} {routing.charAt(0).toLowerCase() + routing.slice(1)}…</span>
                    )}
                  </div>
                </div>
              )}
              {noted && !revealing && (
                <div className="drl-in" style={{ marginLeft: 36, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.sage }}>
                  <Check size={14} strokeWidth={2.6} aria-hidden="true" />
                  <span style={{ textDecoration: noted.cancelled ? 'line-through' : 'none' }}>Noté dans ton humeur du jour</span>
                  {!noted.cancelled && <button onClick={cancelMood} style={{ ...linkBtn, color: C.muted, fontSize: 13, fontWeight: 700, padding: '0 6px' }}>Annuler</button>}
                </div>
              )}
              {breathing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                  <DrLoAvatar state="breathing" palette={palette} size={96} />
                  <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, color: palette.accent, fontWeight: 600 }}>{breath!.inhale ? 'Inspire…' : 'Expire…'}</p>
                </div>
              )}
              {/* Les choix proposés par Dr Lô, dans la conversation, tous visibles */}
              {!revealing && !routing && chips.length > 0 && (
                <div className="drl-in" role="group" aria-label="Choisis une réponse"
                  style={{ marginLeft: 36, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {chips.map(c => (
                    <button key={c.label} onClick={() => onChip(c)} className="drl-btn"
                      style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: c.kind === 'breath' ? palette.accent : C.text,
                        background: 'rgba(242,182,109,.10)', border: '1px solid rgba(242,182,109,.45)', textAlign: 'left' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>

            {/* Répondre */}
            <div style={{ padding: '8px 14px 10px', borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(20,16,13,.7)', maxHeight: '58svh', overflowY: 'auto' }}>
              {controls}
              <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 13, color: C.faint, lineHeight: 1.5 }}>
                Conseils de bien-être, pas de diagnostic · Urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a>
                {' · '}<button onClick={resetConversation} style={{ ...linkBtn, fontSize: 13, fontWeight: 500, minHeight: 0, padding: 0 }}>Effacer</button>
              </p>
            </div>
          </>)}
        </div>

        {progPanel}
        {notifPanel}

        {veiled && (
          <button onClick={() => setVeiled(false)} aria-label="Revenir à la conversation"
            style={{ position: 'fixed', inset: 0, zIndex: 60, border: 0, background: 'rgba(15,12,10,.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <EyeOff size={26} aria-hidden="true" />
            Écran masqué · touche pour revenir
          </button>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Conversation avec ton compagnon"
      aria-busy={revealing}
      className="drl-screen font-sans"
      style={{ position: 'relative', overflow: 'hidden', minHeight: '100svh', background: palette.bg, color: C.text }}
    >
      {/* Lumières qui dérivent doucement */}
      <div aria-hidden="true" className="drl-bokeh" style={{ position: 'absolute', left: -40, top: 120, width: 130, height: 130, borderRadius: '50%', background: palette.bokeh1, filter: 'blur(30px)' }} />
      <div aria-hidden="true" className="drl-bokeh" style={{ position: 'absolute', right: -50, top: 300, width: 160, height: 160, borderRadius: '50%', background: palette.bokeh2, filter: 'blur(36px)', animationDelay: '-5s' }} />
      <div aria-hidden="true" className="drl-bokeh" style={{ position: 'absolute', left: 40, bottom: 120, width: 110, height: 110, borderRadius: '50%', background: palette.bokeh1, filter: 'blur(34px)', animationDelay: '-9s' }} />

      <div className="drl-wrap-chat" style={{ position: 'relative', margin: '0 auto', minHeight: '100svh', display: 'flex', flexDirection: 'column', padding: '18px 22px 0', boxSizing: 'border-box' }}>

        {/* En-tête */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: C.muted }}>
            <Lock size={14} aria-hidden="true" />
            Privé · visible par toi {fem ? 'seule' : genreKnown === 'homme' ? 'seul' : 'uniquement'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {isAuthenticated ? (
              !korisLoading && (
                <Link to="/acheter-koris" aria-label={`Tes ${CREDIT.many} : ${balance}. Recharger`} className="drl-btn"
                  style={{ ...pill, border: '1px solid rgba(242,182,109,.45)', color: palette.accent }}>
                  <Sparkles size={14} aria-hidden="true" /> {balance}
                </Link>
              )
            ) : (
              <button onClick={() => openSignup('login', 'Me connecter')} className="drl-btn" style={{ ...pill, border: `1px solid ${C.line}`, color: C.text, cursor: 'pointer' }}>
                Se connecter
              </button>
            )}
            {isAuthenticated && (
              <button onClick={() => setNotifView('list')} aria-label={bellCount ? `Mes notifications : ${bellCount} nouvelle${bellCount > 1 ? 's' : ''}` : 'Mes notifications'} className="drl-btn"
                style={{ position: 'relative', width: 44, height: 44, borderRadius: 13, border: `1px solid ${C.line}`, background: C.glass, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.text }}>
                <Bell size={20} aria-hidden="true" />
                {bellCount > 0 && (
                  <span aria-hidden="true" style={{ position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: '#E8664F', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1C1612' }}>{bellCount}</span>
                )}
              </button>
            )}
            <button onClick={() => { discret.dismiss(); setVeiled(true); }} aria-label="Masquer l'écran" title="Masquer l'écran" className="drl-btn"
              style={{ minWidth: 44, height: 44, padding: discret.show ? '0 12px' : 0, gap: 6, borderRadius: 13, border: `1px solid ${C.line}`, background: C.glass, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, fontSize: 13, fontWeight: 600 }}>
              <EyeOff size={20} aria-hidden="true" />{discret.show && <span>Discret</span>}
            </button>
          </span>
        </header>

        {/* Le compagnon */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 18 }}>
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <DrLoAvatar state={avatarState} palette={palette} aura={isAuthenticated && !korisLoading ? balance / AURA_FULL : null} />
          </div>
          {statusLabel ? (
            <p role="status" className="drl-in" key={statusLabel}
              style={breathing
                ? { margin: '12px 0 0', fontFamily: 'Fraunces, serif', fontSize: 22, color: palette.accent, fontWeight: 600 }
                : { margin: '12px 0 0', fontSize: 14, fontStyle: 'italic', color: palette.accent, fontWeight: 600 }}>
              {statusLabel}
            </p>
          ) : (
            <button type="button" onClick={() => { if (isAuthenticated) setNaming(v => !v); }} disabled={!isAuthenticated} aria-label={isAuthenticated ? `${companionName} : changer son nom` : companionName} className="drl-btn"
              style={{ margin: '12px 0 0', minHeight: 44, padding: '0 10px', border: 0, background: 'transparent', fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700, cursor: isAuthenticated ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {companionName}{isAuthenticated && <Pencil size={13} aria-hidden="true" />}
            </button>
          )}
          {isAuthenticated && (naming || (!companion && !companionAsked())) && (
            <div style={{ width: '100%' }}>
              <CompanionNaming current={companion} accent={palette.primary}
                onSave={(n) => { setCompanion(saveCompanionName(n)); markCompanionAsked(); setNaming(false); }}
                onSkip={() => { markCompanionAsked(); setNaming(false); }} />
            </div>
          )}
          <nav aria-label="Mode de conversation" style={{ marginTop: 14, display: 'inline-flex', padding: 4, borderRadius: 999, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)' }}>
            {(['discuter', 'confier'] as const).map(t => (
              <button key={t} onClick={() => {
                  if (t === tab) return;
                  setTab(t);
                  setMode('home');
                  if (t === 'confier') { setBreath(null); trackAccueil('confier_open', { guest: !isAuthenticated }); }
                }}
                aria-current={tab === t ? 'page' : undefined}
                className="drl-btn"
                style={{ minHeight: 38, padding: '0 16px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                  background: tab === t ? (t === 'confier' ? 'rgba(201,184,228,.22)' : 'rgba(242,182,109,.20)') : 'transparent',
                  color: tab === t ? (t === 'confier' ? CONFIER.accent : palette.accent) : C.muted }}>
                {t === 'discuter' ? 'Discuter' : 'Me confier'}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'confier' ? (
          <ConfierPanel userId={isAuthenticated && currentUser ? currentUser.id : null} genre={state.genre} onStatus={onConfierStatus} onSignup={() => openSignup('signup')} view={confierView} onView={setConfierView} />
        ) : (<>
        {hasTalked ? (<>
        {/* 1. Bonjour, et la seule chose importante du moment */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 29, lineHeight: 1.18, fontWeight: 600, color: C.title }}>
            {greetingFor(moment, prenom)}
          </h1>
          <p className="drl-in" aria-live="polite" style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.5, color: C.soft }}>{focusLine}</p>
        </div>

        {/* 2. Parler à Dr Lô : l'action principale, tout de suite */}
        <div style={{ marginTop: 16 }}>
          {controls}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '2px 16px', marginTop: 6 }}>
            <button onClick={() => setInChat(true)} style={{ ...linkBtn, fontSize: 13, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MessagesSquare size={14} aria-hidden="true" />Reprendre ma discussion
            </button>
            {convIdx.list.length > 1 && (
              <button onClick={() => { setInChat(true); setShowConvs(true); }} style={{ ...linkBtn, fontSize: 13, color: C.muted }}>
                Toutes mes discussions ({convIdx.list.length})
              </button>
            )}
          </div>
          {noted && !revealing && (
            <div className="drl-in" style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.sage }}>
              <Check size={14} strokeWidth={2.6} aria-hidden="true" />
              <span style={{ textDecoration: noted.cancelled ? 'line-through' : 'none' }}>Noté dans ton humeur du jour</span>
              {!noted.cancelled && (
                <button onClick={cancelMood} style={{ ...linkBtn, color: C.muted, fontSize: 13, fontWeight: 700, padding: '0 6px' }}>Annuler</button>
              )}
            </div>
          )}
        </div>

        </>) : (<>
        {/* Première visite : la conversation d'accueil, au centre */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 29, lineHeight: 1.18, fontWeight: 600, color: C.title }}>
            {greetingFor(moment, prenom)}
          </h1>
          {history.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => setShowHistory(v => !v)} aria-expanded={showHistory} style={{ ...linkBtn, fontSize: 13 }}>
                {showHistory ? 'Masquer le début de la conversation' : 'Voir le début de la conversation'}
              </button>
              {showHistory && (
                <div className="drl-in" style={{ marginTop: 6, maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 4px', borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
                  {history.map(m => <Bubble key={m.id} m={m} compact palette={palette} />)}
                </div>
              )}
            </div>
          )}

          <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {focal.map(m => (
              <div key={m.id}>
                <Bubble m={m} palette={palette} />
                {m.card && renderCard(m)}
              </div>
            ))}
            {partial !== null && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: C.soft }}>{partial}</p>}
            {(phase === 'thinking' || phase === 'reading' || routing) && (
              <div role="status" aria-label="Ton compagnon écrit" style={{ alignSelf: 'center', display: 'inline-flex', gap: 6, padding: '10px 14px', borderRadius: 999, background: 'rgba(255,255,255,.06)' }}>
                {[0, 0.15, 0.3].map(d => <span key={d} className="drl-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: C.muted, animationDelay: `${d}s` }} />)}
              </div>
            )}
          </div>
          {noted && !revealing && (
            <div className="drl-in" style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.sage }}>
              <Check size={14} strokeWidth={2.6} aria-hidden="true" />
              <span style={{ textDecoration: noted.cancelled ? 'line-through' : 'none' }}>Noté dans ton humeur du jour</span>
              {!noted.cancelled && (
                <button onClick={cancelMood} style={{ ...linkBtn, color: C.muted, fontSize: 13, fontWeight: 700, padding: '0 6px' }}>Annuler</button>
              )}
            </div>
          )}
        </div>

        {/* Répondre */}
        <div style={{ marginTop: 16, minHeight: 140 }}>
          {controls}
        </div>

        {!isAuthenticated ? (
          <ShowcaseCards
            onTotem={() => onChip({ label: 'Découvrir mon animal intérieur', kind: 'flow', q: { label: 'Découvrir mon animal intérieur', value: 'need:connaitre' } })}
            onCompat={() => navigate('/assessment/compatibility')}
            onDefi={() => navigate('/decouvre')}
          />
        ) : (
          <DiscoveryRow ids={nextDiscoveries} onStart={id => { setInChat(true); void startTest(id); }} />
        )}
        </>)}

        </>)}

        <p style={{ margin: '14px 0 16px', textAlign: 'center', fontSize: 13, color: C.faint, lineHeight: 1.5 }}>
          Un espace d'écoute, sans jugement. Pas de diagnostic · 18 ans et plus · Urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a>
          <br />
          <button onClick={resetConversation} style={{ ...linkBtn, fontSize: 13, fontWeight: 500 }}>
            Effacer cette conversation
          </button>
        </p>
      </div>

      {progPanel}
      {notifPanel}

      {/* Écran masqué (quelqu'un regarde par-dessus l'épaule) */}
      {veiled && (
        <button onClick={() => setVeiled(false)} aria-label="Revenir à la conversation"
          style={{ position: 'fixed', inset: 0, zIndex: 60, border: 0, background: 'rgba(15,12,10,.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <EyeOff size={26} aria-hidden="true" />
          Écran masqué · touche pour revenir
        </button>
      )}
    </section>
  );
};

// ── Bulles ──────────────────────────────────────────────────────────────────

const Bubble: React.FC<{ m: Msg; palette: MomentPalette; compact?: boolean }> = ({ m, palette, compact }) => {
  if (m.from === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ maxWidth: '82%', padding: compact ? '7px 12px' : '10px 14px', borderRadius: '18px 18px 4px 18px', background: compact ? 'rgba(242,182,109,.18)' : palette.primary, color: compact ? C.text : C.ink, fontSize: compact ? 13.5 : 15, fontWeight: 600, lineHeight: 1.45, textAlign: 'left' }}>
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <p style={{ margin: 0, fontSize: compact ? 13.5 : 16.5, lineHeight: 1.55, color: compact ? C.muted : C.soft, textAlign: compact ? 'left' : 'center' }}>
      <RichText text={m.text} />
    </p>
  );
};

// ── Cartes dans le fil ────────────────────────────────────────────────────────

const ChatCard: React.FC<{
  card: Card; palette: MomentPalette; busy: boolean;
  costLabel: (scaleId: string) => string;
  onStart: (id: string) => void; onOpen: (path: string) => void;
  prenom?: string; genre?: 'homme' | 'femme'; onLinked: () => void;
  onGo: (to: keyof typeof GO, path?: string) => void;
  prog?: ProgCardEnv;
  notif?: { uid: string; onDone: (text: string) => void; onSettings: () => void };
  onQuick?: (what: 'breath' | 'mood' | 'programme') => void;
  results?: Record<string, ScaleResult> | null;
}> = ({ card, palette, busy, costLabel, onStart, onOpen, prenom, genre, onLinked, onGo, prog, notif, onQuick, results }) => {
  if (card.type === 'quick') {
    const QL = { breath: 'Respirer 1 minute avec moi', mood: 'Noter mon humeur', programme: 'Voir le programme qui me conviendrait' } as const;
    return onQuick ? (
      <button onClick={() => onQuick(card.what)} className="drl-btn drl-in"
        style={{ marginTop: 10, minHeight: 44, padding: '0 16px', borderRadius: 12, border: 0, background: palette.primary, color: C.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
        {card.what === 'breath' ? <Wind size={16} aria-hidden="true" /> : card.what === 'mood' ? <CloudSun size={16} aria-hidden="true" /> : <Sprout size={16} aria-hidden="true" />}{QL[card.what]}
      </button>
    ) : null;
  }
  if (card.type === 'notif_optin') return notif ? <NotifOptinCard uid={notif.uid} palette={palette} onDone={notif.onDone} reason={card.reason} /> : null;
  if (card.type === 'notif_settings') return notif ? (
    <button onClick={notif.onSettings} className="drl-btn drl-in"
      style={{ marginTop: 10, minHeight: 44, padding: '0 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,.18)', background: 'transparent', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
      <Bell size={16} color={palette.accent} aria-hidden="true" />Régler mes rappels
    </button>
  ) : null;
  if (card.type === 'programme_invite') return prog ? <ProgrammeInviteCard axes={card.axes} env={prog} /> : null;
  if (card.type === 'programme_offer') return prog ? <ProgrammeOfferCard axis={card.axis} intro={card.intro} order={card.order} light={card.light} fragile={card.fragile} env={prog} /> : null;
  if (card.type === 'programme_open') return prog ? <ProgrammeOpenCard env={prog} /> : null;
  const box: React.CSSProperties = { marginTop: 10, textAlign: 'left', borderRadius: 18, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.06)', padding: 14 };
  const primary: React.CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 12, border: 0, background: palette.primary, color: C.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' };
  const ghost: React.CSSProperties = { ...primary, background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: C.text, fontWeight: 600 };
  if (card.type === 'defi_preview') {
    const items: { text: string; tag?: 'perso' | 'totem'; note?: string }[] = card.items ?? (card.questions ?? []).map(t => ({ text: t }));
    return (
      <div className="drl-in" style={box}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: palette.accent }}>
          Tes proches devront deviner · {items.length} questions
        </p>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: q.tag === 'totem' ? 'rgba(233,200,143,.22)' : q.tag === 'perso' ? 'rgba(157,191,175,.2)' : 'rgba(255,255,255,.08)', color: q.tag === 'totem' ? '#E9C88F' : q.tag === 'perso' ? '#9DBFAF' : C.muted, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {q.tag === 'totem' ? '🐾' : i + 1}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.45, color: C.soft }}>
                {q.tag === 'totem' && <b style={{ display: 'block', fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase', color: '#E9C88F' }}>Compte pour ton animal intérieur</b>}
                {q.tag === 'perso' && <b style={{ display: 'block', fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9DBFAF' }}>Question perso</b>}
                {q.text}
                {q.note && <span style={{ display: 'block', fontSize: 13, color: C.faint }}>{q.note}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (card.type === 'defi_share') {
    const url = defiUrl(card.slug);
    const wa = `https://wa.me/?text=${encodeURIComponent(`Kan moo ma gën a xam ? Penses-tu bien me connaître ? Prouve-le ici : ${url}`)}`;
    return (
      <div className="drl-in" style={box}>
        <p style={{ margin: 0, fontSize: 13, color: C.muted, wordBreak: 'break-all' }}>{url}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <a href={wa} target="_blank" rel="noopener noreferrer" style={{ ...primary, background: '#25D366', color: '#0B2915' }}>Envoyer sur WhatsApp</a>
          <CopyButton text={url} style={ghost} />
          <button onClick={() => onOpen(`/defi/${card.slug}/suivi`)} style={ghost}>Qui a joué ?</button>
        </div>
      </div>
    );
  }
  if (card.type === 'compat_share') {
    const wa = `https://wa.me/?text=${encodeURIComponent(`On regarde notre compatibilité sur Health-e ? Fais tes tests sur https://health-e.sn puis envoie-moi ton code de compatibilité. Le mien : ${card.code}`)}`;
    return (
      <div className="drl-in" style={box}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: palette.accent }}>Ton code à partager</p>
        <p style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: C.title, letterSpacing: '.02em' }}>{card.code || '…'}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <a href={wa} target="_blank" rel="noopener noreferrer" style={{ ...primary, background: '#25D366', color: '#0B2915' }}>Envoyer sur WhatsApp</a>
          {card.code && <CopyButton text={card.code} style={ghost} />}
        </div>
      </div>
    );
  }
  if (card.type === 'compat_result') {
    return (
      <div className="drl-in" style={{ ...box, background: 'rgba(240,154,122,.08)', border: '1px solid rgba(240,154,122,.3)' }}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: '#F09A7A' }}>Compatibilité{card.prenom ? ` · ${card.prenom}` : ''}</p>
        <p style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 600, color: C.title }}>{card.score} %</p>
        {card.strengths.length > 0 && (
          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: C.soft }}><b style={{ color: '#7FD1A0' }}>Ce qui vous rapproche : </b>{card.strengths.join(' · ')}</p>
        )}
        {card.tensions.length > 0 && (
          <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: C.soft }}><b style={{ color: '#E9C88F' }}>À surveiller : </b>{card.tensions.join(' · ')}</p>
        )}
        <button onClick={() => onOpen('/assessment/compatibility')} style={{ ...primary, marginTop: 12 }}>
          Voir l'analyse complète <ArrowRight size={16} aria-hidden="true" />
        </button>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: C.faint }}>Un repère, pas un verdict.</p>
      </div>
    );
  }
  if (card.type === 'go') {
    const go = GO[card.to];
    return (
      <div className="drl-in" style={{ marginTop: 10 }}>
        <button onClick={() => onGo(card.to, card.path)} className="drl-btn"
          style={{ minHeight: 46, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 14, border: 0, background: palette.primary, color: C.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {card.label ?? go.label}{card.to === 'chat' && <span style={{ fontWeight: 600, opacity: 0.75 }}>· {credits(1)} / message</span>}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }
  if (card.type === 'signup') return <SignupCard mode={card.mode ?? 'signup'} prenom={prenom} genre={genre} palette={palette} />;
  if (card.type === 'link_account') return <LinkAccountCard palette={palette} onLinked={onLinked} />;
  if (card.type === 'result_card') return <ResultShareCard scaleId={card.scaleId} result={results?.[card.scaleId]} />;
  if (card.type === 'totem_teaser') return <TotemTeaserCard remaining={card.remaining} total={card.total} />;
  if (card.type === 'result') {
    return (
      <div className="drl-in" style={{ marginTop: 10 }}>
        <button onClick={() => onOpen(card.path)} className="drl-btn"
          style={{ minHeight: 44, padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 14, border: '1px solid rgba(242,182,109,.45)', background: 'rgba(242,182,109,.10)', color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Voir mon résultat détaillé <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }
  if (card.type === 'test') {
    const scale = getScaleById(card.scaleId);
    const meta = getScaleMeta(card.scaleId);
    const Icon = meta.icon;
    return (
      <div className="drl-in" style={{ marginTop: 10, textAlign: 'left', borderRadius: 18, border: '1px solid rgba(242,182,109,.35)', background: 'rgba(255,255,255,.06)', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(242,182,109,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={19} color={palette.accent} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.25 }}>{meta.label}</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: C.faint, display: 'flex', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} aria-hidden="true" /> {scale?.timeEstimateMinutes ?? 3} min</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ListChecks size={12} aria-hidden="true" /> {scale?.items.length ?? '?'} questions</span>
            </p>
          </div>
        </div>
        <button onClick={() => onStart(card.scaleId)} className="drl-btn" disabled={busy}
          style={{ marginTop: 12, width: '100%', minHeight: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, border: 0, background: palette.primary, color: C.ink, fontSize: 15, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.55 : 1 }}>
          {card.resume ? 'Reprendre le test' : <>Commencer ici avec moi <span style={{ fontWeight: 600, opacity: 0.75 }}>· {costLabel(card.scaleId)}</span></>}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }
  if (card.type === 'crisis') {
    const resources = getCrisisResources();
    return (
      <div className="drl-in" style={{ marginTop: 10, textAlign: 'left', borderRadius: 18, border: '1px solid rgba(180,195,220,.4)', background: 'rgba(180,195,220,.10)', padding: 14 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#B4C3DC' }}>Parler à quelqu'un maintenant</p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {resources.map(r => (
            <li key={r.label} style={{ fontSize: 14, color: C.text }}>
              {r.phone ? (
                <a href={`tel:${r.phone.replace(/\s/g, '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#DCE5F2', textDecoration: 'none', minHeight: 32 }}>
                  <Phone size={14} aria-hidden="true" /> {r.label}{r.phone !== r.label.split(' ')[0] ? ` · ${r.phone}` : ''}
                </a>
              ) : (
                <span style={{ fontWeight: 700 }}>{r.label}</span>
              )}
              {r.note && <span style={{ display: 'block', fontSize: 13, color: C.faint }}>{r.note}</span>}
            </li>
          ))}
          <li style={{ fontSize: 13, color: C.muted }}>Ou va voir quelqu'un de confiance autour de toi, maintenant.</li>
        </ul>
      </div>
    );
  }
  return null;
};

const CopyButton: React.FC<{ text: string; style: React.CSSProperties }> = ({ text, style }) => {
  const [done, setDone] = useState(false);
  return (
    <button style={style} onClick={() => {
      navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 2000); }).catch(() => {});
    }}>
      {done ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {done ? 'Copié' : 'Copier'}
    </button>
  );
};

// ── Le test, dans la conversation ────────────────────────────────────────────

const TestPanel: React.FC<{
  scale: AssessmentScale; answers: Record<number, number>; askedItemId: number | null; label: string;
  palette: MomentPalette; hidden: boolean; busy: boolean;
  onAnswer: (o: AnswerOption) => void; onPrev: () => void; onPause: () => void; onFinish: () => void;
}> = ({ scale, answers, askedItemId, label, palette, hidden, busy, onAnswer, onPrev, onPause, onFinish }) => {
  const item = scale.items.find(i => i.id === askedItemId) ?? nextItem(scale, answers);
  const p = progress(scale, answers);
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const hasPrev = !!previousItem(scale, answers, item?.id ?? null);
  const link: React.CSSProperties = { border: 0, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 40, padding: '0 6px', textDecoration: 'underline', textUnderlineOffset: 3 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div aria-label={`${label} : question ${Math.min(p.done + 1, p.total)} sur ${p.total}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: C.faint, marginBottom: 6 }}>
          <span>{label}</span>
          <span>{item ? Math.max(1, visibleItems(scale, answers).findIndex(i => i.id === item.id) + 1) : p.total} / {p.total}</span>
        </div>
        <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,.10)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: palette.accent, transition: 'width .4s ease' }} />
        </div>
      </div>
      {!hidden && item && (
        <div className="drl-in" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {scale.instructions && !/(…|\.\.\.)\s*$/.test(scale.instructions) && (
            <p style={{ margin: '0', fontSize: 13, color: C.faint, textAlign: 'center', lineHeight: 1.4 }}>{scale.instructions}</p>
          )}
          {/* La question reste TOUJOURS visible, au-dessus des réponses (même sur un petit écran) */}
          <p aria-live="polite" style={{ margin: '2px 0 2px', fontSize: 16, fontWeight: 700, color: C.title, textAlign: 'center', lineHeight: 1.4 }}>{item.text}</p>
          {item.options.map(o => {
            const chosen = answers[item.id] === o.value;
            return (
              <button key={o.value} onClick={() => onAnswer(o)} disabled={busy} className="drl-btn"
                style={{ minHeight: 44, padding: '7px 16px', borderRadius: 14, textAlign: 'left', cursor: busy ? 'default' : 'pointer',
                  border: `1px solid ${chosen ? palette.accent : 'rgba(242,182,109,.30)'}`,
                  background: chosen ? 'rgba(242,182,109,.20)' : 'rgba(255,255,255,.05)', color: C.text,
                  display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{o.label}</span>
                {o.subtitle && <span style={{ fontSize: 13, color: C.faint }}>{o.subtitle}</span>}
              </button>
            );
          })}
        </div>
      )}
      {!hidden && !item && (
        <button onClick={onFinish} disabled={busy} className="drl-btn"
          style={{ minHeight: 46, borderRadius: 14, border: 0, background: palette.primary, color: C.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.55 : 1 }}>
          Voir mon résultat
        </button>
      )}
      {!hidden && (
        <div style={{ display: 'flex', justifyContent: hasPrev ? 'space-between' : 'center', gap: 8 }}>
          {hasPrev && <button onClick={onPrev} disabled={busy} style={link}>Question précédente</button>}
          <button onClick={onPause} disabled={busy} style={link}>Continuer plus tard</button>
        </div>
      )}
    </div>
  );
};

export default ConversationAccueil;
