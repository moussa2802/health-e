/**
 * useDictation — dictée vocale (Web Speech API du navigateur, fr-FR).
 * Le texte dicté s'affiche dans le champ : la personne le relit avant d'envoyer.
 * Health-e ne reçoit ni ne garde aucun audio (la reconnaissance est faite par le navigateur).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getCtor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<RecognitionLike | null>(null);
  const baseRef = useRef('');
  const cbRef = useRef(onText);
  cbRef.current = onText;
  const supported = getCtor() !== null;

  const stop = useCallback(() => { recRef.current?.stop(); }, []);

  const start = useCallback((currentText = '') => {
    const Ctor = getCtor();
    if (!Ctor) return;
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = false;
    baseRef.current = currentText.trim() ? `${currentText.trim()} ` : '';
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      cbRef.current((baseRef.current + text).slice(0, 500));
    };
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Micro non autorisé. Tu peux l\'activer dans les réglages de ton navigateur, ou écrire.'
        : 'Je n\'ai pas bien entendu. Réessaie, ou écris-moi.');
    };
    rec.onend = () => { setListening(false); recRef.current = null; };
    recRef.current = rec;
    setError(null);
    try { rec.start(); setListening(true); } catch { setListening(false); }
  }, []);

  useEffect(() => () => { recRef.current?.abort(); }, []);

  return { supported, listening, error, start, stop, clearError: () => setError(null) };
}
