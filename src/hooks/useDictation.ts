/**
 * useDictation — dictée vocale (Web Speech API du navigateur, fr-FR).
 * Le texte dicté s'affiche dans le champ : la personne le relit avant d'envoyer.
 * Health-e ne reçoit ni ne garde aucun audio (la reconnaissance est faite par le navigateur).
 *
 * v2 :
 *  - un petit son (et une vibration sur Android) quand le micro s'ouvre et quand il se ferme ;
 *  - on peut faire des pauses : la dictée continue tant qu'on parle, et s'arrête seule après
 *    4 s de silence (ou 90 s au total). Techniquement : des tours courts relancés à la suite
 *    (le mode « continu » des navigateurs répète des mots sur Android) ;
 *  - parmi les propositions du navigateur, on garde la plus sûre ;
 *  - majuscule en début de phrase, « point d'interrogation » → « ? », « virgule » → « , »… ;
 *  - des messages d'erreur précis (micro refusé, rien entendu, pas d'internet).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type Alt = { transcript: string; confidence?: number };
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<Alt> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onspeechstart?: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getCtor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SILENCE_MS = 4000;
const MAX_MS = 90000;
const MAX_LEN = 500;

/** Ponctuation dite à voix haute, et un peu de mise en forme. */
export function tidy(raw: string): string {
  let t = ` ${raw} `
    .replace(/\s+point d['’]interrogation\b/gi, ' ?')
    .replace(/\s+point d['’]exclamation\b/gi, ' !')
    .replace(/\s+virgule\b/gi, ',')
    .replace(/\s+(à la ligne|nouvelle ligne)\b/gi, '\n')
    .replace(/\s+points? de suspension\b/gi, '…')
    .replace(/\s+deux points\b/gi, ' :');
  t = t.replace(/[ \t]+/g, ' ').replace(/ ,/g, ',').replace(/\n /g, '\n').trim();
  // Majuscule au début et après . ! ? …
  t = t.replace(/(^|[.!?…]\s+|\n)([a-zàâäéèêëîïôöûüç])/g, (_, p: string, c: string) => p + c.toUpperCase());
  return t;
}

/** Bip doux, synthétisé (aucun fichier). up = ouverture du micro, sinon fermeture. */
function earcon(ctx: AudioContext | null, up: boolean) {
  if (!ctx) return;
  try {
    const t = ctx.currentTime + 0.01;
    (up ? [660, 990] : [880, 587]).forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const s = t + i * 0.09;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.12, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.16);
      o.connect(g).connect(ctx.destination); o.start(s); o.stop(s + 0.18);
    });
  } catch { /* pas de son */ }
}

export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** On entend quelqu'un parler en ce moment (pour animer l'indicateur). */
  const [hearing, setHearing] = useState(false);
  const recRef = useRef<RecognitionLike | null>(null);
  const baseRef = useRef('');
  /** Texte déjà validé pendant cette dictée (tours précédents). */
  const doneRef = useRef('');
  const wantRef = useRef(false);
  const startedAt = useRef(0);
  const lastHeard = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;
  const supported = getCtor() !== null;

  const emit = (interim = '') => {
    const spoken = tidy(`${doneRef.current} ${interim}`.trim());
    cbRef.current((baseRef.current + spoken).slice(0, MAX_LEN));
  };

  const finish = useCallback((sound = true) => {
    if (!wantRef.current) return;
    wantRef.current = false;
    try { recRef.current?.stop(); } catch { /* déjà arrêtée */ }
    setListening(false); setHearing(false);
    if (sound) { earcon(ctxRef.current, false); navigator.vibrate?.(10); }
  }, []);

  const stop = useCallback(() => finish(true), [finish]);

  /** Un tour de reconnaissance ; relancé tant que la personne parle. */
  const round = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || !wantRef.current) return;
    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 3;
    let finals = '';
    rec.onresult = (e) => {
      let interim = '';
      finals = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        // La proposition la plus sûre (le navigateur ne donne pas toujours de score : alors la première)
        let best = r[0];
        for (let j = 1; j < r.length; j++) if ((r[j].confidence ?? 0) > (best.confidence ?? 0) + 0.15) best = r[j];
        if (r.isFinal) finals += best.transcript; else interim += best.transcript;
      }
      lastHeard.current = Date.now();
      setHearing(true);
      emit(`${finals} ${interim}`.trim());
    };
    rec.onspeechstart = () => { lastHeard.current = Date.now(); setHearing(true); };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // géré par le silence
      wantRef.current = false;
      setListening(false); setHearing(false);
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Micro non autorisé. Tu peux l\'activer dans les réglages de ton navigateur, ou écrire.'
        : e.error === 'audio-capture' ? 'Je ne trouve pas de micro. Vérifie qu\'il est branché, ou écris-moi.'
        : e.error === 'network' ? 'La dictée a besoin d\'internet. Réessaie quand la connexion revient, ou écris-moi.'
        : 'Je n\'ai pas bien entendu. Réessaie, ou écris-moi.');
    };
    rec.onend = () => {
      if (finals.trim()) doneRef.current = `${doneRef.current} ${finals}`.trim();
      emit();
      setHearing(false);
      const now = Date.now();
      const silent = now - lastHeard.current > SILENCE_MS;
      if (!wantRef.current) { recRef.current = null; return; }
      if (silent || now - startedAt.current > MAX_MS || (baseRef.current + doneRef.current).length >= MAX_LEN) {
        if (!doneRef.current.trim() && silent) setError('Je n\'ai rien entendu. Parle un peu plus près du micro, ou écris-moi.');
        finish(true);
        recRef.current = null;
        return;
      }
      // Une pause : on relance aussitôt, la phrase continue
      try { round(); } catch { finish(true); }
    };
    recRef.current = rec;
    try { rec.start(); } catch { finish(false); }
  }, [finish]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback((currentText = '') => {
    if (!getCtor()) return;
    try { recRef.current?.abort(); } catch { /* rien */ }
    // Le son se prépare dans le toucher (iPhone)
    try {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (C && !ctxRef.current) ctxRef.current = new C();
      ctxRef.current?.resume().catch(() => {});
    } catch { /* pas de son */ }
    baseRef.current = currentText.trim() ? `${currentText.trim()} ` : '';
    doneRef.current = '';
    startedAt.current = Date.now();
    lastHeard.current = Date.now();
    wantRef.current = true;
    setError(null);
    setListening(true);
    earcon(ctxRef.current, true);
    navigator.vibrate?.(15);
    round();
  }, [round]);

  useEffect(() => () => { wantRef.current = false; try { recRef.current?.abort(); } catch { /* rien */ } }, []);

  return { supported, listening, hearing, error, start, stop, clearError: () => setError(null) };
}
