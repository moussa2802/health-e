import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AMBIENTS, EXERCISES, EXERCISE_IDS, VOCALS, stepsFor, totalMs, voiceUrl } from '../../src/data/guidedExercises.ts';

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

test('exercices guidés : chaque fichier audio existe, dans les deux voix (si public/audio est là)', () => {
  const root = join(process.cwd(), 'public', 'audio');
  if (!existsSync(join(root, 'coherence'))) return;
  const voice = (dir: string, file: string) => {
    for (const g of ['femme', 'homme'] as const) {
      const url = voiceUrl(dir, file, g);
      assert.ok(existsSync(join(process.cwd(), 'public', url)), url);
    }
  };
  for (const id of EXERCISE_IDS) {
    const e = EXERCISES[id];
    for (const o of [{}, { beginner: true }, { minutes: 3 }, { minutes: 10 }]) for (const s of stepsFor(e, o)) {
      if (s.voice) voice(e.dir, s.voice);
      if (s.sound) assert.ok(existsSync(join(root, `${s.sound}.mp3`)), `${s.sound}.mp3`);
    }
  }
  for (const a of AMBIENTS) if (a.id !== 'none') assert.ok(existsSync(join(root, 'ambiance', `fond_${a.id}.mp3`)), `ambiance/fond_${a.id}.mp3`);
  for (const v of Object.values(VOCALS)) voice('soutien', v.file);
  for (const f of ['intro', 'inspire_1', 'inspire_2', 'inspire_3', 'expire_1', 'expire_2', 'expire_3', 'milieu', 'fin']) voice('respirer', f);
});

test('cohérence : 3, 5 ou 10 min, mode débutant 4 s puis 5 s, repères vocaux une seule fois', () => {
  const e = EXERCISES.coherence;
  for (const m of [3, 5, 10]) {
    const st = stepsFor(e, { minutes: m });
    const breath = st.filter(s => s.phase !== 'rest').reduce((n, s) => n + s.ms, 0);
    assert.equal(breath, m * 60000);
    for (const v of ['coh_moitie', 'coh_1min', 'coh_derniere']) assert.ok(st.filter(s => s.voice === v).length <= 1, v);
  }
  const b = stepsFor(e, { beginner: true });
  assert.equal(b[1].ms, 4000);
  assert.equal(b[7].ms, 5000);
  assert.equal(b[1].sound, 'ambiance/souffle_in_4');
});
