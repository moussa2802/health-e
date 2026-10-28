/**
 * useChannelsActivity — la pastille de l'onglet « Chaînes » dans l'espace Dr Lô : nouveaux membres, nouveaux commentaires,
 * réponses des personnes depuis ta dernière visite. Se rafraîchit chaque minute ; quand tu quittes l'onglet, les compteurs repartent à zéro.
 */
import { useEffect, useRef, useState } from 'react';
import { getChannelActivity, markChannelsSeen } from '../services/drloChannelService';

export function useChannelsActivity(enabled: boolean, tab: string): number {
  const [count, setCount] = useState(0);
  const prevTab = useRef(tab);
  useEffect(() => {
    if (!enabled) return;
    const load = () => { getChannelActivity().then(r => setCount(r.badge)).catch(() => {}); };
    load();
    const t = window.setInterval(load, 60000);
    return () => window.clearInterval(t);
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    if (prevTab.current === 'channels' && tab !== 'channels') {
      markChannelsSeen().then(() => getChannelActivity()).then(r => setCount(r.badge)).catch(() => {});
    }
    prevTab.current = tab;
  }, [tab, enabled]);
  return tab === 'channels' ? 0 : count;
}
