/**
 * VraiDrLoBand — le bandeau « Le vrai Dr Lô » tout en haut de l'accueil, au-dessus de Dr Lô IA.
 * Vraie photo + mention « médecin », et ses nouveautés (messages, réponses, chaînes) en un coup d'œil.
 * Un tap → « Les messages de Dr Lô » (messages, chaînes, lui écrire). N'affiche jamais le contenu.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ChevronRight } from 'lucide-react';
import { RealDrLoPhoto } from './RealDrLoBadge';
import { DC } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getInbox } from '../../services/drloBroadcastService';
import { getMyThreads } from '../../services/drloQuestionService';
import { getChannelNews } from '../../services/drloChannelService';

const VraiDrLoBand: React.FC<{ uid: string; palette: MomentPalette }> = ({ uid, palette }) => {
  const [n, setN] = useState({ messages: 0, replies: 0, channels: 0 });
  const load = useCallback(() => {
    Promise.all([
      getInbox().then(r => r.badge ?? r.unread).catch(() => 0),
      getMyThreads().then(r => r.news).catch(() => 0),
      getChannelNews().then(r => r.badge).catch(() => 0),
    ]).then(([messages, replies, channels]) => setN({ messages, replies, channels }));
  }, []);
  useEffect(() => {
    load();
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [uid, load]);
  const total = n.messages + n.replies + n.channels;
  const line = n.replies > 0 ? 'Il t\'a répondu personnellement'
    : n.messages > 0 ? `${n.messages > 1 ? `${n.messages} nouveaux messages` : 'Un nouveau message'} de sa part`
    : n.channels > 0 ? `${n.channels} nouveauté${n.channels > 1 ? 's' : ''} dans tes chaînes`
    : 'Ses messages, ses chaînes, lui écrire';
  return (
    <Link to="/messages-dr-lo" className="drl-in drl-btn" aria-label={total > 0 ? `Le vrai Dr Lô : ${total} nouveauté${total > 1 ? 's' : ''}` : 'Le vrai Dr Lô'}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, padding: '10px 14px 10px 10px', borderRadius: 20, textDecoration: 'none', color: DC.text,
        border: `1px solid ${total > 0 ? palette.accent : 'rgba(242,182,109,.35)'}`,
        background: total > 0 ? 'linear-gradient(120deg, rgba(242,182,109,.22), rgba(242,182,109,.06))' : 'rgba(242,182,109,.07)',
      }}>
      <span style={{ position: 'relative', flexShrink: 0 }}>
        <RealDrLoPhoto size={46} palette={palette} />
        {total > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: -4, right: -5, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: '#E8664F', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1C1612' }}>{total > 9 ? '9+' : total}</span>
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 16, fontWeight: 700 }}>
          Le vrai Dr Lô <BadgeCheck size={16} color={palette.accent} aria-label="médecin" />
        </span>
        <span style={{ display: 'block', marginTop: 1, fontSize: 13, color: total > 0 ? palette.accent : DC.muted, fontWeight: total > 0 ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line}</span>
      </span>
      <ChevronRight size={18} color={palette.accent} aria-hidden="true" />
    </Link>
  );
};

export default VraiDrLoBand;
