/** L'exercice « Quelle est ta langue de l'amour ? » : complet, ordre stable, résultat juste (et à égalité, deux langues au plus). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARTES, LANGUES, SITUATIONS, ordreReponses, resultat } from '../../src/data/exerciceLangueAmour';
import { SEANCES_VIDEO, seanceVideoById, seanceVideoDeLExercice } from '../../src/data/seances';

test('5 situations, chacune avec une réponse par langue, et une carte par langue', () => {
  assert.equal(SITUATIONS.length, 5);
  for (const s of SITUATIONS) for (const l of LANGUES) assert.ok(s.reponses[l]?.length > 5, `${s.question} ${l}`);
  for (const l of LANGUES) assert.ok(CARTES[l].titre && CARTES[l].conseil && CARTES[l].piege);
});

test('l\'ordre des réponses mélange les langues sans en perdre', () => {
  for (let i = 0; i < SITUATIONS.length; i++) assert.deepEqual([...ordreReponses(i)].sort(), [...LANGUES].sort());
  assert.notDeepEqual(ordreReponses(0), ordreReponses(1));
});

test('la langue la plus choisie gagne ; à égalité, deux langues selon les situations parlantes', () => {
  assert.deepEqual(resultat(['presence', 'presence', 'mots', 'presence', 'actes']), ['presence']);
  assert.deepEqual(resultat(['mots', 'actes', 'actes', 'mots', 'tendresse']), ['actes', 'mots']);
  assert.deepEqual(resultat(['presence', 'mots', 'actes', 'tendresse', 'attentions']), ['actes', 'presence']);
  assert.deepEqual(resultat([]), []);
});

test('la séance vidéo 1 répond à son nom, à /s/1, et mène à son exercice', () => {
  assert.equal(seanceVideoById('1')?.id, 'mon-mari-ne-m-aime-pas');
  assert.equal(seanceVideoDeLExercice('/exercice/langue-amour')?.n, 1);
  for (const s of SEANCES_VIDEO) assert.ok(s.video.startsWith('/videos/') && s.affiche.startsWith('/images/'));
});
