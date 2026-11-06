/**
 * _korisGift — les étincelles offertes (logique pure, testée).
 *   - le cadeau du jour : quelques étincelles, une fois par jour (heure de Dakar = UTC), SEULEMENT pour une
 *     présence régulière : il faut être venu STREAK_NEEDED jours d'affilée. Un jour sauté remet la série à 1 ;
 *   - le parrainage : quand une personne invitée fait son premier test, elle et son parrain en reçoivent chacun.
 * Les montants se règlent ici (ou par variables d'environnement), sans toucher au reste.
 */
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : d; };

const DAILY_GIFT = num(process.env.KORIS_DAILY_GIFT, 3);
/** Jours d'affilée nécessaires pour (re)débloquer le cadeau du jour. */
const STREAK_NEEDED = Math.max(1, num(process.env.KORIS_DAILY_STREAK, 3));
const REFERRAL_REWARD = num(process.env.KORIS_REFERRAL_REWARD, 10);
/** Un parrain ne gagne pas plus que ça au total (anti-abus : comptes créés en série). */
const REFERRER_CAP = num(process.env.KORIS_REFERRER_CAP, 20);
/** L'invitation doit être utilisée par un compte récent. */
const REFERRAL_WINDOW_DAYS = 14;

/** Le jour à Dakar (UTC+0, sans heure d'été). */
function dakarDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

/** La veille d'un jour AAAA-MM-JJ. */
function previousDay(day) {
  return new Date(Date.parse(`${day}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
}

/**
 * La présence du jour : { visitDay, visitStreak, streakLostOn } à écrire dans le portefeuille,
 * ou null si rien ne change (déjà compté aujourd'hui).
 *   - venue hier → la série continue (+1) ;
 *   - un jour sauté (ou première fois) → la série repart à 1 ; si elle avait débloqué le cadeau, on le note (streakLostOn).
 */
function visit(wallet, day) {
  const w = wallet || {};
  if (w.visitDay === day) return null;
  const prev = w.visitStreak || 0;
  if (w.visitDay === previousDay(day)) return { visitDay: day, visitStreak: prev + 1, streakLostOn: w.streakLostOn || null };
  return { visitDay: day, visitStreak: 1, streakLostOn: prev >= STREAK_NEEDED ? day : null };
}

/** Le portefeuille tel qu'il sera après la visite du jour. */
const afterVisit = (wallet, day) => ({ ...(wallet || {}), ...(visit(wallet, day) || {}) });

/** Cadeau disponible : pas encore pris aujourd'hui, et une série d'au moins STREAK_NEEDED jours (visite du jour comprise). */
function canClaimDaily(wallet, day) {
  if (!wallet || DAILY_GIFT <= 0) return false;
  const w = afterVisit(wallet, day);
  return w.lastDailyGift !== day && (w.visitStreak || 0) >= STREAK_NEEDED;
}

/** Ce que l'accueil affiche : où en est la série. */
function streakInfo(wallet, day) {
  const w = afterVisit(wallet, day);
  return { streak: w.visitStreak || 0, needed: STREAK_NEEDED, lost: w.streakLostOn === day, claimedToday: w.lastDailyGift === day };
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

module.exports = { DAILY_GIFT, STREAK_NEEDED, REFERRAL_REWARD, REFERRER_CAP, REFERRAL_WINDOW_DAYS, dakarDay, previousDay, visit, canClaimDaily, streakInfo, referralState, referrerCanEarn };
