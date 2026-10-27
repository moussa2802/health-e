const test = require('node:test');
const assert = require('node:assert');
const { buildJournalSystem, buildJournalUser, cleanJournalReply } = require('../_drloJournal');
const { VOICE } = require('../_drloVoice');

test('le journal utilise la voix commune et interdit titres et émojis', () => {
  const s = buildJournalSystem();
  assert.ok(s.startsWith(VOICE));
  assert.match(s, /Pas de titre/);
});
test('les anglicismes sont interdits dans la voix', () => {
  assert.match(VOICE, /anglicismes/);
  assert.match(VOICE, /pattern/);
});
test('retire titres à émojis et puces', () => {
  const raw = "👁️ Ce que je ressens en lisant ça\nTu portes beaucoup en ce moment.\n\n💡 Ce que ça m'inspire\n- Tu as besoin de souffler.\n\n🌱 Un conseil\nPrends dix minutes pour toi ce soir.";
  const out = cleanJournalReply(raw);
  assert.ok(!/[👁💡🌱]/u.test(out));
  assert.ok(!/Ce que je ressens/.test(out));
  assert.match(out, /Tu portes beaucoup/);
  assert.match(out, /Prends dix minutes/);
  assert.ok(!/^-/m.test(out));
});
test('borne les champs envoyés', () => {
  const u = buildJournalUser({ contenu: 'x'.repeat(9000), themes: 'pas un tableau' }, { prenom: 'A'.repeat(200) });
  assert.ok(u.length < 5000);
  assert.match(u, /Thèmes : aucun/);
});
