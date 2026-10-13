const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { moderateMessage, _resetCache } = require('./moderation');

describe('moderateMessage', () => {
  it('accepts a clean message', async () => {
    const r = await moderateMessage('Trop drôle ton défi !');
    assert.deepStrictEqual(r, { ok: true });
  });

  it('accepts emojis', async () => {
    const r = await moderateMessage('Tu es génial 😍🔥');
    assert.deepStrictEqual(r, { ok: true });
  });

  it('rejects empty string', async () => {
    const r = await moderateMessage('');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'length');
  });

  it('rejects string > 200 chars', async () => {
    const r = await moderateMessage('a'.repeat(201));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'length');
  });

  it('accepts string of exactly 200 chars', async () => {
    const r = await moderateMessage('a'.repeat(200));
    assert.deepStrictEqual(r, { ok: true });
  });

  it('rejects non-string', async () => {
    const r = await moderateMessage(42);
    assert.equal(r.ok, false);
  });

  // URL detection
  it('rejects http URL', async () => {
    const r = await moderateMessage('Va sur http://evil.com');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'url');
  });

  it('rejects https URL', async () => {
    const r = await moderateMessage('https://example.org');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'url');
  });

  it('rejects www prefix', async () => {
    const r = await moderateMessage('Va sur www.truc.sn');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'url');
  });

  it('rejects .com domain', async () => {
    const r = await moderateMessage('Va sur google.com');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'url');
  });

  it('rejects .sn domain', async () => {
    const r = await moderateMessage('check health-e.sn');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'url');
  });

  // Phone detection
  it('rejects 8+ digit phone number', async () => {
    const r = await moderateMessage('Appelle 77 123 45 67');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'phone');
  });

  it('rejects phone with dots', async () => {
    const r = await moderateMessage('Mon num 77.123.45.67');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'phone');
  });

  it('rejects phone with dashes', async () => {
    const r = await moderateMessage('Appelle 77-123-45-67');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'phone');
  });

  it('rejects phone with + prefix', async () => {
    const r = await moderateMessage('+221 77 123 45 67');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'phone');
  });

  it('rejects phone with +221 dot separator', async () => {
    const r = await moderateMessage('+221.77.123.45.67');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'phone');
  });

  it('rejects phone with mixed separators', async () => {
    const r = await moderateMessage('Tel: (221) 77-123 4567');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'phone');
  });

  it('accepts short numbers (< 8 digits)', async () => {
    const r = await moderateMessage('Merci pour les 5 points');
    assert.deepStrictEqual(r, { ok: true });
  });

  // Social media detection
  it('rejects snap username', async () => {
    const r = await moderateMessage('Ajoute snap: moussa23');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'social');
  });

  it('rejects insta handle', async () => {
    const r = await moderateMessage('@insta moussa_pro');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'social');
  });

  it('rejects tiktok mention', async () => {
    const r = await moderateMessage('Suis moi tiktok moussa');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'social');
  });

  // Banned words
  it('rejects French insult', async () => {
    const r = await moderateMessage('Tu es un connard');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'banned_word');
  });

  it('rejects insult with accents', async () => {
    const r = await moderateMessage('Quel enfoiré');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'banned_word');
  });

  it('rejects insult case-insensitive', async () => {
    const r = await moderateMessage('CONNARD');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'banned_word');
  });

  it('rejects abbreviation FDP', async () => {
    const r = await moderateMessage('fdp va');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'banned_word');
  });

  // Firestore merge (no db = French only)
  it('works without db (French list only)', async () => {
    _resetCache();
    const r = await moderateMessage('Message propre', null);
    assert.deepStrictEqual(r, { ok: true });
  });
});
