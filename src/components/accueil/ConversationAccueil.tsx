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
import { ArrowRight, Check, Clock, EyeOff, ListChecks, Lock, Mic, Phone, Send, Sparkles, Sprout } from 'lucide-react';
import './accueil.css';
import DrLoAvatar, { type DrLoState } from './DrLoAvatar';
import MoodIcon from './MoodIcon';
import ConfierPanel, { CONFIER } from './ConfierPanel';
import SignupCard, { LinkAccountCard, SIGNUP_PENDING_KEY } from './SignupCard';
import { migrateGuestData } from '../../services/guestMigration';
import { recordMood, deleteMood } from '../../services/moodService';
import { captureReferral, registerReferralIfAny } from '../../services/drloQuestionService';
import { AURA_FULL, CREDIT, LOW_CREDIT, credits } from '../../config/creditName';
import { useAuth } from '../../contexts/AuthContext';
import { useKoris } from '../../contexts/KorisContext';
import {
  addExchange,
  afterTest,
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
import { getMoment, greetingFor, PALETTES, type MomentPalette } from '../../utils/drloMoment';
import {
  dayKey, loadMoods, MOOD_STORAGE_PREFIX, moodById, moodReply, MOODS, type MoodId,
} from '../../utils/moodLog';
import { trackAccueil, setAccueilPrescribed } from '../../utils/accueilTracking';
import { getOnboardingProfile, savePartialOnboarding } from '../../utils/onboardingProfile';
import { getAllGuestResults, getGuestCount, GUEST_MAX_TESTS } from '../../utils/guestSession';
import { getProfileProgress } from '../../services/evaluationService';
import { ALL_SCALES, getScaleById, MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import { getScaleMeta } from '../../utils/scaleMeta';
import { getCrisisResources } from '../../data/crisisResources';
import { openDrLoChat } from '../DrLoChat/drLoEvents';
import { useDictation } from '../../hooks/useDictation';
import { startChatTest, recordAnswer, finishChatTest, loadScale } from '../../services/chatTestRunner';
import { routeText } from '../../services/drloRouteService';
import { KORIS_COSTS, isTestFreeRetake } from '../../services/korisService';
import {
  nextItem, previousItem, progress, introText, questionText, fullItemText, criticalAlert, visibleItems,
} from '../../utils/chatTest';
import type { AssessmentScale, AnswerOption } from '../../types/assessment';
import type { ScaleResult } from '../../types/assessment';

const STORAGE_PREFIX = 'he_accueil_v1:';
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
        for (let w = 1; w <= words.length; w += 1) {
          setPartial(words.slice(0, w).join(' '));
          await wait(hint === 'quick' ? 30 : words.length > 40 ? 35 : 55);
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
  const storageKey = `${STORAGE_PREFIX}${uidKey}`;
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
  const [state, setState] = useState<AccueilState | null>(null);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'home' | 'mood'>('home');
  const [showHistory, setShowHistory] = useState(false);
  const [veiled, setVeiled] = useState(false);
  const [noted, setNoted] = useState<{ day: string; cancelled: boolean } | null>(null);
  const [breath, setBreath] = useState<{ inhale: boolean } | null>(null);
  const [reveal, setReveal] = useState({ nonce: 0, from: 0, hint: 'thinking' as Hint });
  const [testBusy, setTestBusy] = useState<null | 'starting' | 'finishing'>(null);
  /** Dr Lô lit un message libre (appel à drlo-route en cours). */
  const [routing, setRouting] = useState(false);
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
      .then(p => { if (!cancelled) setResults(p.scaleResults ?? {}); })
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

  // 2. Démarrer ou reprendre la conversation, puis commenter un test terminé
  useEffect(() => {
    if (!known || !results) return;
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
    let s = saved ? newDay(saved, dayKey(), known) : { ...startConversation(known), day: dayKey() };
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
      hint = 'reading'; // il relit vraiment le résultat qui vient d'arriver
    }
    // Test en cours dans la conversation : on repose la question où on en était
    if (s.step === 'testing' && s.activeTest) {
      const sc = loadScale(s.activeTest.scaleId);
      if (!sc) s = { ...s, step: 'prescribed', activeTest: undefined };
      else if (s.activeTest.askedItemId === null) s = askNextQuestion(s, sc);
    }
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
  }, [known, results, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Persister + exposer le test prescrit à la page de résultats
  useEffect(() => {
    if (!state) return;
    saveState(storageKey, state);
    setAccueilPrescribed(state.prescribed ?? null);
    if (state.prenom || state.genre || state.age) {
      savePartialOnboarding({ prenom: state.prenom, genre: state.genre, age: state.age });
    }
  }, [state, storageKey]);

  // Demandes venant des autres écrans (tableau de bord, humeur) : test, humeur, confier, inscription
  const intentRef = useRef<string | null>(null);
  // Peu de crédits : Dr Lô le dit une seule fois par jour, avec douceur (jamais de culpabilisation)
  useEffect(() => {
    if (!isAuthenticated || korisLoading || balance >= LOW_CREDIT || !state || !known || state.step === 'testing' || tab !== 'discuter') return;
    const k = `he_low_credit_said:${dayKey()}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch { return; }
    const prev = state;
    apply(addExchange(prev, null, [CREDIT.low]), prev);
  }, [isAuthenticated, korisLoading, balance, !!state, !!known]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lien d'invitation d'un proche (?ref=CODE) : gardé jusqu'à la création de l'espace
  useEffect(() => { captureReferral(location.search); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const st = location.state as { prescribe?: string; openMood?: boolean; tab?: 'confier'; signup?: boolean } | null;
    if (!st || !state || !known || state.step === 'testing') return;
    const sig = JSON.stringify(st) + location.key;
    if (intentRef.current === sig) return;
    intentRef.current = sig;
    navigate('.', { replace: true, state: null }); // une seule fois, même après rechargement
    if (st.tab === 'confier') { setTab('confier'); return; }
    if (st.openMood) { setTab('discuter'); setMode('mood'); return; }
    if (st.signup && !isAuthenticated) { setTimeout(() => openSignupRef.current?.('signup'), 0); return; }
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

  const testScale = useMemo<AssessmentScale | null>(
    () => (state?.activeTest ? loadScale(state.activeTest.scaleId) : null),
    [state?.activeTest?.scaleId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const messages = state?.messages ?? [];
  const { shown, partial, phase } = useReveal(messages, reveal.nonce, reveal.from, reveal.hint);
  const revealing = phase !== 'idle' || shown < messages.length;

  const apply = useCallback((next: AccueilState, prev: AccueilState, hint: Hint = 'thinking') => {
    setState(next);
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
  }, [apply]);

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
    : listening ? 'Je t\'écoute…' : null;

  // Le fil « focal » : le dernier message de la personne et la réponse de Dr Lô
  const visible = messages.slice(0, shown);
  let lastUser = -1;
  for (let i = visible.length - 1; i >= 0; i -= 1) if (visible[i].from === 'user') { lastUser = i; break; }
  const focal = lastUser >= 0 ? visible.slice(lastUser) : visible;
  const history = lastUser > 0 ? visible.slice(0, lastUser) : [];

  const today = dayKey();
  const moodToday = loadMoods(moodKey)[today];
  const extrasAllowed = ['need', 'need_clarify', 'prescribed'].includes(state.step);
  const flowReplies = getQuickReplies(state, known);
  type Chip = { label: string; kind: 'flow' | 'mood' | 'breath'; q?: QuickReply };
  const chips: Chip[] = [
    ...flowReplies.map(q => ({ label: q.label, kind: 'flow' as const, q })),
    // Premier écran léger : pas plus d'une pastille « extra » tant que la personne n'a rien dit.
    // L'humeur se note une fois par jour (la page Humeur permettra de la modifier).
    ...(extrasAllowed && !moodToday ? [{ label: 'Noter mon humeur · 30 s', kind: 'mood' as const }] : []),
    ...(extrasAllowed && (lastUser >= 0 || breathing) ? [{ label: 'Respirer avec moi · 1 min', kind: 'breath' as const }] : []),
  ];

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

  const onChip = (c: Chip) => {
    if (c.kind === 'mood') { trackAccueil('mood_open'); setMode('mood'); return; }
    if (c.kind === 'breath') { startBreathing(); return; }
    const q = c.q!;
    if (q.action === 'catalogue') { navigate('/assessment'); return; }
    if (q.action === 'signup') { openSignup('signup', q.label); return; }
    if (q.action === 'free_chat') {
      trackAccueil('free_chat');
      openDrLoChat({
        source: 'accueil',
        greeting: `On peut discuter librement maintenant${prenom ? `, ${prenom}` : ''}. Qu'est-ce que tu as sur le cœur ?`,
      });
      return;
    }
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
    if (breathing) setBreath(null);
    // Gérés sur place, sans IA : la crise (messages validés, immédiats), le mode mineur,
    // et les réponses simples aux questions d'identité.
    const local = detectCrisis(text)
      || state.step === 'minor' || state.step === 'prenom'
      || (state.step === 'genre' && !!parseGenre(text))
      || (state.step === 'age' && !!parseAge(text))
      || (state.step === 'crisis' && text.length < 4);
    if (local) { apply(respond(state, { text }, known), state); return; }

    const base = addExchange(state, text, []);
    setState(base);
    setShowHistory(false);
    setRouting(true);
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
    if (r.ui === 'breath') setBreath({ inhale: true });
  };

  /** Bouton d'une carte « go » : une autre partie du site, le chat libre ou « Me confier ». */
  const onGo = (to: keyof typeof GO) => {
    trackAccueil('go', { to });
    if (to === 'confier') { setTab('confier'); setMode('home'); return; }
    if (to === 'chat') {
      const lastUserText = [...(stateRef.current?.messages ?? [])].reverse().find(m => m.from === 'user')?.text;
      openDrLoChat({
        source: 'accueil_route',
        greeting: `On en parle tranquillement${prenom ? `, ${prenom}` : ''}. Je t'écoute.`,
        draft: lastUserText,
      });
      return;
    }
    const path = GO[to].path;
    if (path) navigate(path);
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
    apply(addExchange(state, `Mon humeur : ${moodById(id).label.toLowerCase()}`, [moodReply(id, prenom, already)]), state);
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
      }, { ...known, doneScaleIds: Object.keys(newResults), guestRemaining: remaining });
      apply(next, cur, 'reading');
      trackAccueil('test_done', { scale: t.scaleId, via: 'chat', guest: !isAuthenticated });
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
    color: C.text, fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
  };
  const pill: React.CSSProperties = {
    minHeight: 36, padding: '0 12px', borderRadius: 999, background: C.glass, fontSize: 13, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
  };
  const linkBtn: React.CSSProperties = {
    border: 0, background: 'transparent', color: C.faint, fontWeight: 600, cursor: 'pointer', minHeight: 32,
    textDecoration: 'underline', textUnderlineOffset: 3,
  };

  return (
    <section
      aria-label="Conversation avec Dr Lô"
      aria-busy={revealing}
      className="drl-screen font-sans"
      style={{ position: 'relative', overflow: 'hidden', minHeight: '100svh', background: palette.bg, color: C.text }}
    >
      {/* Lumières qui dérivent doucement */}
      <div aria-hidden="true" className="drl-bokeh" style={{ position: 'absolute', left: -40, top: 120, width: 130, height: 130, borderRadius: '50%', background: palette.bokeh1, filter: 'blur(30px)' }} />
      <div aria-hidden="true" className="drl-bokeh" style={{ position: 'absolute', right: -50, top: 300, width: 160, height: 160, borderRadius: '50%', background: palette.bokeh2, filter: 'blur(36px)', animationDelay: '-5s' }} />
      <div aria-hidden="true" className="drl-bokeh" style={{ position: 'absolute', left: 40, bottom: 120, width: 110, height: 110, borderRadius: '50%', background: palette.bokeh1, filter: 'blur(34px)', animationDelay: '-9s' }} />

      <div style={{ position: 'relative', maxWidth: 460, margin: '0 auto', minHeight: '100svh', display: 'flex', flexDirection: 'column', padding: '18px 22px 0', boxSizing: 'border-box' }}>

        {/* En-tête */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: C.muted }}>
            <Lock size={14} aria-hidden="true" />
            Privé · visible par toi {fem ? 'seule' : genreKnown === 'homme' ? 'seul' : 'seul(e)'}
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
            <button onClick={() => setVeiled(true)} aria-label="Masquer l'écran" title="Masquer l'écran" className="drl-btn"
              style={{ width: 44, height: 44, borderRadius: 13, border: `1px solid ${C.line}`, background: C.glass, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted }}>
              <EyeOff size={20} aria-hidden="true" />
            </button>
          </span>
        </header>

        {/* Dr Lô */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 18 }}>
          <DrLoAvatar state={avatarState} palette={palette} aura={isAuthenticated && !korisLoading ? balance / AURA_FULL : null} />
          {statusLabel ? (
            <p role="status" className="drl-in" key={statusLabel}
              style={breathing
                ? { margin: '12px 0 0', fontFamily: 'Fraunces, serif', fontSize: 22, color: palette.accent, fontWeight: 600 }
                : { margin: '12px 0 0', fontSize: 14, fontStyle: 'italic', color: palette.accent, fontWeight: 600 }}>
              {statusLabel}
            </p>
          ) : (
            <p style={{ margin: '12px 0 0', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Ton Dr Lô</p>
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
                style={{ minHeight: 38, padding: '0 16px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: 700,
                  background: tab === t ? (t === 'confier' ? 'rgba(201,184,228,.22)' : 'rgba(242,182,109,.20)') : 'transparent',
                  color: tab === t ? (t === 'confier' ? CONFIER.accent : palette.accent) : C.muted }}>
                {t === 'discuter' ? 'Discuter' : 'Me confier'}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'confier' ? (
          <ConfierPanel userId={isAuthenticated && currentUser ? currentUser.id : null} genre={state.genre} onStatus={onConfierStatus} onSignup={() => openSignup('signup')} />
        ) : (<>
        {/* La conversation, au centre */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 29, lineHeight: 1.18, fontWeight: 600, color: C.title }}>
            {greetingFor(moment, prenom)}
          </h1>

          {history.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => setShowHistory(v => !v)} aria-expanded={showHistory} style={{ ...linkBtn, fontSize: 12.5 }}>
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
                {m.card && (
                  <ChatCard
                    card={m.card}
                    palette={palette}
                    busy={!!testBusy || state.step === 'testing'}
                    costLabel={(id: string) => (!isAuthenticated || isTestFreeRetake(results?.[id]?.completedAt as Date | undefined) ? 'gratuit' : credits(KORIS_COSTS.test))}
                    onStart={startTest}
                    onOpen={(path: string) => navigate(path)}
                    prenom={state.prenom}
                    genre={state.genre}
                    onLinked={() => { const cur = stateRef.current ?? state; apply(addExchange(cur, null, ['Parfait. Ton espace est en sécurité.']), cur); }}
                    onGo={onGo}
                  />
                )}
              </div>
            ))}
            {partial !== null && <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.55, color: C.soft }}>{partial}</p>}
            {(phase === 'thinking' || phase === 'reading' || routing) && (
              <div role="status" aria-label="Dr Lô écrit" style={{ alignSelf: 'center', display: 'inline-flex', gap: 6, padding: '10px 14px', borderRadius: 999, background: 'rgba(255,255,255,.06)' }}>
                {[0, 0.15, 0.3].map(d => <span key={d} className="drl-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: C.muted, animationDelay: `${d}s` }} />)}
              </div>
            )}
          </div>

          {noted && !revealing && (
            <div className="drl-in" style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: C.sage }}>
              <Check size={14} strokeWidth={2.6} aria-hidden="true" />
              <span style={{ textDecoration: noted.cancelled ? 'line-through' : 'none' }}>Noté dans ton humeur du jour</span>
              {!noted.cancelled && (
                <button onClick={cancelMood} style={{ ...linkBtn, color: C.muted, fontSize: 12.5, fontWeight: 700, padding: '0 6px' }}>Annuler</button>
              )}
            </div>
          )}
        </div>

        {/* Répondre */}
        <div style={{ marginTop: 16, minHeight: 140 }}>
          {mode === 'mood' ? (
            <div className="drl-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>Comment tu te sens, là, maintenant ?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
                {MOODS.map(md => (
                  <button key={md.id} onClick={() => pickMood(md.id)} className="drl-mood"
                    style={{ minHeight: 72, borderRadius: 14, border: `1px solid ${C.line}`, background: C.glass, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
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
              {state.step === 'testing' && state.activeTest && testScale && (
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
              {!revealing && chips.length > 0 && (
                <div className="drl-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {chips.map(c => (
                    <button key={c.label} onClick={() => onChip(c)} className="drl-btn"
                      style={{
                        ...glassBtn,
                        ...(c.kind === 'flow' ? { background: 'rgba(242,182,109,.10)', border: '1px solid rgba(242,182,109,.4)' } : {}),
                        ...(c.kind === 'breath' && breathing ? { color: palette.accent } : {}),
                      }}>
                      {c.kind === 'breath' && breathing ? 'Arrêter l\'exercice' : c.label}
                    </button>
                  ))}
                </div>
              )}
              {state.step !== 'minor' && (
                <form onSubmit={onSend} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    maxLength={500}
                    placeholder={dictation.listening ? 'Parle, je t\'écoute…' : state.step === 'testing' ? 'Si quelque chose te pèse, écris-le-moi…' : 'Réponds à Dr Lô…'}
                    aria-label="Répondre à Dr Lô"
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
                  <button type="submit" aria-label="Envoyer à Dr Lô" className="drl-btn" disabled={!input.trim()}
                    style={{ width: 50, height: 50, borderRadius: '50%', border: 0, background: palette.primary, boxShadow: `0 8px 24px ${palette.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: !input.trim() ? 0.55 : 1, color: C.ink }}>
                    <Send size={19} aria-hidden="true" />
                  </button>
                </form>
              )}
              {dictation.error && (
                <p role="alert" style={{ margin: 0, fontSize: 12.5, color: C.muted, textAlign: 'center' }}>{dictation.error}</p>
              )}
              {dictation.listening && (
                <p style={{ margin: 0, fontSize: 11.5, color: C.faint, textAlign: 'center' }}>
                  Tu relis avant d'envoyer. Aucun audio n'est gardé par Health-e.
                </p>
              )}
            </div>
          )}
        </div>

        </>)}

        {/* Mon espace : un tap plus loin */}
        <Link to="/espace" className="drl-btn"
          style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', background: C.glass, border: '1px solid rgba(255,255,255,.12)', borderRadius: 18, padding: '14px 16px', color: C.text }}>
          <Sprout size={26} color={palette.accent} strokeWidth={1.8} aria-hidden="true" />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{isAuthenticated ? 'Mon espace bien-être' : 'Toutes les évaluations'}</span>
            <span style={{ fontSize: 12.5, color: '#B9B0A2' }}>{isAuthenticated ? 'Mental · Humeur · Social · Intime' : 'Mental · Vie intime · Bonus'}</span>
          </span>
          <ArrowRight size={18} color={C.muted} aria-hidden="true" />
        </Link>

        <p style={{ margin: '14px 0 16px', textAlign: 'center', fontSize: 11.5, color: C.faint, lineHeight: 1.5 }}>
          Un espace d'écoute, sans jugement. Pas de diagnostic · 18 ans et plus · Urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a>
          <br />
          <button onClick={resetConversation} style={{ ...linkBtn, fontSize: 11.5, fontWeight: 500 }}>
            Effacer cette conversation
          </button>
        </p>
      </div>

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
      {m.text}
    </p>
  );
};

// ── Cartes dans le fil ────────────────────────────────────────────────────────

const ChatCard: React.FC<{
  card: Card; palette: MomentPalette; busy: boolean;
  costLabel: (scaleId: string) => string;
  onStart: (id: string) => void; onOpen: (path: string) => void;
  prenom?: string; genre?: 'homme' | 'femme'; onLinked: () => void;
  onGo: (to: keyof typeof GO) => void;
}> = ({ card, palette, busy, costLabel, onStart, onOpen, prenom, genre, onLinked, onGo }) => {
  if (card.type === 'go') {
    const go = GO[card.to];
    return (
      <div className="drl-in" style={{ marginTop: 10 }}>
        <button onClick={() => onGo(card.to)} className="drl-btn"
          style={{ minHeight: 46, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 14, border: 0, background: palette.primary, color: C.ink, fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
          {go.label}{card.to === 'chat' && <span style={{ fontWeight: 600, opacity: 0.75 }}>· {credits(1)} / message</span>}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }
  if (card.type === 'signup') return <SignupCard mode={card.mode ?? 'signup'} prenom={prenom} genre={genre} palette={palette} />;
  if (card.type === 'link_account') return <LinkAccountCard palette={palette} onLinked={onLinked} />;
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
            <p style={{ margin: '3px 0 0', fontSize: 12, color: C.faint, display: 'flex', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} aria-hidden="true" /> {scale?.timeEstimateMinutes ?? 3} min</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ListChecks size={12} aria-hidden="true" /> {scale?.items.length ?? '?'} questions</span>
            </p>
          </div>
        </div>
        <button onClick={() => onStart(card.scaleId)} className="drl-btn" disabled={busy}
          style={{ marginTop: 12, width: '100%', minHeight: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, border: 0, background: palette.primary, color: C.ink, fontSize: 14.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.55 : 1 }}>
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
            <li key={r.label} style={{ fontSize: 13.5, color: C.text }}>
              {r.phone ? (
                <a href={`tel:${r.phone.replace(/\s/g, '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#DCE5F2', textDecoration: 'none', minHeight: 32 }}>
                  <Phone size={14} aria-hidden="true" /> {r.label}{r.phone !== r.label.split(' ')[0] ? ` · ${r.phone}` : ''}
                </a>
              ) : (
                <span style={{ fontWeight: 700 }}>{r.label}</span>
              )}
              {r.note && <span style={{ display: 'block', fontSize: 11.5, color: C.faint }}>{r.note}</span>}
            </li>
          ))}
          <li style={{ fontSize: 12, color: C.muted }}>Ou va voir quelqu'un de confiance autour de toi, maintenant.</li>
        </ul>
      </div>
    );
  }
  return null;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div aria-label={`${label} : question ${Math.min(p.done + 1, p.total)} sur ${p.total}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: C.faint, marginBottom: 6 }}>
          <span>{label}</span>
          <span>{item ? Math.max(1, visibleItems(scale, answers).findIndex(i => i.id === item.id) + 1) : p.total} / {p.total}</span>
        </div>
        <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,.10)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: palette.accent, transition: 'width .4s ease' }} />
        </div>
      </div>
      {!hidden && item && (
        <div className="drl-in" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scale.instructions && !/(…|\.\.\.)\s*$/.test(scale.instructions) && (
            <p style={{ margin: '2px 0 2px', fontSize: 12, color: C.faint, textAlign: 'center', lineHeight: 1.45 }}>{scale.instructions}</p>
          )}
          {item.options.map(o => {
            const chosen = answers[item.id] === o.value;
            return (
              <button key={o.value} onClick={() => onAnswer(o)} disabled={busy} className="drl-btn"
                style={{ minHeight: 50, padding: '10px 16px', borderRadius: 16, textAlign: 'left', cursor: busy ? 'default' : 'pointer',
                  border: `1px solid ${chosen ? palette.accent : 'rgba(242,182,109,.30)'}`,
                  background: chosen ? 'rgba(242,182,109,.20)' : 'rgba(255,255,255,.05)', color: C.text,
                  display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700 }}>{o.label}</span>
                {o.subtitle && <span style={{ fontSize: 12, color: C.faint }}>{o.subtitle}</span>}
              </button>
            );
          })}
        </div>
      )}
      {!hidden && !item && (
        <button onClick={onFinish} disabled={busy} className="drl-btn"
          style={{ minHeight: 46, borderRadius: 14, border: 0, background: palette.primary, color: C.ink, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.55 : 1 }}>
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
