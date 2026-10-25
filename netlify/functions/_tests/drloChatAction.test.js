const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _splitAction } = require('../dr-lo-chat.js');

test('Dr Lô propose au plus une action, reconnue en dernière ligne', () => {
  assert.deepEqual(_splitAction('Regardons ton sommeil.\n[[test:bonus_sommeil]]'), { text: 'Regardons ton sommeil.', action: { kind: 'test', scaleId: 'bonus_sommeil' } });
  assert.deepEqual(_splitAction('Respire avec moi.\n[[respiration]]'), { text: 'Respire avec moi.', action: { kind: 'respiration' } });
  assert.deepEqual(_splitAction('Juste une écoute.'), { text: 'Juste une écoute.', action: null });
  assert.deepEqual(_splitAction('Texte [[inconnu]] ici.'), { text: 'Texte  ici.', action: null });
});
