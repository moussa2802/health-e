const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { DEFI_SCALE_CONFIG: SERVER_CONFIG } = require('./questionBank');

const clientPath = path.join(__dirname, '../../../src/config/defiConfig.ts');
const clientSource = fs.readFileSync(clientPath, 'utf-8');

function parseClientConfig(source) {
  const match = source.match(/DEFI_SCALE_CONFIG[^{]*\{([\s\S]*?)\n\};/);
  if (!match) throw new Error('Cannot parse client DEFI_SCALE_CONFIG');

  const config = {};
  const lineRe = /(\w+)\s*:\s*\{\s*public:\s*'(\w+)',\s*intime:\s*'(\w+)'/g;
  let m;
  while ((m = lineRe.exec(match[1])) !== null) {
    config[m[1]] = { public: m[2], intime: m[3] };
  }
  return config;
}

const CLIENT_CONFIG = parseClientConfig(clientSource);

describe('DEFI_SCALE_CONFIG sync', () => {
  it('every server scale exists in client config', () => {
    for (const scaleId of Object.keys(SERVER_CONFIG)) {
      assert.ok(
        CLIENT_CONFIG[scaleId],
        `Scale "${scaleId}" is in server config but missing from client defiConfig.ts`
      );
    }
  });

  it('server and client agree on public/intime levels for shared scales', () => {
    const mismatches = [];
    for (const [scaleId, serverCfg] of Object.entries(SERVER_CONFIG)) {
      const clientCfg = CLIENT_CONFIG[scaleId];
      if (!clientCfg) continue;

      if (serverCfg.public !== clientCfg.public) {
        mismatches.push(`${scaleId}.public: server=${serverCfg.public} client=${clientCfg.public}`);
      }
      if (serverCfg.intime !== clientCfg.intime) {
        mismatches.push(`${scaleId}.intime: server=${serverCfg.intime} client=${clientCfg.intime}`);
      }
    }
    assert.equal(mismatches.length, 0, `Config mismatches:\n  ${mismatches.join('\n  ')}`);
  });

  it('client may have additional interdit scales not in server (ok — server only keeps usable scales)', () => {
    const clientOnly = Object.keys(CLIENT_CONFIG).filter(k => !SERVER_CONFIG[k]);
    for (const scaleId of clientOnly) {
      assert.equal(
        CLIENT_CONFIG[scaleId].public, 'interdit',
        `Scale "${scaleId}" is in client but not server — must be interdit in public mode`
      );
    }
  });
});
