import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installPlan } from '../../src/utils/installPlan.ts';
import { detectDevice } from '../../src/utils/pushGuide.ts';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const TIKTOK = `${ANDROID} musical_ly_2023`;

test('installation : le bon mode d\'emploi selon le téléphone', () => {
  assert.equal(installPlan(detectDevice(IPHONE_SAFARI, false), false)?.steps[0].visual, 'ios_share');
  assert.equal(installPlan(detectDevice(IPHONE_CHROME, false), false)?.action, 'copy');
  assert.equal(installPlan(detectDevice(ANDROID, false), true)?.action, 'install');
  assert.equal(installPlan(detectDevice(ANDROID, false), false)?.steps.length, 2);
  assert.equal(installPlan(detectDevice(TIKTOK, false), true)?.action, 'copy');
  assert.equal(installPlan(detectDevice(IPHONE_SAFARI, true), false), null); // déjà ouvert depuis l'icône
  assert.equal(installPlan(detectDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/120', false), true), null); // ordinateur
});
