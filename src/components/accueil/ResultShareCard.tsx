/**
 * Dans la conversation : la carte du résultat qui vient d'être obtenu + partage en un geste.
 *  - « Partager sur WhatsApp » : feuille de partage du téléphone avec l'image (sinon lien WhatsApp avec le texte) ;
 *  - « Story » : même carte au format vertical 9:16 (TikTok, Instagram, statut WhatsApp).
 * Aucune donnée n'est envoyée à un serveur : l'image est fabriquée sur le téléphone.
 */
import React, { useRef, useState } from 'react';
import { Share2, Smartphone } from 'lucide-react';
import ResultCard from '../assessment/ResultCard';
import { getScaleById } from '../../data/scales';
import { getResultCardConfig } from '../../data/experiences';
import { resolveScaleGender } from '../../utils/gender';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getScaleMeta } from '../../utils/scaleMeta';
import { shareCardImage, shareText, whatsappTextLink } from '../../utils/shareCard';
import { trackAccueil } from '../../utils/accueilTracking';
import type { ScaleResult } from '../../types/assessment';
import { DC } from './DrLoShell';

const ResultShareCard: React.FC<{ scaleId: string; result?: ScaleResult }> = ({ scaleId, result }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | 'wa' | 'story'>(null);
  const [note, setNote] = useState('');

  const raw = getScaleById(scaleId);
  if (!raw || !result) return null;
  const scale = resolveScaleGender(raw, getOnboardingProfile()?.genre ?? 'homme');
  const { card: cfg, tone } = getResultCardConfig(scale);
  const label = getScaleMeta(scaleId).label;
  const shareable = cfg.shareable && tone !== 'sober';
  const text = shareText(label);

  const doShare = async (kind: 'wa' | 'story') => {
    const el = kind === 'wa' ? cardRef.current : storyRef.current;
    if (!el || busy) return;
    setBusy(kind); setNote('');
    trackAccueil('result_share', { scale: scaleId, kind });
    try {
      const out = await shareCardImage(el, `health-e-${scaleId}${kind === 'story' ? '-story' : ''}.png`, text,
        kind === 'story' ? { pixelRatio: 3, backgroundColor: '#15110D' } : {});
      if (out === 'downloaded') setNote('Image enregistrée. Tu peux la poster où tu veux.');
    } catch {
      if (kind === 'wa') window.open(whatsappTextLink(text), '_blank', 'noopener');
      else setNote('Je n\'ai pas pu fabriquer l\'image. Réessaie dans un instant.');
    } finally { setBusy(null); }
  };

  const btn: React.CSSProperties = {
    flex: 1, minHeight: 46, borderRadius: 14, border: 0, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
    fontSize: 13.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: busy ? 0.7 : 1,
  };

  return (
    <div className="drl-in" style={{ marginTop: 10, textAlign: 'left' }}>
      <ResultCard ref={cardRef} scale={scale} result={result} size="full" />
      {shareable && (
        <>
          <div style={{ display: 'flex', gap: 9, marginTop: 10 }}>
            <button onClick={() => doShare('wa')} disabled={!!busy} className="drl-btn" style={{ ...btn, background: '#25D366', color: '#0B2A16' }}>
              <Share2 size={16} aria-hidden="true" /> {busy === 'wa' ? 'Un instant…' : 'WhatsApp'}
            </button>
            <button onClick={() => doShare('story')} disabled={!!busy} className="drl-btn" style={{ ...btn, background: DC.glass, color: DC.text, border: `1px solid ${DC.line}` }}>
              <Smartphone size={16} aria-hidden="true" /> {busy === 'story' ? 'Un instant…' : 'Story'}
            </button>
          </div>
          {note && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: DC.muted }}>{note}</p>}
          {/* Format vertical 9:16 (1080×1920 une fois rendu) : hors écran, fabriqué à la demande */}
          <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0 }}>
            <div ref={storyRef} style={{ width: 360, height: 640, background: 'radial-gradient(120% 60% at 50% 0%, rgba(234,150,88,.30), rgba(234,150,88,0) 60%), linear-gradient(180deg,#1F1712 0%,#140F0C 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 20px', boxSizing: 'border-box' }}>
              <div style={{ width: '100%' }}><ResultCard scale={scale} result={result} size="full" /></div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F4EEE4', textAlign: 'center' }}>Et toi, qu'est-ce que ça donne ?</p>
              <p style={{ margin: 0, fontSize: 13, color: '#F2B66D', fontWeight: 700 }}>health-e.sn · lien en bio</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultShareCard;
