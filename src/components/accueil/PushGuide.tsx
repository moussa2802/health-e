/**
 * PushGuide — guide pas à pas pour activer les rappels, adapté au téléphone de la personne :
 * navigateur de TikTok / Instagram / WhatsApp, iPhone (Safari, écran d'accueil), Android (Chrome,
 * Samsung Internet), notifications bloquées… Avec « M'envoyer un essai » pour vérifier.
 */
import React, { useState } from 'react';
import { Check, Copy, Download, Send, Smartphone } from 'lucide-react';
import type { MomentPalette } from '../../utils/drloMoment';
import { currentDevice, currentGuide, promptInstall, sendTest } from '../../services/pushService';
import { GuideVisualView } from './GuideVisuals';

const C = { text: '#F4EEE4', soft: '#DCD3C5', faint: '#A79E90', title: '#FBF5EA', sage: '#9DBFAF', line: 'rgba(255,255,255,.12)', glass: 'rgba(255,255,255,.05)', ink: '#1C140D' };
const LINK = 'https://health-e.sn/?ouvrir=rappels';

const OS_LABEL = { ios: 'iPhone', android: 'Android', desktop: 'Ordinateur' } as const;
const BROWSER_LABEL: Record<string, string> = { safari: 'Safari', chrome: 'Chrome', samsung: 'Samsung Internet', firefox: 'Firefox', edge: 'Edge', other: 'navigateur' };
const APP_LABEL: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', snapchat: 'Snapchat' };

export const PushGuideCard: React.FC<{
  palette: MomentPalette;
  hour: number;
  onActivate: () => Promise<boolean>;
  /** Affiché à l'intérieur d'une carte du chat : sans cadre. */
  embedded?: boolean;
}> = ({ palette, hour, onActivate, embedded }) => {
  const [, refresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const guide = currentGuide();
  const dev = currentDevice();
  const primary: React.CSSProperties = { minHeight: 46, padding: '0 16px', borderRadius: 14, border: 0, background: palette.primary, color: C.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const ghost: React.CSSProperties = { ...primary, background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: C.text, fontWeight: 600 };

  const copy = async () => {
    try { await navigator.clipboard.writeText(LINK); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } catch { /* le lien reste affiché */ }
  };
  const activate = async () => { setBusy(true); await onActivate(); setBusy(false); refresh(x => x + 1); };

  return (
    <div style={embedded ? { display: 'flex', flexDirection: 'column', gap: 14 } : { borderRadius: 18, border: `1px solid ${C.line}`, background: C.glass, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15, fontWeight: 700 }}>
          <Smartphone size={18} color={palette.accent} aria-hidden="true" />{guide.title}
        </span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: C.faint }}>
          Détecté : {OS_LABEL[dev.os]} · {dev.inApp ? `dans ${APP_LABEL[dev.inApp]}` : BROWSER_LABEL[dev.browser]}{dev.standalone ? ' · icône sur l\'écran d\'accueil' : ''}
        </span>
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {guide.steps.map((st, i) => (
          <li key={i} style={{ display: 'flex', gap: 12 }}>
            <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(242,182,109,.18)', color: palette.accent, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.title }}>{st.title}</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 13.5, lineHeight: 1.5, color: C.soft }}>{st.text}</span>
              {st.visual && <GuideVisualView visual={st.visual} os={dev.os} />}
            </span>
          </li>
        ))}
      </ol>
      {guide.action === 'copy_link' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <code style={{ fontSize: 12.5, color: C.soft, background: 'rgba(0,0,0,.25)', padding: '8px 10px', borderRadius: 10, wordBreak: 'break-all' }}>{LINK}</code>
          <button onClick={copy} style={ghost}>{copied ? <><Check size={16} aria-hidden="true" />Lien copié</> : <><Copy size={16} aria-hidden="true" />Copier le lien</>}</button>
        </div>
      )}
      {guide.state === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {guide.action === 'install' && (
            <button onClick={async () => { await promptInstall(); refresh(x => x + 1); }} style={ghost}><Download size={16} aria-hidden="true" />Installer Health-e (facultatif)</button>
          )}
          <button onClick={activate} disabled={busy} style={{ ...primary, opacity: busy ? 0.6 : 1 }}>{busy ? 'Un instant…' : `Activer · rappel à ${hour} h`}</button>
        </div>
      )}
      {guide.state === 'denied' && (
        <button onClick={() => window.location.reload()} style={ghost}>J'ai débloqué, recharger</button>
      )}
    </div>
  );
};

/** Une fois activé : vérifier que tout marche, avec une vraie notification. */
export const PushTestButton: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'no_device' | 'error'>('idle');
  const label = state === 'sending' ? 'Envoi…'
    : state === 'ok' ? 'Envoyé : regarde ton téléphone'
    : 'M\'envoyer un essai';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button disabled={state === 'sending'} onClick={async () => { setState('sending'); setState(await sendTest()); }}
        style={{ minHeight: 44, borderRadius: 14, border: '1px solid rgba(255,255,255,.18)', background: 'transparent', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Send size={15} color={palette.accent} aria-hidden="true" />{label}
      </button>
      {state === 'no_device' && <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#E9C88F' }}>Ce téléphone n'est pas encore enregistré. Désactive puis réactive les rappels ici.</p>}
      {state === 'error' && <p style={{ margin: 0, fontSize: 12.5, color: '#E9C88F' }}>L'essai n'est pas parti (connexion ?). Réessaie dans un instant.</p>}
      {state === 'ok' && <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: C.faint }}>Rien reçu après une minute ? Vérifie que le mode « Ne pas déranger » est coupé et que Chrome (ou Health-e) a le droit d'afficher des notifications dans les réglages du téléphone.</p>}
    </div>
  );
};
