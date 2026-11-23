/**
 * CasDuSoirEpisodePage — /cas-du-soir/:id/:episode : la lecture d'un épisode. L'image d'en-tête, le texte (et le lecteur
 * audio s'il existe), le vote « Qu'aurais-tu fait ? », les résultats, puis « Épisode suivant » ou « La suite maintenant ».
 * « ?autre=1 » : l'autre fin (bonus payé), en lecture seule. Le retour ramène à la liste des épisodes. Aucun appel à l'IA.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import DrLoShell, { DC, usePalette } from '../../components/accueil/DrLoShell';
import LecteurImmersif from '../../components/casdusoir/LecteurImmersif';
import { FenetreConfirmer, GateAdultes, PiedCas, Resultats, TestsEpisode, etoiles, gratuitEpisode, Maj } from '../../components/casdusoir/CdsParts';
import { useKoris } from '../../contexts/KorisContext';
import { CAS_DU_SOIR_PRIX } from '../../config/contenusPayants';
import {
  acheterBonus, avancer, CdsError, getEpisode, getEtat, noterGeste, quandLabel, setBrancheApercu, setHistoire, voter,
  type CdsEpisodeReponse, type CdsEtat,
} from '../../services/casDuSoirService';

/** Le message d'une erreur ; pour « ta suite dépend de ton choix », l'invitation à voter d'abord. */
function messageErreur(e: unknown): string {
  if (e instanceof CdsError && e.data.raison === 'choix_requis') return 'Ta suite dépend de ton choix : vote d\'abord à l\'épisode 3.';
  return e instanceof Error ? e.message : 'Erreur';
}

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
  // Toute dépense passe par la fenêtre de confirmation (prix + « si tu attends, c'est gratuit »)
  const [confirme, setConfirme] = useState<'suite' | 'bonus' | null>(null);

  const loadEtat = () => getEtat().then(setEtat).catch(() => setEtat({ visible: false }));
  useEffect(() => {
    setHistoire(id); setEp(null); setError(''); noterGeste('page');
    void loadEtat();
    getEpisode(n, autre).then(setEp).catch(er => setError(messageErreur(er)));
    window.scrollTo?.(0, 0);
  }, [id, n, autre]); // eslint-disable-line react-hooks/exhaustive-deps

  const retour = { to: `/cas-du-soir/${id}`, label: 'Retour aux épisodes' };
  if (!etat) return <DrLoShell narrow back={retour} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!etat.visible || !etat.histoire) return <Navigate to="/" replace />;
  const h = etat.histoire;
  const prix = etat.prix ?? CAS_DU_SOIR_PRIX;
  // Le prix de l'épisode suivant (il monte avec l'épisode) : celui du serveur, sinon la table de l'appli
  const prixSuite = ep?.suite ? (ep.suite.avance.prix ?? prix.suite[ep.suite.n] ?? 0) : 0;

  const onVote = async (choix: string) => {
    if (!ep) return;
    setBusy('vote'); setError('');
    try {
      const r = await voter(ep.episode.n, choix);
      // Aperçu du propriétaire : son vote n'est pas enregistré, la suite montrée est celle de ce choix
      if (ep.apercu && ep.episode.embranchement && (r.monChoix === 'A' || r.monChoix === 'B')) setBrancheApercu(r.monChoix);
      setEp({ ...ep, monChoix: r.monChoix, resultats: r.resultats });
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(''); }
  };
  const pay = async (what: 'suite' | 'bonus') => {
    setBusy(what); setError('');
    try {
      if (what === 'suite' && ep?.suite) { await avancer(ep.suite.n); refreshBalance?.(); setConfirme(null); navigate(`/cas-du-soir/${id}/${ep.suite.n}`); }
      if (what === 'bonus') { await acheterBonus(); refreshBalance?.(); setConfirme(null); await loadEtat(); setEp(await getEpisode(n)); }
    } catch (e) {
      if (e instanceof CdsError && e.status === 402) setConfirme(null);
      if (e instanceof CdsError && e.status === 402) openNoKorisModal(what === 'suite' ? 'Lire la suite du cas du soir' : 'Le détail des votes par animal', what === 'suite' ? prixSuite : prix.bonus);
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(''); }
  };

  const primary: React.CSSProperties = { width: '100%', minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', textDecoration: 'none' };
  const ghost: React.CSSProperties = { ...primary, background: DC.glass, color: DC.text, border: `1px solid ${DC.line}`, fontWeight: 600 };

  // « Épisode suivant » (ou la leçon, au dernier épisode), tout de suite après le texte : pas besoin de descendre jusqu'au vote.
  // Gratuit si l'épisode est déjà ouvert ; sinon le prix en étincelles est écrit sur le bouton, et le toucher ouvre la fenêtre
  // « si tu attends jusqu'à demain, c'est gratuit ». À l'embranchement (épisode 3), le choix d'abord.
  const blocSuite = (clef: string) => {
    if (!ep || ep.autre) return null;
    if (!ep.suite) {
      return ep.finLisible ? <button key={clef} type="button" onClick={() => navigate(`/cas-du-soir/${id}/lecon`)} style={{ ...primary, marginTop: 16 }}>La leçon de Dr Lô · gratuite</button> : null;
    }
    const s = ep.suite;
    const choixD = !!ep.episode.embranchement && !ep.monChoix;
    const rythme = s.avance.raison === 'choix_requis' || choixD ? 'Ta suite dépend de ton choix : vote d\'abord, juste en dessous.'
      : s.lisible ? '' : s.parution ? `${Maj(quandLabel(s.parution))} · gratuit` : 'Gratuit le lendemain soir de ta lecture';
    return (
      <div key={clef} style={{ marginTop: 16 }}>
        {s.lisible && !choixD
          ? <Link to={`/cas-du-soir/${id}/${s.n}`} style={primary}>Épisode suivant <ChevronRight size={18} aria-hidden="true" /></Link>
          : choixD
            ? <button type="button" onClick={() => document.getElementById('cds-vote')?.scrollIntoView({ block: 'center', behavior: 'smooth' })} style={ghost}>Épisode suivant · fais d'abord ton choix</button>
            : s.avance.ok
              ? <button type="button" disabled={!!busy} onClick={() => setConfirme('suite')} style={primary}>Épisode suivant · {etoiles(prixSuite)}</button>
              : s.avance.raison === 'compte' ? <Link to="/espace" style={primary}>Crée ton espace pour lire la suite</Link> : null}
        {rythme && <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.soft, textAlign: 'center' }}>{rythme}</p>}
      </div>
    );
  };

  return (
    <DrLoShell narrow back={retour} palette={palette}>
      <GateAdultes actif={!!h.adultes} accent={palette.accent} retour={() => navigate('/cas-du-soir')}>
      <p style={{ margin: '18px 0 0', fontSize: 13, fontWeight: 700, color: palette.accent }}>{h.titre}{autre ? ' · l\'autre fin' : ''}</p>
      {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 14, color: '#F6C2AE' }}>{error}</p>}
      {!ep && !error && <p style={{ marginTop: 30, textAlign: 'center', color: DC.muted }}><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Un instant…</p>}
      {error && !ep && <Link to={retour.to} style={{ ...ghost, marginTop: 16 }}>Retour aux épisodes</Link>}

      {ep && (
        <LecteurImmersif
          kicker={`${h.titre}${autre ? ' · l\'autre fin' : ''}`} titre={ep.episode.titre} accent={palette.accent}
          meta={`Épisode ${ep.episode.n} sur ${h.total} · ${ep.episode.minutes} min`}
          audioSrc={ep.audioUrl} minutage={ep.episode.minutage} texte={ep.episode.texte} image={ep.episode.image}
          onBack={() => navigate(retour.to)}
          fin={<>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: DC.muted }}>Épisode {ep.episode.n} sur {h.total}</p>
            <h1 style={{ margin: '0 0 12px', fontFamily: 'Fraunces, serif', fontSize: 24, lineHeight: 1.2, color: DC.title }}>{ep.episode.titre}</h1>
            {!ep.autre && <>
              <p id="cds-vote" style={{ margin: '16px 0 0', fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>QU'AURAIS-TU FAIT ?</p>
              <h2 style={{ margin: '4px 0 0', fontSize: 17, color: DC.title }}>{ep.episode.question}</h2>
              {ep.episode.embranchement && <p style={{ margin: '4px 0 0', fontSize: 14, color: DC.soft }}>Ton choix décide de ta suite : deux issues possibles, et chacune mène à un épisode différent. À la fin, tu pourras découvrir l'autre.</p>}
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

            {!ep.autre && <TestsEpisode ids={ep.episode.tests ?? []} accent={palette.accent} />}

            {ep.monChoix && etat.connecte && !etat.bonus && ep.resultats?.parChoix && (
              <button type="button" disabled={!!busy} onClick={() => setConfirme('bonus')} style={{ ...ghost, marginTop: 14, minHeight: 44, fontSize: 14 }}>
                Voir les votes par animal · {etoiles(prix.bonus)}
              </button>
            )}

            {blocSuite('suite')}
            <Link to={retour.to} className="drl-btn" style={{ ...ghost, marginTop: 12 }}>Tous les épisodes</Link>
            <PiedCas titre={h.titre} avertissement={h.avertissement} />
          </>} />
      )}

      {confirme && ep && (
        <FenetreConfirmer accent={palette.accent} busy={!!busy} error={error}
          titre={confirme === 'suite' ? `Lire l'épisode ${ep.suite?.n} maintenant ?` : 'Voir les votes par animal ?'}
          prix={confirme === 'suite' ? prixSuite : prix.bonus}
          gratuit={confirme === 'suite' ? gratuitEpisode(ep.suite?.parution) : null}
          onConfirm={() => pay(confirme)} onClose={() => { setConfirme(null); setError(''); }} />
      )}
      </GateAdultes>
    </DrLoShell>
  );
};

export default CasDuSoirEpisodePage;
