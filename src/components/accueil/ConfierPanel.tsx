/**
 * ConfierPanel — l'onglet « Me confier » du premier écran.
 * Tout ce qu'on écrit va dans le journal privé (mention « Ajouté à ton journal » + Annuler).
 * Dr Lô écoute en silence (un mot bref), sort du silence si un message inquiétant apparaît,
 * et donne son avis seulement si on le demande (1 Kori, comme le journal classique).
 */
import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronRight, Feather, Mic, Phone, Send } from 'lucide-react';
import {
  addAdvice, addNote, deposit, emptyConfier, entries, hasLiveEntries, joinParagraphs, markCancelled, markError, markSaved, removeParagraph, setDayPage,
  pendingForAdvice, rebuildToday, MAX_ENTRY_CHARS, type ConfierState,
} from '../../utils/confierFlow';
import {
  addCarnet, askAdvice, currentCarnet, DEFAULT_CARNET, getConfidence, listJournal, loadCarnets, removeConfidence, saveConfidence, setCurrentCarnet, updateConfidence,
  type JournalItem,
} from '../../services/confierService';
import { Link } from 'react-router-dom';
import { EntryCard, fullDate, PROGRAMME, sortCarnets } from './JournalEntryCard';
import { useDictation } from '../../hooks/useDictation';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS } from '../../services/korisService';
import { getCrisisResources } from '../../data/crisisResources';
import { trackAccueil } from '../../utils/accueilTracking';
import type { DrLoState } from './DrLoAvatar';
import { CREDIT, credits } from '../../config/creditName';

import { CONFIER } from './confierTheme';
import { dayKey } from '../../utils/moodLog';

export { CONFIER };
const PREFIX = 'he_confier_v1:';

/** La page « Écrire » ne garde que la séance du jour : la veille est rangée dans « Mon journal ». */
function load(key: string): ConfierState {
  try {
    const s = JSON.parse(localStorage.getItem(key) ?? 'null') as (ConfierState & { day?: string }) | null;
    if (!s || s.v !== 1 || !Array.isArray(s.items)) return emptyConfier();
    if (s.day && s.day !== dayKey()) return emptyConfier();
    return s;
  } catch { return emptyConfier(); }
}

