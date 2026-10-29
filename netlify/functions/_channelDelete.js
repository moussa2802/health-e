/**
 * _channelDelete.js — suppression définitive d'une chaîne et de tout ce qui lui appartient.
 * Ordre : vues et réactions → commentaires → publications → membres → fichiers (photo, vocaux) → la chaîne.
 * `db` et `bucket` sont injectés (testé avec de faux services). Chaque collection est vidée par lots de 400.
 */
async function drain(db, query) {
  let n = 0;
  for (let i = 0; i < 50; i++) {
    const snap = await query().limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    n += snap.size;
    if (snap.size < 400) break;
  }
  return n;
}

async function deleteChannel(db, bucket, id) {
  const posts = await db.collection('channelPosts').where('channelId', '==', id).get();
  const counts = { views: 0, comments: 0, posts: 0, members: 0 };
  for (const p of posts.docs) counts.views += await drain(db, () => db.collection('channelPostViews').where('postId', '==', p.id));
  counts.comments = await drain(db, () => db.collection('channelComments').where('channelId', '==', id));
  counts.posts = await drain(db, () => db.collection('channelPosts').where('channelId', '==', id));
  counts.members = await drain(db, () => db.collection('channelMembers').where('channelId', '==', id));
  await bucket.deleteFiles({ prefix: `channels/${id}/` }).catch(() => {});
  await db.collection('channels').doc(id).delete();
  return counts;
}

module.exports = { deleteChannel, drain };
