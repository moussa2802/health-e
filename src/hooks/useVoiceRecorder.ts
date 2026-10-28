/**
 * useVoiceRecorder — enregistre un vocal avec le micro (5 minutes au plus, ≈ 4 ko/s), ou importe un fichier audio
 * (MP3, M4A, AAC, OGG/Opus, WebM, WAV) : durée ≤ 5 min ; s'il est trop lourd ou peu lisible sur iPhone, il est
 * réencodé en MP3 léger dans le navigateur. Rien n'est envoyé tant que l'appelant ne le décide pas.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_VOICE_SEC = 300;
/** Taille maximale envoyée au serveur (limite Netlify de 6 Mo par envoi, base64 compris). */
export const MAX_VOICE_BYTES = 4 * 1024 * 1024;
/** Fichier choisi : au-delà, on refuse avant même de le lire (un vocal de 5 min ne pèse jamais autant). */
const MAX_PICK_BYTES = 60 * 1024 * 1024;
export const VOICE_FILE_ACCEPT = 'audio/*,.mp3,.m4a,.aac,.ogg,.opus,.webm,.wav';
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export interface VoiceClip { blob: Blob; mime: string; durationSec: number; url: string }
export type RecState = 'idle' | 'recording' | 'processing' | 'ready' | 'denied' | 'unsupported';

export function useVoiceRecorder() {
  const [state, setState] = useState<RecState>(() => (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices ? 'unsupported' : 'idle'));
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<VoiceClip | null>(null);
  const [error, setError] = useState('');
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
    setError('');
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
        const raw = new Blob(chunks.current, { type });
        const durationSec = Math.min(MAX_VOICE_SEC, Math.max(1, Math.round((Date.now() - started.current) / 1000)));
        cleanup();
        setState('processing');
        void toUniversalAudio(raw).then(({ blob, mime: m }) => {
          setClip(prev => { if (prev) URL.revokeObjectURL(prev.url); return { blob, mime: m, durationSec, url: URL.createObjectURL(blob) }; });
          setState('ready');
        });
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

  /** Importer un fichier audio : vérifie la durée, le convertit si besoin, puis le propose à l'écoute. */
  const loadFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setError('');
    const type = audioType(file);
    if (!type) { setError('Ce fichier n\'est pas un audio. Choisis un MP3, un M4A (mémo vocal iPhone), un OGG (note WhatsApp) ou un WAV.'); return; }
    if (file.size > MAX_PICK_BYTES) { setError('Ce fichier est beaucoup trop lourd. Un vocal de 5 minutes fait en général moins de 5 Mo.'); return; }
    setState('processing');
    try {
      const sec = await fileDuration(file);
      if (sec === null) { setError('Ce fichier audio ne peut pas être lu ici. Essaie en MP3 ou en M4A.'); setState(idleState()); return; }
      if (sec > MAX_VOICE_SEC + 2) { setError(`Ce vocal dure ${fmt(sec)} : 5 minutes au plus. Coupe-le puis réessaie.`); setState(idleState()); return; }
      const direct = (type === 'audio/mpeg' || type === 'audio/mp4') && file.size <= MAX_VOICE_BYTES;
      const out = direct ? { blob: file as Blob, mime: type } : await toUniversalAudio(new Blob([file], { type }), true);
      if (out.blob.size > MAX_VOICE_BYTES) { setError('Ce vocal reste trop lourd (4 Mo au plus). Exporte-le en MP3 96 kbit/s, ou enregistre-le directement ici.'); setState(idleState()); return; }
      if (out.blob.size < 1000) { setError('Ce fichier audio semble vide.'); setState(idleState()); return; }
      const durationSec = Math.max(1, Math.min(MAX_VOICE_SEC, Math.round(sec)));
      setClip(prev => { if (prev) URL.revokeObjectURL(prev.url); return { blob: out.blob, mime: out.mime, durationSec, url: URL.createObjectURL(out.blob) }; });
      setState('ready');
    } catch {
      setError('Ce fichier audio ne peut pas être lu ici. Essaie en MP3 ou en M4A.');
      setState(idleState());
    }
  }, []);

  const reset = useCallback(() => {
    setClip(prev => { if (prev) URL.revokeObjectURL(prev.url); return null; });
    setError('');
    setElapsed(0);
    setState(typeof MediaRecorder === 'undefined' || !navigator.mediaDevices ? 'unsupported' : 'idle');
  }, []);

  useEffect(() => () => { try { if (rec.current && rec.current.state !== 'inactive') { rec.current.onstop = null; rec.current.stop(); } } catch { /* ignore */ } cleanup(); }, []);

  return { state, elapsed, clip, error, start, stop, reset, loadFile };
}