const ConfierPanel: React.FC<{
  userId: string | null;
  genre?: 'homme' | 'femme';
  onStatus: (state: DrLoState, label: string | null) => void;
  /** Invité : ouvrir la carte « créer mon espace » dans la conversation. */
  onSignup: () => void;
  /** « Écrire » ou « Mon journal » (une seule entité : on écrit et on relit au même endroit). */
  view?: 'write' | 'journal';
  onView?: (v: 'write' | 'journal') => void;
}> = ({ userId, genre, onStatus, onSignup, view = 'write', onView }) => {
  const { refreshBalance, openNoKorisModal } = useKoris();
  const key = `${PREFIX}${userId ?? 'guest'}`;
  const [state, setState] = useState<ConfierState>(() => load(key));
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const listRef = useRef<HTMLDivElement>(null);
  const dictation = useDictation(setDraft);
  const seul = genre === 'femme' ? 'seule' : genre === 'homme' ? 'seul' : 'uniquement';
  const sansAide = genre === 'femme' ? 'seule' : genre === 'homme' ? 'seul' : 'sans soutien';
  // Carnets : la personne range ses confidences (famille, amis, couple…)
  const owner = userId ?? 'guest';
  const pickable = (list: string[]) => sortCarnets(list).filter(c => c !== PROGRAMME);
  const startCarnet = () => { const c = currentCarnet(owner); return c === PROGRAMME ? DEFAULT_CARNET : c; };
  const [carnet, setCarnet] = useState(startCarnet);
  const [carnets, setCarnets] = useState(() => pickable(loadCarnets(owner)));
  const [recent, setRecent] = useState<JournalItem[] | null>(null);
  const [pickCarnet, setPickCarnet] = useState(false);
  const [newCarnet, setNewCarnet] = useState<string | null>(null);
  useEffect(() => { setCarnet(startCarnet()); setCarnets(pickable(loadCarnets(owner))); }, [owner]); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseCarnet = (c: string) => { setCarnet(c); setCurrentCarnet(owner, c); setPickCarnet(false); setNewCarnet(null); };

  useEffect(() => { setState(load(key)); }, [key]);
  // Compte : les carnets et la séance du jour viennent aussi du journal (retrouvés sur tout téléphone)
  useEffect(() => {
    if (!userId) return;
    let off = false;
    listJournal(userId, 80).then(list => {
      if (off) return;
      setCarnets(pickable(loadCarnets(owner, list.map(i => i.carnet))));
      setRecent(list);
      // Pages du jour déjà commencées (autre téléphone) : on continue d'y écrire
      const today = dayKey();
      const pages: Record<string, string> = {};
      for (const i of [...list].reverse()) if (i.source === 'confier' && i.date && dayKey(new Date(i.date)) === today) pages[i.carnet] = i.id;
      if (Object.keys(pages).length) setState(cur => ({ ...cur, pages: { ...pages, ...(cur.pages ?? {}) } }));
      if (stateRef.current.items.length) return;
      const rebuilt = rebuildToday(list, dayKey(), iso => dayKey(new Date(iso)));
      if (rebuilt) setState(cur => (cur.items.length ? cur : { ...rebuilt, pages: cur.pages }));
    }).catch(() => {});
    return () => { off = true; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ ...state, day: dayKey() })); } catch { /* ignore */ } }, [key, state]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [state.items.length]);

  // Dr Lô écoute pendant qu'on écrit
  useEffect(() => {
    if (asking) onStatus('reading', 'Je relis ce que tu as écrit…');
    else if (dictation.listening || draft.trim()) onStatus('listening', 'Je t\'écoute…');
    else onStatus('idle', null);
  }, [asking, dictation.listening, draft, onStatus]);
  useEffect(() => () => onStatus('idle', null), [onStatus]);

  const update = (fn: (s: ConfierState) => ConfierState) => setState(prev => fn(prev));

  const onDeposit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (dictation.listening) dictation.stop();
    setDraft('');
    const { state: next, entryId, crisis } = deposit(stateRef.current, text);
    setState(next);
    trackAccueil('confier_entry', { guest: !userId }); // jamais le contenu
    if (crisis) trackAccueil('crisis', { at: 'confier' });
    try {
      // Même jour, même carnet : le passage s'ajoute à la page du jour (sinon une nouvelle page)
      const pageId = stateRef.current.pages?.[carnet];
      const page = pageId ? await getConfidence(userId, pageId).catch(() => null) : null;
      let journalId: string;
      if (pageId && page) {
        await updateConfidence(userId, pageId, { contenu: joinParagraphs(page.contenu, text) });
        journalId = pageId;
      } else {
        journalId = await saveConfidence(userId, text, carnet);
      }
      update(s => setDayPage(markSaved(s, entryId, journalId), carnet, journalId));
      setRecent(null);
    } catch {
      update(s => markError(s, entryId));
    }
  };

  const onCancel = async (entryId: string, journalId: string | null) => {
    if (!journalId) return;
    const entry = entries(stateRef.current).find(e => e.id === entryId);
    try {
      // On retire seulement ce passage de la page du jour ; la page disparaît si elle devient vide
      const page = await getConfidence(userId, journalId);
      const whole = !!page && !!entry && page.contenu.trim() === entry.text.trim();
      const rest = page && entry && !whole ? removeParagraph(page.contenu, entry.text) : '';
      if (page && entry && rest && rest === page.contenu.trim()) {
        // Le passage a été modifié entre-temps dans Mon journal : on ne touche à rien
        update(s => addNote(s, 'Ce passage a été modifié dans ton journal : retire-le depuis Mon journal si tu veux.'));
        return;
      }
      if (rest) await updateConfidence(userId, journalId, { contenu: rest });
      else await removeConfidence(userId, journalId);
      if (!rest) update(s => ({ ...s, pages: Object.fromEntries(Object.entries(s.pages ?? {}).filter(([, v]) => v !== journalId)) }));
      setRecent(null);
      update(s => markCancelled(s, entryId));
      trackAccueil('confier_cancel');
    } catch {
      update(s => addNote(s, 'Je n\'ai pas pu retirer ce passage (connexion instable). Tu peux le supprimer depuis ton journal.'));
    }
  };

  const onAsk = async () => {
    if (!userId || asking) return;
    const p = pendingForAdvice(stateRef.current);
    if (!p.count) return;
    setAsking(true);
    trackAccueil('confier_advice');
    const out = await askAdvice(userId, p.text, p.lastJournalId);
    setAsking(false);
    refreshBalance();
    if (out.ok) update(s => addAdvice(s, out.text));
    else if (out.reason === 'no_koris') {
      openNoKorisModal('L\'avis de Dr Lô', KORIS_COSTS.journal);
      update(s => addNote(s, `Il te manque des ${CREDIT.many} pour mon avis. Tu peux continuer à écrire : c'est gratuit, et tout reste dans ton journal.`));
    } else update(s => addNote(s, 'Je n\'arrive pas à te répondre maintenant. Ce que tu as écrit est bien dans ton journal ; redemande-moi dans un moment.'));
  };

  useEffect(() => {
    if (view !== 'journal' || recent !== null) return;
    let off = false;
    listJournal(userId, 80).then(l => { if (!off) setRecent(l); }).catch(() => { if (!off) setRecent([]); });
    return () => { off = true; };
  }, [view, recent, userId]);

  const pending = pendingForAdvice(state);
  const resources = getCrisisResources();

  const tabs = (
    <div role="tablist" aria-label="Me confier" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(201,184,228,.08)', border: `1px solid ${CONFIER.line}` }}>
      {(['write', 'journal'] as const).map(v => (
        <button key={v} role="tab" aria-selected={view === v} onClick={() => onView?.(v)} className="drl-btn"
          style={{ minHeight: 36, borderRadius: 9, border: 0, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: view === v ? 'rgba(201,184,228,.25)' : 'transparent', color: view === v ? CONFIER.text : CONFIER.muted }}>
          {v === 'write' ? <><Feather size={14} aria-hidden="true" /> Me confier</> : <><BookOpen size={14} aria-hidden="true" /> Mon journal</>}
        </button>
      ))}
    </div>
  );

  if (view === 'journal') {
    // Aperçu du vrai journal (même design que la page « Mon journal ») : la page du jour, puis les dernières pages
    const pages = (recent ?? []).slice(0, 4);
    return (
      <div className="drl-in" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {tabs}
        <Link to="/journal" className="drl-btn" style={{ minHeight: 50, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', fontSize: 15, fontWeight: 700, background: 'linear-gradient(180deg, #D8CAF0 0%, #B9A6D6 100%)', color: CONFIER.ink }}>
          <BookOpen size={17} aria-hidden="true" /> Ouvrir mon journal
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/journal" state={{ view: 'calendrier' }} onClick={() => { try { localStorage.setItem('he_journal_view', 'calendrier'); } catch { /* ignore */ } }} className="drl-btn"
            style={{ flex: 1, minHeight: 42, borderRadius: 12, border: `1px solid ${CONFIER.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', color: CONFIER.text, fontSize: 14, fontWeight: 600 }}>
            <CalendarDays size={15} aria-hidden="true" /> Calendrier
          </Link>
          <Link to="/journal/ecrire" className="drl-btn"
            style={{ flex: 1, minHeight: 42, borderRadius: 12, border: `1px solid ${CONFIER.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', color: CONFIER.text, fontSize: 14, fontWeight: 600 }}>
            <Feather size={15} aria-hidden="true" /> Page complète
          </Link>
        </div>
        {recent === null ? <p style={{ margin: '6px 0', textAlign: 'center', fontSize: 14, color: CONFIER.faint }}>J'ouvre ton journal…</p>
          : pages.length === 0 ? (
            <p style={{ margin: '6px 0', textAlign: 'center', fontSize: 14, color: CONFIER.muted, lineHeight: 1.5 }}>Ton journal est encore vide. Ce que tu confies ici devient ta page du jour.</p>
          ) : (
            <>
              <p style={{ margin: '4px 0 0', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: CONFIER.accent }}>Mes dernières pages</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>{pages.map(it => <EntryCard key={it.id} it={it} />)}</div>
              {(recent?.length ?? 0) > pages.length && (
                <Link to="/journal" style={{ alignSelf: 'center', minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 4, color: CONFIER.accent, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  Voir les {recent!.length} pages <ChevronRight size={15} aria-hidden="true" />
                </Link>
              )}
            </>
          )}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: CONFIER.faint }}>
          Visible par toi {seul}{!userId && ' · Sans compte, ton journal reste sur ce téléphone'}
        </p>
      </div>
    );
  }

  return (
    <div className="drl-in" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
      {tabs}
      <div ref={listRef} aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '46vh', overflowY: 'auto', paddingRight: 2 }}>
        {/* La page du jour : tout ce qu'on confie aujourd'hui dans ce carnet va sur une même page du journal */}
        <div style={{ borderRadius: 18, border: `1px solid ${CONFIER.line}`, background: CONFIER.tint, padding: 14, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 800, color: CONFIER.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Feather size={13} aria-hidden="true" /> Ma page du jour · {carnet}
          </p>
          <p style={{ margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: CONFIER.text }}>{fullDate(new Date())}</p>
          {state.items.length === 0 ? (
            <p style={{ margin: '8px 0 0', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, color: CONFIER.muted }}>
              « Écris ce que tu veux, comme ça vient. Je lis, je ne juge pas, et je ne t'interromps pas. »
            </p>
          ) : null}
          <p style={{ margin: '8px 0 0', fontSize: 13, color: CONFIER.faint, lineHeight: 1.45 }}>
            Tout ce que tu confies aujourd'hui s'ajoute à cette page de ton journal. Écrire est gratuit.
            {!userId && ' Sans compte, ton journal reste sur ce téléphone.'}
          </p>
          {state.pages?.[carnet] && (
            <Link to={`/journal/${state.pages[carnet]}`} style={{ marginTop: 6, minHeight: 32, display: 'inline-flex', alignItems: 'center', gap: 4, color: CONFIER.accent, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Voir ma page dans le journal <ChevronRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>

        {state.items.map(it => {
          if (it.kind === 'entry') {
            const time = new Date(it.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={it.id} className="drl-in" style={{ alignSelf: 'flex-end', maxWidth: '88%', textAlign: 'left' }}>
                <div style={{ borderRadius: '16px 16px 4px 16px', background: 'rgba(201,184,228,.16)', border: `1px solid ${CONFIER.line}`, padding: '10px 13px' }}>
                  <p style={{ margin: 0, fontSize: 13, color: CONFIER.faint }}>{time}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 15, lineHeight: 1.5, color: it.status === 'cancelled' ? CONFIER.faint : CONFIER.text, textDecoration: it.status === 'cancelled' ? 'line-through' : 'none', whiteSpace: 'pre-wrap' }}>{it.text}</p>
                </div>
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                  {it.status === 'saving' && <span style={{ color: CONFIER.faint }}>Enregistrement…</span>}
                  {it.status === 'saved' && (
                    <>
                      <span style={{ color: '#9DBFAF', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Check size={13} strokeWidth={2.6} aria-hidden="true" /> Ajouté à ta page du jour</span>
                      <button onClick={() => onCancel(it.id, it.journalId)} style={{ minHeight: 32, padding: '0 4px', border: 0, background: 'transparent', color: CONFIER.muted, fontSize: 13, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Annuler</button>
                    </>
                  )}
                  {it.status === 'cancelled' && <span style={{ color: CONFIER.faint }}>Retiré de ta page</span>}
                  {it.status === 'error' && <span style={{ color: '#F09A7A' }}>Pas enregistré (connexion). Copie-le avant de quitter.</span>}
                </div>
              </div>
            );
          }
          if (it.kind === 'ack' || it.kind === 'note') {
            return (
              <div key={it.id} className="drl-in" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/dr-lo.png" alt="" width={24} height={24} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `1.5px solid ${CONFIER.accent}` }} />
                <span style={{ fontSize: 14, fontStyle: it.kind === 'ack' ? 'italic' : 'normal', color: CONFIER.muted, textAlign: 'left', lineHeight: 1.45 }}>{it.text}</span>
              </div>
            );
          }
          if (it.kind === 'advice') {
            return (
              <div key={it.id} className="drl-in" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <img src="/dr-lo.png" alt="" width={28} height={28} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `1.5px solid ${CONFIER.accent}`, flexShrink: 0 }} />
                <div style={{ borderRadius: '4px 16px 16px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', padding: '10px 13px', fontSize: 15, lineHeight: 1.55, color: CONFIER.text, textAlign: 'left', whiteSpace: 'pre-wrap' }}>{it.text}</div>
              </div>
            );
          }
          return (
            <div key={it.id} className="drl-in" style={{ borderRadius: 18, border: '1px solid rgba(180,195,220,.4)', background: 'rgba(180,195,220,.10)', padding: 14, textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: CONFIER.text }}>
                Ce que tu viens d'écrire est important, et je suis content que tu l'aies posé ici. Tu n'as pas à traverser ça {sansAide}.
              </p>
              <p style={{ margin: '8px 0 6px', fontSize: 13, fontWeight: 700, color: '#B4C3DC' }}>Là, tu as besoin d'une vraie personne. Appelle maintenant :</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {resources.filter(r => r.phone).map(r => (
                  <li key={r.label}>
                    <a href={`tel:${r.phone!.replace(/\s/g, '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 32, fontWeight: 700, color: '#DCE5F2', textDecoration: 'none', fontSize: 14 }}>
                      <Phone size={14} aria-hidden="true" /> {r.label} · {r.phone}
                    </a>
                  </li>
                ))}
              </ul>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: CONFIER.muted }}>Ou va voir quelqu'un de confiance autour de toi, tout de suite.</p>
            </div>
          );
        })}
      </div>

      {pending.count > 0 && (
        userId ? (
          <button onClick={onAsk} disabled={asking} className="drl-btn"
            style={{ alignSelf: 'center', minHeight: 42, padding: '0 16px', borderRadius: 999, border: `1px solid ${CONFIER.line}`, background: CONFIER.tint, color: CONFIER.text, fontSize: 14, fontWeight: 700, cursor: asking ? 'default' : 'pointer', opacity: asking ? 0.6 : 1 }}>
            {asking ? 'Dr Lô relit…' : `Demander l'avis de Dr Lô · ${credits(KORIS_COSTS.journal)}`}
          </button>
        ) : (
          <button onClick={onSignup} className="drl-btn"
            style={{ alignSelf: 'center', minHeight: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${CONFIER.line}`, background: 'transparent', color: CONFIER.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Crée ton espace pour avoir l'avis de Dr Lô
          </button>
        )
      )}

      {/* Carnet où va le texte */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" onClick={() => setPickCarnet(v => !v)} aria-expanded={pickCarnet} className="drl-btn"
          style={{ alignSelf: 'flex-start', minHeight: 34, padding: '0 12px', borderRadius: 999, border: `1px solid ${CONFIER.line}`, background: CONFIER.tint, color: CONFIER.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={13} aria-hidden="true" /> Carnet : <b>{carnet}</b> ▾
        </button>
        {pickCarnet && (
          <div className="drl-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {carnets.map(c => (
              <button key={c} type="button" onClick={() => chooseCarnet(c)} className="drl-btn"
                style={{ minHeight: 34, padding: '0 12px', borderRadius: 999, border: `1px solid ${c === carnet ? CONFIER.accent : CONFIER.line}`, background: c === carnet ? 'rgba(201,184,228,.25)' : 'transparent', color: CONFIER.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {c}
              </button>
            ))}
            {newCarnet === null ? (
              <button type="button" onClick={() => setNewCarnet('')} className="drl-btn"
                style={{ minHeight: 34, padding: '0 12px', borderRadius: 999, border: `1px dashed ${CONFIER.line}`, background: 'transparent', color: CONFIER.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Nouveau carnet
              </button>
            ) : (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <input autoFocus value={newCarnet} maxLength={24} onChange={e => setNewCarnet(e.target.value)} placeholder="Ex. Mes sœurs" aria-label="Nom du nouveau carnet"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const list = addCarnet(owner, newCarnet); setCarnets(pickable(list)); const n = list.find(x => x.toLowerCase() === newCarnet.trim().toLowerCase()); if (n) chooseCarnet(n); } }}
                  className="drl-input" style={{ minHeight: 34, width: 140, borderRadius: 999, border: `1px solid ${CONFIER.accent}`, background: 'rgba(255,255,255,.06)', color: CONFIER.text, padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                <button type="button" onClick={() => { const list = addCarnet(owner, newCarnet); setCarnets(pickable(list)); const n = list.find(x => x.toLowerCase() === newCarnet.trim().toLowerCase()); if (n) chooseCarnet(n); }}
                  style={{ minHeight: 34, padding: '0 12px', borderRadius: 999, border: 0, background: CONFIER.accent, color: CONFIER.ink, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>OK</button>
              </span>
            )}
          </div>
        )}
      </div>

      <form onSubmit={onDeposit} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <label htmlFor="drl-confier" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Écrire dans ton journal</label>
        <textarea
          id="drl-confier"
          rows={3}
          value={draft}
          maxLength={MAX_ENTRY_CHARS}
          onChange={e => setDraft(e.target.value)}
          placeholder={dictation.listening ? 'Parle, je t\'écoute…' : 'Ce que tu as sur le cœur…'}
          className="drl-input"
          style={{ flex: 1, minWidth: 0, minHeight: 84, boxSizing: 'border-box', borderRadius: 20, border: `1.5px solid ${draft.trim() || dictation.listening ? CONFIER.accent : 'rgba(255,255,255,.18)'}`, background: 'rgba(255,255,255,.06)', padding: '12px 16px', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.45, color: CONFIER.text, outline: 'none', resize: 'none' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dictation.supported && (
            <button type="button" onClick={() => (dictation.listening ? dictation.stop() : dictation.start(draft))} aria-pressed={dictation.listening}
              aria-label={dictation.listening ? 'Arrêter la dictée' : 'Dicter'} className="drl-btn"
              style={{ width: 46, height: 46, borderRadius: '50%', border: `1px solid ${dictation.listening ? CONFIER.accent : 'rgba(255,255,255,.18)'}`, background: dictation.listening ? CONFIER.tint : 'rgba(255,255,255,.04)', color: dictation.listening ? CONFIER.accent : '#E9E1D4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Mic size={19} aria-hidden="true" />
            </button>
          )}
          <button type="submit" disabled={!draft.trim()} aria-label="Déposer dans mon journal" className="drl-btn"
            style={{ width: 46, height: 46, borderRadius: '50%', border: 0, background: 'linear-gradient(180deg, #D8CAF0 0%, #B9A6D6 100%)', color: CONFIER.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: draft.trim() ? 1 : 0.55 }}>
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
      {dictation.error && <p role="alert" style={{ margin: 0, fontSize: 13, color: CONFIER.muted, textAlign: 'center' }}>{dictation.error}</p>}

      <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: CONFIER.faint }}>
        Visible par toi {seul}
        {hasLiveEntries(state) && <> · <Link to="/journal" style={{ color: CONFIER.accent, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, textDecoration: 'none' }}><BookOpen size={12} aria-hidden="true" /> Ouvrir mon journal</Link></>}
      </p>
    </div>
  );
};

export default ConfierPanel;
