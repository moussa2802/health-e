/**
 * pushGuide.ts — reconnaître le téléphone et le navigateur, et dire pas à pas comment activer
 * les rappels de Dr Lô (logique pure, testée dans tests/unit/pushGuide.test.ts).
 *
 * Cas fréquents chez nous : on arrive depuis TikTok, Instagram ou WhatsApp (navigateur intégré,
 * où les notifications sont impossibles), sur Android (Chrome, Samsung Internet) ou sur iPhone
 * (où il faut d'abord ajouter Health-e à l'écran d'accueil, iOS 16.4 et plus).
 */

export type Os = 'ios' | 'android' | 'desktop';
export type Browser = 'safari' | 'chrome' | 'samsung' | 'firefox' | 'edge' | 'other';
export type InApp = 'tiktok' | 'instagram' | 'facebook' | 'whatsapp' | 'snapchat' | null;

export interface Device {
  os: Os;
  browser: Browser;
  inApp: InApp;
  iosVersion: number | null;
  standalone: boolean;
}

export function detectDevice(ua: string, standalone: boolean, maxTouchPoints = 0): Device {
  const u = ua || '';
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile
  const ios = /iphone|ipad|ipod/i.test(u) || (/Macintosh/.test(u) && maxTouchPoints > 1);
  const android = /android/i.test(u);
  const inApp: InApp = /musical_ly|BytedanceWebview|TikTok/i.test(u) ? 'tiktok'
    : /Instagram/i.test(u) ? 'instagram'
    : /FBAN|FBAV|FB_IAB|FBIOS/i.test(u) ? 'facebook'
    : /WhatsApp/i.test(u) ? 'whatsapp'
    : /Snapchat/i.test(u) ? 'snapchat'
    : null;
  const browser: Browser = /SamsungBrowser/i.test(u) ? 'samsung'
    : /EdgA?\/|EdgiOS/i.test(u) ? 'edge'
    : /FxiOS|Firefox/i.test(u) ? 'firefox'
    : /CriOS|Chrome\//i.test(u) ? 'chrome'
    : /Safari/i.test(u) ? 'safari'
    : 'other';
  const m = u.match(/OS (\d+)[_.](\d+)/);
  const iosVersion = ios && m ? Number(m[1]) + Number(m[2]) / 100 : null;
  return { os: ios ? 'ios' : android ? 'android' : 'desktop', browser, inApp, iosVersion, standalone };
}

export type GuideState =
  | 'ready'            // on peut demander l'autorisation tout de suite
  | 'in_app'           // navigateur de TikTok, Instagram… : ouvrir dans le vrai navigateur
  | 'ios_open_safari'  // iPhone, mais pas dans Safari : ouvrir dans Safari
  | 'ios_install'      // iPhone dans Safari : ajouter à l'écran d'accueil d'abord
  | 'ios_too_old'      // iPhone avant iOS 16.4 : pas de notifications web
  | 'denied'           // la personne a bloqué les notifications : les débloquer
  | 'unsupported';     // navigateur sans notifications

/** Petit dessin du bouton à toucher, affiché sous l'étape (dessins génériques, pas de capture ni de logo). */
export type GuideVisual =
  | 'inapp_menu' | 'inapp_open'
  | 'ios_share' | 'ios_add_home' | 'ios_home_icon' | 'ios_settings'
  | 'android_lock' | 'allow_dialog';

export interface GuideStep { title: string; text: string; visual?: GuideVisual }

export interface Guide {
  state: GuideState;
  title: string;
  steps: GuideStep[];
  /** Bouton d'action proposé sur ce cas */
  action: 'activate' | 'copy_link' | 'install' | null;
}

const APP_NAMES: Record<NonNullable<InApp>, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', snapchat: 'Snapchat',
};

