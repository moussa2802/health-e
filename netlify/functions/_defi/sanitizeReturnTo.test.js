const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const ALLOWED_PREFIXES = [
  '/defi',
  '/assessment',
  '/mon-espace',
  '/journal',
  '/d/',
  '/api/d/',
];

function sanitizeReturnTo(raw) {
  if (!raw || typeof raw !== 'string') return '/assessment';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return '/assessment';
  if (trimmed.startsWith('//')) return '/assessment';
  if (trimmed.startsWith('/\\')) return '/assessment';
  if (trimmed.includes(':')) return '/assessment';
  if (!ALLOWED_PREFIXES.some(p => trimmed === p || trimmed.startsWith(p.endsWith('/') ? p : p + '/') || trimmed.startsWith(p + '?'))) {
    return '/assessment';
  }
  return trimmed;
}

describe('sanitizeReturnTo', () => {
  it('accepts /defi', () => {
    assert.equal(sanitizeReturnTo('/defi'), '/defi');
  });

  it('accepts /defi/abc/suivi', () => {
    assert.equal(sanitizeReturnTo('/defi/abc/suivi'), '/defi/abc/suivi');
  });

  it('accepts /assessment', () => {
    assert.equal(sanitizeReturnTo('/assessment'), '/assessment');
  });

  it('accepts /mon-espace', () => {
    assert.equal(sanitizeReturnTo('/mon-espace'), '/mon-espace');
  });

  it('accepts /d/some-slug', () => {
    assert.equal(sanitizeReturnTo('/d/some-slug'), '/d/some-slug');
  });

  it('accepts /journal', () => {
    assert.equal(sanitizeReturnTo('/journal'), '/journal');
  });

  it('accepts /defi with query string', () => {
    assert.equal(sanitizeReturnTo('/defi?src=notif'), '/defi?src=notif');
  });

  it('rejects https://evil.com', () => {
    assert.equal(sanitizeReturnTo('https://evil.com'), '/assessment');
  });

  it('rejects //evil.com', () => {
    assert.equal(sanitizeReturnTo('//evil.com'), '/assessment');
  });

  it('rejects /\\evil.com', () => {
    assert.equal(sanitizeReturnTo('/\\evil.com'), '/assessment');
  });

  it('rejects javascript:alert(1)', () => {
    assert.equal(sanitizeReturnTo('javascript:alert(1)'), '/assessment');
  });

  it('rejects empty string', () => {
    assert.equal(sanitizeReturnTo(''), '/assessment');
  });

  it('rejects null', () => {
    assert.equal(sanitizeReturnTo(null), '/assessment');
  });

  it('rejects undefined', () => {
    assert.equal(sanitizeReturnTo(undefined), '/assessment');
  });

  it('rejects unknown path /admin', () => {
    assert.equal(sanitizeReturnTo('/admin'), '/assessment');
  });

  it('rejects data: URI', () => {
    assert.equal(sanitizeReturnTo('data:text/html,<h1>hi</h1>'), '/assessment');
  });

  it('rejects path with colon /foo:bar', () => {
    assert.equal(sanitizeReturnTo('/foo:bar'), '/assessment');
  });

  it('rejects relative path without slash', () => {
    assert.equal(sanitizeReturnTo('defi/abc'), '/assessment');
  });
});
