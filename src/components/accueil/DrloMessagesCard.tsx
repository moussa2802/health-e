/**
 * DrloMessagesCard — « Dr Lô t'a laissé un message » en haut de l'accueil.
 * Reste invisible tant qu'il n'y a rien de nouveau ; n'affiche jamais le texte (seulement l'invitation à l'ouvrir).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RealDrLoPhoto } from './RealDrLoBadge';
import { DC } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getInbox } from '../../services/drloBroadcastService';

const DrloMessagesCard: React.FC<{ uid: string; palette: MomentPalette }> = ({ uid, palette }) => {
  const [first, setFirst] = useState<{ id: string; unread: number } | null>(null);
  useEffect(() => {
    let live = true;
    getInbox().then(r => {
      const n = r.items.find(i => !i.seen);
      if (live) setFirst(n ? { id: n.id, unread: r.unread } : null);
    }).catch(() => {});
    return () => { live = false; };
  }, [uid]);
  if (!first) return null;
  return (
    <Link to={first.unread > 1 ? '/messages-dr-lo' : `/messages-dr-lo/${first.id}`} className="drl-in drl-btn"
      style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', padding: '12px 14px', borderRadius: 18, border: `1px solid ${palette.accent}`, background: 'rgba(242,182,109,.10)', color: DC.text }}>
      <RealDrLoPhoto size={40} palette={palette} />
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Dr Lô t'a laissé un message</span>
        <span style={{ display: 'block', marginTop: 1, fontSize: 12, color: DC.muted }}>Écrit par lui, pas par l'IA</span>
      </span>
      {first.unread > 1 && <span style={{ minWidth: 22, height: 22, borderRadius: 11, background: palette.accent, color: DC.ink, fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{first.unread}</span>}
    </Link>
  );
};

export default DrloMessagesCard;
