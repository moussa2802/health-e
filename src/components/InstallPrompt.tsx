/**
 * InstallPrompt — « Ajoute Health-e à ton écran d'accueil » : une petite fenêtre en bas de l'écran,
 * sur téléphone seulement, quand le site n'est pas déjà ouvert depuis son icône.
 *   - Android / Chrome (le navigateur le permet) : un bouton « Installer » ;
 *   - iPhone dans Safari : les 3 gestes (Partager → Sur l'écran d'accueil → Ajouter), avec les dessins des boutons ;
 *   - iPhone hors Safari : ouvrir dans Safari d'abord (copier le lien) ;
 *   - navigateur de TikTok, Instagram… : ouvrir dans le vrai navigateur ;
 *   - autre Android : menu ⋮ → « Ajouter à l'écran d'accueil ».
 * Quand : après 12 s sur la première page, ou dès la 2e page. « Plus tard » : on ne redemande pas avant 7 jours,
 * et plus du tout après 3 refus. Jamais sur l'admin, une page de partage (/p/, /d/), ni pendant un exercice.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Copy, Check, X, Download } from 'lucide-react';
import { canInstall, currentDevice, promptInstall } from '../services/pushService';
import { GuideVisualView } from './accueil/GuideVisuals';
import type { Device } from '../utils/pushGuide';
import { installPlan, type Plan } from '../utils/installPlan';
import { trackAccueil } from '../utils/accueilTracking';

const KEY = 'he_install_offer';
type Memo = { dismissedAt?: number; refusals?: number; done?: boolean };
const read = (): Memo => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') as Memo; } catch { return {}; } };
const write = (m: Memo) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ } };

const HIDDEN = /^\/(admin|p\/|d\/|api\/|espace-pro)/;

const InstallPrompt: React.FC = () => {
  const { pathname } = useLocation();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [copied, setCopied] = useState(false);
  const pages = useRef(0);
  const device = useRef<Device | null>(null);

  useEffect(() => {
    if (plan) return;
    pages.current += 1;
    if (HIDDEN.test(pathname)) return;
    const m = read();
    if (m.done || (m.refusals ?? 0) >= 3 || (m.dismissedAt && Date.now() - m.dismissedAt < 7 * 86400000)) return;
    const show = () => {
      // Pas par-dessus un exercice guidé, une respiration ou une autre fenêtre
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const d = currentDevice();
      device.current = d;
      const p = installPlan(d, canInstall());
      if (p) { setPlan(p); trackAccueil('go', { to: 'install_offer' }); }
    };
    // 2e page : tout de suite (après 2 s) ; 1re page : après 12 s
    const t = window.setTimeout(show, pages.current >= 2 ? 2000 : 12000);
    return () => window.clearTimeout(t);
  }, [pathname, plan]);

  if (!plan) return null;
  const later = () => { const m = read(); write({ ...m, dismissedAt: Date.now(), refusals: (m.refusals ?? 0) + 1 }); setPlan(null); trackAccueil('go', { to: 'install_later' }); };
  const install = async () => {
    const ok = await promptInstall();
    trackAccueil('go', { to: ok ? 'install_done' : 'install_refused' });
    if (ok) { write({ ...read(), done: true }); setPlan(null); } else later();
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText('https://health-e.sn/'); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } catch { /* ignore */ }
  };
  const os = device.current?.os === 'ios' ? 'ios' : 'android';

  return createPortal(
    <div role="dialog" aria-modal="false" aria-labelledby="he-install-title"
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70, padding: '0 10px calc(10px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="drl-in" style={{ pointerEvents: 'auto', width: '100%', maxWidth: 460, maxHeight: '78vh', overflowY: 'auto', borderRadius: 22, background: '#221912', border: '1px solid rgba(242,182,109,.3)', boxShadow: '0 -10px 40px rgba(0,0,0,.5)', padding: '16px 16px 14px', color: '#F3ECE2', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <img src="/icons/icon-192.png" alt="" width={48} height={48} style={{ borderRadius: 12, flex: 'none' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p id="he-install-title" style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, lineHeight: 1.25, color: '#FFF6EA' }}>{plan.title}</p>
            <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.45, color: '#B5AA9C' }}>{plan.intro}</p>
          </div>
          <button type="button" onClick={later} aria-label="Fermer" style={{ width: 40, height: 40, flex: 'none', borderRadius: '50%', border: 0, background: 'transparent', color: '#B5AA9C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {plan.steps.length > 0 && (
          <ol style={{ margin: '14px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plan.steps.map((s, i) => (
              <li key={i} style={{ display: 'flex', gap: 10 }}>
                <span aria-hidden="true" style={{ width: 24, height: 24, flex: 'none', borderRadius: '50%', background: 'rgba(242,182,109,.18)', color: '#F2B66D', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{s.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 14, lineHeight: 1.45, color: '#D8CFC3' }}>{s.text}</p>
                  {s.visual && <div style={{ marginTop: 8 }}><GuideVisualView visual={s.visual} os={os} /></div>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {plan.action === 'install' && (
            <button type="button" onClick={install} style={{ flex: 1, minHeight: 48, borderRadius: 14, border: 0, background: '#F2B66D', color: '#1A120B', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              <Download size={18} aria-hidden="true" />Installer
            </button>
          )}
          {plan.action === 'copy' && (
            <button type="button" onClick={copy} style={{ flex: 1, minHeight: 48, borderRadius: 14, border: 0, background: '#F2B66D', color: '#1A120B', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}{copied ? 'Lien copié' : 'Copier le lien'}
            </button>
          )}
          <button type="button" onClick={later} style={{ flex: plan.action ? 'none' : 1, minHeight: 48, padding: '0 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,.16)', background: 'transparent', color: '#D8CFC3', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {plan.action ? 'Plus tard' : 'J\'ai compris'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default InstallPrompt;
