// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planTestImport, mergeMoods, toMillis } from '../../src/utils/guestImport.ts';
import { startConversation, respond, signupInvite, welcomeAfterAuth, type Known } from '../../src/utils/accueilFlow.ts';

const g = (id: string, scaleId: string, at: string, importedTo?: string) => ({ id, scaleId, importedTo, result: { completedAt: at } });

test('import des tests invités : le plus récent par test, jamais deux fois, jamais par-dessus plus récent', () => {
  const guest = [
    g('a', 'gad7', '2026-10-20T10:00:00Z'),
    g('b', 'gad7', '2026-10-22T10:00:00Z'),
    g('c', 'phq9', '2026-10-22T09:00:00Z'),
    g('d', 'rses', '2026-10-22T09:00:00Z', 'uid1'),
    g('e', 'brs', '2026-10-01T09:00:00Z'),
  ];
  const account = { brs: { completedAt: { seconds: Date.parse('2026-10-10T00:00:00Z') / 1000 } } };
  const plan = planTestImport(guest, account).map(x => x.id).sort();
  assert.deepEqual(plan, ['b', 'c']);
});

test('dates Firestore / ISO / Date', () => {
  assert.equal(toMillis(new Date(5)), 5);
  assert.equal(toMillis('1970-01-01T00:00:00.010Z'), 10);
  assert.equal(toMillis({ toMillis: () => 7 }), 7);
  assert.equal(toMillis(undefined), 0);
});

test('humeur : les jours du compte gardent leur valeur', () => {
  assert.deepEqual(mergeMoods({ d1: 'compte' }, { d1: 'invite', d2: 'invite' }), { d1: 'compte', d2: 'invite' });
});

const k: Known = { isAuthenticated: false, guestRemaining: 0, doneScaleIds: [], labelOf: () => 'Anxiété', minutesOf: () => 3 };

test('invitation dans le chat + accueil après inscription', () => {
  let s = startConversation(k);
  s = respond(s, { value: 'need:stress', label: 'Je suis stressé(e)' }, k);
  s = { ...s, prenom: 'Awa' };
  const inv = signupInvite(s, 'signup', 'Créer mon compte');
  const last = inv.messages.at(-1)!;
  assert.deepEqual(last.card, { type: 'signup', mode: 'signup' });
  assert.match(last.text, /^Awa, je voudrais garder ton portrait/);
  assert.equal(inv.messages.at(-2)!.text, 'Créer mon compte');
  assert.match(signupInvite(s, 'login').messages.at(-1)!.text, /On retrouve ton espace/);

  const w = welcomeAfterAuth(inv, { isNew: true, importedTests: ['Anxiété'], journalCount: 2, phoneOnly: false });
  const txt = w.messages.slice(-2).map(m => m.text).join(' ');
  assert.match(txt, /C'est fait, Awa ! Bienvenue dans ton espace\. J'ai ajouté à ton espace ton test « Anxiété » et tes 2 confidences\./);
  const back = welcomeAfterAuth(inv, { isNew: false, importedTests: [], journalCount: 0, phoneOnly: true });
  assert.match(back.messages.at(-2)!.text, /^Content de te retrouver, Awa !$/);
  assert.equal(back.messages.at(-1)!.card?.type, 'link_account');
});
