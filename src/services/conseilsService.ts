import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConseilItem {
  titre: string;
  texte: string;
}

export interface ExerciceItem {
  titre: string;
  description: string;
}

export interface ConseisData {
  signification: string;
  conseils: ConseilItem[];
  exercice: ExerciceItem;
  avis_pro?: string;
}

export interface CachedConseils extends ConseisData {
  score: number;
  scaleId: string;
  generatedAt: string;
  fromCache: boolean;
}

export interface GenerateConseilsParams {
  userId: string;
  scaleId: string;
  scaleName: string;
  score: number;
  scoreMax: number;
  niveau: string;
  severity: string;
  prenom?: string;
  genre?: string;
  interpretation?: string;
  forceRefresh?: boolean;
}

// ── Cache key ─────────────────────────────────────────────────────────────────

function cacheDocId(scaleId: string): string {
  return scaleId;
}

// ── Read cached conseils (no generation) ────────────────────────────────────

export async function getCachedConseils(
  userId: string,
  scaleId: string
): Promise<CachedConseils | null> {
  try {
    const cacheRef = doc(db, 'users', userId, 'conseils_cache', cacheDocId(scaleId));
    const cached = await getDoc(cacheRef);
    if (cached.exists()) {
      const data = cached.data() as Omit<CachedConseils, 'fromCache'>;
      return { ...data, fromCache: true };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Main service function ─────────────────────────────────────────────────────

export async function getOrGenerateConseils(
  params: GenerateConseilsParams
): Promise<CachedConseils> {
  const { userId, scaleId, score, forceRefresh = false } = params;
  const cacheRef = doc(db, 'users', userId, 'conseils_cache', cacheDocId(scaleId));

  // ── 1. Check cache (unless force refresh) ──
  if (!forceRefresh) {
    try {
      const cached = await getDoc(cacheRef);
      if (cached.exists()) {
        const data = cached.data() as Omit<CachedConseils, 'fromCache'>;
        // Cache valid only if score hasn't changed
        if (data.score === score) {
          return { ...data, fromCache: true };
        }
      }
    } catch {
      // Cache miss on error — proceed to generation
    }
  }

  // ── 2. Call AI endpoint ──
  const response = await fetch('/.netlify/functions/dr-lo-conseils', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scaleId: params.scaleId,
      scaleName: params.scaleName,
      score: params.score,
      scoreMax: params.scoreMax,
      niveau: params.niveau,
      severity: params.severity,
      prenom: params.prenom ?? '',
      genre: params.genre ?? '',
      interpretation: params.interpretation ?? '',
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error((errData as { error?: string }).error ?? 'Erreur lors de la génération des conseils');
  }

  const data = await response.json() as ConseisData;

  // ── 3. Store in cache ──
  const toStore: Omit<CachedConseils, 'fromCache'> = {
    ...data,
    score,
    scaleId,
    generatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(cacheRef, toStore);
  } catch {
    // Non-blocking — display the result even if cache write fails
  }

  return { ...toStore, fromCache: false };
}
