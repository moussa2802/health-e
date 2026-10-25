/**
 * threadSync.ts — les discussions avec Dr Lô suivent la personne d'un téléphone à l'autre
 * (logique pure, testée dans tests/unit/threadSync.test.ts).
 *
 * Avant : les discussions n'existaient que dans le navigateur. Nouveau téléphone, autre
 * navigateur, icône de l'écran d'accueil sur iPhone (stockage séparé de Safari), ou Safari qui
 * efface les données d'un site après 7 jours sans visite → l'accueil paraissait vide.
 * Maintenant : copie dans le compte (users/{uid}/accueil_threads), la plus récente l'emporte.
 */
import type { ConvIndex, ConvMeta } from './conversations';

/** Ce qu'on garde dans le compte : les derniers messages (un document a une taille limitée). */
export const CLOUD_MAX_MESSAGES = 300;

interface Threadish {
  v: 1;
  messages: unknown[];
  seq: number;
  savedAt?: string;
  talk?: { start: number } & Record<string, unknown>;
}

/** Garde les derniers messages ; le début de la discussion approfondie suit le décalage. */
export function trimForCloud<T extends Threadish>(s: T, max = CLOUD_MAX_MESSAGES): T {
  const n = s.messages.length - max;
  if (n <= 0) return s;
  const out = { ...s, messages: s.messages.slice(n) };
  if (s.talk) out.talk = { ...s.talk, start: Math.max(0, s.talk.start - n) };
  return out;
}

/** La version la plus récente (date d'enregistrement, sinon nombre de messages échangés). */
export function pickNewer<T extends Threadish>(local: T | null, remote: T | null): 'local' | 'remote' {
  if (!remote) return 'local';
  if (!local) return 'remote';
  if (local.savedAt && remote.savedAt) return remote.savedAt > local.savedAt ? 'remote' : 'local';
  return remote.seq > local.seq ? 'remote' : 'local';
}

/**
 * Réunit la liste des discussions des deux côtés : toutes celles qui existent quelque part,
 * sauf celles supprimées (sur n'importe quel téléphone).
 */
export function mergeIndex(local: ConvIndex, remote: ConvIndex | null): ConvIndex {
  if (!remote || !Array.isArray(remote.list)) return local;
  const deleted = Array.from(new Set([...(local.deleted ?? []), ...(remote.deleted ?? [])])).slice(-200);
  const byId = new Map<string, ConvMeta>();
  for (const c of [...remote.list, ...local.list]) {
    if (!c || typeof c.id !== 'string' || deleted.includes(c.id)) continue;
    const prev = byId.get(c.id);
    if (!prev || (c.updatedAt ?? '') >= (prev.updatedAt ?? '')) byId.set(c.id, c);
  }
  const list = Array.from(byId.values());
  return { v: 1, current: list.some(c => c.id === local.current) ? local.current : 'main', list, deleted };
}

/** Même contenu (pour ne pas renvoyer une liste inchangée). */
export const sameIndex = (a: ConvIndex, b: ConvIndex) =>
  JSON.stringify({ l: a.list, d: a.deleted ?? [] }) === JSON.stringify({ l: b.list, d: b.deleted ?? [] });
