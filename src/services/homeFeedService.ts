/**
 * homeFeedService.ts — client de la fonction publique home-feed : ce que l'accueil montre à tout le monde
 * (chaînes, derniers contenus ouverts à tous, derniers outils) et le test à la une choisi dans l'espace Dr Lô.
 */
import { authedFetch } from '../utils/authedFetch';

export interface HomeChannel { id: string; name: string; categories: string[]; memberCount: number; imageUrl: string | null; at: number }
export interface HomePost { kind: 'post'; id: string; channelId: string; channelName: string; title: string; hasAudio: boolean; audioSec: number; at: number }
export interface HomeTool { kind: 'tool'; id: string; title: string; minutes: number; at: number }
export interface Featured { scaleId: string; label: string }
export interface HomeFeed { featured: Featured | null; channels: HomeChannel[]; latest: HomePost[]; tools: HomeTool[] }

/** Test mis à la une tant que Dr Lô n'en a pas choisi un : l'anxiété, le sujet qui parle au plus grand nombre. */
export const DEFAULT_FEATURED: Featured = { scaleId: 'gad7', label: '' };

let cache: { at: number; feed: HomeFeed } | null = null;
const TTL = 60_000;

export async function getHomeFeed(force = false): Promise<HomeFeed> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.feed;
  const res = await fetch('/.netlify/functions/home-feed');
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const feed = (await res.json()) as HomeFeed;
  cache = { at: Date.now(), feed };
  return feed;
}

/** Espace Dr Lô : choisit le test à la une (scaleId null = retirer, l'accueil reprend le test par défaut). */
export async function setFeatured(scaleId: string | null, label: string): Promise<Featured | null> {
  const res = await authedFetch('/.netlify/functions/home-feed', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_featured', scaleId, label }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`);
  cache = null;
  return (data as { featured: Featured | null }).featured;
}

/** « il y a 2 jours », « hier »… pour les cartes de nouveautés. */
export function agoLabel(at: number, now = Date.now()): string {
  const days = Math.floor((now - at) / 864e5);
  if (!at || days < 0) return '';
  if (days === 0) return 'aujourd\'hui';
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} jours`;
  const m = Math.floor(days / 30);
  return m < 12 ? `il y a ${m} mois` : 'il y a plus d\'un an';
}
