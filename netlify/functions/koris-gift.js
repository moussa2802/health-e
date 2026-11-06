/**
 * koris-gift — les étincelles offertes (connecté).
 *   POST { action: 'status' }          → { daily: { available, amount, streak, needed, lost, claimedToday }, referral: {…} }
 *                                         (compte aussi la présence du jour : la série de jours d'affilée)
 *   POST { action: 'daily' }           → { ok, credited, balance, streak } : le cadeau du jour, une fois par jour, après 3 jours d'affilée
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

const LEDGER = db.collection('korisReferrals');

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
      // La présence du jour (une écriture par jour au plus) : c'est elle qui fait la série
      const v = wallet ? G.visit(wallet, day) : null;
      if (v) await patientRef.update({ 'korisWallet.visitDay': v.visitDay, 'korisWallet.visitStreak': v.visitStreak, 'korisWallet.streakLostOn': v.streakLostOn }).catch(() => {});
      const profile = prof.exists ? prof.data() : {};
      const code = await ensureCode(uid, profile);
      const joined = await db.collection('userProfiles').where('referredBy', '==', code).count().get().then((c) => c.data().count).catch(() => 0);
      return reply(200, {
        daily: { available: G.canClaimDaily(wallet, day), amount: G.DAILY_GIFT, ...(wallet ? G.streakInfo(wallet, day) : { streak: 0, needed: G.STREAK_NEEDED, lost: false, claimedToday: false }) },
        referral: { code, link: `https://health-e.sn/?ref=${code}`, joined, rewarded: profile.referralRewardCount || 0, reward: G.REFERRAL_REWARD, cap: G.REFERRER_CAP },
      });
    }

    if (body.action === 'daily') {
      const out = await db.runTransaction(async (tx) => {
        const pat = await tx.get(patientRef);
        const wallet = pat.exists ? pat.data().korisWallet : null;
        if (!G.canClaimDaily(wallet, day)) return { ok: false, balance: wallet ? wallet.balance : 0, ...(wallet ? G.streakInfo(wallet, day) : {}) };
        const before = wallet.balance || 0;
        const v = G.visit(wallet, day) || {};
        tx.update(patientRef, {
          'korisWallet.balance': inc(G.DAILY_GIFT), 'korisWallet.lastDailyGift': day,
          ...(v.visitDay ? { 'korisWallet.visitDay': v.visitDay, 'korisWallet.visitStreak': v.visitStreak, 'korisWallet.streakLostOn': v.streakLostOn } : {}),
        });
        history(tx, uid, G.DAILY_GIFT, 'daily_gift', 'Cadeau du jour', before);
        tx.set(db.collection('stats').doc('koris'), { totalRefilled: inc(G.DAILY_GIFT), totalDailyGift: inc(G.DAILY_GIFT) }, { merge: true });
        return { ok: true, credited: G.DAILY_GIFT, balance: before + G.DAILY_GIFT, streak: G.streakInfo(wallet, day).streak };
      });
      return reply(200, out);
    }

    if (body.action === 'referral_reward') {
      const prof = await profileRef.get();
      const profile = prof.exists ? prof.data() : {};
      const state = G.referralState(profile, now);
      if (state !== 'ok') return reply(200, { ok: false, reason: state });
      // userProfiles est modifiable par son propriétaire : un code copié par un autre profil ne doit pas détourner la récompense
      const refSnap = await db.collection('userProfiles').where('referralCode', '==', profile.referredBy).limit(2).get();
      const referrerUid = refSnap.size === 1 ? refSnap.docs[0].id : null;
      if (referrerUid === uid) return reply(200, { ok: false, reason: 'self' });

      const out = await db.runTransaction(async (tx) => {
        const p = await tx.get(profileRef);
        if (G.referralState(p.exists ? p.data() : {}, now) !== 'ok') return { ok: false, reason: 'done' };
        // Registre tenu par le serveur seul (korisReferrals, illisible et non modifiable depuis le navigateur) :
        // effacer « referralRewardedAt » de son profil ne permet plus de toucher la récompense une 2e fois.
        const mineRef = LEDGER.doc(uid);
        const mine = await tx.get(mineRef);
        if (mine.exists && mine.data().rewardedAt) return { ok: false, reason: 'done' };
        const pat = await tx.get(patientRef);
        let refProfile = null; let refPat = null; let refLedger = null;
        if (referrerUid) {
          refProfile = await tx.get(db.collection('userProfiles').doc(referrerUid));
          refPat = await tx.get(db.collection('patients').doc(referrerUid));
          refLedger = await tx.get(LEDGER.doc(referrerUid));
        }
        const reward = G.REFERRAL_REWARD;
        tx.set(profileRef, { referralRewardedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        tx.set(mineRef, { rewardedAt: admin.firestore.FieldValue.serverTimestamp(), referrer: referrerUid || null }, { merge: true });
        if (pat.exists && pat.data().korisWallet) {
          const before = pat.data().korisWallet.balance || 0;
          tx.update(patientRef, { 'korisWallet.balance': inc(reward) });
          history(tx, uid, reward, 'referral', 'Bienvenue : tu as été invité par un proche', before);
        }
        // Plafond du parrain : on garde le plus grand des deux compteurs (celui du profil peut être remis à zéro par son propriétaire)
        const earned = Math.max((refLedger && refLedger.exists && refLedger.data().earnedCount) || 0, (refProfile && refProfile.exists && refProfile.data().referralRewardCount) || 0);
        const referrerEarns = referrerUid && refPat && refPat.exists && refPat.data().korisWallet && G.referrerCanEarn({ referralRewardCount: earned });
        if (referrerEarns) {
          const before = refPat.data().korisWallet.balance || 0;
          tx.update(refPat.ref, { 'korisWallet.balance': inc(reward) });
          tx.set(refProfile.ref, { referralRewardCount: earned + 1 }, { merge: true });
          tx.set(refLedger.ref, { earnedCount: earned + 1 }, { merge: true });
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
