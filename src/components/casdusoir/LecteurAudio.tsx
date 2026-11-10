/**
 * LecteurAudio — le seul lecteur du Cas du soir : l'intrigue (fichier public), les épisodes et la leçon (liens signés).
 * Lecture et pause, barre de progression, durée ; vitesse 1x / 1,25x (sauf en version compacte). Pas de lecture automatique.
 * Il ne s'affiche qu'une fois le fichier reconnu : sans fichier (ou fichier illisible), rien n'apparaît et le texte suffit.
 * Un seul audio joue à la fois : en lancer un met les autres en pause.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { DC } from '../accueil/DrLoShell';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const EVT = 'he-cds-audio-play';

const LecteurAudio: React.FC<{
  src: string | null;
  accent: string;
  /** Ce qu'on écoute : « Écouter l'intrigue », « Écouter l'épisode »… (affiché en version compacte, lu par les lecteurs d'écran) */
  label: string;
  /** Version compacte (cartes) : sans réglage de vitesse, avec le libellé et la durée */
  compact?: boolean;
  style?: React.CSSProperties;
  /** Le temps (s) et l'état de lecture, environ 4 fois par seconde (texte surligné, images) */
  onTime?: (t: number, playing: boolean) => void;
  /** Le fichier est reconnu (true) ou absent / illisible (false) */
  onPret?: (ok: boolean) => void;
  /** Pour sauter à un moment (toucher une phrase) */
  controle?: React.MutableRefObject<{ seek: (t: number) => void } | null>;
}> = ({ src, accent, label, compact, style, onTime, onPret, controle }) => {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [pret, setPret] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);
  useEffect(() => { setPret(false); setPlaying(false); setT(0); setD(0); }, [src]);
  useEffect(() => { if (ref.current) ref.current.playbackRate = rate; }, [rate]);
  // Un seul audio à la fois
  useEffect(() => {
    const onOther = (e: Event) => { const a = ref.current; if (a && (e as CustomEvent).detail !== a && !a.paused) a.pause(); };
    window.addEventListener(EVT, onOther);
    return () => window.removeEventListener(EVT, onOther);
  }, []);
  useEffect(() => {
    if (!controle) return;
    controle.current = {
      seek: (s: number) => {
        const a = ref.current;
        if (!a) return;
        a.currentTime = Math.max(0, s);
        setT(a.currentTime);
        onTime?.(a.currentTime, !a.paused);
        if (a.paused) { window.dispatchEvent(new CustomEvent(EVT, { detail: a })); void a.play().catch(() => {}); }
      },
    };
    return () => { controle.current = null; };
  }); // eslint-disable-line react-hooks/exhaustive-deps
  if (!src) return null;
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      window.dispatchEvent(new CustomEvent(EVT, { detail: a }));
      void a.play().catch(() => setPlaying(false));
    } else a.pause();
  };
  const btn: React.CSSProperties = { minHeight: 44, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, cursor: 'pointer', fontFamily: 'inherit' };
  return (
    <div role="group" aria-label={label} style={{ display: pret ? 'flex' : 'none', alignItems: 'center', gap: 10, marginTop: 12, ...style }}>
      <audio ref={ref} src={src} preload="metadata"
        onLoadedMetadata={e => { setD(e.currentTarget.duration || 0); setPret(true); onPret?.(true); }}
        onError={() => { setPret(false); onPret?.(false); }}
        onPlay={e => { setPlaying(true); onTime?.(e.currentTarget.currentTime, true); }} onPause={e => { setPlaying(false); onTime?.(e.currentTarget.currentTime, false); }}
        onTimeUpdate={e => { setT(e.currentTarget.currentTime); onTime?.(e.currentTarget.currentTime, !e.currentTarget.paused); }}
        onEnded={() => { setPlaying(false); setT(0); onTime?.(0, false); }} />
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : label} style={{ ...btn, width: 48, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: accent, color: accent }}>
        {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
      </button>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {compact && <span style={{ fontSize: 14, fontWeight: 700, color: DC.text }}>{label}{d ? ` · ${fmt(d)}` : ''}</span>}
        <span aria-hidden="true" style={{ display: 'block', height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: d ? `${(t / d) * 100}%` : 0, background: accent }} />
        </span>
      </span>
      {!compact && <span style={{ fontSize: 13, color: DC.muted, fontVariantNumeric: 'tabular-nums' }}>{fmt(t)}{d ? ` / ${fmt(d)}` : ''}</span>}
      {compact && playing && <span style={{ fontSize: 13, color: DC.muted, fontVariantNumeric: 'tabular-nums' }}>{fmt(t)}</span>}
      {!compact && (
        <button type="button" onClick={() => setRate(rate === 1 ? 1.25 : 1)} aria-label={`Vitesse ${rate === 1 ? '1' : '1,25'} fois`} style={{ ...btn, padding: '0 10px', fontSize: 13, fontWeight: 700 }}>
          {rate === 1 ? '1x' : '1,25x'}
        </button>
      )}
    </div>
  );
};

export default LecteurAudio;
