/**
 * BoitePage — /boite-a-questions : la boîte anonyme, sans compte, sans promesse de réponse.
 * Dr Lô lit tout ; il répond par écrit sur cette page ou dans une vidéo, quand il le peut.
 *
 * On lit d'abord, on pose ensuite (refonte du 24/11/2026) :
 *   1. Un titre qui rassure et trois repères (réponses publiées, aucun nom demandé, délai).
 *   2. « Tes questions » épinglé : celles déposées depuis cet appareil, avec leur état.
 *   3. Une réponse « à la une » (la plus utile), puis le fil : thèmes, recherche, cartes repliées (la question d'abord), « voir plus ».
 *   4. Un bouton « Poser ma question, sans nom » toujours visible en bas, qui ouvre l'écran d'écriture (cadenas, amorces, compteur).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock, Lock, Pin, Phone, Search, Video, X } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { RealDrLoPhoto } from '../../components/accueil/RealDrLoBadge';
import {
  compterVue, forgetMyQuestion, getBox, getMineStatus, readMyQuestions, readReactions, reagir, rememberMyQuestion, sendBoxQuestion,
  type BoxAnswer, type BoxTopic, type MineStatus, type MyQuestion, type Reaction,
} from '../../services/boxService';
import { pageTitle } from './outilsShared';

const MAX = 500;
const PAGE = 6;
const NEW_DAYS = 7;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const dayLabel = (ms: number) => (ms ? new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '');
const isRecent = (ms: number) => ms > 0 && Date.now() - ms < NEW_DAYS * 86400000;
// Les réponses déjà vues sur cet appareil : le badge « Nouveau » ne reste que sur celles qu'on n'a pas encore vues
const SEEN_KEY = 'box_seen_answers_v1';
const readSeen = (): Set<string> => { try { return new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set<string>(); } };
const writeSeen = (s: Set<string>) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...readSeen(), ...s])].slice(-600))); } catch { /* stockage indisponible : tant pis */ } };
// Le début de la réponse, coupé proprement sur un mot
const debut = (t: string, n = 120) => { const c = t.replace(/\s+/g, ' ').trim(); if (c.length <= n) return c; const cut = c.slice(0, n); return `${cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : n).replace(/[\s,;:.]+$/, '')}…`; };
const short = (t: string, n = 150) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);

const Pill: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, border: `1px solid ${color}`, color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
);

/**
 * Tes réactions à une réponse : « Utile » et « Moi aussi » (j'ai la même question) sont publiques, sans nom, avec un chiffre seulement au-dessus de 10 ;
 * « Pas clair » reste privé (seul Dr Lô le voit). Une seule réaction par réponse, qu'on peut changer ou annuler en la retouchant.
 */
const Reactions: React.FC<{ a: BoxAnswer; accent: string }> = ({ a, accent }) => {
  const [mienne, setMienne] = useState<Reaction | null>(() => readReactions()[a.id] ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toucher = async (k: Reaction) => {
    const suite = mienne === k ? null : k;
    setBusy(true); setError('');
    try { await reagir(a.id, suite); setMienne(suite); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const btn = (actif: boolean): React.CSSProperties => ({ minHeight: 44, padding: '0 14px', borderRadius: 999, cursor: busy ? 'default' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', color: actif ? '#1C1612' : DC.text, border: `1px solid ${actif ? accent : DC.line}`, background: actif ? accent : 'transparent' });
  const items: { k: Reaction; label: string; n: string | null | undefined }[] = [{ k: 'utile', label: 'Utile', n: a.utile }, { k: 'moi', label: 'Moi aussi', n: a.moi }, { k: 'pasclair', label: 'Pas clair', n: null }];
  return (
    <div style={{ marginTop: 14 }}>
      <div role="group" aria-label="Ta réaction à cette réponse" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map(i => <button key={i.k} type="button" disabled={busy} aria-pressed={mienne === i.k} onClick={() => void toucher(i.k)} className="drl-btn" style={btn(mienne === i.k)}>{i.label}{i.n ? ` · ${i.n}` : ''}</button>)}
      </div>
      <p role="status" style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.45, color: DC.faint }}>
        {mienne ? 'Merci. ' : ''}« Moi aussi » veut dire : j'ai la même question. « Pas clair » reste privé : seul Dr Lô le voit.{a.vues ? ` · Lue par ${a.vues} personnes.` : ''}
      </p>
      {error && <p role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: '#F09A7A' }}>{error}</p>}
    </div>
  );
};

