/**
 * ExerciceLangueAmourPage — /exercice/langue-amour : l'exercice de la séance vidéo 1 (« Mon mari ne m'aime pas »).
 * 5 situations, une réponse par situation, puis la carte de sa langue de l'amour (ou des deux, à égalité) avec le
 * conseil de Dr Lô. On peut enregistrer la carte en image, envoyer l'exercice à l'autre, et la garder dans son carnet
 * « Séances » (sans compte : gardée sur le téléphone, versée au compte à l'inscription).
 * Un exercice pour réfléchir, pas un test (dit à l'écran). Visible du propriétaire seulement tant que la séance n'est
 * pas publique. Aucun appel à l'IA.
 */
import React, { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Gift, Heart, MessageCircle, Send, Upload, Wrench } from 'lucide-react';
import DrLoShell, { DC, usePalette } from '../../components/accueil/DrLoShell';
import { creerEspaceDepuis } from '../../components/casdusoir/CdsParts';
import { useAuth } from '../../contexts/AuthContext';
import { addCarnet, saveConfidence } from '../../services/confierService';
import { shareResultCard, whatsappTextLink } from '../../utils/shareCard';
import { SEANCES_CARNET, seanceVideoDeLExercice } from '../../data/seances';
import {
  AVERTISSEMENT_LANGUES, AVERTISSEMENT_VIOLENCE, CARTES, PHRASE_SEMAINE, SITUATIONS, ordreReponses, resultat, type Langue,
} from '../../data/exerciceLangueAmour';
import { useSeanceVisible } from './SeanceVideoVue';

const LIEN = '/exercice/langue-amour';
const ICONE: Record<Langue, React.ElementType> = { presence: Clock, mots: MessageCircle, actes: Wrench, tendresse: Heart, attentions: Gift };

