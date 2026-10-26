import '../components/accueil/accueil.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useReloadLock from '../hooks/useReloadLock';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getProfileProgress } from '../services/evaluationService';

import lionImg from '../assets/totems/lion.jpg';
import aigleImg from '../assets/totems/aigle.jpg';
import chevalImg from '../assets/totems/cheval.jpg';
import loupImg from '../assets/totems/loup.jpg';
import dauphinImg from '../assets/totems/dauphin.jpg';
import elephantImg from '../assets/totems/elephant.jpg';
import cerfImg from '../assets/totems/cerf.jpg';
import hibouImg from '../assets/totems/hibou.jpg';
import panthereImg from '../assets/totems/panthere.jpg';
import renardImg from '../assets/totems/renard.jpg';
import tortueImg from '../assets/totems/tortue.jpg';
import oursImg from '../assets/totems/ours.jpg';

const TOTEM_IMAGES: Record<string, string> = {
  lion: lionImg, aigle: aigleImg, cheval: chevalImg, loup: loupImg,
  dauphin: dauphinImg, elephant: elephantImg, cerf: cerfImg, hibou: hibouImg,
  panthere: panthereImg, renard: renardImg, tortue: tortueImg, ours: oursImg,
};

const TIMER_SECONDS = 25;
const API_BASE = '/.netlify/functions';

type Phase = 'loading' | 'notFound' | 'expired' | 'isCreator' | 'accueil' | 'playing' | 'submitting' | 'result' | 'alreadyResponded' | 'error';

interface DefiQuestion {
  text: string;
  options: { id: string; label: string }[];
  source: string;
  bonus?: number;
}

interface DefiData {
  slug: string;
  displayName: string;
  genre: string | null;
  statut: string;
  expiresAt: { toDate?: () => Date } | Date;
  devoilement: string;
  nbReponses: number;
  classement: { pseudo: string; score: number }[];
  questions: DefiQuestion[];
  titre?: string;
  petitsMots?: boolean;
}

interface QuestionDetail {
  questionText: string;
  verdict: 'bonne' | 'presque' | 'mauvaise' | 'timeout';
  playerAnswer: string | null;
  correctAnswer?: string;
}

interface ResultData {
  score: number;
  bonnes: number;
  presque: number;
  mauvaises: number;
  total: number;
  rang: number;
  nbRepondants: number;
  devoilement?: { questionIndex: number; correctOptionId: string }[];
  questionDetail?: QuestionDetail[];
  creatorTotem?: string;
  resultTitle?: string;
  resultSubtitle?: string;
}

function getDeviceId(): string {
  const KEY = 'he_defi_device_id';
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return stored;
  } catch {}
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
  try { localStorage.setItem(KEY, id); } catch {}
  return id;
}

function getSavedPseudo(): string {
  try { return localStorage.getItem('he_defi_pseudo') || ''; } catch { return ''; }
}

function savePseudo(v: string) {
  try { localStorage.setItem('he_defi_pseudo', v); } catch {}
}

function genderPronoun(genre: string | null): string {
  return genre === 'feminin' ? 'la' : 'le';
}

function scoreMessage(score: number, name: string, genre: string | null): string {
  const le = genre === 'feminin' ? 'la' : 'le';
  if (score >= 70) return `Tu connais vraiment ${name} par coeur ! ${le.charAt(0).toUpperCase() + le.slice(1)} ${genre === 'feminin' ? 'connaître' : 'connaître'} aussi bien, c'est rare`;
  if (score >= 40) return `Tu connais ${name} plutôt bien, mais ${genre === 'feminin' ? 'elle' : 'il'} garde encore des mystères`;
  return `Tu as encore beaucoup à découvrir sur ${name}`;
}

