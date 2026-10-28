/**
 * CompatInviteResume — une personne arrive par un lien d'invitation à la compatibilité sans compte :
 * elle crée son espace sur l'accueil. Juste après (invitation de moins d'une heure), on la ramène
 * une fois au test de compatibilité, avec le code de l'autre déjà rempli.
 */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loadInvite } from '../utils/compatInvite';

const DONE = 'he_compat_invite_resumed';

export default function CompatInviteResume(): null {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated || pathname !== '/') return;
    const inv = loadInvite();
    if (!inv || Date.now() - inv.at > 3600e3) return;
    try { if (sessionStorage.getItem(DONE)) return; sessionStorage.setItem(DONE, '1'); } catch { return; }
    const code = inv.m ?? inv.s;
    if (code) navigate(`/compat/${encodeURIComponent(code)}${inv.m && inv.s ? `?s=${encodeURIComponent(inv.s)}` : ''}`);
  }, [isAuthenticated, pathname, navigate]);
  return null;
}
