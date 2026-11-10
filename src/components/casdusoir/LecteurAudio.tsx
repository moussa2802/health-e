/**
 * LecteurAudio — lecture, pause, vitesse 1x / 1,25x. Sans fichier, rien ne s'affiche : le texte reste lisible seul.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { DC } from '../accueil/DrLoShell';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const LecteurAudio: React.FC<{ src: string | null; accent: string; label: string }> = ({ src, accent, label }) => {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);
  useEffect(() => { setPlaying(false); setT(0); }, [src]);
  useEffect(() => { if (ref.current) ref.current.playbackRate = rate; }, [rate]);
  if (!src) return null;
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) { void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); } else { a.pause(); setPlaying(false); }
  };
  const btn: React.CSSProperties = { minHeight: 44, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, cursor: 'pointer', fontFamily: 'inherit' };
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
      <audio ref={ref} src={src} preload="metadata" onTimeUpdate={e => setT(e.currentTarget.currentTime)} onLoadedMetadata={e => setD(e.currentTarget.duration || 0)} onEnded={() => setPlaying(false)} />
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Écouter'} style={{ ...btn, width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: accent, color: accent }}>
        {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
      </button>
      <span aria-hidden="true" style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: d ? `${(t / d) * 100}%` : 0, background: accent }} />
      </span>
      <span style={{ fontSize: 13, color: DC.muted, fontVariantNumeric: 'tabular-nums' }}>{fmt(t)}{d ? ` / ${fmt(d)}` : ''}</span>
      <button type="button" onClick={() => setRate(rate === 1 ? 1.25 : 1)} aria-label={`Vitesse ${rate === 1 ? '1' : '1,25'} fois`} style={{ ...btn, padding: '0 10px', fontSize: 13, fontWeight: 700 }}>
        {rate === 1 ? '1x' : '1,25x'}
      </button>
    </div>
  );
};

export default LecteurAudio;
