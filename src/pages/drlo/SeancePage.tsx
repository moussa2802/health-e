/**
 * SeancePage — /cas-du-soir/seance/:id (et le lien court /s/:id) : une séance du « cabinet de Dr Lô » : en vidéo
 * (SeanceVideoVue : le dialogue dessiné, puis l'exercice), ou en conversation
 * (Dr Lô parle, la personne choisit ses réponses, la suite en dépend). Ses réponses et ce qu'elle retient vont dans le carnet
 * « Séances » du journal : liés au compte (le compagnon s'en souvient, sur tous les appareils), ou gardés sur le téléphone
 * sans compte puis versés au compte à l'inscription. Masquée (propriétaire seulement) tant que SEANCES_PUBLIC est false.
 * Aucun appel à l'IA.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import DrLoShell, { DC, usePalette } from '../../components/accueil/DrLoShell';
import LecteurSeance, { type ReponseSeance } from '../../components/casdusoir/LecteurSeance';
import { useAuth } from '../../contexts/AuthContext';
import { getListe } from '../../services/casDuSoirService';
import { addCarnet, saveConfidence } from '../../services/confierService';
import { getScaleMeta } from '../../utils/scaleMeta';
import { SEANCES_CARNET, SEANCES_PUBLIC, seanceById, seanceVideoById } from '../../data/seances';
import SeanceVideoVue from './SeanceVideoVue';

/** Une séance en vidéo (dialogue dessiné, puis exercice) ou en conversation (Dr Lô parle, la personne répond) */
const SeancePage: React.FC = () => {
  const { id = '' } = useParams();
  const v = seanceVideoById(id);
  return v ? <SeanceVideoVue s={v} /> : <SeanceConversation id={id} />;
};

const SeanceConversation: React.FC<{ id: string }> = ({ id }) => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const uid = currentUser?.id ?? null;
  const s = seanceById(id);
  const [visible, setVisible] = useState<boolean | null>(SEANCES_PUBLIC ? true : null);

  useEffect(() => {
    if (SEANCES_PUBLIC) return;
    getListe().then(l => setVisible(!!l.proprio)).catch(() => setVisible(false));
  }, []);

  if (!s) return <Navigate to="/cas-du-soir" replace />;
  if (visible === null) return <DrLoShell narrow backDirect back={{ to: '/cas-du-soir', label: 'Le cas du soir' }} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!visible) return <Navigate to="/" replace />;

  const garder = async (texte: string) => {
    addCarnet(uid ?? 'guest', SEANCES_CARNET);
    await saveConfidence(uid, texte, SEANCES_CARNET);
  };
  // Les réponses choisies : une seule note dans le carnet, à la fin de la séance
  const termine = (reponses: ReponseSeance[]) => {
    if (!reponses.length) return;
    garder(`Séance « ${s.titre} »\n${reponses.map(r => `${r.question} ${r.reponse}`).join('\n')}`).catch(() => { /* la séance reste lisible */ });
  };
  const lien: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 52, padding: '0 16px', marginTop: 10, borderRadius: 16, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' };

  return (
    <DrLoShell narrow backDirect back={{ to: '/cas-du-soir', label: 'Le cas du soir' }} palette={palette}>
      <LecteurSeance seance={s} kicker={`Le cabinet de Dr Lô · séance ${s.n}`} meta={`${s.minutes} min · c'est toi qui réponds · gratuite`}
        accent={palette.accent} onBack={() => navigate('/cas-du-soir')} onTermine={termine} onRetiens={t => garder(`Séance « ${s.titre} » : ce que je retiens\n${t}`)}
        apres={(
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>POUR ALLER PLUS LOIN</p>
            {s.testLie && (
              <button type="button" onClick={() => navigate('/compagnon', { state: { prescribe: s.testLie } })} className="drl-btn" style={lien}>
                Faire le test : {getScaleMeta(s.testLie).label} <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
            {s.casLie && <Link to={`/cas-du-soir/${s.casLie.id}`} className="drl-btn" style={lien}>Le cas du soir : {s.casLie.titre} <ChevronRight size={16} aria-hidden="true" /></Link>}
            <Link to="/boite-a-questions" className="drl-btn" style={lien}>Une question après cette séance ? Dépose-la <ChevronRight size={16} aria-hidden="true" /></Link>
            <p style={{ margin: '14px 0 0', fontSize: 12.5, lineHeight: 1.5, color: '#CDBFAE' }}>Tes réponses sont dans ton carnet « {SEANCES_CARNET} », que tu peux relire ou effacer. Une séance ne remplace pas une consultation. En cas d'urgence, appelle le SAMU (1515).</p>
          </div>
        )} />
    </DrLoShell>
  );
};

export default SeancePage;
