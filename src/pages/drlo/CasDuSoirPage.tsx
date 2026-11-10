/**
 * CasDuSoirPage — « Le cas du soir » : l'histoire en 5 épisodes, un par soir, avec un vote « Qu'aurais-tu fait ? ».
 * Après le vote : les pourcentages, ce qu'a choisi l'animal intérieur de la personne, une phrase courte liée au choix.
 * La suite tout de suite pour une étincelle (sinon gratuite le lendemain soir) ; à la fin : la leçon, le quiz, le test, le compagnon.
 * Masquée tant que le serveur ne la dit pas visible (aujourd'hui : le propriétaire seulement). Aucun appel à l'IA.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Loader2, MessageCircle, Moon } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import LecteurAudio from '../../components/casdusoir/LecteurAudio';
import Illustration from '../../components/accueil/Illustration';
import { useKoris } from '../../contexts/KorisContext';
import { openDrLoChat } from '../../components/DrLoChat/drLoEvents';
import { getScaleMeta } from '../../utils/scaleMeta';
import { CAS_DU_SOIR_PRIX } from '../../config/contenusPayants';
import {
  acheterAutreFin, acheterBonus, avancer, CdsError, getEpisode, getEtat, getFin, quandLabel, setJourApercu, voter,
  type CdsEpisodeReponse, type CdsEtat, type CdsFin, type CdsResultats,
} from '../../services/casDuSoirService';

const ANIMAL_NOM: Record<string, string> = {
  lion: 'Lion', aigle: 'Aigle', cheval: 'Cheval', loup: 'Loup', dauphin: 'Dauphin', elephant: 'Éléphant',
  cerf: 'Cerf', hibou: 'Hibou', panthere: 'Panthère', renard: 'Renard', tortue: 'Tortue', ours: 'Ours',
};
const etoiles = (n: number) => `${n} étincelle${n > 1 ? 's' : ''}`;
const Maj = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const Resultats: React.FC<{ ep: CdsEpisodeReponse; r: CdsResultats; monChoix: string; accent: string }> = ({ ep, r, monChoix, accent }) => (
  <div style={{ marginTop: 14 }}>
    {r.echo && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: DC.text }}>{r.echo}</p>}
    <h4 style={{ margin: '14px 0 0', fontSize: 14, fontWeight: 700, color: DC.muted }}>Ce qu'ont choisi les autres</h4>
    {!r.parChoix && <p style={{ margin: '6px 0 0', fontSize: 14, color: DC.soft }}>Les pourcentages s'affichent à partir de {r.seuil ?? 30} votes ({r.total} pour l'instant).</p>}
    {r.parChoix && ep.episode.choix.map(c => (
      <div key={c.id} style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, color: c.id === monChoix ? DC.title : DC.soft, fontWeight: c.id === monChoix ? 700 : 500 }}>
          <span>{c.id === monChoix && <Check size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />}{c.label}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.parChoix?.[c.id] ?? 0} %</span>
        </div>
        <span aria-hidden="true" style={{ display: 'block', marginTop: 4, height: 8, borderRadius: 4, background: 'rgba(255,255,255,.06)' }}>
          <span style={{ display: 'block', height: '100%', width: `${r.parChoix?.[c.id] ?? 0}%`, borderRadius: 4, background: c.id === monChoix ? accent : 'rgba(255,255,255,.25)' }} />
        </span>
      </div>
    ))}
    {r.parChoix && <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint }}>{r.total} votes</p>}
    {r.animal && <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.soft }}>Toi qui es {ANIMAL_NOM[r.animal.animal] ?? r.animal.animal} : {r.animal.groupe} ont surtout choisi « {r.animal.label} ».</p>}
    {r.parAnimal && r.parAnimal.length > 0 && (
      <div style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: DC.muted }}>Par animal</p>
        {r.parAnimal.map(a => (
          <p key={a.animal} style={{ margin: '4px 0 0', fontSize: 14, color: DC.soft }}>
            {ANIMAL_NOM[a.animal] ?? a.animal} : {ep.episode.choix.map(c => `${c.id} ${a.parChoix[c.id] ?? 0} %`).join(' · ')}
          </p>
        ))}
      </div>
    )}
  </div>
);

const Fin: React.FC<{ fin: CdsFin; accent: string }> = ({ fin, accent }) => {
  const navigate = useNavigate();
  const [rep, setRep] = useState<Record<number, number>>({});
  const tous = fin.quiz.every((_, i) => rep[i] !== undefined);
  const testBtn: React.CSSProperties = { minHeight: 48, borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' };
  return (
    <section style={{ ...card, marginTop: 16 }}>
      <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, color: DC.title }}>{fin.titre}</h2>
      <LecteurAudio src={fin.audioUrl} accent={accent} label="Écouter la leçon" />
      {fin.texte.split(/\n{2,}/).map((p, i) => <p key={i} style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, color: DC.text, whiteSpace: 'pre-line' }}>{p}</p>)}
      <h3 style={{ margin: '20px 0 0', fontSize: 16, color: DC.title }}>Le quiz : 3 questions</h3>
      {fin.quiz.map((q, i) => (
        <div key={i} style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 15, color: DC.text }}>{i + 1}. {q.question}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {q.reponses.map((r, j) => {
              const choisi = rep[i] === j; const fait = rep[i] !== undefined;
              return (
                <button key={j} type="button" disabled={fait} onClick={() => setRep({ ...rep, [i]: j })}
                  style={{ minHeight: 44, textAlign: 'left', padding: '8px 12px', borderRadius: 12, fontFamily: 'inherit', fontSize: 14, cursor: fait ? 'default' : 'pointer', color: DC.text,
                    border: `1px solid ${fait && j === q.bonne ? accent : choisi ? 'rgba(240,154,122,.6)' : DC.line}`, background: fait && j === q.bonne ? `${accent}22` : DC.glass }}>
                  {r}
                </button>
              );
            })}
          </div>
          {rep[i] !== undefined && <p style={{ margin: '6px 0 0', fontSize: 14, color: DC.soft }}>{rep[i] === q.bonne ? 'Oui. ' : 'Pas tout à fait. '}{q.explication}</p>}
        </div>
      ))}
      {tous && fin.apresQuiz && <p style={{ margin: '14px 0 0', fontSize: 15, color: DC.text }}>{fin.apresQuiz}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        {fin.testLie && (
          <button type="button" onClick={() => navigate('/compagnon', { state: { prescribe: fin.testLie } })} className="drl-btn" style={testBtn}>
            Faire le test : {getScaleMeta(fin.testLie).label} <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
        {fin.testAussi && (
          <button type="button" onClick={() => navigate('/compagnon', { state: { prescribe: fin.testAussi } })} className="drl-btn" style={{ ...testBtn, minHeight: 44, fontSize: 14, fontWeight: 500, color: DC.soft }}>
            Aussi : le test {getScaleMeta(fin.testAussi).label}
          </button>
        )}
      </div>
    </section>
  );
};

const CasDuSoirPage: React.FC = () => {
  const palette = usePalette();
  const { openNoKorisModal, refreshBalance } = useKoris();
  const [etat, setEtat] = useState<CdsEtat | null>(null);
  const [n, setN] = useState<number | null>(null);
  const [ep, setEp] = useState<CdsEpisodeReponse | null>(null);
  const [fin, setFin] = useState<CdsFin | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [jour, setJour] = useState<number | null>(null);

  const loadEtat = () => getEtat().then(st => {
    setEtat(st);
    if (st.histoire && n === null) setN(st.histoire.lisibles.length ? st.histoire.lisibles[st.histoire.lisibles.length - 1] : null);
  }).catch(() => setEtat({ visible: false }));
  useEffect(() => { void loadEtat(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (n === null) return;
    setEp(null); setFin(null); setError('');
    getEpisode(n).then(setEp).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  }, [n, etat?.histoire?.parus]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!etat) return <DrLoShell back={{ to: '/', label: 'Retour à l\'accueil' }} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!etat.visible || !etat.histoire) return <Navigate to="/" replace />;
  const h = etat.histoire;
  const prix = etat.prix ?? CAS_DU_SOIR_PRIX;

  const onVote = async (choix: string) => {
    if (!ep) return;
    setBusy('vote'); setError('');
    try { const r = await voter(ep.episode.n, choix); setEp({ ...ep, monChoix: r.monChoix, resultats: r.resultats }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(''); }
  };
  const pay = async (what: 'suite' | 'bonus' | 'autreFin') => {
    setBusy(what); setError('');
    try {
      if (what === 'autreFin') { await acheterAutreFin(); refreshBalance?.(); await loadEtat(); }
      if (what === 'suite' && ep?.suite) { await avancer(ep.suite.n); refreshBalance?.(); await loadEtat(); setN(ep.suite.n); }
      if (what === 'bonus') { await acheterBonus(); refreshBalance?.(); await loadEtat(); if (n !== null) setEp(await getEpisode(n)); }
    } catch (e) {
      if (e instanceof CdsError && e.status === 402) openNoKorisModal(what === 'suite' ? 'Lire la suite du cas du soir' : what === 'autreFin' ? 'L\'autre fin du cas du soir' : 'Le détail des votes par animal', prix[what]);
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(''); }
  };
  const lireAutre = (k: number) => { setBusy('autre'); setError(''); setFin(null); getEpisode(k, true).then(setEp).catch(e => setError(e instanceof Error ? e.message : 'Erreur')).finally(() => setBusy('')); };
  const openFin = () => { setBusy('fin'); getFin().then(setFin).catch(e => setError(e instanceof Error ? e.message : 'Erreur')).finally(() => setBusy('')); };
  const simuler = (j: number | null) => { setJour(j); setJourApercu(j); setN(null); setEp(null); void getEtat().then(st => { setEtat(st); if (st.histoire) setN(st.histoire.lisibles.length ? st.histoire.lisibles[st.histoire.lisibles.length - 1] : null); }); };

  const primary: React.CSSProperties = { width: '100%', minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' };
  const ghost: React.CSSProperties = { ...primary, background: DC.glass, color: DC.text, border: `1px solid ${DC.line}`, fontWeight: 600 };

  return (
    <DrLoShell back={{ to: '/', label: 'Retour à l\'accueil' }} palette={palette}>
      <p style={{ margin: '18px 0 0', fontSize: 13, fontWeight: 700, letterSpacing: '.1em', color: palette.accent }}><Moon size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} />LE CAS DU SOIR</p>
      <h1 style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.15, color: DC.title }}>{h.titre}</h1>
      <Illustration src={h.image} ratio="16 / 9" tint={palette.accent} style={{ marginTop: 12 }} fallback={<Moon size={40} color={palette.accent} strokeWidth={1.4} />} />

      {/* Aperçu du propriétaire : simuler le jour 1 à 5 avant la date de départ */}
      {etat.proprio && (
        <div style={{ ...card, marginTop: 12, padding: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>Aperçu (visible par toi seul) : simuler le jour</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map(j => <button key={j} type="button" onClick={() => simuler(j)} style={{ minWidth: 44, minHeight: 44, borderRadius: 12, border: `1px solid ${jour === j ? palette.accent : DC.line}`, background: DC.glass, color: DC.text, cursor: 'pointer', fontSize: 14 }}>{j}</button>)}
            <button type="button" onClick={() => simuler(null)} style={{ minHeight: 44, padding: '0 12px', borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, cursor: 'pointer', fontSize: 14 }}>Aujourd'hui</button>
          </div>
        </div>
      )}

      <nav aria-label="Épisodes" style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        {Array.from({ length: h.total }, (_, i) => i + 1).map(k => {
          const ok = h.lisibles.includes(k);
          return (
            <button key={k} type="button" disabled={!ok} onClick={() => setN(k)} aria-current={k === n ? 'step' : undefined}
              style={{ flex: 1, minHeight: 44, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: ok ? 'pointer' : 'default', fontFamily: 'inherit',
                border: `1px solid ${k === n ? palette.accent : DC.line}`, background: k === n ? `${palette.accent}22` : DC.glass, color: ok ? DC.text : DC.faint }}>
              {k}
            </button>
          );
        })}
      </nav>

      {h.parus === 0 && !h.lisibles.length && <p style={{ ...card, marginTop: 14, fontSize: 15, color: DC.soft }}>{h.prochain ? `Le premier épisode paraît ${quandLabel(h.prochain)}.` : 'Pas encore de date de parution.'}{etat.proprio ? ' Utilise l\'aperçu ci-dessus pour tout parcourir.' : ''}</p>}
      {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 14, color: '#F6C2AE' }}>{error}</p>}
      {n !== null && !ep && !error && <p style={{ marginTop: 30, textAlign: 'center', color: DC.muted }}><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Un instant…</p>}

      {ep && (
        <article style={{ ...card, marginTop: 14 }}>
          <Illustration src={ep.episode.image} ratio="4 / 3" tint={palette.accent} radius={12} style={{ marginBottom: 12 }} fallback={<Moon size={32} color={palette.accent} strokeWidth={1.4} />} />
          <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>{ep.autre ? 'L\'autre fin · ' : ''}Épisode {ep.episode.n} sur {h.total} · {ep.episode.minutes} min</p>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontSize: 22, color: DC.title }}>{ep.episode.titre}</h2>
          <LecteurAudio src={ep.audioUrl} accent={palette.accent} label="Écouter l'épisode" />
          {ep.episode.texte.split(/\n{2,}/).map((p, i) => <p key={i} style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.65, color: DC.text, whiteSpace: 'pre-line' }}>{p}</p>)}

          {!ep.autre && <>
          <p style={{ margin: '20px 0 0', fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>QU'AURAIS-TU FAIT ?</p>
          <h3 style={{ margin: '4px 0 0', fontSize: 17, color: DC.title }}>{ep.episode.question}</h3>
          {ep.episode.embranchement && <p style={{ margin: '4px 0 0', fontSize: 14, color: DC.soft }}>Ton vote compte : la majorité décide de la suite{etat.decision ? ` ${quandLabel(etat.decision)}` : ''}.</p>}
          {!ep.monChoix ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {ep.episode.choix.map(c => (
                <button key={c.id} type="button" disabled={!!busy} onClick={() => onVote(c.id)} className="drl-btn"
                  style={{ minHeight: 48, textAlign: 'left', padding: '10px 14px', borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {c.label}
                </button>
              ))}
            </div>
          ) : ep.resultats && <Resultats ep={ep} r={ep.resultats} monChoix={ep.monChoix} accent={palette.accent} />}
          </>}

          {ep.monChoix && etat.connecte && !etat.bonus && ep.resultats?.parChoix && (
            <button type="button" disabled={!!busy} onClick={() => pay('bonus')} style={{ ...ghost, marginTop: 14, minHeight: 44, fontSize: 14 }}>
              Voir les votes par animal · {etoiles(prix.bonus)}
            </button>
          )}

          {ep.monChoix && ep.suite && !ep.suite.lisible && (
            <div style={{ marginTop: 16 }}>
              {ep.suite.avance.ok ? (
                <button type="button" disabled={!!busy} onClick={() => pay('suite')} style={primary}>
                  {busy === 'suite' ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}La suite maintenant · {etoiles(prix.suite)}
                </button>
              ) : ep.suite.avance.raison === 'compte' ? (
                <Link to="/espace" style={{ ...primary, textDecoration: 'none' }}>Crée ton espace pour lire la suite</Link>
              ) : null}
              <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.soft, textAlign: 'center' }}>
                {ep.suite.avance.raison === 'vote_en_cours' ? `La majorité décide de la suite ${quandLabel(ep.suite.parution)}.` : `${Maj(quandLabel(ep.suite.parution))} · gratuit`}
              </p>
            </div>
          )}
          {ep.monChoix && ep.suite && ep.suite.lisible && (
            <button type="button" onClick={() => setN(ep.suite!.n)} style={{ ...primary, marginTop: 16 }}>Lire l'épisode {ep.suite.n} <ChevronRight size={18} aria-hidden="true" /></button>
          )}
          {ep.monChoix && ep.finLisible && !fin && (
            <button type="button" disabled={!!busy} onClick={openFin} style={{ ...primary, marginTop: 16 }}>La leçon de Dr Lô · gratuite</button>
          )}
        </article>
      )}

      {fin && <Fin fin={fin} accent={palette.accent} />}

      {/* L'autre fin : bonus, une fois l'histoire terminée */}
      {h.autreFin && etat.autreFin?.possible && (fin || ep?.autre || etat.autreFin.achetee) && (
        <section style={{ ...card, marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 15, color: DC.text }}>{h.autreFin.mention}</p>
          {etat.autreFin.achetee ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {[4, 5].map(k => <button key={k} type="button" disabled={!!busy} onClick={() => lireAutre(k)} style={{ ...ghost, minHeight: 44, fontSize: 14 }}>Lire l'autre épisode {k}</button>)}
            </div>
          ) : (
            <button type="button" disabled={!!busy} onClick={() => pay('autreFin')} style={{ ...ghost, marginTop: 10 }}>L'autre fin · {etoiles(prix.autreFin)}</button>
          )}
        </section>
      )}

      <button type="button" onClick={() => openDrLoChat({ greeting: `Tu lis « ${h.titre} ». Qu'est-ce que cette histoire te fait ?`, source: 'cas_du_soir' })} className="drl-btn"
        style={{ ...ghost, marginTop: 16 }}>
        <MessageCircle size={18} aria-hidden="true" /> En parler avec le compagnon
      </button>
      <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.5, color: DC.faint, textAlign: 'center' }}>{h.avertissement}</p>
    </DrLoShell>
  );
};

export default CasDuSoirPage;
