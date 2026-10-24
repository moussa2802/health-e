/**
 * GuideVisuals — petits dessins des boutons à toucher, pour le guide des rappels.
 * Dessins génériques (pas de capture d'écran, pas de logo de marque), légers, aux couleurs du site.
 * Le bouton à toucher est entouré d'un halo qui pulse (immobile si « réduire les animations »).
 */
import React from 'react';
import type { GuideVisual, Os } from '../../utils/pushGuide';

const C = { text: '#F4EEE4', soft: '#DCD3C5', faint: '#A79E90', accent: '#F2B66D', line: 'rgba(255,255,255,.14)' };

const frame: React.CSSProperties = {
  marginTop: 10, borderRadius: 14, background: '#0F0D0B', border: `1px solid ${C.line}`, padding: 10,
  display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 300, boxSizing: 'border-box', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
};

/** Le halo « c'est ici » autour du bouton à toucher. */
const Target: React.FC<{ children: React.ReactNode; round?: boolean }> = ({ children, round }) => (
  <span className="drl-guide-target" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: round ? '50%' : 10, outline: `2px solid ${C.accent}`, outlineOffset: 3 }}>
    {children}
  </span>
);

const Icon = {
  share: (c = C.text) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" /></svg>
  ),
  plusSquare: (c = C.text) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" /></svg>
  ),
  lock: (c = C.text) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  ),
  chevron: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>,
  back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>,
  fwd: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>,
  book: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2" strokeLinecap="round"><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" /></svg>,
  tabs: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2"><rect x="4" y="7" width="12" height="12" rx="2" /><path d="M8 4h10a2 2 0 0 1 2 2v10" /></svg>,
  copy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>,
  compass: (c = C.text) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>,
  bell: (c = C.text) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /></svg>,
};

const Row: React.FC<{ icon?: React.ReactNode; label: string; hot?: boolean; right?: React.ReactNode }> = ({ icon, label, hot, right }) => {
  const inner = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 10, background: hot ? 'rgba(242,182,109,.14)' : 'rgba(255,255,255,.04)', fontSize: 12.5, fontWeight: hot ? 700 : 500, color: hot ? C.text : C.faint }}>
      <span style={{ flex: 1 }}>{label}</span>
      {right}
      {icon}
    </span>
  );
  return hot ? <span className="drl-guide-target" style={{ display: 'flex', borderRadius: 10, outline: `2px solid ${C.accent}`, outlineOffset: 2 }}>{inner}</span> : inner;
};

export const GuideVisualView: React.FC<{ visual: GuideVisual; os: Os }> = ({ visual, os }) => {
  switch (visual) {
    // Barre d'un navigateur intégré (TikTok, Instagram…) : les trois points en haut à droite
    case 'inapp_menu':
      return (
        <div aria-hidden="true" style={frame}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 10, background: 'rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 16, color: C.faint }}>✕</span>
            <span style={{ flex: 1, fontSize: 12.5, color: C.soft, textAlign: 'center' }}>health-e.sn</span>
            <Target round><span style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: C.text }}>{os === 'ios' ? '…' : '⋮'}</span></Target>
          </div>
          <span style={{ fontSize: 11, color: C.faint, textAlign: 'right', paddingRight: 4 }}>en haut à droite</span>
        </div>
      );
    case 'inapp_open':
      return (
        <div aria-hidden="true" style={frame}>
          <Row label="Copier le lien" icon={Icon.copy} />
          <Row label={os === 'ios' ? 'Ouvrir dans Safari' : 'Ouvrir dans le navigateur'} hot icon={Icon.compass(C.accent)} />
          <Row label="Signaler" />
        </div>
      );
    // Barre du bas de Safari : le bouton Partager au centre
    case 'ios_share':
      return (
        <div aria-hidden="true" style={frame}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 4px', borderRadius: 10, background: 'rgba(255,255,255,.06)' }}>
            {Icon.back}{Icon.fwd}
            <Target><span style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.share(C.accent)}</span></Target>
            {Icon.book}{Icon.tabs}
          </div>
          <span style={{ fontSize: 11, color: C.faint, textAlign: 'center' }}>en bas de l'écran, au milieu</span>
        </div>
      );
    case 'ios_add_home':
      return (
        <div aria-hidden="true" style={frame}>
          <Row label="Copier" icon={Icon.copy} />
          <Row label="Ajouter aux favoris" icon={Icon.book} />
          <Row label="Sur l'écran d'accueil" hot icon={Icon.plusSquare(C.accent)} />
          <span style={{ fontSize: 11, color: C.faint, textAlign: 'center' }}>fais défiler si tu ne le vois pas, puis « Ajouter »</span>
        </div>
      );
    // Écran d'accueil de l'iPhone : l'icône Health-e parmi les autres
    case 'ios_home_icon':
      return (
        <div aria-hidden="true" style={{ ...frame, alignItems: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 44px)', gap: 12, padding: 6 }}>
            {Array.from({ length: 7 }).map((_, i) => <span key={i} style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(255,255,255,.08)' }} />)}
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Target><img src="/icons/icon-192.png" alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 11, display: 'block' }} /></Target>
              <span style={{ fontSize: 10, color: C.text }}>Health-e</span>
            </span>
          </div>
        </div>
      );
    case 'ios_settings':
      return (
        <div aria-hidden="true" style={frame}>
          <span style={{ fontSize: 11, color: C.faint }}>Réglages › Notifications › Health-e</span>
          <Row label="Autoriser les notifications" hot right={<span style={{ width: 34, height: 20, borderRadius: 999, background: '#5FC07A', position: 'relative', display: 'inline-block' }}><span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} /></span>} />
        </div>
      );
    // Barre d'adresse de Chrome : le petit cadenas à gauche
    case 'android_lock':
      return (
        <div aria-hidden="true" style={frame}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 999, background: 'rgba(255,255,255,.06)' }}>
            <Target round><span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.lock(C.accent)}</span></Target>
            <span style={{ flex: 1, fontSize: 12.5, color: C.soft }}>health-e.sn</span>
            <span style={{ fontSize: 16, color: C.faint, fontWeight: 700 }}>⋮</span>
          </div>
          <Row label="Autorisations › Notifications › Autoriser" hot icon={Icon.bell(C.accent)} />
        </div>
      );
    // La fenêtre du téléphone qui demande l'autorisation
    case 'allow_dialog':
      return (
        <div aria-hidden="true" style={{ ...frame, gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.soft, lineHeight: 1.4 }}>
            {Icon.bell(C.faint)}
            {os === 'ios' ? '« Health-e » souhaite vous envoyer des notifications' : 'health-e.sn veut afficher des notifications'}
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 10, background: 'rgba(255,255,255,.05)', fontSize: 12.5, color: C.faint }}>{os === 'ios' ? 'Refuser' : 'Bloquer'}</span>
            <span className="drl-guide-target" style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 10, background: 'rgba(242,182,109,.18)', outline: `2px solid ${C.accent}`, outlineOffset: 2, fontSize: 12.5, fontWeight: 700, color: C.text }}>Autoriser</span>
          </span>
        </div>
      );
    default:
      return null;
  }
};
