/**
 * CasDuSoirEpisodePage — /cas-du-soir/:id/:episode : la lecture d'un épisode. L'image d'en-tête, le texte (et le lecteur
 * audio s'il existe), le vote « Qu'aurais-tu fait ? », les résultats, puis « Épisode suivant » ou « La suite maintenant ».
 * « ?autre=1 » : l'autre fin (bonus payé), en lecture seule. Le retour ramène à la liste des épisodes. Aucun appel à l'IA.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Loader2, Moon } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import Illustration from '../../components/accueil/Illustration';
import LecteurAudio from '../../components/casdusoir/LecteurAudio';
import { PiedCas, Resultats, etoiles, Maj } from '../../components/casdusoir/CdsParts';
import { useKoris } from '../../contexts/KorisContext';
import { CAS_DU_SOIR_PRIX } from '../../config/contenusPayants';
import {
  acheterBonus, avancer, CdsError, getEpisode, getEtat, quandLabel, setHistoire, voter,
  type CdsEpisodeReponse, type CdsEtat,
} from '../../services/casDuSoirService';

const CasDuSoirEpisodePage: React.FC = () => {
  const { id = '', episode = '1' } = useParams();
  const n = Math.max(1, Math.round(Number(episode)) || 1);
  const autre = new URLSearchParams(useLocation().search).get('autre') === '1';
  const palette = usePalette();
  const navigate = useNavigate();
  const { openNoKorisModal, refreshBalance } = useKoris();
  const [etat, setEtat] = useState<CdsEtat | null>(null);
  const [ep, setEp] = useState<CdsEpisodeReponse | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const loadEtat = () => getEtat().then(setEtat).catch(() => setEtat({ visible: false }));
  useEffect(() => {
    setHistoire(id); setEp(null); setError('');
    void loadEtat();
    getEpisode(n, autre).then(setEp).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
    window.scrollTo?.(0, 0);
  }, [id, n, autre]); // eslint-disable-line react-hooks/exhaustive-deps

  const retour = { to: `/cas-du-soir/${id}`, label: 'Retour aux épisodes' };
  if (!etat) return <DrLoShell narrow back={retour} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!etat.visible || !etat.histoire) return <Navigate to="/" replace />;
  const h = etat.histoire;
  const prix = etat.prix ?? CAS_DU_SOIR_PRIX;

  const onVote = async (choix: string) => {
    if (!ep) return;
    setBusy('vote'); setError('');
    try { const r = await voter(ep.episode.n, choix); setEp({ ...ep, monChoix: r.monChoix, resultats: r.resultats }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(''); }
  };
  const pay = async (what: 'suite' | 'bonus') => {
    setBusy(what); setError('');
    try {
      if (what === 'suite' && ep?.suite) { await avancer(ep.suite.n); refreshBalance?.(); navigate(`/cas-du-soir/${id}/${ep.suite.n}`); }
      if (what === 'bonus') { await acheterBonus(); refreshBalance?.(); await loadEtat(); setEp(await getEpisode(n)); }
    } catch (e) {
      if (e instanceof CdsError && e.status === 402) openNoKorisModal(what === 'suite' ? 'Lire la suite du cas du soir' : 'Le détail des votes par animal', prix[what]);
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(''); }
  };

  const primary: React.CSSProperties = { width: '100%', minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', textDecoration: 'none' };
  const ghost: React.CSSProperties = { ...primary, background: DC.glass, color: DC.text, border: `1px solid ${DC.line}`, fontWeight: 600 };

  return (
    <DrLoShell narrow back={retour} palette={palette}>
      <p style={{ margin: '18px 0 0', fontSize: 13, fontWeight: 700, color: palette.accent }}>{h.titre}{autre ? ' · l\'autre fin' : ''}</p>
      {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 14, color: '#F6C2AE' }}>{error}</p>}
      {!ep && !error && <p style={{ marginTop: 30, textAlign: 'center', color: DC.muted }}><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Un instant…</p>}
      {error && !ep && <Link to={retour.to} style={{ ...ghost, marginTop: 16 }}>Retour aux épisodes</Link>}

      {ep && (
        <article style={{ ...card, marginTop: 10 }}>
          <Illustration src={ep.episode.image} ratio="4 / 3" tint={palette.accent} radius={12} style={{ marginBottom: 12 }} fallback={<Moon size={32} color={palette.accent} strokeWidth={1.4} />} />
          <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>Épisode {ep.episode.n} sur {h.total} · {ep.episode.minutes} min</p>
          <h1 style={{ margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontSize: 24, lineHeight: 1.2, color: DC.title }}>{ep.episode.titre}</h1>
          <LecteurAudio src={ep.audioUrl} accent={palette.accent} label="Écouter l'épisode" />
          {ep.episode.texte.split(/\n{2,}/).map((p, i) => <p key={i} style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.65, color: DC.text, whiteSpace: 'pre-line' }}>{p}</p>)}

          {!ep.autre && <>
            <p style={{ margin: '20px 0 0', fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>QU'AURAIS-TU FAIT ?</p>
            <h2 style={{ margin: '4px 0 0', fontSize: 17, color: DC.title }}>{ep.episode.question}</h2>
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
                <Link to="/espace" style={primary}>Crée ton espace pour lire la suite</Link>
              ) : null}
              <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.soft, textAlign: 'center' }}>
                {ep.suite.avance.raison === 'vote_en_cours' ? `La majorité décide de la suite ${quandLabel(ep.suite.parution)}.` : `${Maj(quandLabel(ep.suite.parution))} · gratuit`}
              </p>
            </div>
          )}
          {ep.monChoix && ep.suite && ep.suite.lisible && (
            <Link to={`/cas-du-soir/${id}/${ep.suite.n}`} style={{ ...primary, marginTop: 16 }}>Épisode suivant <ChevronRight size={18} aria-hidden="true" /></Link>
          )}
          {ep.monChoix && ep.finLisible && (
            <button type="button" onClick={() => navigate(`/cas-du-soir/${id}`, { state: { fin: true } })} style={{ ...primary, marginTop: 16 }}>La leçon de Dr Lô · gratuite</button>
          )}
        </article>
      )}

      <Link to={retour.to} className="drl-btn" style={{ ...ghost, marginTop: 16 }}>Tous les épisodes</Link>
      <PiedCas titre={h.titre} avertissement={h.avertissement} />
    </DrLoShell>
  );
};

export default CasDuSoirEpisodePage;
