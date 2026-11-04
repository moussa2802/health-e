/**
 * useLaunch — ce que la personne voit pendant le lancement par vagues : on(key) dit si une fonctionnalité s'affiche.
 * Réglage lu dans home-feed (mis en cache 60 s) ; progression lue une fois par session (tests faits, animal révélé).
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getHomeFeed } from '../services/homeFeedService';
import { getProfileProgress } from '../services/evaluationService';
import { DEFAULT_LAUNCH, featureOn, type FeatureKey, type LaunchCfg, type Progress } from '../utils/launch';

let progressCache: { uid: string; at: number; p: Progress } | null = null;
/** À appeler après un test terminé ou l'animal révélé, pour que les déblocages apparaissent tout de suite. */
export const resetLaunchProgress = () => { progressCache = null; };

export function useLaunch() {
  const { currentUser, isAuthenticated } = useAuth();
  const uid = isAuthenticated && currentUser ? currentUser.id : null;
  const [cfg, setCfg] = useState<LaunchCfg>(DEFAULT_LAUNCH);
  const [progress, setProgress] = useState<Progress | null>(uid && progressCache?.uid === uid ? progressCache.p : null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    getHomeFeed().then(f => { if (alive && f.launch) setCfg(f.launch); }).catch(() => {}).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!uid) { setProgress(null); return; }
    if (progressCache && progressCache.uid === uid && Date.now() - progressCache.at < 60000) { setProgress(progressCache.p); return; }
    let alive = true;
    getProfileProgress(uid).then(r => {
      const p: Progress = { tests: r.completedCount, animal: !!r.totem?.revealedAt };
      progressCache = { uid, at: Date.now(), p };
      if (alive) setProgress(p);
    }).catch(() => {});
    return () => { alive = false; };
  }, [uid]);
  return { ready, cfg, progress, on: (k: FeatureKey) => featureOn(k, cfg, progress) };
}