export function guideFor(d: Device, permission: 'default' | 'granted' | 'denied' | 'none', canInstall = false): Guide {
  if (d.inApp) {
    const app = APP_NAMES[d.inApp];
    return {
      state: 'in_app',
      title: `Tu es dans le navigateur de ${app}`,
      action: 'copy_link',
      steps: [
        { title: 'Ouvre Health-e dans ton vrai navigateur', visual: 'inapp_menu', text: d.os === 'ios'
          ? `Touche les trois points « … » de ${app}, puis « Ouvrir dans Safari » (ou « Ouvrir dans le navigateur »).`
          : `Touche les trois points « ⋮ » de ${app}, puis « Ouvrir dans le navigateur » (ou « Ouvrir dans Chrome »).` },
        { title: 'Choisis « Ouvrir dans le navigateur »', visual: 'inapp_open', text: 'Le nom peut changer un peu selon l\'appli : « Ouvrir dans Safari », « Ouvrir dans Chrome »…' },
        { title: 'Ou copie le lien', text: 'Copie le lien ci-dessous et colle-le dans Chrome ou Safari. Ton espace t\'y attend : connecte-toi avec le même compte.' },
        { title: 'On reprend de l\'autre côté', text: 'Connecte-toi avec le même compte : je reprends là où on en était pour terminer.' },
      ],
    };
  }
  if (d.os === 'ios') {
    if (d.iosVersion !== null && d.iosVersion < 16.4) {
      return {
        state: 'ios_too_old', title: 'Ton iPhone ne permet pas encore les rappels', action: null,
        steps: [{ title: 'Mets à jour ton iPhone', text: 'Les notifications des sites demandent iOS 16.4 ou plus récent (Réglages → Général → Mise à jour logicielle). En attendant, tout ce qui t\'attend reste dans la cloche.' }],
      };
    }
    if (!d.standalone && d.browser !== 'safari') {
      return {
        state: 'ios_open_safari', title: 'Sur iPhone, ça passe par Safari', action: 'copy_link',
        steps: [
          { title: 'Ouvre Health-e dans Safari', text: 'Copie le lien ci-dessous et colle-le dans Safari (la boussole bleue).' },
          { title: 'Ajoute-le à ton écran d\'accueil', visual: 'ios_share', text: 'Dans Safari, touche le bouton Partager (le carré avec une flèche vers le haut), puis « Sur l\'écran d\'accueil », puis « Ajouter ».' },
          { title: 'Ouvre Health-e depuis cette icône', visual: 'ios_home_icon', text: 'Connecte-toi : je reprends là où on en était, et l\'iPhone te demandera d\'autoriser. Touche « Autoriser ».' },
        ],
      };
    }
    if (!d.standalone) {
      return {
        state: 'ios_install', title: 'Sur iPhone : 3 gestes, une seule fois', action: null,
        steps: [
          { title: 'Touche le bouton Partager', visual: 'ios_share', text: 'En bas de Safari : le carré avec une flèche vers le haut.' },
          { title: '« Sur l\'écran d\'accueil », puis « Ajouter »', visual: 'ios_add_home', text: 'Fais défiler la liste si tu ne le vois pas. Une icône Health-e apparaît sur ton écran, comme une appli.' },
          { title: 'Ouvre Health-e depuis cette icône', visual: 'ios_home_icon', text: 'Connecte-toi si besoin : je reprends là où on en était, et l\'iPhone te demandera d\'autoriser. Touche « Autoriser ».' },
        ],
      };
    }
    if (permission === 'denied') {
      return {
        state: 'denied', title: 'Les notifications sont bloquées', action: null,
        steps: [
          { title: 'Ouvre les Réglages de l\'iPhone', visual: 'ios_settings', text: 'Réglages → Notifications → Health-e.' },
          { title: 'Active « Autoriser les notifications »', text: 'Puis rouvre Health-e : je reprends là où on en était pour terminer.' },
        ],
      };
    }
  }
  if (permission === 'none') {
    return {
      state: 'unsupported', title: 'Ce navigateur ne permet pas les notifications', action: 'copy_link',
      steps: [{ title: 'Essaie avec Chrome', text: d.os === 'android' ? 'Ouvre Health-e dans Chrome (copie le lien ci-dessous), connecte-toi, puis active les rappels dans la cloche.' : 'Tout ce qui t\'attend reste visible dans la cloche, en haut de l\'accueil.' }],
    };
  }
  if (permission === 'denied') {
    const where = d.browser === 'samsung'
      ? 'Menu ☰ → Paramètres → Sites et téléchargements → Notifications → health-e.sn → Autoriser.'
      : d.os === 'android'
        ? 'Touche le petit cadenas (ou ⓘ) à gauche de l\'adresse → Autorisations → Notifications → Autoriser. Ou : Chrome ⋮ → Paramètres → Paramètres des sites → Notifications → health-e.sn.'
        : 'Clique sur le cadenas à gauche de l\'adresse → Notifications → Autoriser.';
    return {
      state: 'denied', title: 'Les notifications sont bloquées pour Health-e', action: null,
      steps: [
        { title: 'Débloque-les dans ton navigateur', text: where, ...(d.os === 'android' && d.browser !== 'samsung' ? { visual: 'android_lock' as const } : {}) },
        { title: 'Recharge la page', text: 'Je reprends là où on en était pour terminer.' },
      ],
    };
  }
  const steps: GuideStep[] = [];
  if (d.os === 'android' && !d.standalone && canInstall) {
    steps.push({ title: 'Conseillé : installe Health-e', text: 'Une icône sur ton écran, comme une appli. Les rappels arrivent plus sûrement. (Facultatif.)' });
  }
  steps.push({ title: 'Touche « Activer »', visual: 'allow_dialog', text: 'Ton téléphone va te demander : touche « Autoriser ».' });
  steps.push({ title: 'Vérifie avec un essai', text: 'Touche « M\'envoyer un essai » : une notification de Health-e doit arriver dans les secondes qui suivent.' });
  return { state: 'ready', title: 'Activer les rappels sur ce téléphone', action: canInstall && d.os === 'android' && !d.standalone ? 'install' : 'activate', steps };
}

