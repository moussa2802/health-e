const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// ── defi-close: transaction reads-before-writes ─────────────────────────────

const closeSource = fs.readFileSync(
  path.join(__dirname, '../defi-close.js'), 'utf-8'
);

describe('defi-close: transaction reads-before-writes (structural)', () => {
  it('all tx.get() calls appear before any tx.set()/tx.update()', () => {
    const txMatch = closeSource.match(/db\.runTransaction\(async \(tx\) => \{([\s\S]*?)\n    \}\)/);
    assert.ok(txMatch, 'transaction block found');
    const txBody = txMatch[1];
    const lines = txBody.split('\n');

    let lastGetLine = -1;
    let firstWriteLine = Infinity;

    lines.forEach((line, i) => {
      if (/tx\.get\(/.test(line)) lastGetLine = i;
      if (/tx\.set\(|tx\.update\(/.test(line) && i < firstWriteLine) firstWriteLine = i;
    });

    assert.ok(lastGetLine < firstWriteLine,
      `Last tx.get at line ${lastGetLine} must be before first tx.set/tx.update at line ${firstWriteLine}`);
  });

  it('reads privateDoc, defiDoc, profileDoc, and mesDefiDoc', () => {
    const txMatch = closeSource.match(/db\.runTransaction\(async \(tx\) => \{([\s\S]*?)\n    \}\)/);
    const txBody = txMatch[1];
    assert.ok(/tx\.get\(privateRef\)/.test(txBody), 'reads privateRef');
    assert.ok(/tx\.get\(defiRef\)/.test(txBody), 'reads defiRef');
    assert.ok(/tx\.get\(profileRef\)/.test(txBody), 'reads profileRef');
    assert.ok(/tx\.get\(mesDefiRef\)/.test(txBody), 'reads mesDefiRef');
  });
});

// ── defi-close: snapshot content ────────────────────────────────────────────

describe('defi-close: mesDefis snapshot', () => {
  it('writes statut, endedAt, endedBy, nbReponses, scoreMoyen, top3', () => {
    const txMatch = closeSource.match(/db\.runTransaction\(async \(tx\) => \{([\s\S]*?)\n    \}\)/);
    const txBody = txMatch[1];
    const updateMatch = txBody.match(/tx\.update\(mesDefiRef,\s*\{([\s\S]*?)\}\)/);
    assert.ok(updateMatch, 'tx.update(mesDefiRef, {...}) found');
    const updateBody = updateMatch[1];
    assert.ok(/statut:\s*'termine'/.test(updateBody), 'statut: termine');
    assert.ok(/endedAt/.test(updateBody), 'endedAt');
    assert.ok(/endedBy:\s*'createur'/.test(updateBody), 'endedBy: createur');
    assert.ok(/nbReponses/.test(updateBody), 'nbReponses');
    assert.ok(/scoreMoyen/.test(updateBody), 'scoreMoyen');
    assert.ok(/top3/.test(updateBody), 'top3');
  });

  it('top3 contains only pseudo and score (no uid, no deviceId)', () => {
    const txMatch = closeSource.match(/db\.runTransaction\(async \(tx\) => \{([\s\S]*?)\n    \}\)/);
    const txBody = txMatch[1];
    const mapMatch = txBody.match(/\.map\(e\s*=>\s*\(\{([\s\S]*?)\}\)/);
    assert.ok(mapMatch, 'top3 map found');
    const mapBody = mapMatch[1];
    assert.ok(/pseudo/.test(mapBody), 'includes pseudo');
    assert.ok(/score/.test(mapBody), 'includes score');
    assert.ok(!/uid/.test(mapBody), 'no uid leaked');
    assert.ok(!/deviceId/.test(mapBody), 'no deviceId leaked');
    assert.ok(!/respondedAt/.test(mapBody), 'no respondedAt leaked');
  });
});

// ── defi-create: defiHistory flag ───────────────────────────────────────────

const createSource = fs.readFileSync(
  path.join(__dirname, '../defi-create.js'), 'utf-8'
);

describe('defi-create: defiHistory flag (structural)', () => {
  it('writes defiHistory: true in the profile update', () => {
    const updateIdx = createSource.indexOf('tx.update(profileRef,');
    assert.ok(updateIdx !== -1, 'tx.update(profileRef, ...) found');
    const afterUpdate = createSource.slice(updateIdx, updateIdx + 300);
    assert.ok(/defiHistory:\s*true/.test(afterUpdate), 'defiHistory: true present in profileRef update');
  });
});

// ── Client filter: terminated defis ─────────────────────────────────────────
// The client shows as "terminated" any mesDefis doc whose slug is NOT in activeDefis.

describe('client filter: terminated defis', () => {
  const now = Date.now();
  const activeSlugs = new Set(['active1', 'active2']);

  function isTerminated(doc) {
    return !activeSlugs.has(doc.slug);
  }

  it('excludes active defis', () => {
    assert.equal(isTerminated({ slug: 'active1', expiresAt: now + 100000 }), false);
    assert.equal(isTerminated({ slug: 'active2', statut: 'termine' }), false);
  });

  it('includes defis with statut == termine', () => {
    assert.equal(isTerminated({ slug: 'ended1', statut: 'termine', expiresAt: now + 100000 }), true);
  });

  it('includes naturally expired defis', () => {
    assert.equal(isTerminated({ slug: 'expired1', expiresAt: now - 100000 }), true);
  });

  it('includes defis terminated before snapshot feature (no statut, future expiresAt)', () => {
    assert.equal(isTerminated({ slug: 'legacy1', expiresAt: now + 100000 }), true);
  });

  it('includes defis without createdAt', () => {
    assert.equal(isTerminated({ slug: 'no-created' }), true);
  });
});
