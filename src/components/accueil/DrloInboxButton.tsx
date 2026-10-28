/**
 * DrloInboxButton — la porte d'entrée vers les messages du VRAI Dr Lô, à côté de l'IA sur l'accueil.
 * Photo réelle + pastille de nouveautés (messages non lus, réponses à tes commentaires, nouveaux commentaires).
 * Toujours visible une fois connecté : on sait où retrouver ses messages, même quand il n'y a rien de nouveau.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RealDrLoPhoto } from './RealDrLoBadge';
import { DC } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getInbox } from '../../services/drloBroadcastService';
import { getMyThreads } from '../../services/drloQuestionService';
import { getChannelNews } from '../../services/drloChannelService';

const DrloInboxButton: React.FC<{ uid: string; palette: MomentPalette }> = ({ uid, palette }) => {
  const [badge, setBadge] = useState(0);
  const load = useCallback(() => {
    Promise.all([
      getInbox().then(r => r.badge ?? r.unread).catch(() => 0),
      getMyThreads().then(r => r.news).catch(() => 0),
      getChannelNews().then(r => r.badge).catch(() => 0),
    ]).then(([a, b, c]) => setBadge(a + b + c));
  }, []);
  useEffect(() => {
    load();
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [uid, load]);
  const label = badge > 0
    ? `Messages du vrai Dr Lô : ${badge} nouveauté${badge > 1 ? 's' : ''}`
    : 'Messages du vrai Dr Lô';
  return (
    <Link to="/messages-dr-lo" aria-label={label} className="drl-btn"
      style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textDecoration: 'none', minWidth: 64 }}>
      <span style={{ position: 'relative', display: 'block' }}>
        <RealDrLoPhoto size={56} palette={palette} />
        {badge > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: -5, right: -6, minWidth: 22, height: 22, padding: '0 6px', boxSizing: 'border-box', borderRadius: 11, background: '#E8664F', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1C1612' }}>{badge > 9 ? '9+' : badge}</span>
        )}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.15, color: badge > 0 ? palette.accent : DC.muted, textAlign: 'center' }}>Le vrai<br />Dr Lô</span>
    </Link>
  );
};

export default DrloInboxButton;
