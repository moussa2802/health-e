const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../_homeFeed');

test('cleanFeatured : vide = on retire, id invalide refusé, accroche limitée', () => {
  assert.deepEqual(H.cleanFeatured({ scaleId: null }), { featured: null });
  assert.deepEqual(H.cleanFeatured({ scaleId: '' }), { featured: null });
  assert.ok(H.cleanFeatured({ scaleId: 'Bad Id!' }).error);
  assert.deepEqual(H.cleanFeatured({ scaleId: 'bonus_hsp', label: '  Es-tu   hypersensible ? ' }), { featured: { scaleId: 'bonus_hsp', label: 'Es-tu hypersensible ?' } });
  assert.ok(H.cleanFeatured({ scaleId: 'gad7', label: 'x'.repeat(61) }).error);
});

test('latestPosts : seulement les aperçus publiés, avec un texte, les plus récents d\'abord', () => {
  const ch = { c1: { name: 'Couple' } };
  const posts = [
    { id: 'a', channelId: 'c1', status: 'published', preview: true, title: 'Aimer sans se perdre', audio: { durationSec: 90 }, createdAt: 100 },
    { id: 'b', channelId: 'c1', status: 'published', preview: false, title: 'Réservé', createdAt: 300 },
    { id: 'c', channelId: 'c1', status: 'draft', preview: true, title: 'Brouillon', createdAt: 400 },
    { id: 'd', channelId: 'zz', status: 'published', preview: true, title: 'Chaîne inconnue', createdAt: 500 },
    { id: 'e', channelId: 'c1', status: 'published', preview: true, text: '  Un texte   court ', createdAt: 200 },
    { id: 'f', channelId: 'c1', status: 'published', preview: true, createdAt: 600 },
  ];
  const out = H.latestPosts(posts, ch);
  assert.deepEqual(out.map((p) => p.id), ['e', 'a']);
  assert.equal(out[0].title, 'Un texte court');
  assert.equal(out[1].hasAudio, true);
  assert.equal(out[1].audioSec, 90);
  assert.equal(out[1].channelName, 'Couple');
});

test('publicChannels : pas d\'archivées, pas de conditions, tri par membres', () => {
  const rows = [
    { id: 'a', c: { name: 'A', memberCount: 5, categories: [], photoPath: 'x.jpg', rules: { minAge: 18 }, price: 3 } },
    { id: 'b', c: { name: 'B', memberCount: 9, categories: [] } },
    { id: 'c', c: { name: 'C', memberCount: 50, status: 'archived' } },
  ];
  const out = H.publicChannels(rows);
  assert.deepEqual(out.map((c) => c.id), ['b', 'a']);
  assert.equal(out[1].imageUrl, '/.netlify/functions/channel-share?id=a&img=1');
  assert.equal(out[0].imageUrl, null);
  assert.equal('rules' in out[0], false);
  assert.equal('price' in out[0], false);
});

test('latestTools : publiés seulement, récents d\'abord, limités', () => {
  const rows = [
    { id: '1', p: { status: 'published', title: 'Ancrage', minutes: 3, createdAt: 10 } },
    { id: '2', p: { status: 'draft', title: 'Brouillon', createdAt: 99 } },
    { id: '3', p: { status: 'published', title: 'Respiration 4-6', minutes: 2, createdAt: 20 } },
  ];
  assert.deepEqual(H.latestTools(rows).map((t) => t.id), ['3', '1']);
  assert.equal(H.latestTools(rows, 1).length, 1);
});