const ExerciceLangueAmourPage: React.FC = () => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const uid = currentUser?.id ?? null;
  const seance = seanceVideoDeLExercice(LIEN);
  const visible = useSeanceVisible(!!seance?.publique);
  const [etape, setEtape] = useState(-1); // -1 : entrée ; 0 à 4 : les situations ; 5 : la carte
  const [choix, setChoix] = useState<Langue[]>([]);
  const [garde, setGarde] = useState<'' | 'envoi' | 'ok' | 'erreur'>('');
  const carte = useRef<HTMLDivElement | null>(null);

  const retour = seance ? { to: `/cas-du-soir/seance/${seance.id}`, label: seance.titre } : { to: '/cas-du-soir', label: 'Le cas du soir' };
  if (!seance) return <Navigate to="/cas-du-soir" replace />;
  if (visible === null) return <DrLoShell narrow backDirect back={retour} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!visible) return <Navigate to="/" replace />;

  const res = etape === SITUATIONS.length ? resultat(choix) : [];
  const repondre = (l: Langue) => { setChoix(c => [...c.slice(0, etape), l]); setEtape(e => e + 1); window.scrollTo({ top: 0 }); };
  const recommencer = () => { setChoix([]); setGarde(''); setEtape(0); window.scrollTo({ top: 0 }); };
  const texteCarnet = () => `Exercice « ${seance.exercice.titre} » : ${res.map(l => CARTES[l].nom.toLowerCase()).join(' et ')}.\n${res.map(l => `${CARTES[l].titre} Mon conseil : ${CARTES[l].conseil}`).join('\n')}`;
  const garder = async () => {
    if (garde === 'envoi' || garde === 'ok') return;
    setGarde('envoi');
    try { addCarnet(uid ?? 'guest', SEANCES_CARNET); await saveConfidence(uid, texteCarnet(), SEANCES_CARNET); setGarde('ok'); } catch { setGarde('erreur'); }
  };
  const envoyer = async () => {
    const url = `${window.location.origin}${LIEN}`;
    const text = `J'ai fait l'exercice de Dr Lô : quelle est ta langue de l'amour ? Une minute. Fais-le, et on compare :`;
    if (navigator.share) { try { await navigator.share({ text, url }); return; } catch { return; } }
    window.open(whatsappTextLink(`${text} ${url}`), '_blank', 'noopener');
  };
  const enregistrer = async () => { if (carte.current) { try { await shareResultCard(carte.current, 'langue-amour'); } catch { /* annulé */ } } };

  const bouton: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', minHeight: 52, padding: '0 18px', borderRadius: 999, border: 0, background: palette.accent, color: '#1C1612', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' };
  const secondaire: React.CSSProperties = { ...bouton, minHeight: 48, marginTop: 10, background: 'transparent', border: `1px solid ${DC.line}`, color: DC.text, fontSize: 15, fontWeight: 600 };
  const kicker = <p style={{ margin: '18px 0 0', fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>LE CABINET DE DR LÔ · EXERCICE{!seance.publique && ' · visible par toi seulement'}</p>;

  // L'entrée
  if (etape < 0) return (
    <DrLoShell narrow backDirect back={retour} palette={palette}>
      {kicker}
      <h1 style={{ margin: '6px 0 10px', fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.12, color: DC.title }}>{seance.exercice.titre}</h1>
      <p style={{ margin: '0 0 8px', fontSize: 16, lineHeight: 1.55, color: DC.text }}>5 petites situations. Réponds avec ton cœur, pas avec ce que tu « devrais » répondre.</p>
      <p style={{ margin: '0 0 20px', fontSize: 13.5, lineHeight: 1.5, color: DC.muted }}>Un exercice pour réfléchir sur soi, pas un test scientifique. Sans compte, gratuit.</p>
      <button type="button" onClick={() => setEtape(0)} className="drl-btn" style={bouton}>Commencer</button>
    </DrLoShell>
  );

  // Une situation
  if (etape < SITUATIONS.length) {
    const s = SITUATIONS[etape];
    return (
      <DrLoShell narrow backDirect back={retour} palette={palette}>
        {kicker}
        <div role="progressbar" aria-label="Avancement" aria-valuemin={1} aria-valuemax={SITUATIONS.length} aria-valuenow={etape + 1} style={{ display: 'flex', gap: 6, margin: '12px 0 4px' }}>
          {SITUATIONS.map((_, i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= etape ? palette.accent : 'rgba(255,255,255,.12)' }} />)}
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.muted }}>Situation {etape + 1} sur {SITUATIONS.length}</p>
        <h1 style={{ margin: '8px 0 16px', fontFamily: 'Fraunces, serif', fontSize: 24, lineHeight: 1.25, color: DC.title }}>{s.question}</h1>
        <div role="group" aria-label="Ta réponse">
          {ordreReponses(etape).map(l => (
            <button key={l} type="button" onClick={() => repondre(l)} className="drl-btn"
              style={{ display: 'block', width: '100%', textAlign: 'left', minHeight: 56, padding: '12px 16px', marginBottom: 10, borderRadius: 16, border: `1px solid ${choix[etape] === l ? palette.accent : DC.line}`, background: DC.glass, color: DC.text, fontSize: 16, lineHeight: 1.4, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {s.reponses[l]}
            </button>
          ))}
        </div>
        {etape > 0 && (
          <button type="button" onClick={() => setEtape(e => e - 1)} className="drl-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 44, marginTop: 4, padding: '0 6px', border: 0, background: 'transparent', color: DC.soft, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ChevronLeft size={16} aria-hidden="true" /> Situation précédente
          </button>
        )}
      </DrLoShell>
    );
  }

  // La carte
  return (
    <DrLoShell narrow backDirect back={retour} palette={palette}>
      {kicker}
      <h1 style={{ margin: '6px 0 14px', fontFamily: 'Fraunces, serif', fontSize: 26, lineHeight: 1.15, color: DC.title }}>{res.length > 1 ? 'Tu parles deux langues' : 'Ta langue de l\'amour'}</h1>

      <div ref={carte} style={{ padding: 20, borderRadius: 22, background: 'linear-gradient(160deg, #1B2340 0%, #121528 55%, #0C0B14 100%)', border: '1px solid rgba(255,255,255,.12)', color: '#FBF5EA' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.1em', color: '#E8B96A' }}>MA LANGUE DE L'AMOUR</p>
        {res.map(l => {
          const C = CARTES[l]; const Icone = ICONE[l];
          return (
            <div key={l} style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(232,185,106,.16)', color: '#E8B96A', flex: 'none' }}><Icone size={22} /></span>
                <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.1, fontWeight: 600 }}>{C.nom}</p>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.55 }}>{C.texte}</p>
              <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5 }}><strong style={{ color: '#E8B96A' }}>Mon conseil :</strong> {C.conseil}</p>
              <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: '#CDBFAE' }}><strong>Le piège :</strong> {C.piege}</p>
            </div>
          );
        })}
        <p style={{ margin: '16px 0 0', fontSize: 13, color: '#9C93A8' }}>Dr Lô · Le cabinet de Dr Lô · health-e.sn</p>
      </div>

      <div style={{ marginTop: 16, padding: 16, borderRadius: 18, border: `1px solid ${DC.line}`, background: DC.glass }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>LA PHRASE À ESSAYER CETTE SEMAINE</p>
        <p style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 18, lineHeight: 1.4, color: DC.title }}>{PHRASE_SEMAINE}</p>
      </div>

      <button type="button" onClick={envoyer} className="drl-btn" style={{ ...bouton, marginTop: 16 }}><Send size={18} aria-hidden="true" /> Et l'autre ? Envoie-lui l'exercice</button>
      <button type="button" onClick={enregistrer} className="drl-btn" style={secondaire}><Upload size={18} aria-hidden="true" /> Enregistrer ma carte en image</button>
      {garde === 'ok' ? (
        <div role="status" style={{ marginTop: 10, padding: '12px 14px', borderRadius: 16, border: `1px solid ${DC.line}`, color: DC.soft, fontSize: 14, lineHeight: 1.5 }}>
          Gardée dans ton carnet « {SEANCES_CARNET} ». Le compagnon s'en souviendra.
          {!uid && <button type="button" onClick={() => creerEspaceDepuis(navigate, LIEN)} className="drl-btn" style={{ ...secondaire, marginTop: 10 }}>Crée ton espace pour la retrouver partout <ChevronRight size={16} aria-hidden="true" /></button>}
        </div>
      ) : (
        <button type="button" onClick={garder} disabled={garde === 'envoi'} className="drl-btn" style={secondaire}>{garde === 'envoi' ? 'Un instant…' : 'Garder ma carte dans mon carnet'}</button>
      )}
      {garde === 'erreur' && <p role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: '#F6C2AE' }}>Pas pu la garder. Réessaie dans un instant.</p>}

      <p style={{ margin: '18px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.text }}>Et dis-moi en commentaire, sous la vidéo, quelle est ta langue !</p>
      <Link to={retour.to} className="drl-btn" style={secondaire}>Revoir la séance « {seance.titre} »</Link>
      <button type="button" onClick={recommencer} className="drl-btn" style={{ ...secondaire, border: 0, color: DC.soft }}>Refaire l'exercice</button>

      <p style={{ margin: '16px 0 6px', fontSize: 13, lineHeight: 1.5, color: DC.muted }}>{AVERTISSEMENT_LANGUES}</p>
      <p style={{ margin: '0 0 24px', fontSize: 13, lineHeight: 1.5, color: DC.muted }}>{AVERTISSEMENT_VIOLENCE} <Link to="/boite-a-questions" style={{ color: DC.soft, textDecoration: 'underline' }}>Ouvrir la boîte</Link></p>
    </DrLoShell>
  );
};

export default ExerciceLangueAmourPage;
