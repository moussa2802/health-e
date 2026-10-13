const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getActiveDefis, canCreateDefi, buildActiveDefisUpdate } = require('./activeDefisHelper');

describe('getActiveDefis', () => {
  const future = new Date(Date.now() + 3600000);
  const past = new Date(Date.now() - 3600000);

  it('returns empty array for empty profile', () => {
    assert.deepStrictEqual(getActiveDefis({}), []);
  });

  it('migrates old activeDefi to array', () => {
    const result = getActiveDefis({ activeDefi: { slug: 'abc', expiresAt: future } });
    assert.equal(result.length, 1);
    assert.equal(result[0].slug, 'abc');
    assert.equal(result[0].titre, 'Mon défi');
    assert.equal(result[0].audience, 'tous');
  });

  it('filters expired from old activeDefi', () => {
    const result = getActiveDefis({ activeDefi: { slug: 'abc', expiresAt: past } });
    assert.deepStrictEqual(result, []);
  });

  it('reads activeDefis array and filters expired', () => {
    const result = getActiveDefis({
      activeDefis: [
        { slug: 'a', titre: 'Défi A', audience: 'amis', expiresAt: future },
        { slug: 'b', titre: 'Défi B', audience: 'famille', expiresAt: past },
        { slug: 'c', titre: 'Défi C', audience: 'tous', expiresAt: future },
      ],
    });
    assert.equal(result.length, 2);
    assert.equal(result[0].slug, 'a');
    assert.equal(result[1].slug, 'c');
  });

  it('prefers activeDefis over activeDefi when both exist', () => {
    const result = getActiveDefis({
      activeDefi: { slug: 'old', expiresAt: future },
      activeDefis: [{ slug: 'new', titre: 'T', audience: 'amis', expiresAt: future }],
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].slug, 'new');
  });

  it('handles Firestore Timestamp-like objects', () => {
    const ts = { toDate: () => future };
    const result = getActiveDefis({ activeDefi: { slug: 'x', expiresAt: ts } });
    assert.equal(result.length, 1);
  });

  it('defaults titre and audience when missing', () => {
    const result = getActiveDefis({
      activeDefis: [{ slug: 'x', expiresAt: future }],
    });
    assert.equal(result[0].titre, 'Mon défi');
    assert.equal(result[0].audience, 'tous');
  });
});

describe('canCreateDefi', () => {
  it('returns true for 0 active', () => assert.equal(canCreateDefi([]), true));
  it('returns true for 1 active', () => assert.equal(canCreateDefi([{}]), true));
  it('returns true for 2 active', () => assert.equal(canCreateDefi([{}, {}]), true));
  it('returns false for 3 active', () => assert.equal(canCreateDefi([{}, {}, {}]), false));
});

describe('buildActiveDefisUpdate', () => {
  it('appends new entry to existing array', () => {
    const current = [{ slug: 'a' }];
    const result = buildActiveDefisUpdate(current, { slug: 'b' });
    assert.equal(result.length, 2);
    assert.equal(result[1].slug, 'b');
  });

  it('does not mutate original array', () => {
    const current = [{ slug: 'a' }];
    buildActiveDefisUpdate(current, { slug: 'b' });
    assert.equal(current.length, 1);
  });
});
