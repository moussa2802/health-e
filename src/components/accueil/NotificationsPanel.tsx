/**
 * NotificationsPanel — la cloche de l'accueil : « Mes notifications » et « Mes rappels ».
 *  - En haut : ce qui attend maintenant (calculé sur place : programme, bilan, test, totem).
 *  - Ensuite : ce que Dr Lô a envoyé (réponse du vrai Dr Lô, défi, rappels…).
 *  - « Mes rappels » : activer sur ce téléphone, heure, types, silence la nuit.
 */
import React, { useEffect, useState } from 'react';
import { Bell, ChevronLeft, Moon, Smartphone } from 'lucide-react';
import type { MomentPalette } from '../../utils/drloMoment';
import { loadInbox, markRead, type InboxItem } from '../../services/inboxService';
import { clearSetupPending, currentGuide, defaultPrefs, enablePush, loadPrefs, markSetupPending, noteRefused, pushSupport, REMINDER_HOURS, savePrefs, type NotifPrefs } from '../../services/pushService';
import { PushGuideCard, PushTestButton } from './PushGuide';

const C = { text: '#F4EEE4', soft: '#DCD3C5', muted: '#CFC6B8', faint: '#A79E90', title: '#FBF5EA', sage: '#9DBFAF', line: 'rgba(255,255,255,.12)', glass: 'rgba(255,255,255,.05)', ink: '#1C140D' };

export interface LiveItem { key: string; title: string; body: string; onOpen: () => void }

