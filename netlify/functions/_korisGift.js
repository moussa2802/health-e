/**
 * _korisGift — les étincelles offertes (logique pure, testée).
 *   - le cadeau du jour : quelques étincelles, une fois par jour (heure de Dakar = UTC) ;
 *   - le parrainage : quand une personne invitée fait son premier test, elle et son parrain en reçoivent chacun.
 * Les montants se règlent ici (ou par variables d'environnement), sans toucher au reste.
 */
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : d; };

const DAILY_GIFT = num(process.env.KORIS_DAILY_GIFT, 3);
const REFERRAL_REWARD = num(process.env.KORIS_REFERRAL_REWARD, 10);
/** Un parrain ne gagne pas plus que ça au total (anti-abus : comptes créés en série). */
const REFERRER_CAP = num(process.env.KORIS_REFERRER_CAP, 20);
/** L'invitation doit être utilisée par un compte récent. */
const REFERRAL_WINDOW_DAYS = 14;

/** Le jour à Dakar (UTC+0, sans heure d'été). */
function dakarDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function canClaimDaily(wallet, day) {
  if (!wallet || DAILY_GIFT <= 0) return false;
  return wallet.lastDailyGift !== day;
}

const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : v ? Date.parse(v) || 0 : 0);

/**
 * La personne invitée peut-elle déclencher la récompense ?
 * → 'ok' | 'no_ref' | 'done' | 'no_test' | 'too_old'
 */
function referralState(profile, now = Date.now()) {
  const p = profile || {};
  if (!p.referredBy) return 'no_ref';
  if (p.referralRewardedAt) return 'done';
  if (Object.keys(p.scaleResults || {}).length === 0) return 'no_test';
  const created = ms(p.createdAt);
  if (created && now - created > REFERRAL_WINDOW_DAYS * 86400000) return 'too_old';
  return 'ok';
}

/** Le parrain peut-il encore gagner ? (la personne invitée gagne quoi qu'il arrive) */
function referrerCanEarn(referrerProfile) {
  return ((referrerProfile && referrerProfile.referralRewardCount) || 0) < REFERRER_CAP;
}

module.exports = { DAILY_GIFT, REFERRAL_REWARD, REFERRER_CAP, REFERRAL_WINDOW_DAYS, dakarDay, canClaimDaily, referralState, referrerCanEarn };
