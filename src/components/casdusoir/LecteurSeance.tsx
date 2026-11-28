/**
 * LecteurSeance — une séance du « cabinet de Dr Lô », en plein écran, comme une conversation :
 *   - Dr Lô parle (son passage audio, et son texte qui s'affiche), puis pose une question ;
 *   - la personne choisit l'une des deux réponses, avec ses mots : sa réponse s'affiche de son côté, et la suite dépend d'elle ;
 *   - à la fin, ce qu'elle retient (facultatif) et la suite (test, cas, boîte).
 * Sans audio (ou « Lire sans le son ») : le texte de chaque passage s'affiche tout de suite, et l'on va de choix en choix.
 * Ses choix sont remis à la page à la fin (onTermine) pour être gardés dans son carnet. Aucun appel à l'IA.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Pause, Play } from 'lucide-react';
import { finSelon, type ChoixSeance, type Seance } from '../../data/seances';

const INK = '#FBF5EA';
const SOFT = '#CDBFAE';
const LINE = 'rgba(255,255,255,.14)';
const AVATAR = '/images/cas-du-soir/drlo-avatar.webp';
const moinsDAnimations = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Element = { sorte: 'drlo'; id: string } | { sorte: 'moi'; texte: string };
export type ReponseSeance = { question: string; reponse: string };

const LecteurSeance: React.FC<{
  seance: Seance;
  kicker: string;
  meta: string;
  accent: string;
  onBack: () => void;
  /** La séance est finie : les réponses choisies, dans l'ordre */
  onTermine?: (reponses: ReponseSeance[]) => void;
  /** Garder ce que la personne retient (une erreur est montrée sur la carte) */
  onRetiens?: (texte: string) => Promise<void>;
  /** Ce qui vient après la séance (test, cas, boîte) */
  apres: React.ReactNode;
}> = ({ seance, kicker, meta, accent, onBack, onTermine, onRetiens, apres }) => {
  const aDuSon = Object.values(seance.noeuds).some(x => !!x.audio);
  const [phase, setPhase] = useState<'entree' | 'seance'>('entree');
  const [fil, setFil] = useState<Element[]>([]);
  const [courant, setCourant] = useState<string | null>(null);
  const [attente, setAttente] = useState<ChoixSeance[] | null>(null);
  const [termine, setTermine] = useState(false);
  const [joue, setJoue] = useState(false);
  const avecSon = useRef(false);
  const tags = useRef<string[]>([]);
  const reponses = useRef<ReponseSeance[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const bas = useRef<HTMLDivElement | null>(null);

  // Pas de défilement de la page derrière
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = avant; };
  }, []);
  // Ce qui vient d'arriver se place sous les yeux
  useEffect(() => {
    if (phase !== 'seance') return;
    const t = window.setTimeout(() => bas.current?.scrollIntoView({ block: 'end', behavior: moinsDAnimations() ? 'auto' : 'smooth' }), 80);
    return () => window.clearTimeout(t);
  }, [fil, attente, termine, phase]);
  useEffect(() => () => { audio.current?.pause(); }, []);

  const apresPassage = (id: string) => {
    const x = seance.noeuds[id];
    if (!x) return;
    if (x.choix) { setAttente(x.choix); return; }
    if (x.selon) { entrer(finSelon(x.selon, tags.current)); return; }
    if (x.suite) { entrer(x.suite); return; }
    if (x.fin) { setTermine(true); setCourant(null); onTermine?.(reponses.current); }
  };
  function entrer(id: string) {
    const x = seance.noeuds[id];
    if (!x) return;
    setFil(f => [...f, { sorte: 'drlo', id }]);
    setCourant(id);
    const a = audio.current;
    if (avecSon.current && x.audio && a) {
      a.src = x.audio;
      a.onended = () => { setJoue(false); apresPassage(id); };
      void a.play().then(() => setJoue(true)).catch(() => { setJoue(false); apresPassage(id); });
    } else {
      apresPassage(id);
    }
  }
  const commencer = (son: boolean) => {
    avecSon.current = son; tags.current = []; reponses.current = [];
    setFil([]); setAttente(null); setTermine(false); setPhase('seance');
    entrer(seance.depart);
  };
  const choisir = (c: ChoixSeance) => {
    const q = courant ? seance.noeuds[courant]?.question : undefined;
    if (q) reponses.current = [...reponses.current, { question: q, reponse: c.label }];
    if (c.tag) tags.current = [...tags.current, c.tag];
    setAttente(null);
    setFil(f => [...f, { sorte: 'moi', texte: c.label }]);
    window.setTimeout(() => entrer(c.suite), avecSon.current ? 350 : 450);
  };
  const basculer = () => {
    const a = audio.current; if (!a) return;
    if (a.paused) void a.play().then(() => setJoue(true)).catch(() => {}); else { a.pause(); setJoue(false); }
  };

  const bouton: React.CSSProperties = { display: 'block', width: '100%', minHeight: 50, borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', padding: '0 16px' };
  const rond: React.CSSProperties = { width: 44, height: 44, borderRadius: 14, border: `1px solid ${LINE}`, background: 'rgba(19,13,8,.55)', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' };

  return (
    <div role="region" aria-label={`${seance.titre} : séance en plein écran`} style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#0B0704', color: INK, overflow: 'hidden', fontFamily: 'inherit' }}>
      <audio ref={audio} preload="auto" onPause={() => setJoue(false)} onPlay={() => setJoue(true)} />
      {/* Sa photo : nette à l'entrée, voilée pendant la séance pour laisser lire */}
      <img src={seance.image} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '60% 20%',
        filter: phase === 'seance' ? 'blur(14px) brightness(.32)' : 'none', transform: phase === 'seance' ? 'scale(1.08)' : 'none', transition: 'filter 1s ease, transform 1s ease' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,6,3,.5) 0, rgba(10,6,3,0) 22%, rgba(10,6,3,.2) 50%, rgba(10,6,3,.95) 100%)' }} />

      <div style={{ position: 'absolute', left: 12, right: 12, top: 'calc(10px + env(safe-area-inset-top, 0px))', display: 'flex', alignItems: 'center', gap: 12, zIndex: 9 }}>
        <button type="button" onClick={() => { audio.current?.pause(); onBack(); }} aria-label="Retour" className="drl-btn" style={rond}><ChevronLeft size={22} aria-hidden="true" /></button>
        {phase === 'seance' && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '.06em', color: SOFT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kicker}</p>
            <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seance.titre}</p>
          </div>
        )}
        {phase === 'seance' && avecSon.current && courant && seance.noeuds[courant]?.audio && (
          <button type="button" onClick={basculer} aria-label={joue ? 'Pause' : 'Reprendre'} className="drl-btn" style={rond}>{joue ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}</button>
        )}
      </div>

      {phase === 'entree' && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 22px calc(26px + env(safe-area-inset-bottom, 0px))', zIndex: 5, maxWidth: 560, margin: '0 auto' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: accent }}>{kicker.toUpperCase()}</p>
          <h1 style={{ margin: '6px 0 8px', fontFamily: 'Fraunces, serif', fontSize: 'clamp(28px, 8vw, 36px)', lineHeight: 1.08, fontWeight: 600 }}>{seance.titre}</h1>
          <p style={{ margin: '0 0 6px', fontSize: 15, lineHeight: 1.5, color: INK }}>{seance.accroche}</p>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: SOFT }}>{meta}</p>
          <button type="button" onClick={() => commencer(aDuSon)} className="drl-btn" style={{ ...bouton, border: 0, background: accent, color: '#1C1612' }}>Commencer la séance</button>
          {aDuSon && <button type="button" onClick={() => commencer(false)} className="drl-btn" style={{ ...bouton, minHeight: 46, marginTop: 8, fontSize: 14, fontWeight: 500, border: `1px solid ${LINE}`, background: 'rgba(19,13,8,.5)', color: INK }}>Lire sans le son</button>}
        </div>
      )}

      {phase === 'seance' && (
        <div aria-live="polite" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(64px + env(safe-area-inset-top, 0px))', bottom: 0, overflowY: 'auto', overscrollBehavior: 'contain', zIndex: 3,
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 5%, #000 100%)', maskImage: 'linear-gradient(to bottom, transparent 0, #000 5%, #000 100%)' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 18px calc(40px + env(safe-area-inset-bottom, 0px))' }}>
            {fil.map((e, k) => e.sorte === 'drlo' ? (
              <div key={k} className="cdss-entre" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '0 0 16px' }}>
                <img src={AVATAR} alt="" style={{ width: 34, height: 34, borderRadius: 17, objectFit: 'cover', flex: 'none', marginTop: 2, border: `2px solid ${courant === e.id && joue ? accent : 'transparent'}`, transition: 'border-color .4s' }} />
                <div style={{ minWidth: 0 }}>
                  {seance.noeuds[e.id].blocs.map((b, j) => (
                    <p key={j} style={{ margin: j ? '10px 0 0' : 0, fontFamily: 'Fraunces, serif', fontSize: 19, lineHeight: 1.5, color: INK }}>{b}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div key={k} className="cdss-entre" style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 18px' }}>
                <p style={{ margin: 0, maxWidth: '82%', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', background: accent, color: '#1C1612', fontSize: 16, lineHeight: 1.4, fontWeight: 600 }}>{e.texte}</p>
              </div>
            ))}

            {attente && (
              <div role="group" aria-label="Ta réponse" className="cdss-entre" style={{ margin: '6px 0 0' }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, letterSpacing: '.08em', color: accent }}>TA RÉPONSE</p>
                {attente.map(c => (
                  <button key={c.label} type="button" onClick={() => choisir(c)} className="drl-btn"
                    style={{ display: 'block', width: '100%', textAlign: 'left', minHeight: 52, padding: '12px 16px', marginBottom: 8, borderRadius: 16, border: `1px solid ${LINE}`, background: 'rgba(32,23,16,.86)', color: INK, fontSize: 16, lineHeight: 1.4, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {termine && (
              <div className="cdss-entre" style={{ marginTop: 8 }}>
                {onRetiens && <Retiens accent={accent} onRetiens={onRetiens} />}
                <div style={{ marginTop: 18 }}>{apres}</div>
                <button type="button" onClick={() => commencer(avecSon.current)} className="drl-btn" style={{ ...bouton, minHeight: 46, marginTop: 14, fontSize: 14, fontWeight: 500, border: `1px solid ${LINE}`, background: 'rgba(19,13,8,.5)', color: INK }}>Recommencer la séance</button>
              </div>
            )}
            <div ref={bas} />
          </div>
        </div>
      )}
      <style>{'@keyframes cdss-entre{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.cdss-entre{animation:cdss-entre .5s ease both}@media (prefers-reduced-motion: reduce){.cdss-entre{animation:none}}'}</style>
    </div>
  );
};

/** « Ce que tu retiens » : facultatif, gardé dans le carnet */
const Retiens: React.FC<{ accent: string; onRetiens: (texte: string) => Promise<void> }> = ({ accent, onRetiens }) => {
  const [texte, setTexte] = useState('');
  const [etat, setEtat] = useState<'' | 'envoi' | 'garde' | 'erreur'>('');
  const garder = async () => {
    if (!texte.trim() || etat === 'envoi') return;
    setEtat('envoi');
    try { await onRetiens(texte.trim()); setEtat('garde'); } catch { setEtat('erreur'); }
  };
  return (
    <div style={{ padding: '14px 14px 12px', borderRadius: 18, background: 'rgba(32,23,16,.86)', border: `1px solid ${LINE}` }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '.08em', color: accent }}>ET TOI ?</p>
      <p style={{ margin: '4px 0 10px', fontFamily: 'Fraunces, serif', fontSize: 18, lineHeight: 1.35, color: INK }}>Qu'est-ce que tu retiens de cette séance ?</p>
      {etat === 'garde' ? (
        <p role="status" style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: SOFT }}>Gardé dans ton carnet « Séances ». Le compagnon s'en souviendra.</p>
      ) : (
        <>
          <textarea value={texte} onChange={e => setTexte(e.target.value.slice(0, 1500))} rows={3} aria-label="Ce que tu retiens de cette séance" placeholder="Pour toi, sans obligation."
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', borderRadius: 12, border: `1px solid ${LINE}`, background: 'rgba(0,0,0,.25)', color: INK, padding: '10px 12px', fontSize: 16, lineHeight: 1.45, fontFamily: 'inherit' }} />
          {etat === 'erreur' && <p role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: '#F6C2AE' }}>Pas pu le garder. Réessaie dans un instant.</p>}
          <button type="button" onClick={garder} disabled={!texte.trim() || etat === 'envoi'} className="drl-btn"
            style={{ marginTop: 10, minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: texte.trim() ? accent : 'rgba(255,255,255,.12)', color: texte.trim() ? '#1C1612' : SOFT, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {etat === 'envoi' ? 'Un instant…' : 'Garder dans mon carnet'}
          </button>
        </>
      )}
    </div>
  );
};

export default LecteurSeance;
