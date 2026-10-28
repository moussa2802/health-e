/**
 * compatInvite.ts — inviter quelqu'un au test de compatibilité par un LIEN (plus besoin de recopier un code).
 * Le lien porte seulement les codes de compatibilité (comme le code qu'on partageait déjà) : aucun résultat.
 * L'invitation est gardée sur le téléphone de la personne invitée (14 jours) le temps qu'elle crée son espace
 * ou fasse ses tests ; elle est effacée une fois la compatibilité calculée.
 */
const KEY = 'he_compat_invite_v1';
const MAX_AGE = 14 * 864e5;

export const isMentalCode = (c: string) => /^HE-MNT-\d{4}-[A-Z0-9]{4}$/i.test(c) || /^SM-[A-Z0-9]{4}$/i.test(c);
export const isSexualCode = (c: string) => /^HE-SEX-\d{4}-[A-Z0-9]{4}$/i.test(c) || /^SE-[A-Z0-9]{4}$/i.test(c);

export interface CompatInvite { m: string | null; s: string | null; at: number }

/** Le lien à partager : /compat/<code mental>[?s=<code intime>] (ou /compat/<code intime> s'il n'y a que lui). */
export function inviteLink(origin: string, mental: string | null, sexual: string | null): string | null {
  const m = mental?.trim().toUpperCase() || null;
  const s = sexual?.trim().toUpperCase() || null;
  if (m && isMentalCode(m)) return `${origin}/compat/${encodeURIComponent(m)}${s && isSexualCode(s) ? `?s=${encodeURIComponent(s)}` : ''}`;
  if (s && isSexualCode(s)) return `${origin}/compat/${encodeURIComponent(s)}`;
  return null;
}

/** Lit l'invitation depuis l'adresse (/compat/:code?s=…). null si les codes ne sont pas valides. */
export function inviteFromUrl(code: string | undefined, s: string | null, now = Date.now()): CompatInvite | null {
  const c = (code ?? '').trim().toUpperCase();
  const sx = (s ?? '').trim().toUpperCase();
  const m = isMentalCode(c) ? c : null;
  const sexual = isSexualCode(c) ? c : isSexualCode(sx) ? sx : null;
  return m || sexual ? { m, s: sexual, at: now } : null;
}

export function saveInvite(inv: CompatInvite): void {
  try { localStorage.setItem(KEY, JSON.stringify(inv)); } catch { /* ignore */ }
}

export function loadInvite(now = Date.now()): CompatInvite | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as CompatInvite | null;
    if (!v || (!v.m && !v.s) || now - (v.at || 0) > MAX_AGE) return null;
    return v;
  } catch { return null; }
}

export function clearInvite(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Le message partagé (WhatsApp, SMS…). */
export function inviteMessage(link: string): string {
  return `Fais le test de compatibilité avec moi sur Health-e 💞 Touche le lien, dis ce qu'on est l'un pour l'autre (couple, crush, amis, famille…) et Dr Lô compare nos profils : ${link}`;
}
