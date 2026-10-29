/**
 * AudioPlayer — lecteur des vocaux aux couleurs du site (remplace le lecteur blanc du navigateur).
 * Lecture / pause, barre de progression qu'on peut toucher pour avancer, durée, vitesse ×1 / ×1,5 / ×2.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { DC } from './DrLoShell';

const mmss = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
const SPEEDS = [1, 1.5, 2];

const AudioPlayer: React.FC<{
  src: string;
  ariaLabel: string;
  /** Durée connue à l'avance (secondes), affichée avant que le fichier soit chargé. */
  durationHint?: number;
  onPlay?: () => void;
  accent?: string;
  style?: React.CSSProperties;
}> = ({ src, ariaLabel, durationHint, onPlay, accent = DC.gold, style }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(durationHint ?? 0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => { setPlaying(false); setCur(0); }, [src]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) { void a.play().catch(() => {}); } else a.pause();
  };
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = ref.current;
    if (!a || !dur) return;
    a.currentTime = (Number(e.target.value) / 1000) * dur;
    setCur(a.currentTime);
  };
  const nextSpeed = () => {
    const s = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(s);
    if (ref.current) ref.current.playbackRate = s;
  };
  const pct = dur ? Math.min(100, (cur / dur) * 100) : 0;

  return (
    <div role="group" aria-label={ariaLabel}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 6px 6px', borderRadius: 999, background: 'rgba(255,255,255,.06)', border: `1px solid ${DC.line}`, minWidth: 0, ...style }}>
      <audio ref={ref} src={src} preload="metadata"
        onPlay={() => { setPlaying(true); onPlay?.(); }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setCur(0); }}
        onTimeUpdate={e => setCur(e.currentTarget.currentTime)}
        onLoadedMetadata={e => { const d = e.currentTarget.duration; if (isFinite(d) && d > 0) setDur(d); e.currentTarget.playbackRate = speed; }} />
      <button type="button" onClick={toggle} aria-label={playing ? 'Mettre en pause' : 'Écouter'} className="drl-btn"
        style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', border: 0, background: accent, color: DC.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {playing ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" aria-hidden="true" style={{ marginLeft: 2 }} />}
      </button>
      <input type="range" min={0} max={1000} step={1} value={Math.round(pct * 10)} onChange={seek} aria-label="Position dans le vocal"
        style={{ flex: 1, minWidth: 0, height: 24, accentColor: accent, background: 'transparent', cursor: 'pointer' }} />
      <span style={{ fontSize: 13, color: DC.muted, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {playing || cur > 0 ? mmss(cur) : mmss(dur)}
      </span>
      <button type="button" onClick={nextSpeed} aria-label={`Vitesse de lecture : ${speed}`} className="drl-btn"
        style={{ minWidth: 40, height: 32, flexShrink: 0, borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        ×{String(speed).replace('.', ',')}
      </button>
    </div>
  );
};

export default AudioPlayer;
