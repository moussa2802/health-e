import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';

interface DefiFlag {
  defiEnabled: boolean;
  loading: boolean;
}

export function useDefiFlag(): DefiFlag {
  const { currentUser } = useAuth();
  const [state, setState] = useState<DefiFlag>({ defiEnabled: false, loading: true });
  const fetched = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setState({ defiEnabled: false, loading: false });
      return;
    }

    if (fetched.current === currentUser.id) return;
    fetched.current = currentUser.id;

    getDoc(doc(db, 'config', 'features'))
      .then(snap => {
        if (!snap.exists()) {
          setState({ defiEnabled: false, loading: false });
          return;
        }
        const defi = snap.data()?.defi;
        if (!defi) {
          setState({ defiEnabled: false, loading: false });
          return;
        }
        const enabled =
          defi.enabled === true ||
          (Array.isArray(defi.allowlist) && defi.allowlist.includes(currentUser.id));
        setState({ defiEnabled: enabled, loading: false });
      })
      .catch(() => {
        setState({ defiEnabled: false, loading: false });
      });
  }, [currentUser]);

  return state;
}
