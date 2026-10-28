/**
 * DrLoSheet — parler à Dr Lô IA sans quitter la page : un panneau qui monte du bas.
 * C'est LA MÊME conversation que l'accueil (même stockage, même compte) : ce qui est dit ici
 * se retrouve dans « Mon Dr Lô », et inversement. Mêmes règles : messages offerts puis 1 étincelle,
 * protocole de crise. Les tests dans la conversation restent sur l'accueil (bouton « Faire le test »).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Maximize2, Phone, Send, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS } from '../../services/korisService';
import { addExchange, enterCrisis, GO, type AccueilState, type Card } from '../../utils/accueilFlow';
import { convStorageKey, loadIndex } from '../../utils/conversations';
import { trimForCloud } from '../../utils/threadSync';
import { pullThread, pushThread } from '../../services/threadSyncService';
import { rememberNow, talk, type TalkAction } from '../../services/drloTalk';
import { getScaleMeta } from '../../utils/scaleMeta';
import { getScaleById } from '../../data/scales';
import { getCrisisResources } from '../../data/crisisResources';
import RichText from '../accueil/RichText';
import { trackAccueil } from '../../utils/accueilTracking';

/** Même préfixe que ConversationAccueil (la conversation de l'accueil). */
const STORAGE_PREFIX = 'he_accueil_v1:';
const C = {
  bg: '#1C1612', text: '#F4EEE4', soft: '#DCD3C5', muted: '#CFC6B8', faint: '#A79E90', line: 'rgba(255,255,255,.14)',
  glass: 'rgba(255,255,255,.06)', accent: '#F2B66D', ink: '#1C140D', user: 'rgba(242,182,109,.16)',
};

function loadState(key: string): AccueilState | null {
  try {
    const s = JSON.parse(localStorage.getItem(key) ?? 'null') as AccueilState | null;
    return s && s.v === 1 && Array.isArray(s.messages) ? s : null;
  } catch { return null; }
}

/** Les boutons que Dr Lô IA propose, version « panneau » (tout ce qui ne demande pas l'accueil). */
function actionCard(a: TalkAction): Card | undefined {
  switch (a.kind) {
    case 'test': return getScaleById(a.scaleId) ? { type: 'test', scaleId: a.scaleId } : undefined;
    case 'journal': return { type: 'go', to: 'confier', path: '/journal', label: 'Écrire dans mon journal' };
    case 'humeur': return { type: 'go', to: 'confier', path: '/humeur', label: 'Noter mon humeur' };
    case 'programme': case 'respiration': return { type: 'go', to: 'chat', path: '/', label: a.kind === 'programme' ? 'Voir le programme avec Dr Lô' : 'Respirer avec Dr Lô' };
    case 'defi': return { type: 'go', to: 'defi' };
    case 'compat': return { type: 'go', to: 'compat' };
    case 'vrai_drlo': return { type: 'go', to: 'question_drlo' };
    case 'totem': return { type: 'go', to: 'totem' };
    case 'catalogue': return { type: 'go', to: 'catalogue' };
    case 'chaines': return { type: 'go', to: 'chaines' };
    case 'chaine': return { type: 'go', to: 'chaines', path: `/chaines/${a.id}`, label: a.name ? `Voir la chaîne « ${a.name} »` : 'Voir la chaîne' };
    default: return undefined;
  }
}

interface Props { open: boolean; greeting?: string | null; draft?: string | null; onClose: () => void }

