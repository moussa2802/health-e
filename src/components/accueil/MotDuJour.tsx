/**
 * MotDuJour — « Ton mot du jour » sur l'accueil : un petit mot du compagnon, comme un post-it sur le miroir.
 * Écrit pour la personne (ce qu'il sait d'elle, hors intime), un nouveau chaque jour.
 * - Garder : il rejoint « Mes mots » (sur le compte).
 * - Le recevoir chaque jour : si les rappels ne sont pas activés, propose de les activer (notification discrète,
 *   « Ton mot du jour t'attend », jamais le mot lui-même sur l'écran verrouillé).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Bell, Pin, Check } from 'lucide-react';
import { DC } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { cachedMot, getMot, keepMot, type Mot } from '../../services/motService';
import { getCompanionName } from '../../utils/companion';
import { loadPrefs } from '../../services/pushService';
import { NotifOptinCard } from './NotificationsPanel';
import { trackAccueil } from '../../utils/accueilTracking';

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const PAPER = '#F4E3C3';
const INK = '#3A2A1C';

const MotDuJour: React.FC<{ uid: string; palette: MomentPalette; focus?: boolean }> = ({ uid, palette, focus }) => {
  const [mot, setMot] = useState<Mot | null>(() => cachedMot(uid));
  const [failed, setFailed] = useState(false);
  const [kept, setKept] = useState(() => !!cachedMot(uid)?.kept);
  const [notifOn, setNotifOn] = useState<boolean | null>(null);
  const [optin, setOptin] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const name = getCompanionName() || 'Ton compagnon';

  useEffect(() => {
    let off = false;
    getMot(uid).then(m => { if (!off) { setMot(m); setKept(!!m.kept); } }).catch(() => { if (!off) setFailed(true); });
    loadPrefs(uid).then(p => { if (!off) setNotifOn(!!p.on && (p as { mot?: boolean }).mot !== false); }).catch(() => {});
    return () => { off = true; };
  }, [uid]);
  // Arrivée depuis la notification : on montre le mot
  useEffect(() => { if (focus && mot) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [focus, mot]);

  if (failed && !mot) return null;
  const d = new Date();
  const date = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  const keep = () => {
    if (!mot || kept) return;
    setKept(true);
    trackAccueil('go', { to: 'mot_keep' });
    keepMot(uid, mot).catch(() => setKept(false));
  };

  return (
    <section ref={ref} aria-label="Ton mot du jour" style={{ marginTop: 18 }}>
      <div style={{ position: 'relative', margin: '0 6px', padding: '22px 18px 14px', borderRadius: 6, background: PAPER, color: INK, transform: 'rotate(-1.2deg)', boxShadow: '0 12px 28px rgba(0,0,0,.35), 0 2px 0 rgba(0,0,0,.08)' }}>
        {/* Le petit ruban adhésif */}
        <span aria-hidden="true" style={{ position: 'absolute', top: -10, left: '50%', width: 86, height: 22, transform: 'translateX(-50%) rotate(2deg)', background: 'rgba(255,248,230,.55)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 2 }} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#8A6A44' }}>Le mot de {name} · {date}</p>
        {mot ? (
          <p className="drl-in" style={{ margin: '10px 0 0', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 21, lineHeight: 1.4, fontWeight: 500, color: INK }}>{mot.text}</p>
        ) : (
          <div aria-label="Ton mot arrive" style={{ margin: '14px 0 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ height: 14, width: '92%', borderRadius: 7, background: 'rgba(58,42,28,.12)' }} />
            <span style={{ height: 14, width: '70%', borderRadius: 7, background: 'rgba(58,42,28,.12)' }} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={keep} disabled={!mot} aria-pressed={kept} className="drl-btn"
            style={{ minHeight: 40, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(58,42,28,.25)', background: kept ? 'rgba(58,42,28,.1)' : 'transparent', color: INK, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            {kept ? <Check size={15} aria-hidden="true" /> : <Pin size={15} aria-hidden="true" />}{kept ? 'Gardé' : 'Garder'}
          </button>
          {notifOn === false && !done && (
            <button type="button" onClick={() => { setOptin(o => !o); trackAccueil('go', { to: 'mot_optin' }); }} aria-expanded={optin} className="drl-btn"
              style={{ minHeight: 40, padding: '0 12px', borderRadius: 999, border: 0, background: 'transparent', color: '#7A5A36', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
              <Bell size={15} aria-hidden="true" />Le recevoir chaque jour
            </button>
          )}
        </div>
      </div>
      {optin && !done && (
        <div style={{ marginTop: 8 }}>
          <NotifOptinCard uid={uid} palette={palette} reason="mot" onDone={t => { setDone(t); setOptin(false); setNotifOn(true); }} />
        </div>
      )}
      {done && <p role="status" style={{ margin: '10px 4px 0', fontSize: 14, lineHeight: 1.5, color: DC.muted }}>{done}</p>}
    </section>
  );
};

export default MotDuJour;
