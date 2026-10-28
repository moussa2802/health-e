/**
 * FloatingChat — Dr Lô IA disponible sur toutes les pages, sans quitter la page.
 * La pastille « Dr Lô » (et tout appel à openDrLoChat) ouvre un panneau par-dessus la page
 * (DrLoSheet), avec LA MÊME conversation que l'accueil. Sur l'accueil, la conversation est
 * déjà là : pas de pastille. Sans compte, on renvoie vers l'accueil (création de l'espace).
 */
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DRLO_OPEN_EVENT, type DrLoOpenDetail } from './drLoEvents';
import DrLoSheet from './DrLoSheet';

interface Props {
  userId: string | null;
  /** Masquer la pastille flottante (le panneau reste ouvrable par openDrLoChat). */
  hideLauncher?: boolean;
}

/** Pages où la pastille n'a pas sa place : l'accueil (Dr Lô y est déjà) et les écrans du vrai Dr Lô / de l'équipe. */
const NO_LAUNCHER = (p: string) => p === '/' || p === '/drlo' || p === '/equipe' || p === '/question' || p.startsWith('/d/') || p.startsWith('/assessment/quiz/');

const FloatingChat: React.FC<Props> = ({ userId, hideLauncher = false }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState<{ greeting: string | null; draft: string | null } | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<DrLoOpenDetail>).detail ?? {};
      if (!userId || pathname === '/') { navigate('/', { state: { talk: { greeting: d.greeting ?? null, draft: d.draft ?? null } } }); return; }
      setOpen({ greeting: d.greeting ?? null, draft: d.draft ?? null });
    };
    window.addEventListener(DRLO_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(DRLO_OPEN_EVENT, onOpen);
  }, [navigate, userId, pathname]);

  // Changement de page : le panneau se referme
  useEffect(() => { setOpen(null); }, [pathname]);

  const showLauncher = !hideLauncher && !NO_LAUNCHER(pathname) && !open;
  return (
    <>
      {showLauncher && (
        <button onClick={() => (userId ? setOpen({ greeting: null, draft: null }) : navigate('/', { state: { talk: { greeting: null, draft: null } } }))}
          aria-label="Parler à Dr Lô"
          style={{ position: 'fixed', right: 14, bottom: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px 5px 5px', borderRadius: 999, border: '1px solid rgba(242,182,109,.5)', background: '#1C1612', color: '#F4EEE4', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 28px rgba(0,0,0,.35)' }}>
          <img src="/dr-lo.png" alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid #F2B66D' }} />
          Dr Lô
        </button>
      )}
      <DrLoSheet open={!!open} greeting={open?.greeting} draft={open?.draft} onClose={() => setOpen(null)} />
    </>
  );
};

export default FloatingChat;