/**
 * Chrome enregistre en webm/opus, que beaucoup de téléphones (iPhone surtout) ne savent pas lire :
 * le vocal « charge en boucle ». On le convertit donc en MP3 (lu partout) avant envoi.
 * Si la conversion échoue, on garde l'original.
 */
export async function toUniversalAudio(blob: Blob, force = false): Promise<{ blob: Blob; mime: string }> {
  const base = blob.type.split(';')[0].toLowerCase();
  if (!force && (base === 'audio/mp4' || base === 'audio/mpeg')) return { blob, mime: base };
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    void ctx.close();
    const RATE = 24000;
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * RATE)), RATE);
    const src = off.createBufferSource();
    src.buffer = decoded; src.connect(off.destination); src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const { Mp3Encoder } = await import('@breezystack/lamejs');
    const enc = new Mp3Encoder(1, RATE, 48);
    const int16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) { const v = Math.max(-1, Math.min(1, pcm[i])); int16[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }
    const parts: Uint8Array[] = [];
    for (let i = 0; i < int16.length; i += 1152) {
      const out = enc.encodeBuffer(int16.subarray(i, i + 1152));
      if (out.length) parts.push(out);
    }
    const tail = enc.flush();
    if (tail.length) parts.push(tail);
    const mp3 = new Blob(parts as BlobPart[], { type: 'audio/mpeg' });
    return mp3.size > 1000 ? { blob: mp3, mime: 'audio/mpeg' } : { blob, mime: base || 'audio/webm' };
  } catch {
    return { blob, mime: base || 'audio/webm' };
  }
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

const idleState = (): RecState => (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices ? 'unsupported' : 'idle');
const fmt = (sec: number) => `${Math.floor(sec / 60)} min ${String(Math.round(sec % 60)).padStart(2, '0')}`;

/** Type audio normalisé d'un fichier choisi (le navigateur ne le donne pas toujours : on regarde l'extension). */
export function audioType(file: { name: string; type: string }): string | null {
  const t = (file.type || '').split(';')[0].toLowerCase();
  const byExt: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm', wav: 'audio/wav' };
  const norm: Record<string, string> = { 'audio/mp3': 'audio/mpeg', 'audio/x-m4a': 'audio/mp4', 'audio/m4a': 'audio/mp4', 'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/opus': 'audio/ogg' };
  if (t.startsWith('audio/')) return norm[t] ?? t;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return byExt[ext] ?? null;
}

/** Durée d'un fichier audio en secondes (lecteur du navigateur, sinon décodage complet), ou null s'il est illisible. */
async function fileDuration(file: Blob): Promise<number | null> {
  const viaElement = await new Promise<number | null>(resolve => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    const done = (v: number | null) => { URL.revokeObjectURL(url); resolve(v); };
    const t = window.setTimeout(() => done(null), 8000);
    a.preload = 'metadata';
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) { window.clearTimeout(t); done(a.duration); return; }
      // WebM/Opus : durée inconnue tant qu'on n'a pas tout lu.
      a.ontimeupdate = () => { a.ontimeupdate = null; window.clearTimeout(t); done(Number.isFinite(a.duration) && a.duration > 0 ? a.duration : null); };
      a.currentTime = 1e7;
    };
    a.onerror = () => { window.clearTimeout(t); done(null); };
    a.src = url;
  });
  if (viaElement) return viaElement;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    void ctx.close();
    return decoded.duration > 0 ? decoded.duration : null;
  } catch { return null; }
}
