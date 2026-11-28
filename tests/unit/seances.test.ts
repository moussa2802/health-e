/** Les séances : chaque chemin mène à une fin, et la fin dépend bien des réponses. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEANCES, finSelon, verifierSeance } from '../../src/data/seances';

test('chaque séance est complète (suites connues, deux réponses par question, une fin)', () => {
  for (const s of SEANCES) assert.deepEqual(verifierSeance(s), [], s.id);
});

test('la fin suit l\'étiquette la plus fréquente, et « autre » sans étiquette', () => {
  const selon = { oubli: 'fin_oubli', peine: 'fin_peine', autre: 'fin_oubli' };
  assert.equal(finSelon(selon, ['peine', 'oubli', 'peine']), 'fin_peine');
  assert.equal(finSelon(selon, ['oubli', 'oubli', 'peine']), 'fin_oubli');
  assert.equal(finSelon(selon, []), 'fin_oubli');
  assert.equal(finSelon(selon, ['peine', 'oubli']), 'fin_peine');
});

test('tous les chemins de la séance 1 arrivent à la même conclusion', () => {
  const s = SEANCES[0];
  const chemins = (id: string, vus: string[]): string[][] => {
    const x = s.noeuds[id];
    if (x.fin) return [[...vus, id]];
    const sorties = x.choix ? x.choix.map(c => c.suite) : x.selon ? Object.values(x.selon) : [x.suite!];
    return [...new Set(sorties)].flatMap(o => chemins(o, [...vus, id]));
  };
  const tous = chemins(s.depart, []);
  assert.ok(tous.length >= 32);
  for (const c of tous) assert.equal(c[c.length - 1], 'fin');
});