export default function DefiJouerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [phase, setPhase] = useState<Phase>('loading');
  useReloadLock(phase === 'playing' || phase === 'submitting');
  const [defi, setDefi] = useState<DefiData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Accueil
  const [pseudo, setPseudo] = useState(getSavedPseudo);

  // Playing
  const [startToken, setStartToken] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ questionIndex: number; optionId: string | null; ms: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const questionStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Result
  const [result, setResult] = useState<ResultData | null>(null);

  // Petit mot
  const [petitMot, setPetitMot] = useState('');
  const [petitMotSent, setPetitMotSent] = useState(false);
  const [petitMotSending, setPetitMotSending] = useState(false);
  const [petitMotError, setPetitMotError] = useState('');

  // ── Load défi ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) { setPhase('notFound'); return; }

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'defis', slug));
        if (!snap.exists()) { setPhase('notFound'); return; }

        const data = snap.data() as DefiData;
        data.slug = slug;
        setDefi(data);

        const expiresAt = data.expiresAt && typeof (data.expiresAt as any).toDate === 'function'
          ? (data.expiresAt as any).toDate() : new Date(data.expiresAt as any);

        if (expiresAt <= new Date()) { setPhase('expired'); return; }

        if (currentUser) {
          try {
            const profile = await getProfileProgress(currentUser.id);
            if (profile.activeDefis?.some(d => d.slug === slug)) {
              setPhase('isCreator');
              return;
            }
          } catch {}
        }

        setPhase('accueil');
      } catch {
        setPhase('notFound');
      }
    })();
  }, [slug, currentUser]);

  // ── Timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    questionStartRef.current = Date.now();
    setTimeLeft(TIMER_SECONDS);
    setSelectedId(null);

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      const remaining = Math.max(0, TIMER_SECONDS - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        handleAnswer(null);
      }
    }, 100);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentQ]);

  // ── Start ─────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!slug || !pseudo.trim() || pseudo.trim().length < 2) return;
    savePseudo(pseudo.trim());

    try {
      const deviceId = getDeviceId();
      const res = await fetch(`${API_BASE}/defi-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, deviceId }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Erreur'); setPhase('error'); return; }

      setStartToken(data.startToken);
      setCurrentQ(0);
      setAnswers([]);
      setPhase('playing');
    } catch {
      setErrorMsg('Impossible de se connecter au serveur');
      setPhase('error');
    }
  }, [slug, pseudo]);

  // ── Answer ────────────────────────────────────────────────────────────
  const handleAnswer = useCallback((optionId: string | null) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const ms = Math.min(Date.now() - questionStartRef.current, 26000);
    setSelectedId(optionId);

    const newAnswers = [...answers, { questionIndex: currentQ, optionId, ms }];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (defi && currentQ + 1 < defi.questions.length) {
        setCurrentQ(prev => prev + 1);
      } else {
        submitAnswers(newAnswers);
      }
    }, 400);
  }, [answers, currentQ, defi]);

  // ── Submit ────────────────────────────────────────────────────────────
  const submitAnswers = useCallback(async (finalAnswers: typeof answers) => {
    setPhase('submitting');

    try {
      const deviceId = getDeviceId();
      const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

      if (currentUser) {
        try {
          const { getAuth } = await import('firebase/auth');
          const token = await getAuth().currentUser?.getIdToken();
          if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch(`${API_BASE}/defi-respond`, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          slug,
          deviceId,
          pseudo: pseudo.trim(),
          startToken,
          answers: finalAnswers,
        }),
      });
      const data = await res.json();

      if (res.status === 409) { setPhase('alreadyResponded'); return; }
      if (!res.ok) { setErrorMsg(data.error || 'Erreur'); setPhase('error'); return; }

      setResult(data);
      setPhase('result');
    } catch {
      setErrorMsg('Impossible de se connecter au serveur');
      setPhase('error');
    }
  }, [slug, pseudo, startToken, currentUser]);

  // ── Send petit mot ────────────────────────────────────────────────────
  const handleSendPetitMot = useCallback(async () => {
    if (!slug || petitMotSending || !petitMot.trim()) return;
    setPetitMotSending(true);
    setPetitMotError('');

    try {
      const deviceId = getDeviceId();
      const res = await fetch(`${API_BASE}/defi-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, deviceId, texte: petitMot.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPetitMotError(data.error || 'Erreur');
        setPetitMotSending(false);
        return;
      }
      setPetitMotSent(true);
    } catch {
      setPetitMotError('Erreur réseau');
    } finally {
      setPetitMotSending(false);
    }
  }, [slug, petitMot, petitMotSending]);

  // ── Render helpers ────────────────────────────────────────────────────
  const pronoun = defi ? genderPronoun(defi.genre) : 'le';

  const whatsappShare = (score: number) => {
    const text = `J'ai eu ${score} % au défi de ${defi?.displayName} 😎 Et toi, tu ${pronoun} connais vraiment ? 👉 https://health-e.sn/api/d/${slug}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const top3 = defi?.classement?.slice(0, 3) || [];

  // ── Minimal header ────────────────────────────────────────────────────
  const MiniHeader = () => (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md border-b border-line px-4 py-3 flex items-center justify-center">
      <span className="font-display text-lg font-bold text-gold">Health-e</span>
    </header>
  );

  // ── LOADING ───────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-paper drl-screen drl-page">
        <MiniHeader />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // ── NOT FOUND ─────────────────────────────────────────────────────────
  if (phase === 'notFound') {
    return (
      <div className="min-h-screen bg-paper drl-screen drl-page">
        <MiniHeader />
        <div className="max-w-md mx-auto px-5 pt-20 text-center">
          <p className="text-4xl mb-4">🤔</p>
          <h1 className="font-display text-xl font-bold text-ink mb-2">Oups, ce défi n'existe pas</h1>
          <p className="text-muted mb-8">Le lien est peut-être incorrect ou le défi a été supprimé.</p>
          <button onClick={() => navigate('/')} className="bg-gold text-white font-semibold px-6 py-3 rounded-xl">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ── EXPIRED ───────────────────────────────────────────────────────────
  if (phase === 'expired') {
    return (
      <div className="min-h-screen bg-paper drl-screen drl-page">
        <MiniHeader />
        <div className="max-w-md mx-auto px-5 pt-12 text-center">
          <p className="text-4xl mb-4">🏁</p>
          <h1 className="font-display text-xl font-bold text-ink mb-2">Ce défi est terminé</h1>
          <p className="text-muted mb-6">
            {defi?.statut === 'termine'
              ? `${defi.displayName} a clôturé son défi`
              : 'Le temps est écoulé !'}
          </p>

          {top3.length > 0 && (
            <div className="bg-white/60 rounded-2xl p-4 mb-8 border border-line">
              <h2 className="font-display font-bold text-ink mb-3">🏆 Top 3</h2>
              {top3.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                  <span className="text-ink">{['🥇', '🥈', '🥉'][i]} {e.pseudo}</span>
                  <span className="font-bold text-gold">{e.score} %</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate(`/decouvre?src=defi&ref=${slug}`)}
            className="bg-gold text-white font-semibold px-6 py-3 rounded-xl w-full"
          >
            Et toi, découvre ton totem
          </button>
        </div>
      </div>
    );
  }

  // ── IS CREATOR ────────────────────────────────────────────────────────
  if (phase === 'isCreator') {
    return (
      <div className="min-h-screen bg-paper drl-screen drl-page">
        <MiniHeader />
        <div className="max-w-md mx-auto px-5 pt-20 text-center">
          <p className="text-4xl mb-4">😄</p>
          <h1 className="font-display text-xl font-bold text-ink mb-2">C'est ton défi !</h1>
          <p className="text-muted mb-8">Partage-le à tes proches pour qu'ils jouent.</p>
          <button onClick={() => navigate(`/defi/${slug}/partage`)} className="bg-gold text-white font-semibold px-6 py-3 rounded-xl">
            Partage-le 👉
          </button>
        </div>
      </div>
    );
  }

  // ── ALREADY RESPONDED ─────────────────────────────────────────────────
  if (phase === 'alreadyResponded') {
    return (
      <div className="min-h-screen bg-paper drl-screen drl-page">
        <MiniHeader />
        <div className="max-w-md mx-auto px-5 pt-20 text-center">
          <p className="text-4xl mb-4">✋</p>
          <h1 className="font-display text-xl font-bold text-ink mb-2">Tu as déjà répondu</h1>
          <p className="text-muted mb-8">Tu ne peux répondre qu'une seule fois à ce défi.</p>
          <a
            href={whatsappShare(0)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#25D366] text-white font-semibold px-6 py-3 rounded-xl"
          >
            Partager le défi via WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────
  if (phase === 'error') {
    const canRetry = answers.length > 0 && startToken;
    return (
      <div className="min-h-screen bg-paper drl-screen drl-page">
        <MiniHeader />
        <div className="max-w-md mx-auto px-5 pt-20 text-center">
          <p className="text-4xl mb-4">😕</p>
          <h1 className="font-display text-xl font-bold text-ink mb-2">Oups</h1>
          <p className="text-muted mb-8">{errorMsg || 'Une erreur est survenue.'}</p>
          {canRetry ? (
            <button onClick={() => submitAnswers(answers)} className="bg-gold text-white font-semibold px-6 py-3 rounded-xl">
              Réessayer l'envoi
            </button>
          ) : (
            <button onClick={() => setPhase('accueil')} className="bg-gold text-white font-semibold px-6 py-3 rounded-xl">
              Recommencer
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── ACCUEIL ───────────────────────────────────────────────────────────
  if (phase === 'accueil' && defi) {
    const pseudoValid = pseudo.trim().length >= 2 && pseudo.trim().length <= 20;

    return (
      <div className="min-h-screen bg-paper drl-screen drl-page">
        <MiniHeader />
        <div className="max-w-md mx-auto px-5 pt-8 pb-12">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-ink leading-tight mb-2">
              {defi.titre
                ? `${defi.titre} par ${defi.displayName} 👀`
                : `${defi.displayName} veut savoir qui ${pronoun} connaît le mieux 👀`}
            </h1>
            <p className="text-muted">
              {defi.questions.length} questions · 25 secondes chacune ⏱️
            </p>
          </div>

          {top3.length > 0 && (
            <div className="bg-white/60 rounded-2xl p-4 mb-6 border border-line">
              <h2 className="font-display font-bold text-ink mb-3 text-sm">🏆 Classement</h2>
              {top3.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-ink text-sm">{['🥇', '🥈', '🥉'][i]} {e.pseudo}</span>
                  <span className="font-bold text-gold text-sm">{e.score} %</span>
                </div>
              ))}
              {defi.nbReponses > 3 && (
                <p className="text-xs text-muted mt-2 text-center">et {defi.nbReponses - 3} autres</p>
              )}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-ink mb-2">Ton pseudo</label>
            <input
              type="text"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              placeholder="Comment tu t'appelles ?"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl border border-line bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
            />
          </div>

          <p className="text-xs text-muted text-center mb-6">
            Tes réponses servent uniquement au jeu.
          </p>

          <button
            onClick={handleStart}
            disabled={!pseudoValid}
            className="w-full bg-gold text-white font-bold text-lg py-4 rounded-xl shadow-soft disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            C'est parti !
          </button>
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  if (phase === 'playing' && defi) {
    const question = defi.questions[currentQ];
    const isTotem = question.source === 'totem';
    const isLastQ = currentQ === defi.questions.length - 1;
    const isMidpoint = currentQ === Math.floor(defi.questions.length / 2);
    const progress = ((currentQ) / defi.questions.length) * 100;
    const isRedZone = timeLeft <= 5;
    const timerPct = (timeLeft / TIMER_SECONDS) * 100;

    if (isRedZone && timeLeft > 0 && timeLeft <= 5 && Math.floor(timeLeft) !== Math.floor(timeLeft + 0.1)) {
      try { navigator.vibrate?.(50); } catch {}
    }

    const rhythmMessage = isLastQ && isTotem
      ? 'Dernière question, elle compte double 🐾'
      : isMidpoint
        ? 'Mi-temps ⚽'
        : null;

    return (
      <div className="min-h-screen bg-paper drl-screen drl-page flex flex-col">
        <MiniHeader />

        {/* Progress + timer */}
        <div className="px-4 pt-3 pb-2 space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium">Question {currentQ + 1}/{defi.questions.length}</span>
              {rhythmMessage && (
                <span className="text-xs font-bold text-gold animate-pulse">{rhythmMessage}</span>
              )}
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-gold/30 rounded-full transition-none" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div>
            <span className={`text-xs font-bold tabular-nums ${isRedZone ? 'text-red-500' : 'text-muted'}`}>
              {Math.ceil(timeLeft)}
            </span>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full rounded-full transition-none ${isRedZone ? 'bg-red-500' : 'bg-sage'}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col px-5 pt-4 pb-8 max-w-md mx-auto w-full">
          {isTotem && (
            <div className="bg-gold-soft text-gold text-xs font-bold px-3 py-1.5 rounded-full self-start mb-3">
              Question bonus ×2 🐾
            </div>
          )}

          <h2 className="font-display text-lg font-bold text-ink mb-6 leading-snug">
            {question.text}
          </h2>

          <div className="flex flex-col gap-3 flex-1">
            {question.options.map(opt => {
              const isSelected = selectedId === opt.id;
              const totemKey = isTotem ? opt.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : null;
              const totemImg = totemKey ? Object.entries(TOTEM_IMAGES).find(([k]) => totemKey.includes(k))?.[1] : null;

              return (
                <button
                  key={opt.id}
                  onClick={() => { if (!selectedId) handleAnswer(opt.id); }}
                  disabled={!!selectedId}
                  className={`
                    text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center gap-3
                    ${isSelected
                      ? 'border-gold bg-gold-soft scale-[0.98]'
                      : 'border-line bg-white hover:border-gold/40 active:scale-[0.98]'}
                    ${selectedId && !isSelected ? 'opacity-50' : ''}
                  `}
                >
                  {totemImg && (
                    <img src={totemImg} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <span className="text-ink text-sm leading-snug">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── SUBMITTING ────────────────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-paper drl-screen drl-page">
        <MiniHeader />
        <div className="flex flex-col items-center justify-center pt-32">
          <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full mb-4" />
          <p className="text-muted">Calcul de ton score...</p>
        </div>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────
  if (phase === 'result' && result && defi) {
    const SUGGESTIONS = [
      'Fier de toi ❤️',
      'Je te connais trop bien 😂',
      'Tu es un vrai baobab 🌳',
      'Ce jeu, c’est validé 🔥',
    ];
    const ilElle = defi.genre === 'feminin' ? 'Elle' : 'Il';
    const luiElle = defi.genre === 'feminin' ? 'elle' : 'lui';

    return (
      <div className="min-h-screen bg-paper drl-screen drl-page">
        <MiniHeader />
        <div className="max-w-md mx-auto px-5 pt-8 pb-12">
          {/* Score */}
          <div className="text-center mb-8">
            <p className="text-5xl font-display font-bold text-gold mb-2">{result.score} %</p>
            {result.resultTitle ? (
              <>
                <h1 className="font-display text-xl font-bold text-ink mb-1">{result.resultTitle}</h1>
                {result.resultSubtitle && (
                  <p className="text-[14px] text-muted m-0">{result.resultSubtitle}</p>
                )}
              </>
            ) : (
              <h1 className="font-display text-xl font-bold text-ink">
                {scoreMessage(result.score, defi.displayName, defi.genre)} {result.score >= 70 ? '🔥' : result.score >= 40 ? '👀' : '🤔'}
              </h1>
            )}
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.bonnes}</p>
              <p className="text-xs text-muted">Bonnes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{result.presque}</p>
              <p className="text-xs text-muted">Presque</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{result.mauvaises}</p>
              <p className="text-xs text-muted">Raté</p>
            </div>
          </div>

          {/* Rank */}
          <div className="bg-white/60 rounded-2xl p-4 mb-6 border border-line text-center">
            <p className="text-ink">
              Tu es <strong className="text-gold">{result.rang}{result.rang === 1 ? 'er' : 'e'}</strong> sur {result.nbRepondants} {result.nbRepondants > 1 ? 'joueurs' : 'joueur'}
            </p>
          </div>

          {/* Petit mot card */}
          {defi.petitsMots && !petitMotSent && (
            <div className="rounded-2xl p-4 mb-6 border-2 border-gold/40 shadow-sm"
              style={{ background: 'linear-gradient(135deg, rgba(212,163,75,0.08) 0%, rgba(193,114,70,0.08) 100%)' }}>
              <h3 className="font-display font-bold text-ink text-[15px] mb-0.5">
                💌 Laisse un petit mot à {defi.displayName}
              </h3>
              <p className="text-xs text-muted mb-3">
                {ilElle} le lira dans son espace, rien que pour {luiElle}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setPetitMot(s)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-white/80 border border-gold/20 text-ink hover:bg-gold-soft active:scale-95 transition-all">
                    {s}
                  </button>
                ))}
              </div>
              <textarea
                value={petitMot}
                onChange={e => setPetitMot(e.target.value)}
                placeholder="Ton message ici..."
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-line bg-white text-ink text-sm resize-none focus:outline-none focus:border-gold"
              />
              <p className="text-[11px] text-muted mt-1 mb-2 text-right">{petitMot.length}/200</p>
              {petitMotError && (
                <p className="text-[12px] text-red-500 mb-2">{petitMotError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSendPetitMot}
                  disabled={!petitMot.trim() || petitMotSending}
                  className="flex-1 bg-gold text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
                >
                  {petitMotSending ? 'Envoi...' : 'Envoyer 💌'}
                </button>
                <button
                  onClick={() => setPetitMotSent(true)}
                  className="px-4 py-2.5 rounded-xl text-muted text-sm hover:underline"
                >
                  Non merci
                </button>
              </div>
            </div>
          )}

          {petitMotSent && defi.petitsMots && petitMot.trim() && (
            <div className="bg-gold-soft rounded-2xl p-4 mb-6 text-center">
              <p className="text-sm text-ink font-medium">Merci pour ton petit mot 💌</p>
            </div>
          )}

          {/* Question detail */}
          {result.questionDetail && result.questionDetail.length > 0 && (
            <div className="bg-white/60 rounded-2xl p-4 mb-6 border border-line">
              <h3 className="font-display font-bold text-ink text-sm mb-3">Ton détail</h3>
              {result.questionDetail.map((d, i) => {
                const icon = d.verdict === 'bonne' ? '✅' : d.verdict === 'presque' ? '🟠' : '❌';
                return (
                  <div key={i} className="py-2.5 border-b border-line last:border-0">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
                      <p className="text-sm text-ink leading-snug">{d.questionText}</p>
                    </div>
                    <p className="text-xs text-muted ml-6">
                      Ta réponse : {d.playerAnswer || '⏱️ Temps écoulé'}
                    </p>
                    {d.correctAnswer && d.verdict !== 'bonne' && (
                      <p className="text-xs text-green-600 ml-6 mt-0.5">
                        Bonne réponse : {d.correctAnswer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <a
            href={whatsappShare(result.score)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#25D366] text-white font-bold text-center py-4 rounded-xl mb-4"
          >
            Partager mon score via WhatsApp
          </a>

          <button
            onClick={() => {
              try { localStorage.setItem('he_acq_src', `defi:${slug}`); } catch {}
              navigate(`/decouvre?src=defi&ref=${slug}`, {
                state: {
                  creatorTotem: result.creatorTotem || null,
                  creatorName: defi.displayName,
                },
              });
            }}
            className="w-full bg-gold text-white font-bold py-4 rounded-xl text-[14px] leading-snug px-4"
          >
            Et toi ? Tes proches te connaissent-ils vraiment ? 👉
          </button>
        </div>
      </div>
    );
  }

  return null;
}
