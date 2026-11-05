/**
 * PencLive — le direct de Pénc mi, en morceaux réutilisables :
 *   ChatFlux / ChatSheet      les commentaires qui défilent par-dessus le Pénc (et la liste complète)
 *   PinnedQuestion            la question « à l'antenne », vue par tous
 *   QuestionsSheet            la boîte à questions (Anonyme / pseudo / prénom) + « moi aussi »
 *   HostQuestions             côté hôte : afficher à tous, répondue, masquer
 *   SlideCard / ImageViewer   l'image de présentation, et son agrandissement (pincer, double-tap, boutons)
 *   SlidesManager             côté hôte : ajouter, montrer, retirer des images
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, EyeOff, HelpCircle, ImagePlus, Loader2, Minus, Plus, X, ZoomIn } from 'lucide-react';
import { DC } from '../accueil/DrLoShell';
import type { IdentityMode } from '../../services/drloBroadcastService';
import {
  addSlide, answerQuestion, askQuestion, hideQuestion, pinQuestion, removeSlide, showSlide, voteQuestion,
  type ChatMessage, type PencQuestion,
} from '../../services/pencLiveService';

const LAV = '#C9B8E4';
const COLORS = ['#9DBFAF', '#C9B8E4', '#F09A7A', '#9FB4C8', '#E8A0B8', '#E9C88F'];
export const colorOf = (s: string) => COLORS[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
const anon = (n: string) => !n || n === 'Anonyme';
const srOnly: React.CSSProperties = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

const Dot: React.FC<{ name: string; size: number }> = ({ name, size }) => (
  <span aria-hidden="true" style={{ width: size, height: size, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.46, fontWeight: 700,
    background: anon(name) ? 'rgba(243,233,220,.16)' : colorOf(name), color: anon(name) ? DC.soft : DC.ink }}>{anon(name) ? '?' : name.trim()[0].toUpperCase()}</span>
);

// ───────── Commentaires ─────────
/** Les 5 derniers commentaires, par-dessus le Pénc : les plus anciens s'effacent en remontant. Toucher ouvre la liste. */
const who = (m: ChatMessage, meId?: string) => `${m.n}${m.h ? ' · hôte' : ''}${meId && m.who === meId ? ' (toi)' : ''}`;

export const ChatFlux: React.FC<{ items: ChatMessage[]; meId?: string; onOpen: () => void }> = ({ items, meId, onOpen }) => {
  const last = items.slice(-5);
  if (!last.length) return null;
  const fade = [0.3, 0.5, 0.7, 0.88, 1];
  return (
    <button type="button" onClick={onOpen} aria-label={`Commentaires en direct : ${items.length}. Toucher pour tout lire`} className="drl-btn"
      style={{ width: '100%', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'inherit' }}>
      {last.map((m, i) => (
        <span key={m.cid} className="penc-msg" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: fade[fade.length - last.length + i] }}>
          <Dot name={m.n} size={26} />
          <span style={{ padding: '6px 11px', borderRadius: 16, background: 'rgba(18,12,7,.62)', fontSize: 14, lineHeight: 1.35, color: DC.text, maxWidth: '100%', overflowWrap: 'anywhere' }}>
            <b style={{ color: anon(m.n) ? DC.muted : colorOf(m.n) }}>{who(m, meId)}</b> {m.t}
          </span>
        </span>
      ))}
    </button>
  );
};

/** Tous les commentaires (depuis ton arrivée) ; l'hôte peut en masquer un pour tout le monde. */
export const ChatSheet: React.FC<{ items: ChatMessage[]; meId?: string; isMod: boolean; onHide: (cid: string) => void; onClose: () => void }> = ({ items, meId, isMod, onHide, onClose }) => {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView(); }, [items.length]);
  return (
    <Sheet title={`Commentaires · ${items.length}`} onClose={onClose}>
      {items.length === 0 ? <p style={{ margin: 0, color: DC.muted, fontSize: 15 }}>Aucun commentaire pour l'instant. Lance-toi !</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(m => (
            <div key={m.cid} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Dot name={m.n} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: DC.faint }}><b style={{ color: anon(m.n) ? DC.muted : colorOf(m.n) }}>{who(m, meId)}</b> · {new Date(m.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                <p style={{ margin: '2px 0 0', fontSize: 15, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{m.t}</p>
              </div>
              {isMod && !m.h && <button type="button" onClick={() => onHide(m.cid)} aria-label={`Masquer pour tous le commentaire de ${m.n}`} className="drl-btn" style={iconBtn}><EyeOff size={16} aria-hidden="true" /></button>}
            </div>
          ))}
          <div ref={end} />
        </div>
      )}
    </Sheet>
  );
};

