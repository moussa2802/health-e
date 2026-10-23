/**
 * FloatingChat — il n'y a plus qu'UN Dr Lô : la conversation de l'accueil.
 * Sur les autres pages, la pastille flottante (et tout appel à openDrLoChat) ramène à cette
 * conversation, en mode « discussion approfondie », avec le message d'ouverture éventuel.
 * (L'ancienne fenêtre de chat séparée a été retirée.)
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DRLO_OPEN_EVENT, type DrLoOpenDetail } from './drLoEvents';

interface Props {
  userId: string | null;
  /** Masquer la pastille flottante (écrans « Mon Dr Lô », où la conversation est déjà là). */
  hideLauncher?: boolean;
}

const FloatingChat: React.FC<Props> = ({ hideLauncher = false }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<DrLoOpenDetail>).detail ?? {};
      navigate('/', { state: { talk: { greeting: d.greeting ?? null, draft: d.draft ?? null } } });
    };
    window.addEventListener(DRLO_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(DRLO_OPEN_EVENT, onOpen);
  }, [navigate]);

  if (hideLauncher) return null;
  return (
    <button onClick={() => navigate('/', { state: { talk: { greeting: null, draft: null } } })}
      aria-label="Parler à Dr Lô"
      style={{ position: 'fixed', right: 16, bottom: 18, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', borderRadius: 999, border: '1px solid rgba(242,182,109,.5)', background: '#1C1612', color: '#F4EEE4', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 28px rgba(0,0,0,.35)' }}>
      <img src="/dr-lo.png" alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid #F2B66D' }} />
      Dr Lô
    </button>
  );
};

export default FloatingChat;
