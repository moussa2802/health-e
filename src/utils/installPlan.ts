/**
 * installPlan — le mode d'emploi « Ajouter Health-e à l'écran d'accueil » adapté au téléphone (logique pure, testée).
 * Utilisé par components/InstallPrompt.tsx.
 */
import type { Device, GuideVisual } from './pushGuide';

const APP: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', snapchat: 'Snapchat' };

export interface Plan { title: string; intro: string; steps: { title: string; text: string; visual?: GuideVisual }[]; action: 'install' | 'copy' | null }

/** Le mode d'emploi adapté à ce téléphone (null : rien à proposer). */
export function installPlan(d: Device, installable: boolean): Plan | null {
  if (d.standalone || d.os === 'desktop') return null;
  const intro = 'Une icône sur ton écran, comme une appli : tu ouvres Health-e en un geste, en plein écran, et tu peux recevoir ton mot du jour.';
  if (d.inApp) {
    const app = APP[d.inApp] || 'cette appli';
    return {
      title: 'Ajoute Health-e à ton écran d\'accueil', intro, action: 'copy',
      steps: [
        { title: `Tu es dans le navigateur de ${app}`, visual: 'inapp_menu', text: d.os === 'ios' ? `Touche « … » en haut, puis « Ouvrir dans Safari ».` : `Touche « ⋮ » en haut, puis « Ouvrir dans le navigateur » (Chrome).` },
        { title: 'Ou copie le lien', text: d.os === 'ios' ? 'Et colle-le dans Safari (la boussole bleue).' : 'Et colle-le dans Chrome.' },
        { title: 'Là-bas, ajoute-le à l\'écran d\'accueil', text: 'Cette petite fenêtre te montrera comment.' },
      ],
    };
  }
  if (d.os === 'ios') {
    if (d.browser !== 'safari') {
      return {
        title: 'Ajoute Health-e à ton écran d\'accueil', intro, action: 'copy',
        steps: [
          { title: 'Sur iPhone, ça passe par Safari', text: 'Copie le lien et colle-le dans Safari (la boussole bleue).' },
          { title: 'Puis touche le bouton Partager', visual: 'ios_share', text: 'Le carré avec une flèche vers le haut, en bas de Safari.' },
          { title: '« Sur l\'écran d\'accueil », puis « Ajouter »', visual: 'ios_add_home', text: 'Fais défiler la liste si tu ne le vois pas.' },
        ],
      };
    }
    return {
      title: 'Ajoute Health-e à ton écran d\'accueil', intro, action: null,
      steps: [
        { title: 'Touche le bouton Partager', visual: 'ios_share', text: 'En bas de Safari : le carré avec une flèche vers le haut.' },
        { title: '« Sur l\'écran d\'accueil »', visual: 'ios_add_home', text: 'Fais défiler la liste si tu ne le vois pas, puis touche « Ajouter ».' },
        { title: 'C\'est fait', visual: 'ios_home_icon', text: 'L\'icône Health-e est sur ton écran. Ouvre-le depuis là, ton compte t\'attend.' },
      ],
    };
  }
  if (installable) {
    return { title: 'Installe Health-e sur ton téléphone', intro, action: 'install', steps: [] };
  }
  return {
    title: 'Ajoute Health-e à ton écran d\'accueil', intro, action: null,
    steps: [
      { title: d.browser === 'samsung' ? 'Touche le menu ☰ en bas' : 'Touche le menu ⋮ en haut à droite', text: 'Le menu de ton navigateur.' },
      { title: '« Ajouter à l\'écran d\'accueil »', text: 'Ou « Installer l\'application ». Puis confirme.' },
    ],
  };
}

