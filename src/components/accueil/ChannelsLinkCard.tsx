/**
 * ChannelsLinkCard — la rangée « Les chaînes » en haut de « Mes messages »,
 * avec la pastille de nouveautés (nouvelles publications + réponses dans mes chaînes).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AudioLines, ChevronRight } from 'lucide-react';
import { DC } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getChannelNews } from '../../services/drloChannelService';

const ChannelsLinkCard: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [badge, setBadge] = useState(0);
  useEffect(() => { getChannelNews().then(r => setBadge(r.badge)).catch(() => {}); }, []);
  return (
    <Link to="/chaines" className="drl-btn" aria-label={badge > 0 ? `Les chaînes : ${badge} nouveauté${badge > 1 ? 's' : ''}` : 'Les chaînes'}
      style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, padding: '14px 16px', minHeight: 64, borderRadius: 18, textDecoration: 'none', color: DC.text, border: `1px solid ${badge > 0 ? palette.accent : 'rgba(242,182,109,.45)'}`, background: 'rgba(242,182,109,.10)' }}>
      <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(242,182,109,.16)', color: palette.accent }}><AudioLines size={20} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: DC.title }}>Les chaînes</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 13, lineHeight: 1.45, color: DC.muted }}>{badge > 0 ? `${badge} nouveauté${badge > 1 ? 's' : ''} dans tes chaînes` : 'Vocaux et textes, thème par thème.'}</span>
      </span>
      {badge > 0 && <span aria-hidden="true" style={{ minWidth: 24, height: 24, padding: '0 7px', boxSizing: 'border-box', borderRadius: 12, background: '#E8664F', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}
      <ChevronRight size={18} color={DC.muted} aria-hidden="true" />
    </Link>
  );
};

export default ChannelsLinkCard;
