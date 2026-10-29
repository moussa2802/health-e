/**
 * ChannelsLinkCard — la grande carte « Les chaînes de Dr Lô » en haut de « Les messages de Dr Lô »,
 * avec la pastille de nouveautés (nouvelles publications + réponses de Dr Lô dans mes chaînes).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AudioLines, ChevronRight } from 'lucide-react';
import { DC } from './DrLoShell';
import { RealDrLoPhoto } from './RealDrLoBadge';
import type { MomentPalette } from '../../utils/drloMoment';
import { getChannelNews } from '../../services/drloChannelService';

const ChannelsLinkCard: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [badge, setBadge] = useState(0);
  useEffect(() => { getChannelNews().then(r => setBadge(r.badge)).catch(() => {}); }, []);
  return (
    <Link to="/chaines" className="drl-btn" aria-label={badge > 0 ? `Les chaînes de Dr Lô : ${badge} nouveauté${badge > 1 ? 's' : ''}` : 'Les chaînes de Dr Lô'}
      style={{
        position: 'relative', overflow: 'hidden', display: 'block', marginTop: 16, padding: '18px 18px 16px', borderRadius: 22, textDecoration: 'none', color: DC.text,
        border: `1px solid ${badge > 0 ? palette.accent : 'rgba(242,182,109,.45)'}`,
        background: 'linear-gradient(135deg, rgba(242,182,109,.28) 0%, rgba(201,120,80,.18) 45%, rgba(40,28,20,.6) 100%)',
        boxShadow: '0 14px 36px rgba(0,0,0,.28)',
      }}>
      <AudioLines size={120} aria-hidden="true" style={{ position: 'absolute', right: -18, bottom: -26, color: 'rgba(242,182,109,.12)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <RealDrLoPhoto size={48} palette={palette} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Nouveau</p>
          <p style={{ margin: '2px 0 0', fontFamily: 'Fraunces, serif', fontSize: 22, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>Les chaînes de Dr Lô</p>
        </div>
        {badge > 0 && (
          <span aria-hidden="true" style={{ minWidth: 26, height: 26, padding: '0 8px', boxSizing: 'border-box', borderRadius: 13, background: '#E8664F', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge > 9 ? '9+' : badge}</span>
        )}
      </div>
      <p style={{ position: 'relative', margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>
        Ses vocaux et ses textes, thème par thème. Tu entres une fois, tu restes aussi longtemps que tu veux.
      </p>
      <span style={{ position: 'relative', marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700, color: palette.accent }}>
        {badge > 0 ? `${badge} nouveauté${badge > 1 ? 's' : ''} dans tes chaînes` : 'Découvrir les chaînes'} <ChevronRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
};

export default ChannelsLinkCard;
