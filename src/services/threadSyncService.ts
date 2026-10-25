/**
 * threadSyncService — copie des discussions avec Dr Lô dans le compte (fonction drlo-threads),
 * pour les retrouver après déconnexion, sur un autre téléphone ou depuis l'icône de l'iPhone.
 * Tout échec est silencieux : la copie du téléphone reste la référence.
 */
import { authedFetch } from '../utils/authedFetch';
import type { ConvIndex } from '../utils/conversations';

async function call<T>(body: Record<string, unknown>, timeoutMs = 8000): Promise<T | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctrl ? window.setTimeout(() => ctrl.abort(), timeoutMs) : 0;
  try {
    const res = await authedFetch('/.netlify/functions/drlo-threads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...(ctrl ? { signal: ctrl.signal } : {}),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    if (t) window.clearTimeout(t);
  }
}

export interface Pulled<S> { index: ConvIndex | null; thread: S | null }

/** null = impossible de joindre le compte (on ne pousse rien par-dessus dans ce cas). */
export async function pullThread<S>(convId: string): Promise<Pulled<S> | null> {
  const out = await call<{ index: ConvIndex | null; thread: { state: string | null; savedAt: string | null } | null }>({ action: 'pull', convId });
  if (!out) return null;
  let thread: S | null = null;
  if (out.thread?.state) {
    try { thread = JSON.parse(out.thread.state) as S; } catch { thread = null; }
  }
  return { index: out.index ?? null, thread };
}

export async function pushThread(convId: string, state: unknown, savedAt: string): Promise<boolean> {
  return !!(await call({ action: 'push', convId, state: JSON.stringify(state), savedAt }));
}

export async function pushIndex(index: ConvIndex): Promise<boolean> {
  return !!(await call({ action: 'index', index }));
}

/** Discussion supprimée par la personne : effacée aussi du compte. */
export async function deleteThread(convId: string): Promise<boolean> {
  return !!(await call({ action: 'delete', convId }));
}
