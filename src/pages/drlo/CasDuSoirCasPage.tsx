/**
 * CasDuSoirCasPage — /cas-du-soir/:id : un cas. La couverture et le titre, puis une carte par épisode avec son image
 * et son état (lu, à lire, gratuit demain soir ou tout de suite pour une étincelle, verrouillé). Après l'embranchement,
 * seule la version choisie par la majorité apparaît, une fois figée. En bas : la leçon, le quiz, les tests, l'autre fin.
 * Le bandeau d'aperçu du propriétaire (jours 1 à 5) est ici.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Hourglass, Loader2, Lock, Moon } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import Illustration from '../../components/accueil/Illustration';
import { ImageCard, SectionTitle, Stack, CompactRow } from '../../components/accueil/HomeParts';
import { BandeauApercu, Fin, PiedCas, etoiles, Maj } from '../../components/casdusoir/CdsParts';
import { useKoris } from '../../contexts/KorisContext';
import { CAS_DU_SOIR_PRIX } from '../../config/contenusPayants';
import {
  acheterAutreFin, avancer, CdsError, getEpisodes, getEtat, getFin, quandLabel, setHistoire,
  type CdsEpisodeCarte, type CdsEtat, type CdsFin,
} from '../../services/casDuSoirService';

type Episodes = Awaited<ReturnType<typeof getEpisodes>>;

const CasDuSoirCasPage: React.FC = () => {
  const { id = '' } = useParams();
  const palette = usePalette();
  const navigate = useNavigate();
  const location = useLocation();
  const { openNoKorisModal, refreshBalance } = useKoris();
  const [etat, setEtat] = useState<CdsEtat | null>(null);
  const [eps, setEps] = useState<Episodes | null>(null);
  const [fin, setFin] = useState<CdsFin | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setHistoire(id);
    getEtat().then(setEtat).catch(() => setEtat({ visible: false }));
    getEpisodes().then(setEps).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  };
  useEffect(() => { setFin(null); load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Arrivée depuis le dernier épisode : la leçon s'ouvre directement
  useEffect(() => {
    if ((location.state as { fin?: boolean } | null)?.fin && eps?.finie && !fin) getFin().then(setFin).catch(() => {});
  }, [eps]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!etat) return <DrLoShell narrow back={{ to: '/cas-du-soir', label: 'Retour aux cas' }} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!etat.visible || !etat.histoire) return <Navigate to="/" replace />;
  const h = etat.histoire;
  const prix = eps?.prix ?? etat.prix ?? CAS_DU_SOIR_PRIX;

  const pay = async (what: 'suite' | 'autreFin', n?: number) => {
    setBusy(what); setError('');
    try {
      if (what === 'suite' && n) { await avancer(n); refreshBalance?.(); navigate(`/cas-du-soir/${id}/${n}`); return; }
      if (what === 'autreFin') { await acheterAutreFin(); refreshBalance?.(); load(); }
    } catch (e) {
      if (e instanceof CdsError && e.status === 402) openNoKorisModal(what === 'suite' ? 'Lire la suite du cas du soir' : 'L\'autre fin du cas du soir', prix[what]);
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(''); }
  };

  const carte = (e: CdsEpisodeCarte) => {
    if (e.attente) {
      return <CompactRow key={e.n} title="La suite dépend de votre vote" sub={`Épisode ${e.n}${etat.decision ? ` · la majorité décide ${quandLabel(etat.decision)}` : ''}`} tint={palette.accent} icon={<Hourglass size={20} color={palette.accent} />} onClick={() => navigate(`/cas-du-soir/${id}/3`)} />;
    }
    const lien = e.etat === 'lu' || e.etat === 'a_lire' ? `/cas-du-soir/${id}/${e.n}` : undefined;
    const line = e.etat === 'lu' ? 'Lu' : e.etat === 'a_lire' ? 'À lire'
      : e.etat === 'prochain' ? (e.parution ? `${Maj(quandLabel(e.parution))} · gratuit` : 'Bientôt')
      : e.etat === 'compte' ? 'Crée ton espace pour lire la suite'
      : e.parution ? `Paraît ${quandLabel(e.parution)}` : 'Bientôt';
    const footer = e.etat === 'prochain' && e.avance?.ok
      ? <button type="button" disabled={!!busy} onClick={() => pay('suite', e.n)} className="drl-btn" style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${palette.accent}`, background: 'transparent', color: palette.accent, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          {busy === 'suite' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}La suite tout de suite · {etoiles(prix.suite)}
        </button>
      : e.etat === 'compte'
        ? <Link to="/espace" className="drl-btn" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: palette.accent, textDecoration: 'none' }}>Créer mon espace</Link>
        : undefined;
    const ferme = !lien;
    return (
      <ImageCard key={e.n} to={lien} image={e.image ?? null} tint={ferme ? DC.muted : palette.accent}
        fallback={ferme ? <Lock size={28} color={DC.muted} aria-hidden="true" /> : <Moon size={32} color={palette.accent} strokeWidth={1.4} />}
        kicker={`Épisode ${e.n}`} title={e.titre} line={line} footer={footer} />
    );
  };

  return (
    <DrLoShell narrow back={{ to: '/cas-du-soir', label: 'Retour aux cas' }} palette={palette}>
      <Illustration src={h.image} ratio="16 / 9" tint={palette.accent} radius={20} style={{ marginTop: 16 }} fallback={<Moon size={44} color={palette.accent} strokeWidth={1.4} />} />
      <p style={{ margin: '14px 0 0', fontSize: 13, fontWeight: 700, color: palette.accent }}>Le cas du soir</p>
      <h1 style={{ margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.15, color: DC.title }}>{h.titre}</h1>
      <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>{h.accroche}</p>

      {etat.proprio && <BandeauApercu accent={palette.accent} onChange={load} />}

      <SectionTitle>Les épisodes</SectionTitle>
      {error && <p role="alert" style={{ margin: '0 0 12px', fontSize: 14, color: '#F6C2AE' }}>{error}</p>}
      {!eps ? <p style={{ textAlign: 'center', color: DC.muted }}>Un instant…</p> : <Stack>{eps.episodes.map(carte)}</Stack>}

      {eps?.finie && (
        <>
          <SectionTitle>La fin de l'histoire</SectionTitle>
          {!fin && (
            <button type="button" disabled={!!busy} onClick={() => { setBusy('fin'); getFin().then(setFin).catch(e => setError(e instanceof Error ? e.message : 'Erreur')).finally(() => setBusy('')); }}
              className="drl-btn" style={{ width: '100%', minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              La leçon de Dr Lô · gratuite
            </button>
          )}
          {fin && <Fin fin={fin} accent={palette.accent} />}
          {h.autreFin && eps.autreFin.possible && (
            <section style={{ ...card, marginTop: 14 }}>
              <p style={{ margin: 0, fontSize: 15, color: DC.text }}>{h.autreFin.mention}</p>
              {eps.autreFin.achetee ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {[4, 5].map(k => <Link key={k} to={`/cas-du-soir/${id}/${k}?autre=1`} className="drl-btn" style={{ flex: 1, minHeight: 44, borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>L'autre épisode {k}</Link>)}
                </div>
              ) : (
                <button type="button" disabled={!!busy} onClick={() => pay('autreFin')} style={{ width: '100%', marginTop: 10, minHeight: 48, borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>L'autre fin · {etoiles(prix.autreFin)}</button>
              )}
            </section>
          )}
        </>
      )}

      <PiedCas titre={h.titre} avertissement={h.avertissement} />
    </DrLoShell>
  );
};

export default CasDuSoirCasPage;