// ───────── Panneau du bas ─────────
const iconBtn: React.CSSProperties = { width: 44, height: 44, flex: 'none', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
export const Sheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="drl-screen" style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(8,5,3,.6)' }}>
      <button type="button" aria-label="Fermer" onClick={onClose} style={{ flex: 1, minHeight: 60, border: 0, background: 'transparent', cursor: 'pointer' }} />
      <section role="dialog" aria-label={title} style={{ maxHeight: '86svh', overflowY: 'auto', boxSizing: 'border-box', width: '100%', maxWidth: 640, margin: '0 auto', borderRadius: '26px 26px 0 0', background: '#1E150D', borderTop: '1px solid rgba(255,255,255,.1)', padding: '10px 18px calc(20px + env(safe-area-inset-bottom, 0px))', color: DC.text }}>
        <span aria-hidden="true" style={{ display: 'block', width: 40, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.2)', margin: '0 auto 8px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 600, color: DC.title }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="drl-btn" style={{ ...iconBtn, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,.06)' }}><X size={18} aria-hidden="true" /></button>
        </div>
        {children}
      </section>
    </div>
  );
};

// ───────── Questions ─────────
export const PinnedQuestion: React.FC<{ q: PencQuestion }> = ({ q }) => (
  <section aria-label="Question à l'antenne" aria-live="polite" style={{ padding: 14, borderRadius: 18, background: 'rgba(201,184,228,.12)', border: `1px solid ${LAV}73` }}>
    <p style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: LAV }}><HelpCircle size={15} aria-hidden="true" />Question à l'antenne</p>
    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: DC.title }}>{q.text}</p>
    <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.muted }}>{q.name}{q.votes > 0 ? ` · ${q.votes} personne${q.votes > 1 ? 's' : ''} se la pose${q.votes > 1 ? 'nt' : ''} aussi` : ''}</p>
  </section>
);

const ID_KEY = 'he_comment_identity';
const loadIdt = (): { mode: IdentityMode; pseudo: string } => {
  try { const v = JSON.parse(localStorage.getItem(ID_KEY) || '{}'); if (['anon', 'prenom', 'pseudo'].includes(v.mode)) return { mode: v.mode, pseudo: String(v.pseudo || '') }; } catch { /* ignore */ }
  return { mode: 'anon', pseudo: '' };
};

