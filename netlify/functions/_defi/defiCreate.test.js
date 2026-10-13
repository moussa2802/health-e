const path = require('path');

// ── Extract validation functions from defi-create.js ───────────────────────
// We test the validation logic directly since the handler requires Firebase

const defiCreateSource = require('fs').readFileSync(
  path.join(__dirname, '..', 'defi-create.js'), 'utf-8'
);

// Extract sanitizeDisplayName
const sanitizeMatch = defiCreateSource.match(
  /function sanitizeDisplayName\(raw\)\s*\{[\s\S]*?\n\}/
);
const sanitizeDisplayName = new Function('return ' + sanitizeMatch[0])();

// Extract buildEligibleResults
const buildMatch = defiCreateSource.match(
  /function buildEligibleResults\(scaleResults, optinScales, mode\)\s*\{[\s\S]*?\n\}/
);
// Need DEFI_SCALE_CONFIG in scope
const configMatch = defiCreateSource.match(
  /const DEFI_SCALE_CONFIG = \{[\s\S]*?\n\};/
);
const buildEligibleResults = new Function(
  configMatch[0] + '\n' + buildMatch[0] + '\nreturn buildEligibleResults;'
)();

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function assertEq(a, b, msg) {
  if (a !== b) throw new Error(`FAIL: ${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

// ── sanitizeDisplayName ─────────────────────────────────────────────────────

console.log('\n── sanitizeDisplayName ──');

test('valid name', () => {
  assertEq(sanitizeDisplayName('Moussa'), 'Moussa', 'simple name');
});

test('trims and collapses spaces', () => {
  assertEq(sanitizeDisplayName('  Awa   Ba  '), 'Awa Ba', 'spaces');
});

test('too short', () => {
  assertEq(sanitizeDisplayName('A'), null, 'single char');
});

test('too long', () => {
  assertEq(sanitizeDisplayName('A'.repeat(21)), null, '21 chars');
});

test('exactly 2 chars OK', () => {
  assertEq(sanitizeDisplayName('AB'), 'AB', '2 chars');
});

test('exactly 20 chars OK', () => {
  assertEq(sanitizeDisplayName('A'.repeat(20)), 'A'.repeat(20), '20 chars');
});

test('rejects HTML tags', () => {
  assertEq(sanitizeDisplayName('<script>'), null, 'html');
  assertEq(sanitizeDisplayName('Mo>ussa'), null, 'html >');
});

test('rejects URLs', () => {
  assertEq(sanitizeDisplayName('http://evil.com'), null, 'http');
  assertEq(sanitizeDisplayName('https://evil.com'), null, 'https');
});

test('rejects control characters', () => {
  assertEq(sanitizeDisplayName('Mo\x00ssa'), null, 'null byte');
  assertEq(sanitizeDisplayName('Mo\x1Fssa'), null, 'unit separator');
});

test('allows emojis', () => {
  assertEq(sanitizeDisplayName('Awa 😊'), 'Awa 😊', 'emoji');
});

test('non-string returns null', () => {
  assertEq(sanitizeDisplayName(123), null, 'number');
  assertEq(sanitizeDisplayName(null), null, 'null');
  assertEq(sanitizeDisplayName(undefined), null, 'undefined');
});

// ── buildEligibleResults ────────────────────────────────────────────────────

console.log('\n── buildEligibleResults ──');

const mockResults = {
  big_five: { totalScore: 30, subscaleScores: { extraversion: 6 }, alertLevel: 0 },
  gad7: { totalScore: 10, alertLevel: 0 },
  rses: { totalScore: 28, alertLevel: 0 },
  phq9: { totalScore: 5, alertLevel: 0 },
  bonus_hsp: { totalScore: 20, alertLevel: 0 },
  pss10: { totalScore: 15, alertLevel: 3 },
};

test('auto scales included without opt-in', () => {
  const result = buildEligibleResults(mockResults, [], 'public');
  const ids = result.map(r => r.scaleId);
  assert(ids.includes('big_five'), 'big_five auto');
  assert(ids.includes('bonus_hsp'), 'bonus_hsp auto');
});

test('optin scales excluded when not opted in', () => {
  const result = buildEligibleResults(mockResults, [], 'public');
  const ids = result.map(r => r.scaleId);
  assert(!ids.includes('gad7'), 'gad7 not opted in');
  assert(!ids.includes('rses'), 'rses not opted in');
});

test('optin scales included when opted in', () => {
  const result = buildEligibleResults(mockResults, ['gad7', 'rses'], 'public');
  const ids = result.map(r => r.scaleId);
  assert(ids.includes('gad7'), 'gad7 opted in');
  assert(ids.includes('rses'), 'rses opted in');
});

test('interdit scales excluded even when opted in', () => {
  const result = buildEligibleResults(mockResults, ['phq9'], 'public');
  const ids = result.map(r => r.scaleId);
  assert(!ids.includes('phq9'), 'phq9 interdit');
});

test('alertLevel >= 3 excluded', () => {
  const result = buildEligibleResults(mockResults, ['pss10'], 'public');
  const ids = result.map(r => r.scaleId);
  assert(!ids.includes('pss10'), 'pss10 alert 3');
});

test('unknown scales excluded', () => {
  const results = { ...mockResults, unknown_scale: { totalScore: 5, alertLevel: 0 } };
  const result = buildEligibleResults(results, [], 'public');
  const ids = result.map(r => r.scaleId);
  assert(!ids.includes('unknown_scale'), 'unknown scale');
});

test('empty optinScales array works', () => {
  const result = buildEligibleResults(mockResults, null, 'public');
  assert(Array.isArray(result), 'returns array with null optinScales');
});

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
