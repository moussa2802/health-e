/**
 * drloRouteService — envoie un message libre du premier écran à la fonction drlo-route,
 * qui renvoie où l'emmener. Gratuit. En cas d'échec (réseau, limite, délai), renvoie null :
 * la conversation retombe sur sa logique par mots-clés.
 */
import type { RouteDecision } from '../utils/accueilFlow';

export interface RoutePayload {
  text: string;
  step: string;
  prenom?: string;
  genre?: 'homme' | 'femme';
  isAuthenticated: boolean;
  done: string[];
  scales: { id: string; label: string }[];
  activeTest?: { label: string; question: string; options: string[] } | null;
  lastDrlo?: string;
}

const ACTIONS = new Set(['test', 'defi', 'compat', 'mood', 'confier', 'breath', 'chat', 'question_drlo', 'totem',
  'catalogue', 'explain', 'pause', 'continue', 'crisis', 'reply']);

export async function routeText(payload: RoutePayload, timeoutMs = 9000): Promise<RouteDecision | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    const res = await fetch('/.netlify/functions/drlo-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl?.signal,
    });
    if (!res.ok) return null;
    const d = await res.json() as RouteDecision;
    if (!d || !ACTIONS.has(d.action) || typeof d.reply !== 'string' || !d.reply.trim()) return null;
    return { action: d.action, scaleId: d.scaleId ?? null, then: d.then ?? null, reply: d.reply };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
