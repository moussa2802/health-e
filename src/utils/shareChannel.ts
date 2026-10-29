/**
 * Partager une chaîne : ouvre le partage du téléphone (WhatsApp, SMS…) avec un message qui donne envie ; sinon copie le lien.
 * Ne renvoie jamais d'erreur : 'shared' | 'copied' | 'cancelled' | 'failed'.
 */
import { channelInviteUrl } from '../services/drloChannelService';

export function inviteMessage(name: string, price: number): string {
  const entry = price > 0 ? `Entrée : ${price} étincelle${price > 1 ? 's' : ''}.` : 'Entrée gratuite.';
  return `Je te conseille la chaîne « ${name} » de Dr Lô sur Health-e. Des vocaux pour mieux te comprendre. ${entry}`;
}

export async function shareChannel(ch: { id: string; name: string; price: number }): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const url = channelInviteUrl(ch.id);
  const text = inviteMessage(ch.name, ch.price);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title: `${ch.name} — la chaîne de Dr Lô`, text, url });
      return 'shared';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