/** Poser sa question (avant ou pendant le Pénc) et dire « moi aussi » à celles des autres. */
export const QuestionsSheet: React.FC<{ pencId: string; questions: PencQuestion[]; accent: string; onChanged: () => void; onClose: () => void; canAsk?: boolean }> = ({ pencId, questions, accent, onChanged, onClose, canAsk = true }) => {
  const [text, setText] = useState('');
  const [idt, setIdt] = useState(loadIdt);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'crisis'; text: string } | null>(null);
  const send = async () => {
    if (text.trim().length < 2 || busy) return;
    setBusy(true); setMsg(null);
    try {
      try { localStorage.setItem(ID_KEY, JSON.stringify(idt)); } catch { /* ignore */ }
      const r = await askQuestion(pencId, text, idt.mode, idt.pseudo);
      if (r.crisis) { setMsg({ kind: 'crisis', text: '' }); return; }
      setText(''); setMsg({ kind: 'ok', text: 'Ta question est envoyée. Les autres peuvent dire « moi aussi ».' }); onChanged();
    } catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Erreur' }); } finally { setBusy(false); }
  };
  const vote = (q: PencQuestion) => { voteQuestion(pencId, q.id, !q.voted).then(onChanged).catch(() => {}); };
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 44, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: on ? 700 : 600, border: `1px solid ${on ? accent : DC.line}`, background: on ? `${accent}29` : 'transparent', color: on ? DC.title : DC.soft });
  return (
    <Sheet title={canAsk ? 'Pose ta question' : 'Les questions'} onClose={onClose}>
      {canAsk && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, color: DC.muted }}>Ta question</span>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={300} placeholder="Ex. : comment parler de mon stress à mes parents ?" className="drl-input"
              style={{ resize: 'none', borderRadius: 16, border: `1px solid ${text ? accent : DC.line}`, background: 'rgba(255,255,255,.04)', color: DC.text, fontFamily: 'inherit', fontSize: 16, lineHeight: 1.45, padding: '12px 14px' }} />
          </label>
          <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
            <legend style={{ fontSize: 13, color: DC.muted, marginBottom: 8 }}>Comment tu signes ?</legend>
            <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
              {([['anon', 'Anonyme'], ['pseudo', 'Un pseudo'], ['prenom', 'Mon prénom']] as const).map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={idt.mode === k} onClick={() => setIdt({ ...idt, mode: k })} style={chip(idt.mode === k)}>{l}</button>
              ))}
            </div>
            {idt.mode === 'pseudo' && <input value={idt.pseudo} maxLength={20} onChange={e => setIdt({ ...idt, pseudo: e.target.value })} aria-label="Ton pseudo" placeholder="Ton pseudo" className="drl-input"
              style={{ marginTop: 8, width: '100%', minHeight: 46, boxSizing: 'border-box', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text }} />}
            <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.45, color: DC.faint }}>{idt.mode === 'anon' ? 'Anonyme : tu reçois un nom au hasard. Personne ne peut savoir que c\'est un nom inventé.' : 'Ne donne ni ton nom complet, ni ton numéro.'}</p>
          </fieldset>
          <button type="button" disabled={busy || text.trim().length < 2} onClick={send} className="drl-btn"
            style={{ minHeight: 50, borderRadius: 999, border: 0, background: accent, color: DC.ink, fontFamily: 'inherit', fontSize: 16, fontWeight: 800, cursor: 'pointer', opacity: busy || text.trim().length < 2 ? 0.55 : 1 }}>
            {busy ? <Loader2 size={18} className="animate-spin" aria-label="Envoi" /> : 'Envoyer ma question'}
          </button>
          {msg?.kind === 'crisis' && (
            <p role="alert" style={{ margin: 0, padding: 12, borderRadius: 14, background: 'rgba(240,154,122,.12)', fontSize: 14, lineHeight: 1.5, color: DC.text }}>
              Ce que tu écris compte, et ça ne sera pas affiché devant tout le monde. Si tu penses à te faire du mal ou si tu es en danger maintenant, appelle le SAMU au <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a> ou le CHU de Fann au <a href="tel:+221338691820" style={{ fontWeight: 700 }}>33 869 18 20</a>. Parle à une vraie personne, tout de suite.
            </p>
          )}
          {msg && msg.kind !== 'crisis' && <p role={msg.kind === 'err' ? 'alert' : 'status'} style={{ margin: 0, fontSize: 14, color: msg.kind === 'err' ? '#F09A7A' : DC.sage }}>{msg.text}</p>}
          <div style={{ height: 1, background: DC.line, margin: '4px 0' }} />
        </div>
      )}
      <h3 style={{ margin: canAsk ? '4px 0 10px' : '0 0 10px', fontSize: 15, fontWeight: 700, color: DC.title }}>Les questions · {questions.length}</h3>
      {questions.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: DC.muted }}>Aucune question pour l'instant. Sois la première personne !</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.map(q => (
            <div key={q.id} style={{ padding: '12px 14px', borderRadius: 16, display: 'flex', gap: 10, alignItems: 'flex-start',
              background: q.pinned ? 'rgba(201,184,228,.1)' : q.status === 'answered' ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.05)', border: q.pinned ? `1px solid ${LAV}66` : '1px solid transparent' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {q.pinned && <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, letterSpacing: '.05em', color: LAV }}>À L'ANTENNE</p>}
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: q.status === 'answered' ? DC.muted : DC.text, overflowWrap: 'anywhere' }}>{q.text}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: q.status === 'answered' ? DC.sage : DC.faint, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {q.status === 'answered' && <Check size={14} aria-hidden="true" />}{q.status === 'answered' ? 'Répondue · ' : ''}{q.mine ? `${q.name} (toi)` : q.name}
                </p>
              </div>
              {q.status === 'open' && !q.mine && (
                <button type="button" onClick={() => vote(q)} aria-pressed={q.voted} aria-label={`Moi aussi, ${q.votes}`} className="drl-btn"
                  style={{ minWidth: 56, minHeight: 52, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${q.voted ? LAV : DC.line}`, background: q.voted ? 'rgba(201,184,228,.16)' : 'transparent', color: q.voted ? DC.title : DC.soft }}>
                  <span style={{ fontSize: 16, color: DC.title }}>{q.votes}</span>moi aussi
                </button>
              )}
              {q.mine && q.status === 'open' && <span style={{ flex: 'none', fontSize: 13, color: DC.faint, paddingTop: 2 }}>{q.votes} moi aussi</span>}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
};

/** Côté hôte : les questions triées par « moi aussi ». */
export const HostQuestions: React.FC<{ pencId: string; questions: PencQuestion[]; accent: string; onChanged: () => void }> = ({ pencId, questions, accent, onChanged }) => {
  const [busy, setBusy] = useState('');
  const run = (k: string, f: () => Promise<unknown>) => { setBusy(k); f().then(onChanged).catch(() => {}).finally(() => setBusy('')); };
  const open = questions.filter(q => q.status === 'open');
  if (!open.length) return <p style={{ margin: 0, fontSize: 14, color: DC.faint }}>Pas de question en attente. Elles arrivent ici, les plus demandées en premier.</p>;
  const b = (primary: boolean): React.CSSProperties => ({ minHeight: 44, padding: '0 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
    border: primary ? `1px solid ${accent}` : `1px solid ${DC.line}`, background: primary ? `${accent}1F` : 'transparent', color: DC.title });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {open.map(q => (
        <div key={q.id} style={{ padding: 14, borderRadius: 18, background: q.pinned ? 'rgba(201,184,228,.1)' : 'rgba(255,255,255,.05)', border: q.pinned ? `1px solid ${LAV}73` : '1px solid transparent' }}>
          {q.pinned && <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, letterSpacing: '.05em', color: LAV }}>À L'ANTENNE · TOUT LE MONDE LA VOIT</p>}
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{q.text}</p>
          <p style={{ margin: '6px 0 10px', fontSize: 13, color: DC.faint }}>{q.name} · {q.votes} moi aussi</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {q.pinned
              ? <button type="button" disabled={!!busy} onClick={() => run(`a${q.id}`, () => answerQuestion(pencId, q.id))} style={{ ...b(false), flex: 1, background: DC.sage, color: DC.ink, border: 0 }}>Marquer répondue</button>
              : <button type="button" disabled={!!busy} onClick={() => run(`p${q.id}`, () => pinQuestion(pencId, q.id))} style={{ ...b(true), flex: 1 }}>Afficher à tous</button>}
            {q.pinned && <button type="button" disabled={!!busy} onClick={() => run(`u${q.id}`, () => pinQuestion(pencId, null))} style={b(false)}>Retirer</button>}
            <button type="button" disabled={!!busy} onClick={() => run(`h${q.id}`, () => hideQuestion(pencId, q.id))} aria-label="Masquer cette question" style={{ ...iconBtn, minHeight: 44 }}><EyeOff size={17} aria-hidden="true" /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ───────── Images ─────────
export const SlideCard: React.FC<{ url: string; index: number; total: number; onOpen: () => void; host?: { onPrev: () => void; onNext: () => void; onHide: () => void; busy?: boolean } }> = ({ url, index, total, onOpen, host }) => {
  const nav: React.CSSProperties = { minWidth: 44, minHeight: 44, padding: '0 12px', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.05)', color: DC.title, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
  return (
    <section aria-label="Image de présentation" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button type="button" onClick={onOpen} aria-label={`Image ${index + 1} sur ${total} : toucher pour agrandir`} className="drl-btn"
        style={{ position: 'relative', width: '100%', height: 'clamp(240px, 46svh, 520px)', padding: 0, border: `1px solid ${DC.line}`, borderRadius: 18, overflow: 'hidden', background: '#0B0704', cursor: 'zoom-in', display: 'block' }}>
        <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        <span style={{ position: 'absolute', right: 8, bottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, background: 'rgba(18,12,7,.8)', fontSize: 13, fontWeight: 700, color: DC.text }}>
          <ZoomIn size={15} aria-hidden="true" />Agrandir · {index + 1}/{total}
        </span>
      </button>
      {host && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={host.busy || index === 0} onClick={host.onPrev} aria-label="Image précédente" style={{ ...nav, opacity: index === 0 ? 0.4 : 1 }}>‹</button>
          <button type="button" disabled={host.busy || index >= total - 1} onClick={host.onNext} aria-label="Image suivante" style={{ ...nav, opacity: index >= total - 1 ? 0.4 : 1 }}>›</button>
          <button type="button" disabled={host.busy} onClick={host.onHide} style={{ ...nav, flex: 1 }}>Cacher l'image pour tous</button>
        </div>
      )}
    </section>
  );
};

/** Plein écran : pincer pour zoomer, glisser pour se déplacer, double-tap ou boutons + / −. */
export const ImageViewer: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  const [scale, setScale] = useState(1);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const clamp = (x: number) => Math.min(5, Math.max(1, x));
  /** Change le zoom en gardant le même point au centre (ou sous les doigts). */
  const zoomTo = (next: number, cx?: number, cy?: number) => {
    const el = box.current;
    const prev = scaleRef.current;
    const n = clamp(next);
    if (!el || n === prev) return;
    const px = cx ?? el.clientWidth / 2;
    const py = cy ?? el.clientHeight / 2;
    const fx = (el.scrollLeft + px) / prev;
    const fy = (el.scrollTop + py) / prev;
    scaleRef.current = n;
    setScale(n);
    requestAnimationFrame(() => { el.scrollLeft = fx * n - px; el.scrollTop = fy * n - py; });
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let start: { d: number; s: number } | null = null;
    let lastTap = 0;
    const d = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => { const r = el.getBoundingClientRect(); return [(t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top]; };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) { start = { d: d(e.touches), s: scaleRef.current }; e.preventDefault(); return; }
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 280) {
          e.preventDefault();
          const r = el.getBoundingClientRect();
          zoomTo(scaleRef.current > 1.2 ? 1 : 2.5, e.touches[0].clientX - r.left, e.touches[0].clientY - r.top);
          lastTap = 0;
        } else lastTap = now;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && start) { e.preventDefault(); const [cx, cy] = mid(e.touches); zoomTo(start.s * (d(e.touches) / start.d), cx, cy); }
    };
    const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) start = null; };
    // Safari (iPhone) : ses propres gestes de zoom de page sont bloqués ici
    const block = (e: Event) => e.preventDefault();
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('gesturestart', block as EventListener);
    el.addEventListener('gesturechange', block as EventListener);
    return () => {
      el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd);
      el.removeEventListener('gesturestart', block as EventListener); el.removeEventListener('gesturechange', block as EventListener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const round: React.CSSProperties = { width: 48, height: 48, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,.14)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
  return (
    <div role="dialog" aria-label="Image agrandie" className="drl-screen" style={{ position: 'fixed', inset: 0, zIndex: 90, background: '#000' }}>
      <div ref={box} onDoubleClick={e => { const r = box.current!.getBoundingClientRect(); zoomTo(scaleRef.current > 1.2 ? 1 : 2.5, e.clientX - r.left, e.clientY - r.top); }}
        style={{ position: 'absolute', inset: 0, overflow: 'auto', touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <div style={{ width: `${scale * 100}%`, height: `${scale * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {failed
            ? <p style={{ color: '#fff', fontSize: 15, padding: 24, textAlign: 'center' }}>L'image n'a pas pu s'afficher. Ferme et réessaie dans un instant.</p>
            : <img src={url} alt="Image de présentation" draggable={false} onError={() => setFailed(true)} style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', WebkitUserSelect: 'none' }} />}
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Fermer l'image" style={{ ...round, position: 'absolute', top: 'calc(12px + env(safe-area-inset-top, 0px))', right: 12 }}><X size={22} aria-hidden="true" /></button>
      <div style={{ position: 'absolute', bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, pointerEvents: 'none' }}>
        <button type="button" onClick={() => zoomTo(scaleRef.current / 1.5)} aria-label="Dézoomer" style={{ ...round, pointerEvents: 'auto' }}><Minus size={20} aria-hidden="true" /></button>
        <span style={{ minWidth: 60, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 700, padding: '6px 10px', borderRadius: 999, background: 'rgba(0,0,0,.5)' }}>{Math.round(scale * 100)} %</span>
        <button type="button" onClick={() => zoomTo(scaleRef.current * 1.5)} aria-label="Zoomer" style={{ ...round, pointerEvents: 'auto' }}><Plus size={20} aria-hidden="true" /></button>
      </div>
      <p style={srOnly}>Pince avec deux doigts pour zoomer, touche deux fois, ou utilise les boutons.</p>
    </div>
  );
};

/** Côté hôte : préparer et montrer les images (photos, captures, schémas). */
export const SlidesManager: React.FC<{ pencId: string; slides: (string | null)[]; current: number | null; accent: string; onChanged: () => void }> = ({ pencId, slides, current, accent, onChanged }) => {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    for (const [i, f] of [...files].entries()) {
      setBusy(`Envoi ${i + 1}/${files.length}…`);
      try { await addSlide(pencId, f); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); break; }
    }
    setBusy(''); if (input.current) input.current.value = ''; onChanged();
  };
  const run = (k: string, f: () => Promise<unknown>) => { setBusy(k); setError(''); f().then(onChanged).catch(e => setError(e instanceof Error ? e.message : 'Erreur')).finally(() => setBusy('')); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Ajoute des images (schéma, capture, photo). Touche « Montrer » : elle s'affiche chez tout le monde, et chacun peut zoomer.</p>
      {slides.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}>
          {slides.map((u, i) => (
            <div key={`${i}-${u}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#0B0704', border: `2px solid ${current === i ? accent : DC.line}` }}>
                {u ? <img src={u} alt={`Image ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                {current === i && <span style={{ position: 'absolute', left: 6, top: 6, padding: '3px 7px', borderRadius: 999, background: accent, color: DC.ink, fontSize: 13, fontWeight: 800 }}>À l'écran</span>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" disabled={!!busy} onClick={() => run(`s${i}`, () => showSlide(pencId, current === i ? null : i))} style={{ flex: 1, minHeight: 40, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, border: `1px solid ${current === i ? DC.line : accent}`, background: current === i ? 'transparent' : `${accent}1F`, color: DC.title }}>{current === i ? 'Cacher' : 'Montrer'}</button>
                <button type="button" disabled={!!busy} onClick={() => run(`r${i}`, () => removeSlide(pencId, i))} aria-label={`Retirer l'image ${i + 1}`} style={{ width: 40, minHeight: 40, borderRadius: 10, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} aria-hidden="true" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" multiple onChange={e => { void pick(e.target.files); }} style={srOnly} id={`slides-${pencId}`} aria-label="Ajouter des images" />
      <label htmlFor={`slides-${pencId}`} className="drl-btn" style={{ minHeight: 48, borderRadius: 999, border: `1px dashed ${accent}`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
        {busy ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" />{busy.startsWith('Envoi') ? busy : 'Un instant…'}</> : <><ImagePlus size={18} aria-hidden="true" />Ajouter des images</>}
      </label>
      {error && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#F09A7A' }}>{error}</p>}
    </div>
  );
};
