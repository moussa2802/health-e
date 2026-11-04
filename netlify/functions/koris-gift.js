/**
 * koris-gift — les étincelles offertes (connecté).
 *   POST { action: 'status' }          → { daily: { available, amount }, referral: { code, link, joined, rewarded, reward, cap } }
 *   POST { action: 'daily' }           → { ok, credited, balance } : le cadeau du jour, une fois par jour
 *   POST { action: 'referral_reward' } → { ok, credited } : la personne invitée a fait son premier test →
 *                                         elle et son parrain reçoivent chacun REFERRAL_REWARD (parrain plafonné)
 * Tout se décide côté serveur, dans une transaction : jamais deux fois le même cadeau.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const G = require('./_korisGift');
const Q = require('./_drloQuestions');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const inc = (n) => admin.firestore.FieldValue.increment(n);

function history(tx, uid, amount, feature, details, before) {
  tx.set(db.collection('patients').doc(uid).collection('korisHistory').doc(), {
    type: 'bonus', amount, feature, details, balanceBefore: before, balanceAfter: before + amount,
    timestamp: new Date().toISOString(), serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function ensureCode(uid, profile) {
  if (profile.referralCode) return profile.referralCode;
  const code = Q.makeReferralCode();
  await db.collection('userProfiles').doc(uid).set({ referralCode: code }, { merge: true });
  return code;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  const uid = user.uid;
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Requête invalide' }); }
  const now = Date.now();
  const day = G.dakarDay(now);
  const patientRef = db.collection('patients').doc(uid);
  const profileRef = db.collection('userProfiles').doc(uid);

  try {
    if (body.action === 'status') {
      const [pat, prof] = await Promise.all([patientRef.get(), profileRef.get()]);
      const wallet = pat.exists ? pat.data().korisWallet : null;
      const profile = prof.exists ? prof.data() : {};
      const code = await ensureCode(uid, profile);
      const joined = await db.collection('userProfiles').where('referredBy', '==', code).count().get().then((c) => c.data().count).catch(() => 0);
      return reply(200, {
        daily: { available: G.canClaimDaily(wallet, day), amount: G.DAILY_GIFT },
        referral: { code, link: `https://health-e.sn/?ref=${code}`, joined, rewarded: profile.referralRewardCount || 0, reward: G.REFERRAL_REWARD, cap: G.REFERRER_CAP },
      });
    }

    if (body.action === 'daily') {
      const out = await db.runTransaction(async (tx) => {
        const pat = await tx.get(patientRef);
        const wallet = pat.exists ? pat.data().korisWallet : null;
        if (!G.canClaimDaily(wallet, day)) return { ok: false, balance: wallet ? wallet.balance : 0 };
        const before = wallet.balance || 0;
        tx.update(patientRef, { 'korisWallet.balance': inc(G.DAILY_GIFT), 'korisWallet.lastDailyGift': day });
        history(tx, uid, G.DAILY_GIFT, 'daily_gift', 'Cadeau du jour', before);
        tx.set(db.collection('stats').doc('koris'), { totalRefilled: inc(G.DAILY_GIFT), totalDailyGift: inc(G.DAILY_GIFT) }, { merge: true });
        return { ok: true, credited: G.DAILY_GIFT, balance: before + G.DAILY_GIFT };
      });
      return reply(200, out);
    }

    if (body.action === 'referral_reward') {
      const prof = await profileRef.get();
      const profile = prof.exists ? prof.data() : {};
      const state = G.referralState(profile, now);
      if (state !== 'ok') return reply(200, { ok: false, reason: state });
      const refSnap = await db.collection('userProfiles').where('referralCode', '==', profile.referredBy).limit(1).get();
      const referrerUid = refSnap.empty ? null : refSnap.docs[0].id;
      if (referrerUid === uid) return reply(200, { ok: false, reason: 'self' });

      const out = await db.runTransaction(async (tx) => {
        const p = await tx.get(profileRef);
        if (G.referralState(p.exists ? p.data() : {}, now) !== 'ok') return { ok: false, reason: 'done' };
        const pat = await tx.get(patientRef);
        let refProfile = null; let refPat = null;
        if (referrerUid) {
          refProfile = await tx.get(db.collection('userProfiles').doc(referrerUid));
          refPat = await tx.get(db.collection('patients').doc(referrerUid));
        }
        const reward = G.REFERRAL_REWARD;
        tx.set(profileRef, { referralRewardedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        if (pat.exists && pat.data().korisWallet) {
          const before = pat.data().korisWallet.balance || 0;
          tx.update(patientRef, { 'korisWallet.balance': inc(reward) });
          history(tx, uid, reward, 'referral', 'Bienvenue : tu as été invité par un proche', before);
        }
        const referrerEarns = referrerUid && refPat && refPat.exists && refPat.data().korisWallet && G.referrerCanEarn(refProfile && refProfile.data());
        if (referrerEarns) {
          const before = refPat.data().korisWallet.balance || 0;
          tx.update(refPat.ref, { 'korisWallet.balance': inc(reward) });
          tx.set(refProfile.ref, { referralRewardCount: inc(1) }, { merge: true });
          history(tx, referrerUid, reward, 'referral', 'Un proche que tu as invité a fait son premier test', before);
        }
        tx.set(db.collection('stats').doc('koris'), { totalRefilled: inc(reward + (referrerEarns ? reward : 0)), referrals: inc(1) }, { merge: true });
        return { ok: true, credited: reward };
      });
      return reply(200, out);
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (err) {
    console.error('koris-gift error:', err);
    return reply(500, { error: 'Erreur serveur' });
  }
};
