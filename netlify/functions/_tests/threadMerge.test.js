// Lancer : node --test netlify/functions/_tests/threadMerge.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mergeThreads } = require('../_threadMerge');

const m = (from, text) => ({ id: 'x', from, text });
const S = (msgs, extra = {}) => ({ v: 1, seq: msgs.length + 1, messages: msgs, ...extra });

test('copie qui prolonge celle du compte : gardée telle quelle', () => {
  const a = S([m('drlo', 'Bonjour'), m('user', 'Salut'), m('drlo', 'Ça va ?')]);
  const b = S([...a.messages, m('user', 'Oui'), m('drlo', 'Super')]);
  assert.deepEqual(mergeThreads(a, b), { state: b, merged: false });
});

test('vieux téléphone qui ajoute « Re-bonjour » à une vieille copie : rien n\'est perdu', () => {
  const old = [m('drlo', 'Bonjour'), m('user', 'Salut')];
  const remote = S([...old, m('drlo', 'Ça va ?'), m('user', 'Je dors mal'), m('drlo', 'Je comprends')]);
  const stale = S([...old, m('drlo', 'Re-bonjour Papa')]);
  const out = mergeThreads(remote, stale);
  assert.equal(out.merged, true);
  assert.deepEqual(out.state.messages.map((x) => x.text), ['Bonjour', 'Salut', 'Ça va ?', 'Je dors mal', 'Je comprends', 'Re-bonjour Papa']);
});

test('nouvel appareil qui a démarré une discussion neuve : on ne remplace pas l\'historique', () => {
  const remote = S([m('drlo', 'Bonjour'), m('user', 'A'), m('drlo', 'B'), m('user', 'C')]);
  const fresh = S([m('drlo', 'Bonjour')]);
  const out = mergeThreads(remote, fresh);
  assert.equal(out.state, remote);
});

test('premier envoi, ou compte vide : la copie envoyée est gardée', () => {
  const b = S([m('drlo', 'Bonjour')]);
  assert.equal(mergeThreads(null, b).state, b);
  assert.equal(mergeThreads(S([]), b).state, b);
});
