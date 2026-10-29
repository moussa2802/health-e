/** Bouton « Partager » d'une chaîne : partage du téléphone, sinon lien copié (avec confirmation visible). */
import React, { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { DC } from './DrLoShell';
import { shareChannel } from '../../utils/shareChannel';

const ShareChannelButton: React.FC<{ channel: { id: string; name: string; price: number }; primary?: string; compact?: boolean }> = ({ channel, primary, compact }) => {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const go = async () => {
    const r = await shareChannel(channel);
    if (r === 'copied') { setState('copied'); setTimeout(() => setState('idle'), 2500); }
    else if (r === 'failed') { setState('failed'); setTimeout(() => setState('idle'), 3500); }
  };
  const label = state === 'copied' ? 'Lien copié' : state === 'failed' ? 'Copie impossible' : 'Partager';
  return (
    <button type="button" onClick={go} className="drl-btn" aria-live="polite"
      style={{ minHeight: compact ? 38 : 46, padding: compact ? '0 14px' : '0 18px', borderRadius: 999, border: primary ? 0 : `1px solid ${DC.line}`, background: primary ?? DC.glass, color: primary ? '#1C140D' : DC.text, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {state === 'copied' ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />} {label}
    </button>
  );
};

export default ShareChannelButton;
