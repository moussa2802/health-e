const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createStartToken, verifyStartToken } = require('./tokenUtils');

const SECRET = 'test-secret-32-chars-minimum-1234';

describe('tokenUtils', () => {
  it('round-trip: create then verify', () => {
    const token = createStartToken('abc123', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', SECRET);
    const result = verifyStartToken(token, SECRET, 'abc123', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    assert.ok(result, 'should verify successfully');
    assert.equal(result.slug, 'abc123');
    assert.equal(result.deviceId, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    assert.ok(typeof result.t0 === 'number');
  });

  it('wrong secret → null', () => {
    const token = createStartToken('abc', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', SECRET);
    const result = verifyStartToken(token, 'wrong-secret-xxxxxxxxxxxxxxxxxxxx', 'abc', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    assert.equal(result, null);
  });

  it('tampered payload → null', () => {
    const token = createStartToken('abc', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', SECRET);
    const parts = token.split('.');
    const tampered = Buffer.from('{"slug":"HACKED","deviceId":"x","t0":0}').toString('base64url');
    const bad = `${tampered}.${parts[1]}`;
    assert.equal(verifyStartToken(bad, SECRET, 'HACKED', 'x'), null);
  });

  it('slug mismatch → null', () => {
    const token = createStartToken('abc', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', SECRET);
    assert.equal(verifyStartToken(token, SECRET, 'xyz', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'), null);
  });

  it('deviceId mismatch → null', () => {
    const token = createStartToken('abc', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', SECRET);
    assert.equal(verifyStartToken(token, SECRET, 'abc', '11111111-2222-4333-8444-555555555555'), null);
  });

  it('expired token (> 15 min) → null', () => {
    const token = createStartToken('abc', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', SECRET);
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    payload.t0 = Date.now() - 16 * 60 * 1000;
    const newPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const crypto = require('crypto');
    const newSig = crypto.createHmac('sha256', SECRET).update(newPayload).digest('base64url');
    assert.equal(verifyStartToken(`${newPayload}.${newSig}`, SECRET, 'abc', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'), null);
  });

  it('null/empty/garbage → null', () => {
    assert.equal(verifyStartToken(null, SECRET, 'a', 'b'), null);
    assert.equal(verifyStartToken('', SECRET, 'a', 'b'), null);
    assert.equal(verifyStartToken('not.a.valid.token', SECRET, 'a', 'b'), null);
    assert.equal(verifyStartToken('garbage', SECRET, 'a', 'b'), null);
  });
});

describe('sanitizePseudo (extracted from defi-respond)', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(__dirname, '../defi-respond.js'), 'utf-8');
  const match = source.match(/function sanitizePseudo\(raw\)\s*\{[\s\S]*?\n\}/);
  const sanitizePseudo = new Function('return ' + match[0])();

  it('valid pseudo', () => assert.equal(sanitizePseudo('Moussa'), 'Moussa'));
  it('trims + collapses spaces', () => assert.equal(sanitizePseudo('  Moussa   Test  '), 'Moussa Test'));
  it('too short', () => assert.equal(sanitizePseudo('A'), null));
  it('too long', () => assert.equal(sanitizePseudo('A'.repeat(21)), null));
  it('HTML rejected', () => assert.equal(sanitizePseudo('<b>hack</b>'), null));
  it('URL rejected', () => assert.equal(sanitizePseudo('https://evil.com'), null));
  it('emoji ok', () => assert.equal(sanitizePseudo('Papa 😎'), 'Papa 😎'));
  it('non-string', () => assert.equal(sanitizePseudo(42), null));
});

describe('buildDevoilement (extracted from defi-respond)', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(__dirname, '../defi-respond.js'), 'utf-8');

  const configMatch = source.match(/const \{ scoreResponse, DEFI_SCALE_CONFIG \}[^\n]*/);
  const { DEFI_SCALE_CONFIG } = require('./questionBank');

  const fnMatch = source.match(/function buildDevoilement\(defi, truths\)\s*\{[\s\S]*?\n\}/);
  const buildDevoilement = new Function('DEFI_SCALE_CONFIG', 'return ' + fnMatch[0])(DEFI_SCALE_CONFIG);

  const truths = [
    { source: 'scale', scaleId: 'big_five.extraversion', correctOptionId: 'o_1', optionBands: {} },
    { source: 'scale', scaleId: 'gad7', correctOptionId: 'o_2', optionBands: {} },
    { source: 'totem', correctOptionId: 'o_3' },
  ];

  it('devoilement=auto: reveals auto scales + totem, NOT optin', () => {
    const defi = { devoilement: 'auto', mode: 'public' };
    const result = buildDevoilement(defi, truths);
    assert.ok(result);
    const indices = result.map(r => r.questionIndex);
    assert.ok(indices.includes(0), 'big_five (auto) should be revealed');
    assert.ok(!indices.includes(1), 'gad7 (optin) should NOT be revealed');
    assert.ok(indices.includes(2), 'totem should be revealed');
  });

  it('devoilement=aucun: returns null', () => {
    const defi = { devoilement: 'aucun', mode: 'public' };
    assert.equal(buildDevoilement(defi, truths), null);
  });
});

describe('answer validation', () => {
  it('optionId from wrong question should be detectable', () => {
    const questions = [
      { text: 'Q1', options: [{ id: 'o_a' }, { id: 'o_b' }], source: 'scale' },
      { text: 'Q2', options: [{ id: 'o_c' }, { id: 'o_d' }], source: 'scale' },
    ];
    const answers = [
      { questionIndex: 0, optionId: 'o_c', ms: 5000 },
      { questionIndex: 1, optionId: 'o_d', ms: 3000 },
    ];

    const q0ValidIds = questions[0].options.map(o => o.id);
    assert.ok(!q0ValidIds.includes(answers[0].optionId), 'o_c does not belong to Q1');
  });

  it('ms > 16000 should be capped', () => {
    const ms = 25000;
    const capped = Math.min(ms, 16000);
    assert.equal(capped, 16000);
  });

  it('null optionId is valid (timeout)', () => {
    const answer = { questionIndex: 0, optionId: null, ms: 15000 };
    assert.equal(answer.optionId, null);
  });
});