const when = (t: number) => {
  if (!t) return '';
  const d = new Date(t);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 864e5);
  if (days === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'hier';
  if (days < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const NotificationsPanel: React.FC<{
  uid: string;
  palette: MomentPalette;
  live: LiveItem[];
  startView?: 'list' | 'settings';
  onClose: () => void;
  onLink: (link: string) => void;
  onInboxChange?: (items: InboxItem[]) => void;
}> = ({ uid, palette, live, startView = 'list', onClose, onLink, onInboxChange }) => {
  const [view, setView] = useState<'list' | 'settings'>(startView);
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs());
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    let off = false;
    loadInbox(uid).then(list => {
      if (off) return;
      setItems(list);
      onInboxChange?.(list);
      const unread = list.filter(i => !i.read).map(i => i.id);
      // Ouvrir la liste = tout est vu ; le point reste visible pendant cette ouverture
      if (unread.length) markRead(unread).then(() => onInboxChange?.(list.map(i => ({ ...i, read: true })))).catch(() => {});
    });
    loadPrefs(uid).then(p => { if (!off) setPrefs(p); });
    return () => { off = true; };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (prefs.on || next.on) savePrefs(uid, next).catch(() => {});
  };

  const activate = async () => {
    setMsg(null);
    const out = await enablePush(uid, prefs);
    if (out.ok) { setPrefs(p => ({ ...p, on: true })); setMsg('C\'est activé. Touche « M\'envoyer un essai » pour vérifier.'); return; }
    setMsg(out.reason === 'refused' || out.reason === 'denied'
      ? 'Les notifications sont bloquées pour Health-e. Autorise-les dans les réglages de ton navigateur (le cadenas à côté de l\'adresse), puis réessaie.'
      : out.reason === 'ios_install'
        ? 'Sur iPhone, ajoute d\'abord Health-e à ton écran d\'accueil (bouton Partager, puis « Sur l\'écran d\'accueil »), ouvre-le depuis là, puis active les rappels.'
        : 'Ce navigateur ne permet pas les notifications. Tu retrouveras tout ici, dans la cloche.');
  };

  const card: React.CSSProperties = { borderRadius: 18, border: `1px solid ${C.line}`, background: C.glass, overflow: 'hidden' };
  const row: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', border: 0, background: 'transparent', color: C.text, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' };
  const dot = <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8664F', flexShrink: 0 }} />;
  const sw = (on: boolean, onClick: () => void, label: string) => (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick}
      style={{ width: 48, height: 30, borderRadius: 999, border: 0, cursor: 'pointer', background: on ? palette.accent : 'rgba(255,255,255,.16)', position: 'relative', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
    </button>
  );

  const types: { key: keyof NotifPrefs; title: string; sub: string }[] = [
    { key: 'programme', title: 'Mon programme', sub: 'Si des engagements restent à faire' },
    { key: 'drlo', title: 'Réponses du vrai Dr Lô', sub: 'Dès qu\'il t\'a répondu' },
    { key: 'social', title: 'Défi et compatibilité', sub: 'Quand un proche a joué' },
    { key: 'totem', title: 'Mon totem et mes bilans', sub: 'Bilan prêt, défi de la semaine' },
    { key: 'nudge', title: 'Prendre de mes nouvelles', sub: 'Si je ne passe pas pendant 4 jours, 1 fois par semaine au plus' },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label={view === 'list' ? 'Mes notifications' : 'Mes rappels'}
      style={{ position: 'fixed', inset: 0, zIndex: 57, background: palette.bg, color: C.text, overflowY: 'auto', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => (view === 'settings' && startView === 'list' ? setView('list') : onClose())} aria-label="Revenir"
            style={{ width: 44, height: 44, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: C.title }}>{view === 'list' ? 'Mes notifications' : 'Mes rappels'}</h1>
        </header>

        {view === 'list' ? (<>
          {live.length > 0 && (
            <section>
              <p style={{ margin: '0 4px 8px', fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: C.faint }}>Maintenant</p>
              <div style={card}>
                {live.map((l, i) => (
                  <button key={l.key} onClick={() => { onClose(); l.onOpen(); }} style={{ ...row, borderTop: i ? `1px solid ${C.line}` : 0 }}>
                    {dot}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{l.title}</span>
                      <span style={{ display: 'block', fontSize: 13, color: C.faint, marginTop: 2 }}>{l.body}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <section>
            <p style={{ margin: '0 4px 8px', fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: C.faint }}>Récemment</p>
            {items === null ? (
              <p style={{ margin: 0, fontSize: 14, color: C.faint, padding: '0 4px' }}>Je regarde…</p>
            ) : items.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: C.faint, padding: '0 4px' }}>Rien pour l'instant. Quand le vrai Dr Lô te répond ou qu'un proche joue à ton défi, c'est ici.</p>
            ) : (
              <div style={card}>
                {items.map((it, i) => (
                  <button key={it.id} onClick={() => { onClose(); onLink(it.link); }} style={{ ...row, borderTop: i ? `1px solid ${C.line}` : 0, opacity: it.read ? 0.72 : 1 }}>
                    {it.read ? <span style={{ width: 8, flexShrink: 0 }} /> : dot}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{it.title}</span>
                      <span style={{ display: 'block', fontSize: 13, color: C.faint, marginTop: 2 }}>{it.body}</span>
                    </span>
                    <span style={{ fontSize: 13, color: C.faint, flexShrink: 0 }}>{when(it.at)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
          <button onClick={() => setView('settings')} style={{ alignSelf: 'center', border: 0, background: 'transparent', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <Bell size={15} aria-hidden="true" />Régler mes rappels
          </button>
        </>) : (<>
          {!prefs.on ? (
            <PushGuideCard palette={palette} hour={prefs.hour} onActivate={async () => { await activate(); return true; }} />
          ) : (
            <div style={{ ...card, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Smartphone size={18} color={C.sage} aria-hidden="true" />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>Rappels activés sur ce téléphone</span>
                {sw(true, () => update({ on: false }), 'Désactiver les rappels')}
              </div>
              <PushTestButton palette={palette} />
            </div>
          )}
          {msg && <p role="status" style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: C.soft }}>{msg}</p>}

          <div style={{ ...card, padding: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Heure de mon rappel</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {REMINDER_HOURS.map(h => (
                <button key={h} onClick={() => update({ hour: h })} aria-pressed={prefs.hour === h}
                  style={{ minHeight: 40, padding: '0 16px', borderRadius: 999, border: `1px solid ${prefs.hour === h ? palette.accent : C.line}`, background: prefs.hour === h ? 'rgba(242,182,109,.18)' : 'transparent', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {h} h
                </button>
              ))}
            </div>
          </div>
          <div style={card}>
            {types.map((t, i) => (
              <div key={t.key} style={{ ...row, cursor: 'default', borderTop: i ? `1px solid ${C.line}` : 0 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{t.title}</span>
                  <span style={{ display: 'block', fontSize: 13, color: C.faint, marginTop: 2 }}>{t.sub}</span>
                </span>
                {sw(!!prefs[t.key], () => update({ [t.key]: !prefs[t.key] } as Partial<NotifPrefs>), t.title)}
              </div>
            ))}
          </div>
          <div style={{ ...card, ...row, cursor: 'default' }}>
            <Moon size={18} color={C.muted} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Silence la nuit</span>
              <span style={{ display: 'block', fontSize: 13, color: C.faint, marginTop: 2 }}>Rien entre 22 h et 7 h</span>
            </span>
            {sw(prefs.quiet, () => update({ quiet: !prefs.quiet }), 'Silence la nuit')}
          </div>
          <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: C.faint, lineHeight: 1.5 }}>Rien n'est envoyé quand ton programme est en pause. Tout reste aussi visible ici, dans la cloche.</p>
        </>)}
      </div>
    </div>
  );
};

export default NotificationsPanel;

/** Dans la discussion, juste après « J'accepte » le programme : « Je te fais signe chaque jour ? » */
/** Pourquoi Dr Lô propose les rappels : le texte de la carte s'y adapte. */
export type OptinReason = 'programme' | 'drlo_answer' | 'defi' | 'ask' | 'resume';

const OPTIN_TEXT: Record<OptinReason, { kicker: string; title: string; sub: string; yes: (h: number) => string; hours: boolean }> = {
  programme: { kicker: 'Mon rappel du jour', title: 'À quelle heure ?', sub: 'Un seul message par jour, et seulement s\'il te reste quelque chose à faire.', yes: h => `Oui, fais-moi signe à ${h} h`, hours: true },
  ask: { kicker: 'Mes rappels', title: 'À quelle heure ?', sub: 'Un seul message par jour au plus, et seulement s\'il te reste quelque chose à faire.', yes: h => `Activer · rappel à ${h} h`, hours: true },
  resume: { kicker: 'Mes rappels', title: 'On termine ?', sub: 'Un seul message par jour au plus, jamais de mot sensible sur l\'écran verrouillé.', yes: h => `Activer · rappel à ${h} h`, hours: true },
  drlo_answer: { kicker: 'Sa réponse', title: 'Je te préviens dès qu\'il répond ?', sub: 'Une notification discrète, sans le contenu de ta question.', yes: () => 'Oui, préviens-moi', hours: false },
  defi: { kicker: 'Ton défi', title: 'Je te préviens quand un proche a répondu ?', sub: 'Au plus une notification toutes les 2 heures.', yes: () => 'Oui, préviens-moi', hours: false },
};

const DONE_TEXT: Record<OptinReason, (h: number) => string> = {
  programme: h => `Parfait. Je te fais signe chaque jour vers ${h} h, seulement s'il te reste quelque chose à faire. Tu peux tout régler dans la cloche, en haut de l'accueil.`,
  ask: h => `C'est fait. Je te fais signe vers ${h} h, seulement s'il te reste quelque chose à faire. Tu peux tout régler dans la cloche, en haut de l'accueil.`,
  resume: h => `C'est fait, tes rappels sont activés (vers ${h} h). Tu peux tout régler dans la cloche, en haut de l'accueil.`,
  drlo_answer: () => 'C\'est noté : je te préviens dès que Dr Lô t\'a répondu.',
  defi: () => 'C\'est noté : je te préviens quand un proche a répondu.',
};

export const NotifOptinCard: React.FC<{ uid: string; palette: MomentPalette; onDone: (text: string) => void; reason?: OptinReason }> = ({ uid, palette, onDone, reason = 'programme' }) => {
  const [hour, setHour] = useState(19);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [support, setSupport] = useState(pushSupport());
  const T = OPTIN_TEXT[reason];
  // Le guide s'affiche ici : on s'en souvient sur le compte, pour reprendre dans l'autre navigateur
  useEffect(() => { if (support !== 'ok' && support !== 'unsupported') markSetupPending(uid, support); }, [uid, support]);
  const primary: React.CSSProperties = { minHeight: 46, width: '100%', padding: '0 16px', borderRadius: 14, border: 0, background: palette.primary, color: C.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
  if (done) return <p className="drl-in" style={{ margin: '8px 0 0', fontSize: 13, color: C.sage }}>{done}</p>;
  const finish = (line: string, text: string) => { setDone(line); onDone(text); };
  const yes = async (): Promise<boolean> => {
    setBusy(true);
    const out = await enablePush(uid, { ...defaultPrefs(), hour, on: true });
    setBusy(false);
    if (out.ok) { finish(T.hours ? `Rappel activé à ${hour} h` : 'Notifications activées', DONE_TEXT[reason](hour)); return true; }
    if (out.reason === 'refused' || out.reason === 'denied') { setSupport(pushSupport()); return false; } // le guide « débloquer » prend le relais
    finish('Rappels indisponibles ici', 'Ce téléphone ne me laisse pas envoyer de rappels. Tout ce qui t\'attend sera dans la cloche, en haut de l\'accueil.');
    return false;
  };
  const no = () => {
    noteRefused(uid);
    clearSetupPending(uid);
    finish('Pas de rappel', 'D\'accord. Tout ce qui t\'attend sera dans la cloche, en haut de l\'accueil.');
  };
  return (
    <div className="drl-in" style={{ marginTop: 10, textAlign: 'left', borderRadius: 18, border: '1px solid rgba(242,182,109,.3)', background: 'rgba(242,182,109,.07)', padding: 16, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <p style={{ margin: 0, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: palette.accent }}>{T.kicker}</p>
      <p style={{ margin: '6px 0 2px', fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: C.title }}>{support === 'ok' ? T.title : 'Je te montre comment faire'}</p>
      <p style={{ margin: 0, fontSize: 13, color: C.faint }}>{T.sub}</p>
      {support === 'unsupported' ? (
        <p style={{ margin: '12px 0 4px', fontSize: 14, lineHeight: 1.5, color: '#E9C88F' }}>{currentGuide().title}. Tout ce qui t'attend reste visible dans la cloche, en haut de l'accueil.</p>
      ) : support !== 'ok' ? (
        // Guide pas à pas, en images, ici même dans la conversation
        <div style={{ margin: '12px 0 4px' }}><PushGuideCard palette={palette} hour={hour} onActivate={yes} embedded /></div>
      ) : (<>
        {T.hours && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 0' }}>
            {REMINDER_HOURS.map(h => (
              <button key={h} onClick={() => setHour(h)} aria-pressed={hour === h}
                style={{ minHeight: 40, padding: '0 16px', borderRadius: 999, border: `1px solid ${hour === h ? palette.accent : C.line}`, background: hour === h ? 'rgba(242,182,109,.18)' : 'transparent', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {h} h
              </button>
            ))}
          </div>
        )}
        <button onClick={() => { void yes(); }} disabled={busy} style={{ ...primary, marginTop: 16, opacity: busy ? 0.6 : 1 }}>{busy ? 'Un instant…' : T.yes(hour)}</button>
      </>)}
      <button onClick={no}
        style={{ width: '100%', minHeight: 40, marginTop: 8, border: 0, background: 'transparent', color: C.faint, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        Non merci, je passerai moi-même
      </button>
      {support === 'ok' && <p style={{ margin: '4px 0 0', fontSize: 13, color: C.faint, textAlign: 'center' }}>Ton téléphone va te demander d'autoriser les notifications.</p>}
    </div>
  );
};
