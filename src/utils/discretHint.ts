/** Le mot « Discret » à côté de l'œil barré, seulement tant que la personne ne l'a pas vu. */
import { useEffect, useState } from 'react';

const KEY = 'he_discret_seen';

function read(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function useDiscretHint(): { show: boolean; dismiss: () => void } {
  const [seen, setSeen] = useState<boolean>(read);
  const dismiss = () => {
    setSeen(true);
    try { localStorage.setItem(KEY, '1'); } catch { /* navigation privée */ }
  };
  useEffect(() => {
    if (seen) return;
    const t = setTimeout(dismiss, 25000); // on le laisse 25 s au premier passage
    return () => clearTimeout(t);
  }, [seen]);
  return { show: !seen, dismiss };
}
