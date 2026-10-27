/**
 * useVoiceRecorder — enregistre un vocal avec le micro (3 minutes au plus), léger (≈ 25 ko/s).
 * Rien n'est envoyé tant que l'appelant ne le décide pas.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_VOICE_SEC = 180;
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export interface VoiceClip { blob: Blob; mime: string; durationSec: number; url: string }
export type RecState = 'idle' | 'recording' | 'ready' | 'denied' | 'unsupported';

export function useVoiceRecorder() {
  const [state, setState] = useState<RecState>(() => (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices ? 'unsupported' : 'idle'));
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<VoiceClip | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const started = useRef(0);
  const stream = useRef<MediaStream | null>(null);

  const cleanup = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach(t => t.stop());
    stream.current = null;
  };

  const stop = useCallback(() => { if (rec.current && rec.current.state !== 'inactive') rec.current.stop(); }, []);

  const start = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices) { setState('unsupported'); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const mime = TYPES.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const r = new MediaRecorder(s, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
      chunks.current = [];
      r.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        const type = r.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunks.current, { type });
        const durationSec = Math.min(MAX_VOICE_SEC, Math.max(1, Math.round((Date.now() - started.current) / 1000)));
        setClip(prev => { if (prev) URL.revokeObjectURL(prev.url); return { blob, mime: type, durationSec, url: URL.createObjectURL(blob) }; });
        setState('ready');
        cleanup();
      };
      rec.current = r;
      started.current = Date.now();
      setElapsed(0);
      r.start(1000);
      setState('recording');
      timer.current = window.setInterval(() => {
        const sec = Math.round((Date.now() - started.current) / 1000);
        setElapsed(sec);
        if (sec >= MAX_VOICE_SEC) stop();
      }, 250);
    } catch {
      setState('denied');
      cleanup();
    }
  }, [stop]);

  const reset = useCallback(() => {
    setClip(prev => { if (prev) URL.revokeObjectURL(prev.url); return null; });
    setElapsed(0);
    setState(typeof MediaRecorder === 'undefined' || !navigator.mediaDevices ? 'unsupported' : 'idle');
  }, []);

  useEffect(() => () => { try { if (rec.current && rec.current.state !== 'inactive') { rec.current.onstop = null; rec.current.stop(); } } catch { /* ignore */ } cleanup(); }, []);

  return { state, elapsed, clip, start, stop, reset };
}

/** Blob → base64 (sans l'en-tête data:). */
export function blobToBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] ?? '');
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(b);
  });
}
