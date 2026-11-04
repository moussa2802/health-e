/** Le point de la semaine déjà ouvert cette semaine (sur l'appareil) : la carte « Lire » ne s'impose plus. */
const KEY = 'he_point_seen';
export const pointSeenWeek = (): string => { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } };
export const markPointSeen = (week: string): void => { try { localStorage.setItem(KEY, week); } catch { /* ignore */ } };
