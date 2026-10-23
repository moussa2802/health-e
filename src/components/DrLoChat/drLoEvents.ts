/**
 * drLoEvents.ts — Ouvrir le chat Dr Lô depuis n'importe quelle page.
 *
 * Le widget FloatingChat est monté une seule fois dans App.tsx ; les pages
 * ne le connaissent pas. Elles appellent openDrLoChat() et le widget écoute.
 */

export const DRLO_OPEN_EVENT = 'drlo:open';

export interface DrLoOpenDetail {
  /** Premier message affiché par Dr Lô (remplace le « Salut ! » générique si la conversation est vide). */
  greeting?: string;
  /** D'où vient l'ouverture (ex. 'home_button', 'home_follow_up') — pour les métriques. */
  source?: string;
}

export function openDrLoChat(detail: DrLoOpenDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DrLoOpenDetail>(DRLO_OPEN_EVENT, { detail }));
}
