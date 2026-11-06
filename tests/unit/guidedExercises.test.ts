import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EXERCISES, EXERCISE_IDS, VOCALS, totalMs } from '../../src/data/guidedExercises.ts';

test('exercices guidés : durées annoncées respectées', () => {
  const min = (id: keyof typeof EXERCISES) => totalMs(EXERCISES[id]) / 60000;
  assert.ok(min('coherence') >= 5 && min('coherence') < 5.6, `cohérence ${min('coherence')}`);
  assert.ok(min('ancrage') >= 1.8 && min('ancrage') < 2.3);
  assert.ok(min('sommeil') >= 2.6 && min('sommeil') < 3.3);
  assert.ok(min('relacher') >= 2.6 && min('relacher') < 3.3);
  // Cohérence : 30 inspirations et 30 expirations de 5 s
  const c = EXERCISES.coherence.steps;
  assert.equal(c.filter(s => s.phase === 'in').length, 30);
  assert.ok(c.filter(s => s.phase !== 'rest').every(s => s.ms === 5000));
});

test('exercices guidés : chaque fichier audio existe (si public/audio est là)', () => {
  const root = join(process.cwd(), 'public', 'audio');
  if (!existsSync(join(root, 'coherence'))) return;
  for (const id of EXERCISE_IDS) {
    const e = EXERCISES[id];
    for (const s of e.steps) for (const f of [s.voice, s.sound]) if (f) assert.ok(existsSync(join(root, e.dir, `${f}.mp3`)), `${e.dir}/${f}.mp3`);
  }
  for (const v of Object.values(VOCALS)) assert.ok(existsSync(join(process.cwd(), 'public', v.file)), v.file);
});
