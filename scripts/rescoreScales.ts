/**
 * rescoreScales.ts — Recalcule, pour TOUS les comptes, les résultats enregistrés avec une ancienne
 * version d'une échelle (champ `scoringVersion` des échelles, ex. ECR-R corrigé le 22 oct. 2026).
 *
 * Même logique que le recalcul automatique fait à l'ouverture du profil (evaluationService.rescoreOutdatedResults) :
 * on reprend les réponses de la dernière session terminée, on recalcule, on met à jour le profil et la session,
 * et si le totem change, il est proposé comme « évolution » (totem.pendingAnimal).
 * Utile pour les personnes qui ne se reconnectent pas (leurs compatibilités restent justes).
 *
 * Usage (depuis le dossier du projet) :
 *   Simulation, rien n'est écrit :
 *     GOOGLE_CLOUD_PROJECT=health-e-af2bf npx tsx scripts/rescoreScales.ts
 *   Écriture réelle :
 *     GOOGLE_CLOUD_PROJECT=health-e-af2bf npx tsx scripts/rescoreScales.ts --apply
 * Identifiants : GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/compte-de-service.json
 *   (ou `gcloud auth application-default login`), comme les autres scripts du dossier.
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ALL_SCALES } from '../src/data/scales';
import { needsRescore, rescore } from '../src/utils/scaleScoring';
import { computeTotem, TOTEM_REQUIRED_SCALES } from '../src/utils/totemAlgorithm';
import type { ScaleResult } from '../src/types/assessment';

const APPLY = process.argv.includes('--apply');
if (!getApps().length) initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const toMs = (v: unknown): number => {
  if (!v) return 0;
  const t = v as { toMillis?: () => number; seconds?: number };
  if (v instanceof Date) return v.getTime();
  return t.toMillis ? t.toMillis() : (t.seconds ?? 0) * 1000;
};

async function main() {
  const versioned = ALL_SCALES.filter(s => s.scoringVersion);
  console.log(`${APPLY ? 'ÉCRITURE' : 'SIMULATION (ajoute --apply pour écrire)'} — échelles versionnées : ${versioned.map(s => `${s.id} v${s.scoringVersion}`).join(', ')}\n`);
  const profiles = await db.collection('userProfiles').get();
  const stats = { profils: 0, recalcules: 0, sansReponses: 0, totemsChanges: 0 };

  for (const p of profiles.docs) {
    const data = p.data();
    const results: Record<string, ScaleResult> = data.scaleResults ?? {};
    const outdated = Object.keys(results).filter(id => needsRescore(ALL_SCALES.find(s => s.id === id), results[id]));
    if (outdated.length === 0) continue;
    stats.profils += 1;

    const sessions = (await db.collection('assessmentSessions')
      .where('userId', '==', p.id).where('status', '==', 'completed').get()).docs;
    const updated = { ...results };
    const profileUpdate: Record<string, unknown> = {};

    for (const id of outdated) {
      const scale = ALL_SCALES.find(s => s.id === id)!;
      const latest = sessions
        .filter(d => { const s = d.data(); return s.answers?.[id] && Object.keys(s.answers[id]).length > 0 && s.scores?.[id]; })
        .sort((a, b) => toMs(b.data().completedAt ?? b.data().startedAt) - toMs(a.data().completedAt ?? a.data().startedAt))[0];
      if (!latest) {
        stats.sansReponses += 1;
        profileUpdate[`scaleResults.${id}.rescoreSkipped`] = true;
        console.log(`  ${p.id} · ${id} : réponses introuvables, ancien score conservé`);
        continue;
      }
      const before = results[id];
      const r = rescore(scale, before, latest.data().answers[id]);
      updated[id] = r;
      stats.recalcules += 1;
      console.log(`  ${p.id} · ${id} : ${JSON.stringify(before.subscaleScores)} → ${JSON.stringify(r.subscaleScores)}`);
      profileUpdate[`scaleResults.${id}.totalScore`] = r.totalScore;
      profileUpdate[`scaleResults.${id}.subscaleScores`] = r.subscaleScores ?? null;
      profileUpdate[`scaleResults.${id}.interpretation`] = r.interpretation;
      profileUpdate[`scaleResults.${id}.scoringVersion`] = r.scoringVersion ?? null;
      if (APPLY) {
        await latest.ref.update({
          [`scores.${id}.totalScore`]: r.totalScore,
          [`scores.${id}.subscaleScores`]: r.subscaleScores ?? null,
          [`scores.${id}.interpretation`]: r.interpretation,
          [`scores.${id}.scoringVersion`]: r.scoringVersion ?? null,
        });
      }
    }

    const totem = data.totem as { animal?: string; pendingAnimal?: string } | undefined;
    if (outdated.some(id => (TOTEM_REQUIRED_SCALES as readonly string[]).includes(id))
        && TOTEM_REQUIRED_SCALES.every(id => !!updated[id])) {
      const newAnimal = computeTotem(updated);
      if (newAnimal && totem?.animal && newAnimal !== totem.animal && newAnimal !== totem.pendingAnimal) {
        profileUpdate['totem.pendingAnimal'] = newAnimal;
        stats.totemsChanges += 1;
        console.log(`  ${p.id} · totem : ${totem.animal} → ${newAnimal} (proposé comme évolution)`);
      }
    }
    if (APPLY && Object.keys(profileUpdate).length > 0) {
      await p.ref.update({ ...profileUpdate, updatedAt: FieldValue.serverTimestamp() });
    }
  }
  console.log(`\nProfils concernés : ${stats.profils} · résultats recalculés : ${stats.recalcules} · sans réponses : ${stats.sansReponses} · totems qui évoluent : ${stats.totemsChanges}`);
  if (!APPLY) console.log('Rien n\'a été écrit. Relance avec --apply pour appliquer.');
}

main().catch(e => { console.error(e); process.exit(1); });