const DrLoSheet: React.FC<Props> = ({ open, greeting, draft, onClose }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { refreshBalance, openNoKorisModal } = useKoris();
  const uid = currentUser?.id ?? null;
  const [state, setState] = useState<AccueilState | null>(null);
  const [key, setKey] = useState<{ storage: string; conv: string } | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<AccueilState | null>(null);
  stateRef.current = state;

  // Ouverture : on charge la conversation de l'accueil (téléphone, sinon compte)
  useEffect(() => {
    if (!open || !uid) return;
    let off = false;
    const idx = loadIndex(uid);
    const storage = convStorageKey(STORAGE_PREFIX, uid, idx.current);
    setKey({ storage, conv: idx.current });
    setMissing(false);
    const boot = (s: AccueilState) => {
      let next = s;
      if (greeting) next = { ...addExchange(next, null, [greeting]), talk: next.talk ?? { conv: `conv_${Date.now()}`, start: next.messages.length, opening: greeting } };
      setState(next);
      if (greeting) save(storage, idx.current, next);
    };
    const local = loadState(storage);
    if (local) boot(local);
    else {
      pullThread<AccueilState>(idx.current).then(r => {
        if (off) return;
        if (r?.thread && Array.isArray(r.thread.messages)) boot(r.thread); else setMissing(true);
      }).catch(() => { if (!off) setMissing(true); });
    }
    if (draft) setInput(draft);
    trackAccueil('free_chat', { from: 'sheet' });
    return () => { off = true; };
  }, [open, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [state?.messages.length, busy, open]);

  const save = (storage: string, conv: string, s: AccueilState) => {
    const savedAt = new Date().toISOString();
    const withDate = { ...s, savedAt };
    try { localStorage.setItem(storage, JSON.stringify(withDate)); } catch { /* stockage indisponible */ }
    void pushThread(conv, trimForCloud(withDate), savedAt);
  };

  const send = async () => {
    const text = input.trim();
    const base = stateRef.current;
    if (!text || !base || !key || !uid || busy) return;
    setInput('');
    const t = base.talk ?? { conv: `conv_${Date.now()}`, start: base.messages.length, opening: null };
    const withUser: AccueilState = { ...addExchange(base, text, []), talk: t };
    setState(withUser); save(key.storage, key.conv, withUser);
    setBusy(true);
    const turns = base.messages.slice(-12).map(m => ({ role: m.from === 'user' ? 'user' as const : 'assistant' as const, content: m.text })).filter(m => m.content.trim());
    const out = await talk(uid, t.conv, text, turns, t.opening ?? null);
    setBusy(false);
    const cur = stateRef.current ?? withUser;
    let next: AccueilState;
    if (!out.ok) {
      if (out.reason === 'no_koris') openNoKorisModal('Un message à Dr Lô', KORIS_COSTS.chat);
      next = addExchange(cur, null, [out.reason === 'no_koris'
        ? 'Tes messages offerts d\'aujourd\'hui sont utilisés, et il te manque une étincelle pour celui-ci. Ils reviennent demain.'
        : out.reason === 'limit' ? 'On a beaucoup parlé aujourd\'hui, on reprend demain. En attendant, tu peux écrire dans ton journal.'
        : 'Je n\'arrive pas à te répondre maintenant (connexion instable). Réessaie dans un instant.']);
    } else if (out.actions.some(a => a.kind === 'crise')) {
      next = enterCrisis(cur);
    } else {
      refreshBalance();
      const cards = out.actions.map(actionCard).filter((c): c is Card => !!c);
      next = addExchange(cur, null, cards.length ? [{ text: out.text, card: cards[0] }, ...cards.slice(1).map(card => ({ text: '', card }))] : [out.text]);
      if (out.remember) rememberNow([...turns, { role: 'user', content: text }, { role: 'assistant', content: out.text }]);
    }
    setState(next); save(key.storage, key.conv, next);
  };

  const go = (path: string, st?: unknown) => { onClose(); navigate(path, st ? { state: st } : undefined); };

  const renderCard = (card: Card) => {
    const btn: React.CSSProperties = { marginTop: 8, minHeight: 42, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 12, border: 0, background: C.accent, color: C.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
    if (card.type === 'test') return <button style={btn} onClick={() => go('/', { prescribe: card.scaleId })}>Faire le test « {getScaleMeta(card.scaleId).label} » <ArrowRight size={15} aria-hidden="true" /></button>;
    if (card.type === 'go') {
      const path = card.path ?? GO[card.to].path ?? '/';
      return <button style={btn} onClick={() => go(path, card.to === 'chat' ? { talk: { greeting: null, draft: null } } : undefined)}>{card.label ?? GO[card.to].label} <ArrowRight size={15} aria-hidden="true" /></button>;
    }
    if (card.type === 'crisis') {
      return (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {getCrisisResources().filter(r => r.phone).slice(0, 3).map(r => (
            <a key={r.label} href={`tel:${(r.phone ?? '').replace(/\s/g, '')}`} style={{ ...btn, marginTop: 0, textDecoration: 'none', background: 'rgba(240,154,122,.2)', color: C.text, border: '1px solid rgba(240,154,122,.6)' }}>
              <Phone size={15} aria-hidden="true" /> {r.label} · {r.phone}
            </a>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!open) return null;
  const msgs = (state?.messages ?? []).slice(-30);

  return (
    <div role="dialog" aria-modal="true" aria-label="Discuter avec Dr Lô" style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <button aria-label="Fermer" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(0,0,0,.55)', cursor: 'pointer' }} />
      <div className="drl-in" style={{ position: 'relative', height: '82vh', maxHeight: 720, width: '100%', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', background: C.bg, color: C.text, borderRadius: '22px 22px 0 0', border: `1px solid ${C.line}`, borderBottom: 0, boxShadow: '0 -16px 40px rgba(0,0,0,.45)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 10px 16px', borderBottom: `1px solid ${C.line}` }}>
          <img src="/dr-lo.png" alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${C.accent}` }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>Dr Lô</p>
            <p style={{ margin: 0, fontSize: 12, color: C.faint }}>Ton compagnon IA · la même discussion que sur l'accueil</p>
          </div>
          <button onClick={() => go('/', { talk: { greeting: null, draft: input || null } })} aria-label="Ouvrir en plein écran" style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.line}`, background: C.glass, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Maximize2 size={17} /></button>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.line}`, background: C.glass, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </header>

        <div ref={listRef} aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {missing && (
            <div style={{ margin: 'auto 0', textAlign: 'center', color: C.muted, fontSize: 14.5, lineHeight: 1.55 }}>
              <p style={{ margin: 0 }}>Ta discussion avec Dr Lô commence sur l'accueil.</p>
              <button onClick={() => go('/', { talk: { greeting: greeting ?? null, draft: draft ?? null } })} style={{ marginTop: 12, minHeight: 44, padding: '0 18px', borderRadius: 14, border: 0, background: C.accent, color: C.ink, fontWeight: 700, cursor: 'pointer' }}>Ouvrir Dr Lô</button>
            </div>
          )}
          {!state && !missing && <p style={{ margin: 'auto', color: C.faint }}><Loader2 size={18} className="animate-spin" aria-label="Chargement" /></p>}
          {msgs.map(m => (
            m.from === 'user' ? (
              <div key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '82%', padding: '9px 13px', borderRadius: '16px 16px 4px 16px', background: C.user, color: C.text, fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</div>
            ) : (
              <div key={m.id} style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
                {m.text && <div style={{ padding: '9px 13px', borderRadius: '16px 16px 16px 4px', background: C.glass, border: `1px solid ${C.line}`, fontSize: 15, lineHeight: 1.55, color: C.soft }}><RichText text={m.text} /></div>}
                {m.card && renderCard(m.card)}
              </div>
            )
          ))}
          {busy && <div style={{ alignSelf: 'flex-start', padding: '9px 13px', borderRadius: 16, background: C.glass, color: C.faint, fontSize: 14 }}>Dr Lô écrit…</div>}
        </div>

        {state && (
          <form onSubmit={e => { e.preventDefault(); void send(); }} style={{ display: 'flex', gap: 8, padding: '10px 12px calc(10px + env(safe-area-inset-bottom))', borderTop: `1px solid ${C.line}` }}>
            <textarea aria-label="Ton message à Dr Lô" rows={1} value={input} onChange={e => setInput(e.target.value)} placeholder="Écris à Dr Lô…" maxLength={1500}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              style={{ flex: 1, minHeight: 44, maxHeight: 120, resize: 'none', borderRadius: 14, border: `1px solid ${C.line}`, background: C.glass, color: C.text, padding: '11px 13px', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Envoyer" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', border: 0, background: C.accent, color: C.ink, cursor: 'pointer', opacity: !input.trim() || busy ? 0.45 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}>
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DrLoSheet;