// ── Dr Lô propose les rappels dans la conversation ──────────────────────────

/**
 * La personne parle des rappels / notifications (« active mes notifs », « rappelle-moi chaque soir »,
 * « je ne reçois pas les notifications »…). Volontairement prudent : « ça me rappelle… » ou
 * « un rappel de vaccin » ne comptent pas.
 */
export function isReminderRequest(text: string): boolean {
  const t = (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
  if (/\bnotif(ication)?s?\b/.test(t)) return true;
  if (/\b(rappelle|previens|previene|alerte)[- ]?(moi|nous)\b/.test(t)) return true;
  if (/\b(fai[st]?[- ]moi|me faire|me fais) signe\b/.test(t)) return true;
  if (/\brappels?\b/.test(t) && /\b(activ\w*|desactiv\w*|mettre|met|mets|recevoir|recoi\w*|regl\w*|chaque|tous les|quotidien\w*|du jour|dr lo|health-?e|telephone|portable|marchent?|fonctionnent?|arrivent?|mes|ses)\b/.test(t) && !/\bvaccin\w*\b/.test(t)) return true;
  return false;
}

/** Combien de fois Dr Lô a proposé les rappels, et combien de « non ». */
export interface AskLog { refused: number; last: number }

/**
 * Proposer les rappels de lui-même ? Jamais plus d'une fois par semaine, et plus jamais après
 * deux refus. (Quand la personne le demande elle-même, ce frein ne s'applique pas.)
 */
export function mayPropose(log: AskLog, now: number): boolean {
  if (log.refused >= 2) return false;
  return !log.last || now - log.last >= 7 * 864e5;
}

/**
 * La personne avait commencé à activer les rappels (guide affiché) sur un autre navigateur ou
 * avant d'ajouter Health-e à l'écran d'accueil : faut-il reprendre là où elle s'était arrêtée ?
 * Oui si c'est récent (7 jours), pas encore activé, et si la situation du téléphone a changé
 * (ex. ouvert dans Chrome au lieu de TikTok, ou depuis l'icône de l'écran d'accueil).
 */
export function shouldResume(
  prefs: { on?: boolean; setupPending?: string | null; setupFrom?: string | null },
  support: string,
  now: number,
): boolean {
  if (prefs.on || !prefs.setupPending) return false;
  const at = Date.parse(prefs.setupPending);
  if (!at || now - at > 7 * 864e5) return false;
  if (support === 'unsupported') return false;
  return support !== prefs.setupFrom;
}
