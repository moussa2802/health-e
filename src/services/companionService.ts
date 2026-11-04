/**
 * companionService — le compagnon enregistré sur le compte (fonction serveur companion).
 * Au premier passage, ce qui était choisi sur le téléphone (nom, couleur, signe) monte sur le compte ;
 * ensuite, le compte fait foi et chaque appareil s'aligne.
 */
import { authedFetch } from '../utils/authedFetch';
import { getCompanionColor, getCompanionIcon, getCompanionName, saveCompanionColor, saveCompanionIcon, saveCompanionName } from '../utils/companion';
import { notifyCompanionChange, setCompanionStage } from '../utils/companionStage';

export interface CompanionData { name: string; color: string | null; icon: string | null; stage: number; seenStage: number }

async function call(body: Record<string, unknown>): Promise<CompanionData> {
  const res = await authedFetch('/.netlify/functions/companion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Erreur');
  return data as CompanionData;
}

function applyLocally(d: CompanionData): void {
  if (d.name) saveCompanionName(d.name);
  if (d.color) saveCompanionColor(d.color);
  if (d.icon) saveCompanionIcon(d.icon);
  setCompanionStage(d.stage);
  notifyCompanionChange();
}

let pending: Promise<CompanionData> | null = null;
/** Une fois par chargement de page (partagé entre l'accueil, la discussion et Moi). */
export function syncCompanion(): Promise<CompanionData> {
  if (pending) return pending;
  pending = (async () => {
    let d = await call({ action: 'get' });
    // Premier passage : on monte ce qui avait été choisi sur cet appareil
    if (!d.name && !d.color && !d.icon) {
      const local = { name: getCompanionName(), color: getCompanionColor().id, icon: getCompanionIcon() };
      if (local.name || local.color !== 'ambre' || local.icon !== 'pousse') d = await call({ action: 'save', ...local });
    }
    applyLocally(d);
    return d;
  })();
  pending.catch(() => { pending = null; });
  return pending;
}

/** Après « Nommer ton compagnon » : on enregistre aussi sur le compte (sans bloquer l'écran). */
export function pushCompanion(): void {
  call({ action: 'save', name: getCompanionName(), color: getCompanionColor().id, icon: getCompanionIcon() })
    .then(d => { pending = Promise.resolve(d); }).catch(() => { /* réessaiera au prochain passage */ });
  notifyCompanionChange();
}

export async function markStageSeen(): Promise<void> {
  const d = await call({ action: 'seen' });
  pending = Promise.resolve(d);
}
