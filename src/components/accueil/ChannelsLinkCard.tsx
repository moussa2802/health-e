/**
 * ChannelsLinkCard — le lien « Les chaînes de Dr Lô » (page « Les messages de Dr Lô »), avec la pastille de nouveautés.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getChannelNews } from '../../services/drloChannelService';

const ChannelsLinkCard: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [badge, setBadge] = useState(0);
  useEffect(() => { getChannelNews().then(r => setBadge(r.badge)).catch(() => {}); }, []);
  return (
    <Link to="/chaines" className="drl-btn" aria-label={badge > 0 ? `Les chaînes de Dr Lô : ${badge} nouveauté${badge > 1 ? 's' : ''}` : 'Les chaînes de Dr Lô'}
      style={{ ...card, marginTop: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, color: DC.text, fontWeight: 700, fontSize: 15, borderColor: badge > 0 ? palette.accent : DC.line }}>
      Les chaînes de Dr Lô
      {badge > 0 && <span aria-hidden="true" style={{ minWidth: 22, height: 22, padding: '0 7px', boxSizing: 'border-box', borderRadius: 11, background: '#E8664F', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge > 9 ? '9+' : badge}</span>}
      <span style={{ marginLeft: 'auto', color: palette.accent }}>›</span>
    </Link>
  );
};

export default ChannelsLinkCard;
