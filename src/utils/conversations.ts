/**
 * conversations.ts — les discussions avec Dr Lô : une discussion principale, plus des
 * discussions secondaires que la personne crée, nomme et retrouve dans son historique.
 * Gardées sur le téléphone (comme la conversation d'accueil), clé par personne.
 */

export const MAIN_ID = 'main';

export interface ConvMeta {
  id: string;
  title: string;
  /** ISO de la dernière activité */
  updatedAt: string;
  /** Premier ou dernier message de la personne, pour s'y retrouver */
  preview?: string;
  /** Titre donné par défaut (la date) : il sera remplacé par le début du premier message. */
  auto?: boolean;
}

export interface ConvIndex {
  v: 1;
  current: string;
  list: ConvMeta[];
  /** Discussions supprimées (pour qu'elles ne reviennent pas d'un autre téléphone). */
  deleted?: string[];
}

const INDEX_PREFIX = 'he_convs_v1:';

export const mainMeta = (): ConvMeta => ({ id: MAIN_ID, title: 'Discussion principale', updatedAt: new Date().toISOString() });

export function emptyIndex(): ConvIndex {
  return { v: 1, current: MAIN_ID, list: [mainMeta()] };
}

export function loadIndex(uidKey: string): ConvIndex {
  try {
    const raw = JSON.parse(localStorage.getItem(`${INDEX_PREFIX}${uidKey}`) ?? 'null') as ConvIndex | null;
    if (!raw || raw.v !== 1 || !Array.isArray(raw.list)) return emptyIndex();
    const list = raw.list.some(c => c.id === MAIN_ID) ? raw.list : [mainMeta(), ...raw.list];
    return { v: 1, current: list.some(c => c.id === raw.current) ? raw.current : MAIN_ID, list, ...(Array.isArray(raw.deleted) ? { deleted: raw.deleted } : {}) };
  } catch {
    return emptyIndex();
  }
}

export function saveIndex(uidKey: string, idx: ConvIndex): void {
  try { localStorage.setItem(`${INDEX_PREFIX}${uidKey}`, JSON.stringify(idx)); } catch { /* ignore */ }
}

/** Clé de stockage d'une discussion : la principale garde l'ancienne clé (rien n'est perdu). */
export function convStorageKey(prefix: string, uidKey: string, convId: string): string {
  return convId === MAIN_ID ? `${prefix}${uidKey}` : `${prefix}${uidKey}:${convId}`;
}

export function cleanTitle(t: string): string | null {
  const n = t.trim().replace(/\s+/g, ' ');
  if (n.length < 1 || n.length > 40 || /[<>]/.test(n)) return null;
  return n;
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export function defaultTitle(d = new Date()): string {
  return `Discussion du ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function createConv(idx: ConvIndex, title?: string, now = new Date()): { idx: ConvIndex; id: string } {
  const id = `c${now.getTime().toString(36)}`;
  const meta: ConvMeta = { id, title: (title && cleanTitle(title)) || defaultTitle(now), updatedAt: now.toISOString(), ...(title && cleanTitle(title) ? {} : { auto: true }) };
  return { idx: { ...idx, current: id, list: [...idx.list, meta] }, id };
}

export function renameConv(idx: ConvIndex, id: string, title: string): ConvIndex {
  const t = cleanTitle(title);
  if (!t) return idx;
  return { ...idx, list: idx.list.map(c => {
    if (c.id !== id) return c;
    const { auto: _auto, ...rest } = c;
    return { ...rest, title: t };
  }) };
}

/** La discussion principale ne se supprime pas (on peut l'effacer). */
export function deleteConv(idx: ConvIndex, id: string): ConvIndex {
  if (id === MAIN_ID) return idx;
  return { ...idx, current: idx.current === id ? MAIN_ID : idx.current, list: idx.list.filter(c => c.id !== id), deleted: [...(idx.deleted ?? []), id] };
}

/** Un titre court tiré du début d'un message (coupé au mot, 32 caractères au plus). */
export function titleFromMessage(text: string): string | null {
  const n = text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (n.length < 3) return null;
  if (n.length <= 32) return cleanTitle(n.replace(/[.!?…]+$/, ''));
  const cut = n.slice(0, 32);
  const sp = cut.lastIndexOf(' ');
  return cleanTitle(`${(sp > 14 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, '')}…`);
}

export function touchConv(idx: ConvIndex, id: string, preview?: string, now = new Date()): ConvIndex {
  return {
    ...idx,
    list: idx.list.map(c => {
      if (c.id !== id) return c;
      const next: ConvMeta = { ...c, updatedAt: now.toISOString(), ...(preview ? { preview: preview.slice(0, 80) } : {}) };
      // Discussion sans titre choisi : elle prend le nom de son premier message, pour qu'on s'y retrouve
      if (c.auto && c.id !== MAIN_ID && preview) {
        const t = titleFromMessage(preview);
        if (t) { next.title = t; delete next.auto; }
      }
      return next;
    }),
  };
}

/** Principale d'abord, puis les plus récentes. */
export function sortedConvs(idx: ConvIndex): ConvMeta[] {
  const main = idx.list.find(c => c.id === MAIN_ID) ?? mainMeta();
  return [main, ...idx.list.filter(c => c.id !== MAIN_ID).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))];
}