const BoitePage: React.FC = () => {
  const palette = usePalette();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | { support: boolean }>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<BoxAnswer[]>([]);
  const [topics, setTopics] = useState<BoxTopic[]>([]);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mine, setMine] = useState<MyQuestion[]>(() => readMyQuestions());
  const [status, setStatus] = useState<Record<string, MineStatus>>({});
  const [topic, setTopic] = useState('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getBox().then(b => { setAnswers(b.answers); setTopics(b.topics); setWaiting(b.waiting); }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  // L'état de chaque question de cet appareil. Une question supprimée côté serveur disparaît de la liste.
  const ids = mine.map(q => q.id).join(',');
  useEffect(() => {
    if (!ids) return;
    getMineStatus(ids.split(',')).then(list => {
      const map: Record<string, MineStatus> = {};
      list.forEach(s => { map[s.id] = s; });
      setStatus(map);
      list.filter(s => s.state === 'gone').forEach(s => setMine(forgetMyQuestion(s.id)));
    }).catch(() => {});
  }, [ids]);

  const send = async () => {
    if (text.trim().length < 8) { setError('Écris au moins une phrase (8 caractères).'); return; }
    setBusy(true); setError('');
    try {
      const asked = text.trim();
      const r = await sendBoxQuestion(asked);
      if (r.id) setMine(rememberMyQuestion({ id: r.id, text: asked, at: Date.now() }));
      setSent({ support: r.support }); setText('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  const mineIds = useMemo(() => new Set(mine.map(q => q.id)), [mine]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    answers.forEach(a => { c[a.topic] = (c[a.topic] || 0) + 1; });
    return c;
  }, [answers]);
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return answers.filter(a => (topic === 'all' || a.topic === topic) && (!q || norm(`${a.question} ${a.answer}`).includes(q)));
  }, [answers, topic, query]);
  const visible = filtered.slice(0, shown);
  useEffect(() => {
    const root = listRef.current; if (!root || typeof IntersectionObserver === 'undefined') return;
    const timers = new Map<Element, number>();
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      const id = (e.target as HTMLElement).dataset.boxId; if (!id) return;
      if (e.isIntersecting) timers.set(e.target, window.setTimeout(() => { if (!vues.current.has(id)) { vues.current.add(id); writeSeen(vues.current); } }, 1500));
      else { const t = timers.get(e.target); if (t) window.clearTimeout(t); timers.delete(e.target); }
    }), { threshold: 0.7 });
    root.querySelectorAll('[data-box-id]').forEach(el => io.observe(el));
    return () => { timers.forEach(t => window.clearTimeout(t)); io.disconnect(); };
  }, [visible.length, topic, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const [seen, setSeen] = useState<Set<string>>(() => readSeen());
  const markSeen = (id: string) => setSeen(prev => { if (prev.has(id)) return prev; const n = new Set(prev); n.add(id); writeSeen(n); return n; });
  const toggle = (id: string) => { if (!open[id]) compterVue(id); setOpen(o => ({ ...o, [id]: !o[id] })); markSeen(id); };
  // Une réponse restée à l'écran un instant est « vue » : le badge ne reviendra pas à la prochaine visite (il reste jusque-là pour ne pas bouger sous les yeux)
  const vues = useRef<Set<string>>(readSeen());
  const listRef = useRef<HTMLDivElement | null>(null);
  const topicLabel = (id: string) => topics.find(t => t.id === id)?.label ?? 'Autres questions';

  const chip = (active: boolean): React.CSSProperties => ({
    minHeight: 40, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
    border: `1px solid ${active ? palette.accent : DC.line}`, background: active ? palette.accent : 'transparent', color: active ? '#1C1612' : DC.text,
  });

  const answerBlock = (a: string) => (
    <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'flex-start' }}>
      <RealDrLoPhoto size={36} palette={palette} />
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: DC.text, whiteSpace: 'pre-line' }}>{a}</p>
    </div>
  );

  // La plus utile en vedette (à égalité : la plus récente) ; elle sort du fil tant qu'on ne filtre pas
  const une = useMemo(() => {
    if (answers.length === 0) return null;
    const score = (a: BoxAnswer) => parseInt(String(a.utile ?? '0'), 10) || 0;
    return [...answers].sort((x, y) => score(y) - score(x) || y.at - x.at)[0];
  }, [answers]);
  const avecUne = !!une && topic === 'all' && !query.trim();
  const fil = avecUne ? filtered.filter(a => a.id !== une.id) : filtered;
  const montrees = fil.slice(0, shown);
  const COULEURS = [DC.intime, DC.sage, DC.gold, DC.social, DC.confier];
  const couleurDe = (id: string) => COULEURS[Math.max(0, topics.findIndex(t => t.id === id)) % COULEURS.length];

  // L'écran pour poser sa question
  const [ecrire, setEcrire] = useState(false);
  const [toutesMes, setToutesMes] = useState(false);
  const zone = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!ecrire) return;
    const avant = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => zone.current?.focus(), 150);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEcrire(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = avant; window.clearTimeout(t); document.removeEventListener('keydown', onKey); };
  }, [ecrire]);
  const AMORCES = ['Pourquoi j’ai peur d’être quittée ?', 'Je ne ressens pas de plaisir…', 'Comment dire non sans blesser ?', 'Je me sens seul(e), même entouré(e)…'];

  const carte = (a: BoxAnswer) => {
    const isOpen = !!open[a.id];
    const own = mineIds.has(a.id);
    return (
      <article key={a.id} data-box-id={a.id} style={{ ...card, padding: 0, border: `1px solid ${own ? palette.accent : DC.line}` }}>
        <button type="button" onClick={() => toggle(a.id)} aria-expanded={isOpen} className="drl-btn"
          style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, minHeight: 56, border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
              <i aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: couleurDe(a.topic), display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.02em', color: DC.soft }}>{topicLabel(a.topic)}</span>
              <span style={{ fontSize: 12, color: DC.faint }}>· {dayLabel(a.at)}</span>
              {isRecent(a.at) && !seen.has(a.id) && <Pill color={palette.accent}>Nouveau</Pill>}
              {own && <Pill color={palette.accent}>Ta question</Pill>}
            </span>
            <span style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, lineHeight: 1.3, color: DC.title }}>{a.question}</span>
            {!isOpen && (
              <>
                <span style={{ display: 'block', marginTop: 8, fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Dr Lô : « {debut(a.answer)} »</span>
                <span style={{ display: 'block', marginTop: 6, fontSize: 14, color: palette.accent, fontWeight: 700 }}>Lire la réponse</span>
              </>
            )}
          </span>
          <ChevronDown size={20} color={DC.soft} aria-hidden="true" style={{ flexShrink: 0, marginTop: 20, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        {isOpen && <div style={{ padding: '0 16px 16px' }}>{answerBlock(a.answer)}<Reactions a={a} accent={palette.accent} /></div>}
      </article>
    );
  };

  return (
    <DrLoShell back={{ to: '/', label: 'Accueil' }} palette={palette}>
      <h1 style={pageTitle}>La boîte anonyme</h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: DC.soft, lineHeight: 1.5 }}>Les questions que les gens n'osent pas poser, et les réponses de Dr Lô. Sans compte, sans nom. Il lit tout et répond à certaines : ici par écrit, ou dans une vidéo.</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {[{ v: loaded ? String(answers.length) : '…', l: answers.length > 1 ? 'réponses publiées' : 'réponse publiée' }, { v: 'Aucun', l: 'nom demandé' }, { v: '7 jours', l: 'pour répondre' }].map(t => (
          <div key={t.l} style={{ flex: 1, minWidth: 0, borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, padding: '9px 6px', textAlign: 'center' }}>
            <b style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: DC.title }}>{t.v}</b>
            <span style={{ fontSize: 11.5, color: DC.soft }}>{t.l}</span>
          </div>
        ))}
      </div>

      {/* Tes questions : épinglées, avec leur état */}
      {mine.length > 0 && (
        <section aria-labelledby="box-mine" style={{ marginTop: 22 }}>
          <h2 id="box-mine" style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>
            <Pin size={18} color={palette.accent} aria-hidden="true" /> Tes questions
          </h2>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.45, color: DC.faint }}>Gardées seulement sur cet appareil : si tu changes de téléphone ou vides les données du navigateur, elles ne s'affichent plus ici.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(toutesMes ? mine : mine.slice(0, 2)).map(q => {
              const s = status[q.id];
              const answered = s?.state === 'answered';
              return (
                <article key={q.id} style={{ ...card, border: `1px solid ${answered ? palette.accent : DC.line}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: DC.faint }}>Déposée le {dayLabel(q.at)}</span>
                    {!s && <Pill color={DC.faint}><Clock size={12} aria-hidden="true" /> Vérification…</Pill>}
                    {s?.state === 'waiting' && <Pill color={DC.soft}><Clock size={12} aria-hidden="true" /> En attente</Pill>}
                    {answered && <Pill color={palette.accent}>Dr Lô a répondu</Pill>}
                    {s?.state === 'video' && <Pill color={palette.accent}><Video size={12} aria-hidden="true" /> Réponse en vidéo</Pill>}
                    {s?.state === 'closed' && <Pill color={DC.faint}>Pas de réponse écrite</Pill>}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: DC.title }}>{answered && s?.question ? s.question : short(q.text)}</p>
                  {answered && s?.answer && answerBlock(s.answer)}
                  {s?.state === 'waiting' && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Dr Lô lit toutes les questions et répond à certaines. Reviens voir ici : si une réponse est publiée, elle apparaîtra à cet endroit.</p>}
                  {s?.state === 'video' && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Dr Lô répond à ta question dans une vidéo, sur ses réseaux.</p>}
                  {s?.state === 'closed' && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Dr Lô n'a pas pu répondre à cette question ici. Tu peux la reformuler et la redéposer, ou en parler à ton compagnon.</p>}
                  <button type="button" onClick={() => setMine(forgetMyQuestion(q.id))} className="drl-btn"
                    style={{ marginTop: 10, minHeight: 40, padding: '0 4px', border: 'none', background: 'transparent', color: DC.faint, fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
                    Retirer de cette liste
                  </button>
                </article>
              );
            })}
          </div>
          {mine.length > 2 && (
            <button type="button" onClick={() => setToutesMes(v => !v)} aria-expanded={toutesMes} className="drl-btn"
              style={{ marginTop: 10, minHeight: 44, padding: '0 4px', border: 'none', background: 'transparent', color: palette.accent, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {toutesMes ? 'Réduire' : `Voir toutes mes questions (${mine.length})`}
            </button>
          )}
        </section>
      )}

      {/* La réponse à la une, puis le fil des réponses de Dr Lô */}
      {loaded && answers.length === 0 && (
        <p style={{ margin: '22px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Pas encore de réponse publiée. Sois la première ou le premier : pose ta question, sans nom.</p>
      )}
      {loaded && answers.length > 0 && (
        <section aria-labelledby="box-answers" style={{ marginTop: 24 }}>
          {avecUne && une && (
            <article data-box-id={une.id} style={{ borderRadius: 20, padding: 16, border: `1px solid ${palette.accent}`, background: `linear-gradient(160deg, ${palette.accent}24, rgba(30,22,16,.92) 62%)`, marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>À LA UNE · LA PLUS UTILE</p>
              <p style={{ margin: '8px 0 12px', fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 600, lineHeight: 1.25, color: DC.title }}>{une.question}</p>
              {answerBlock(open[une.id] ? une.answer : debut(une.answer, 170))}
              <button type="button" onClick={() => toggle(une.id)} aria-expanded={!!open[une.id]} className="drl-btn"
                style={{ marginTop: 10, minHeight: 44, padding: 0, border: 'none', background: 'transparent', color: palette.accent, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {open[une.id] ? 'Réduire' : 'Lire la réponse ›'}
              </button>
              {open[une.id] ? <Reactions a={une} accent={palette.accent} /> : (une.utile || une.moi) ? (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: DC.soft }}>{[une.utile ? `Utile · ${une.utile}` : '', une.moi ? `Moi aussi · ${une.moi}` : ''].filter(Boolean).join('   ')}</p>
              ) : null}
            </article>
          )}

          <h2 id="box-answers" style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>{avecUne ? 'Les dernières réponses' : 'Les réponses de Dr Lô'}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.45, color: DC.soft }}>
            {answers.length} réponse{answers.length > 1 ? 's' : ''} publiée{answers.length > 1 ? 's' : ''}
            {waiting !== null && waiting > 0 ? ` · ${waiting} question${waiting > 1 ? 's' : ''} attend${waiting > 1 ? 'ent' : ''} encore Dr Lô` : ''}
          </p>

          <div role="group" aria-label="Choisir un thème" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 0 4px', margin: '0 -2px', scrollbarWidth: 'none' }}>
            <button type="button" onClick={() => { setTopic('all'); setShown(PAGE); }} aria-pressed={topic === 'all'} className="drl-btn" style={chip(topic === 'all')}>Toutes ({answers.length})</button>
            {topics.filter(t => counts[t.id]).map(t => (
              <button key={t.id} type="button" onClick={() => { setTopic(t.id); setShown(PAGE); }} aria-pressed={topic === t.id} className="drl-btn" style={chip(topic === t.id)}>{t.label} ({counts[t.id]})</button>
            ))}
          </div>

          <div style={{ position: 'relative', marginTop: 8 }}>
            <Search size={18} color={DC.faint} aria-hidden="true" style={{ position: 'absolute', left: 14, top: 15 }} />
            <input type="search" value={query} onChange={e => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Chercher un mot (ex. : mère, stress, rupture)" aria-label="Chercher dans les réponses"
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px 0 42px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' }} />
          </div>

          {fil.length === 0 ? (
            <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>{filtered.length === 0 ? 'Aucune réponse ne correspond. Essaie un autre mot, ou une autre catégorie.' : 'Pas d\'autre réponse pour l\'instant.'}</p>
          ) : (
            <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>{montrees.map(carte)}</div>
          )}

          {fil.length > shown && (
            <button type="button" onClick={() => setShown(n => n + PAGE)} className="drl-btn"
              style={{ marginTop: 14, width: '100%', minHeight: 50, borderRadius: 16, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Voir {Math.min(PAGE, fil.length - shown)} réponse{Math.min(PAGE, fil.length - shown) > 1 ? 's' : ''} de plus ({fil.length - shown} restante{fil.length - shown > 1 ? 's' : ''})
            </button>
          )}
        </section>
      )}

      {/* Le geste principal, toujours visible : poser sa question, sans nom */}
      {!ecrire && (
        <button type="button" onClick={() => { setSent(null); setEcrire(true); }} className="drl-btn"
          style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))', maxWidth: 448, margin: '0 auto', zIndex: 40, minHeight: 54, borderRadius: 999, border: 0, background: palette.accent, color: '#1C1612', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
          Poser ma question, sans nom
        </button>
      )}

      {/* L'écran d'écriture */}
      {ecrire && (
        <div role="dialog" aria-modal="true" aria-labelledby="box-ecrire" style={{ position: 'fixed', inset: 0, zIndex: 950, overflowY: 'auto', background: '#130D08' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: 'calc(14px + env(safe-area-inset-top, 0px)) 18px calc(40px + env(safe-area-inset-bottom, 0px))' }}>
            <button type="button" onClick={() => setEcrire(false)} aria-label="Fermer" className="drl-btn" style={{ width: 44, height: 44, borderRadius: 13, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} aria-hidden="true" /></button>
            {sent ? (
              <section style={{ marginTop: 18 }} aria-live="polite">
                <p id="box-ecrire" style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: DC.title }}>C'est déposé. Merci.</p>
                <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Ta question est épinglée en haut de la page, dans « Tes questions ». Reviens : si Dr Lô répond ici, tu la verras à cet endroit.</p>
                {sent.support && (
                  <div role="alert" style={{ marginTop: 14, padding: 12, borderRadius: 14, border: '1px solid rgba(232,102,79,.5)', background: 'rgba(232,102,79,.1)' }}>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: DC.text }}>Ce que tu écris me fait penser que tu souffres. Ne reste pas avec ça sans en parler : parle à une personne de confiance, ou appelle maintenant le SAMU au <b>1515</b>.</p>
                    <a href="tel:1515" className="drl-btn" style={{ marginTop: 10, minHeight: 48, padding: '0 16px', borderRadius: 14, background: '#E8664F', color: '#fff', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Phone size={18} aria-hidden="true" /> Appeler le 1515</a>
                  </div>
                )}
                <button type="button" onClick={() => setEcrire(false)} className="drl-btn" style={{ marginTop: 16, width: '100%', minHeight: 50, borderRadius: 999, border: 0, background: palette.accent, color: '#1C1612', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>Voir les réponses</button>
                <button type="button" onClick={() => setSent(null)} className="drl-btn" style={{ marginTop: 10, width: '100%', minHeight: 46, borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, fontWeight: 700, cursor: 'pointer' }}>Poser une autre question</button>
              </section>
            ) : (
              <section style={{ marginTop: 14 }}>
                <h2 id="box-ecrire" style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, lineHeight: 1.15, color: DC.title }}>Ta question</h2>
                <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Écris comme tu parles. Personne ne saura que c'est toi.</p>
                <p style={{ margin: '8px 0 0', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: DC.sage }}><Lock size={14} aria-hidden="true" /> Sans nom, sans compte, sans numéro</p>
                <label htmlFor="box-q" style={{ position: 'absolute', left: -9999 }}>Ta question</label>
                <textarea id="box-q" ref={zone} value={text} onChange={e => setText(e.target.value.slice(0, MAX))} rows={6} placeholder="Je n'arrive pas à… écris ici, en quelques phrases. Pas de numéro ni de lien."
                  style={{ width: '100%', boxSizing: 'border-box', marginTop: 12, borderRadius: 16, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: 14, fontFamily: 'inherit', fontSize: 16, lineHeight: 1.5, color: DC.text, outline: 'none', resize: 'vertical' }} />
                <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.faint, textAlign: 'right' }}>{text.length} / {MAX}</p>
                {text.trim() === '' && (
                  <>
                    <p style={{ margin: '8px 0 6px', fontSize: 14, fontWeight: 700, color: DC.text }}>Pas d'idée ? Pars d'une de celles-ci :</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {AMORCES.map(a => <button key={a} type="button" onClick={() => { setText(a); zone.current?.focus(); }} className="drl-btn" style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.soft, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>{a}</button>)}
                    </div>
                  </>
                )}
                {error && <p role="alert" style={{ margin: '10px 0 0', color: '#F09A7A', fontSize: 15 }}>{error}</p>}
                <button type="button" onClick={send} disabled={busy} className="drl-btn"
                  style={{ marginTop: 14, width: '100%', minHeight: 54, borderRadius: 999, border: 'none', background: palette.accent, color: '#1C1612', fontSize: 16, fontWeight: 800, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.55 : 1 }}>
                  {busy ? 'Envoi…' : 'Déposer ma question'}
                </button>
                <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.5, color: DC.faint, textAlign: 'center' }}>Dr Lô lit tout et répond à certaines questions, ici ou dans une vidéo. Rien n'est publié sans son accord, et jamais avec ton nom. Ce n'est pas une consultation : en cas d'urgence, appelle le SAMU (1515).</p>
              </section>
            )}
          </div>
        </div>
      )}
    </DrLoShell>
  );
};

export default BoitePage;
