import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDevice, guideFor } from '../../src/utils/pushGuide.ts';

const UA = {
  androidChrome: 'Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36',
  tiktokAndroid: 'Mozilla/5.0 (Linux; Android 12; TECNO KG5) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0 Mobile Safari/537.36 trill_310 BytedanceWebview/d8a21c6 musical_ly_2023',
  instaIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 325.0.0',
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1',
  iosOld: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
};

test('reconnaît le téléphone, le navigateur et les navigateurs intégrés', () => {
  assert.deepEqual(detectDevice(UA.androidChrome, false), { os: 'android', browser: 'chrome', inApp: null, iosVersion: null, standalone: false });
  assert.equal(detectDevice(UA.samsung, false).browser, 'samsung');
  assert.equal(detectDevice(UA.tiktokAndroid, false).inApp, 'tiktok');
  assert.equal(detectDevice(UA.instaIos, false).inApp, 'instagram');
  assert.equal(detectDevice(UA.iosSafari, false).iosVersion, 17.04);
  assert.equal(detectDevice(UA.iosChrome, false).browser, 'chrome');
});

test('le bon guide pour chaque cas', () => {
  assert.equal(guideFor(detectDevice(UA.tiktokAndroid, false), 'none').state, 'in_app');
  assert.equal(guideFor(detectDevice(UA.instaIos, false), 'none').action, 'copy_link');
  assert.equal(guideFor(detectDevice(UA.iosChrome, false), 'none').state, 'ios_open_safari');
  assert.equal(guideFor(detectDevice(UA.iosSafari, false), 'none').state, 'ios_install');
  assert.equal(guideFor(detectDevice(UA.iosSafari, true), 'default').state, 'ready');
  assert.equal(guideFor(detectDevice(UA.iosSafari, true), 'denied').state, 'denied');
  assert.equal(guideFor(detectDevice(UA.iosOld, false), 'none').state, 'ios_too_old');
  const a = guideFor(detectDevice(UA.androidChrome, false), 'default', true);
  assert.equal(a.state, 'ready');
  assert.equal(a.action, 'install');
  assert.match(guideFor(detectDevice(UA.samsung, false), 'denied').steps[0].text, /Sites et téléchargements/);
  assert.equal(guideFor(detectDevice(UA.androidChrome, false), 'none').state, 'unsupported');
});

import { isReminderRequest, mayPropose, shouldResume } from '../../src/utils/pushGuide.ts';

test('comprend une demande de rappels, sans faux positifs', () => {
  for (const t of ['active mes notifications', 'je reçois pas les notifs', 'Rappelle-moi chaque soir stp', 'tu peux me faire signe ?', 'fais-moi signe demain', 'comment activer les rappels', 'mes rappels marchent pas', 'préviens-moi quand il répond']) {
    assert.equal(isReminderRequest(t), true, t);
  }
  for (const t of ['ça me rappelle mon enfance', 'il me rappelle mon ex', 'le rappel du vaccin', 'je suis stressé', 'un rappel à l\'ordre de mon patron']) {
    assert.equal(isReminderRequest(t), false, t);
  }
});

test('ne propose pas les rappels trop souvent', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');
  assert.equal(mayPropose({ refused: 0, last: 0 }, now), true);
  assert.equal(mayPropose({ refused: 1, last: now - 3 * 864e5 }, now), false);
  assert.equal(mayPropose({ refused: 1, last: now - 8 * 864e5 }, now), true);
  assert.equal(mayPropose({ refused: 2, last: now - 30 * 864e5 }, now), false);
});

test('reprend l\'activation quand le téléphone a changé de situation', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');
  const pending = new Date(now - 864e5).toISOString();
  assert.equal(shouldResume({ on: false, setupPending: pending, setupFrom: 'in_app' }, 'ok', now), true);
  assert.equal(shouldResume({ on: false, setupPending: pending, setupFrom: 'in_app' }, 'ios_install', now), true);
  assert.equal(shouldResume({ on: false, setupPending: pending, setupFrom: 'ios_install' }, 'ios_install', now), false);
  assert.equal(shouldResume({ on: true, setupPending: pending, setupFrom: 'in_app' }, 'ok', now), false);
  assert.equal(shouldResume({ on: false, setupPending: new Date(now - 9 * 864e5).toISOString(), setupFrom: 'in_app' }, 'ok', now), false);
  assert.equal(shouldResume({ on: false, setupPending: null }, 'ok', now), false);
});
