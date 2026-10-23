// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMoment, greetingFor, PALETTES } from '../../src/utils/drloMoment.ts';
import { dayKey, setMood, removeMood, moodReply, MOODS } from '../../src/utils/moodLog.ts';
import { startConversation, addExchange, type Known } from '../../src/utils/accueilFlow.ts';

const at = (h: number) => new Date(2026, 9, 22, h, 30);

test('moment de la journée : matin / après-midi / soir', () => {
  assert.equal(getMoment(at(6)), 'matin');
  assert.equal(getMoment(at(11)), 'matin');
  assert.equal(getMoment(at(12)), 'aprem');
  assert.equal(getMoment(at(17)), 'aprem');
  assert.equal(getMoment(at(18)), 'soir');
  assert.equal(getMoment(at(2)), 'soir');
  for (const m of ['matin', 'aprem', 'soir'] as const) assert.ok(PALETTES[m].accent.startsWith('#'));
});

test('salutation avec et sans prénom', () => {
  assert.equal(greetingFor('matin'), 'Jàmm nga fanaane ?');
  assert.equal(greetingFor('aprem', 'Awa'), 'Na nga def, Awa ?');
  assert.equal(greetingFor('soir', 'Moussa'), 'Na nga yendoo, Moussa ?');
});

test('humeur : clé de jour locale, ajout, mise à jour, annulation', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  let m = setMood({}, '2026-10-22', 'bof', 1);
  m = setMood(m, '2026-10-22', 'plutot_bien', 2);
  assert.deepEqual(m['2026-10-22'], { mood: 'plutot_bien', at: 2 });
  const before = m;
  m = removeMood(m, '2026-10-22');
  assert.equal(m['2026-10-22'], undefined);
  assert.ok(before['2026-10-22'], 'pas de mutation');
});

test('humeur : douceur quand ça ne va pas, 1515 si très dur, jamais de diagnostic', () => {
  assert.equal(MOODS.length, 5);
  assert.match(moodReply('pas_bien', 'Awa'), /Je suis là.*respirer/);
  assert.doesNotMatch(moodReply('pas_bien'), /1515/);
  assert.match(moodReply('tres_dur'), /1515/);
  assert.match(moodReply('bof', 'Awa'), /noté : bof/);
  assert.match(moodReply('bof', undefined, true), /mis à jour/);
  for (const md of MOODS) assert.doesNotMatch(moodReply(md.id), /dépression|diagnostic|trouble/i);
});

test('addExchange : ajoute sans changer d\'étape', () => {
  const k: Known = { isAuthenticated: true, guestRemaining: 0, doneScaleIds: [], labelOf: x => x, minutesOf: () => 3 };
  const s = startConversation(k);
  const n = addExchange(s, 'Mon humeur : bof', ['Merci.']);
  assert.equal(n.step, s.step);
  assert.equal(n.messages.length, s.messages.length + 2);
  assert.equal(n.messages.at(-2)!.from, 'user');
  assert.equal(n.messages.at(-1)!.from, 'drlo');
  const ids = new Set(n.messages.map(m => m.id));
  assert.equal(ids.size, n.messages.length, 'identifiants uniques');
  const o = addExchange(n, null, ['Bien joué.']);
  assert.equal(o.messages.at(-1)!.text, 'Bien joué.');
});
