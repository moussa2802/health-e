/**
 * CasDuSoirLeconPage — /cas-du-soir/:id/lecon : la leçon de Dr Lô, directement en plein écran (sa photo derrière, le lecteur
 * en bas, le texte qui monte). On y arrive du dernier épisode ou de la page du cas : un seul geste, « Écouter la leçon ».
 * Après la lecture : le quiz, « ce cas t'a été utile ? », les tests et le cas suivant. Gratuite, une fois le dernier épisode lisible.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import DrLoShell, { DC, usePalette } from '../../components/accueil/DrLoShell';
import LecteurImmersif from '../../components/casdusoir/LecteurImmersif';
import { FinLecon, GateAdultes, PiedCas } from '../../components/casdusoir/CdsParts';
import { getEtat, getFin, setHistoire, type CdsEtat, type CdsFin } from '../../services/casDuSoirService';

const PHOTO = '/images/cas-du-soir/drlo-lecon.webp';

const CasDuSoirLeconPage: React.FC = () => {
  const { id = '' } = useParams();
  const palette = usePalette();
  const navigate = useNavigate();
  const [etat, setEtat] = useState<CdsEtat | null>(null);
  const [fin, setFin] = useState<CdsFin | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setHistoire(id); setFin(null); setError('');
    getEtat().then(setEtat).catch(() => setEtat({ visible: false }));
    getFin().then(setFin).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
    window.scrollTo?.(0, 0);
  }, [id]);

  const retour = { to: `/cas-du-soir/${id}`, label: 'Retour au cas' };
  if (!etat) return <DrLoShell narrow back={retour} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!etat.visible || !etat.histoire) return <Navigate to="/" replace />;
  const h = etat.histoire;
  if (error) {
    return (
      <DrLoShell narrow back={retour} palette={palette}>
        <p role="alert" style={{ margin: '40px 0 0', fontSize: 15, color: '#F6C2AE', textAlign: 'center' }}>{error}</p>
        <Link to={retour.to} className="drl-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 50, marginTop: 16, borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontWeight: 600, textDecoration: 'none' }}>Retour au cas</Link>
      </DrLoShell>
    );
  }
  if (!fin) return <DrLoShell narrow back={retour} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;

  const minutes = fin.minutage?.duree ? Math.max(1, Math.round(fin.minutage.duree / 60)) : null;
  return (
    <DrLoShell narrow back={retour} palette={palette}>
      <GateAdultes actif={!!h.adultes} accent={palette.accent} retour={() => navigate('/cas-du-soir')}>
        <LecteurImmersif
          kicker={h.titre} titre="La leçon de Dr Lô" accent={palette.accent} fond="plein"
          meta={`Ce qu'il faut retenir${minutes ? ` · ${minutes} min` : ''} · gratuite`}
          audioSrc={fin.audioUrl} minutage={fin.minutage} image={PHOTO}
          texte={fin.texte.split(/\n\s*\n\s*Sources\s*:/)[0]}
          libelles={{ ecouter: 'Écouter la leçon', lire: 'Lire la leçon', continuer: 'Passer au quiz' }}
          onBack={() => navigate(retour.to)}
          fin={<>
            <FinLecon fin={fin} accent={palette.accent} id={h.id} />
            <PiedCas titre={h.titre} avertissement={h.avertissement} />
          </>} />
      </GateAdultes>
    </DrLoShell>
  );
};

export default CasDuSoirLeconPage;
