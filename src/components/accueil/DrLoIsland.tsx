/**
 * DrLoIsland — la « bulle d'activité » du compagnon : pendant qu'il travaille, une capsule flotte en haut
 * de la discussion avec son image et ce qu'il fait précisément (« Lit ton message », « Compare vos profils »…).
 * Elle disparaît quand il a fini.
 */
import React, { useEffect, useState } from 'react';
import CompanionMark from './CompanionMark';
import { companionLabel } from '../../utils/companion';
import { Sparkles } from 'lucide-react';
import type { DrLoState } from './DrLoAvatar';
import type { MomentPalette } from '../../utils/drloMoment';

function PoseImage({ size }: { state: DrLoState; size: number }) {
  return <CompanionMark size={size} style={{ display: 'block' }} />;
}

const DrLoIsland: React.FC<{ state: DrLoState; label: string | null; palette: MomentPalette }> = ({ state, label, palette }) => {
  // On garde le dernier libellé pendant la sortie, pour une disparition douce
  const [shown, setShown] = useState<{ state: DrLoState; label: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (label) { setShown({ state, label }); setLeaving(false); return; }
    if (!shown) return;
    setLeaving(true);
    const t = window.setTimeout(() => { setShown(null); setLeaving(false); }, 260);
    return () => window.clearTimeout(t);
  }, [label, state]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown) return null;
  const joy = shown.state === 'joy';
  const ring = joy ? '#F0C86E' : palette.accent;
  const anim = shown.state === 'thinking' || shown.state === 'writing' ? 'drl-orbit'
    : shown.state === 'reading' ? 'drl-sweep'
    : shown.state === 'listening' ? 'drl-listen'
    : joy ? 'drl-joy-glow' : 'drl-halo';
  return (
    <div role="status" aria-live="polite" aria-label={`${companionLabel()} : ${shown.label}`}
      className={leaving ? 'drl-island-out' : 'drl-island-in'}
      style={{ position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)', zIndex: 4, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 66, height: 66, marginBottom: -14, zIndex: 1 }}>
        <div className={anim} aria-hidden="true"
          style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid ${ring}66`, borderTopColor: ring }} />
        <div style={{ position: 'relative', borderRadius: '50%', border: `2px solid ${ring}`, overflow: 'hidden', background: '#EDE7DF' }}>
          <PoseImage state={shown.state} size={62} />
        </div>
      </div>
      <div style={{ padding: '18px 18px 10px', minWidth: 170, borderRadius: 20, background: 'rgba(30,25,21,.92)', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 10px 30px rgba(0,0,0,.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F4EEE4' }}>{companionLabel()}</p>
        <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#DCD3C5', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} color={ring} aria-hidden="true" /> {shown.label}
        </p>
      </div>
    </div>
  );
};

export default DrLoIsland;
