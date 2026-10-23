/**
 * socialChat — appels réseau du Défi et de la compatibilité faits depuis la conversation.
 * Mêmes fonctions serveur et mêmes règles que les pages /defi/creer et /assessment/compatibility.
 */
import { authedFetch } from '../utils/authedFetch';
import { getProfileProgress } from './evaluationService';
import {
  computeCompatibility, computeMergedCompatibility, createCompatibilityRequest,
  saveCompatibilityHistory, validateCompatibilityCode,
} from './compatibilityService';
import { getTotemProgress } from '../utils/totemAlgorithm';
import type { CompatibilityResult } from '../types/assessment';
import { DEFI_SCALE_CONFIG } from '../config/defiConfig';
import type { DefiAudience, DefiQuestion, PersoQuestion, SelectedPerso } from '../utils/socialFlow';

export interface SocialProfile {
  totemRevealed: boolean;
  totemMissing: number;
  activeDefis: number;
  genre: 'masculin' | 'feminin' | null;
  codeMental: string | null;
  codeSexual: string | null;
  /** Tests sensibles déjà faits, que la personne peut ajouter à un défi public. */
  availableOptins: string[];
}

export async function loadSocialProfile(uid: string): Promise<SocialProfile> {
  const p = await getProfileProgress(uid);
  const g = p.defiGenre || p.onboardingProfile?.genre;
  return {
    totemRevealed: !!p.totem?.revealedAt,
    totemMissing: getTotemProgress(p.scaleResults ?? {}).missing.length,
    activeDefis: p.activeDefis?.length ?? 0,
    genre: g === 'masculin' || g === 'homme' ? 'masculin' : g === 'feminin' || g === 'femme' ? 'feminin' : null,
    codeMental: p.compatibilityIdMental,
    codeSexual: p.compatibilityIdSexual,
    availableOptins: Object.entries(DEFI_SCALE_CONFIG)
      .filter(([id, cfg]) => cfg.public === 'optin' && !!p.scaleResults?.[id])
      .map(([id]) => id),
  };
}

export interface DefiInput {
  displayName: string;
  audience: DefiAudience;
  genre: 'masculin' | 'feminin';
  duration: number;
  devoilement: 'auto' | 'aucun';
  titre: string;
  optinScales: string[];
  petitsMots: boolean;
}

export async function defiPreview(i: DefiInput): Promise<{ ok: true; selected: DefiQuestion[]; available: DefiQuestion[]; perso: PersoQuestion[]; totem: string | null } | { ok: false; error: string }> {
  try {
    const res = await authedFetch('/.netlify/functions/defi-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: i.displayName, audience: i.audience, persoCount: 0, genre: i.genre, optinScales: i.optinScales }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'aperçu impossible' };
    const q = (x: { key: string; text: string }) => ({ key: x.key, text: x.text });
    return {
      ok: true,
      selected: (data.selected ?? []).map(q),
      available: (data.available ?? []).map(q),
      perso: (data.perso ?? []).map((p: PersoQuestion) => ({ id: p.id, stem: p.stem, options: p.options ?? [], allowOther: !!p.allowOther })),
      totem: data.totem?.text ?? null,
    };
  } catch {
    return { ok: false, error: 'connexion instable' };
  }
}

export async function defiCreate(i: DefiInput, selectedKeys: string[], perso: SelectedPerso[]): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  try {
    const res = await authedFetch('/.netlify/functions/defi-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: i.displayName, optinScales: i.optinScales, duration: i.duration, devoilement: i.devoilement,
        titre: i.titre, audience: i.audience, petitsMots: i.petitsMots, selectedKeys, genre: i.genre,
        ...(perso.length ? { persoQuestions: perso.map(sp => (sp.customAnswer ? { questionId: sp.questionId, customAnswer: sp.customAnswer } : { questionId: sp.questionId, answerIdx: sp.answerIdx })) } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'création impossible' };
    try { localStorage.setItem('he_defi_pseudo', i.displayName); } catch { /* ignore */ }
    return { ok: true, slug: data.slug };
  } catch {
    return { ok: false, error: 'connexion instable' };
  }
}

export const defiUrl = (slug: string) => `https://health-e.sn/api/d/${slug}`;

export async function checkCompatCode(code: string, uid: string): Promise<{ ok: true; prenom: string } | { ok: false; error: string }> {
  try {
    const v = await validateCompatibilityCode(code, uid);
    if (!v.valid) return { ok: false, error: v.error || 'Code introuvable.' };
    return { ok: true, prenom: v.prenom || 'cette personne' };
  } catch {
    return { ok: false, error: 'Je n\'arrive pas à vérifier ce code (connexion instable).' };
  }
}

/** Même calcul que la page Compatibilité (les étincelles sont débitées côté serveur par l'analyse). */
export async function runCompat(uid: string, relType: string, romantic: boolean, code: string, type: 'mental' | 'sexual', prenom: string): Promise<{ ok: true; result: CompatibilityResult } | { ok: false; error: string }> {
  try {
    let result: CompatibilityResult;
    if (romantic) {
      result = await computeMergedCompatibility(uid, relType, type === 'mental' ? code : null, type === 'sexual' ? code : null);
      await saveCompatibilityHistory(uid, relType, code, type, result, prenom, type === 'mental' ? code : undefined, type === 'sexual' ? code : undefined).catch(() => {});
    } else {
      if (type !== 'mental') return { ok: false, error: 'Pour ce type de relation, il me faut son code « mental » (HE-MNT-…).' };
      const req = await createCompatibilityRequest(uid, code, relType);
      result = await computeCompatibility(req.id);
      await saveCompatibilityHistory(uid, relType, code, 'mental', result, prenom).catch(() => {});
    }
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur pendant la comparaison.' };
  }
}
