/**
 * FloatingChat — le compagnon, ouvrable depuis n'importe quelle page sans la quitter.
 * Tout appel à openDrLoChat ouvre un panneau par-dessus la page (DrLoSheet), avec LA MÊME conversation que
 * l'onglet Compagnon. Plus de pastille flottante : la barre du bas donne déjà accès au Compagnon.
 * Sans compte, on renvoie vers l'onglet Compagnon (création de l'espace).
 */
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DRLO_OPEN_EVENT, type DrLoOpenDetail } from './drLoEvents';
import DrLoSheet from './DrLoSheet';

interface Props {
  userId: string | null;
}

const FloatingChat: React.FC<Props> = ({ userId }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState<{ greeting: string | null; draft: string | null } | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<DrLoOpenDetail>).detail ?? {};
      if (!userId || pathname === '/compagnon') { navigate('/compagnon', { state: { talk: { greeting: d.greeting ?? null, draft: d.draft ?? null } } }); return; }
      setOpen({ greeting: d.greeting ?? null, draft: d.draft ?? null });
    };
    window.addEventListener(DRLO_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(DRLO_OPEN_EVENT, onOpen);
  }, [navigate, userId, pathname]);

  // Changement de page : le panneau se referme
  useEffect(() => { setOpen(null); }, [pathname]);

  return (
    <>
      <DrLoSheet open={!!open} greeting={open?.greeting} draft={open?.draft} onClose={() => setOpen(null)} />
    </>
  );
};

export default FloatingChat;
