/**
 * ResultatPage — le résultat d'UN test, dans le design de « Mon espace » (/espace/resultat/:scaleId).
 * Ouvert par « Détail et conseils » (Mental, Vie intime, bonus) à la place de l'ancienne liste /assessment/... :
 * la carte de résultat (partageable si le test le permet), ce que ça veut dire, les conseils de Dr Lô,
 * puis « Le refaire » et « En parler à Dr Lô ». Le dernier résultat enregistré est affiché.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight, MessageCircle, Phone, RefreshCw, Sparkles, Upload } from 'lucide-react';
import DrLoShell, { DC, usePalette } from '../../components/accueil/DrLoShell';
import ResultCard from '../../components/assessment/ResultCard';
import ConseilsCard from '../../components/assessment/ConseilsCard';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { getAllGuestResults } from '../../utils/guestSession';
import { getScaleById } from '../../data/scales';
import { resolveScaleGender } from '../../utils/gender';
import { getResultCardConfig } from '../../data/experiences';
import { shareResultCard } from '../../utils/shareCard';
import { isSexualFilterComplete } from '../../utils/sexualHealthFilter';
import { getCrisisResources } from '../../data/crisisResources';
import { trackAccueil } from '../../utils/accueilTracking';
import { openDrLoChat } from '../../components/DrLoChat/drLoEvents';
import { toDate } from '../../utils/drLoGuide';
import type { ScaleResult } from '../../types/assessment';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const SEC: React.CSSProperties = { marginTop: 14, background: DC.glass, border: `1px solid ${DC.line}`, borderRadius: 20, padding: 17 };
const LAB: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: DC.faint, margin: 0 };
const BTN: React.CSSProperties = { flex: 1, minHeight: 48, borderRadius: 14, padding: '0 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 };

const ResultatPage: React.FC = () => {
  const { scaleId = '' } = useParams<{ scaleId: string }>();
  const navigate = useNavigate();
  const palette = usePalette();
  const { currentUser, isAuthenticated, authReady } = useAuth();
  const uid = isAuthenticated && currentUser ? currentUser.id : null;
  const ob = getOnboardingProfile();
  const genre = ob?.genre ?? 'homme';
  const [result, setResult] = useState<ScaleResult | null | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);
  const raw = getScaleById(scaleId);

  useEffect(() => {
    if (!authReady || !raw) return;
    let off = false;
    trackAccueil('espace_view', { guest: !uid, domaine: `resultat_${scaleId}` });
    if (!uid) { setResult(getAllGuestResults()[scaleId] ?? null); return; }
    getProfileProgress(uid).then(p => { if (!off) setResult(p.scaleResults?.[scaleId] ?? null); }).catch(() => { if (!off) setResult(null); });
    return () => { off = true; };
  }, [authReady, uid, scaleId, raw]);

  if (!raw) return <Navigate to="/espace" replace />;
  const scale = resolveScaleGender(raw, genre);
  const intime = scale.category === 'sexual_health';
  const backTo = { to: intime ? '/espace/intime' : '/espace/mental', label: intime ? 'Retour à Intime' : 'Retour à Mental' };

  if (result === undefined) {
    return <DrLoShell back={backTo} genre={ob?.genre} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  }
  if (result === null) return <Navigate to={backTo.to} replace />;

  const rg = (t: string) => (t || '').replace(/\{\{([^|]+)\|([^}]+)\}\}/g, (_, m, f) => (genre === 'homme' ? m : f));
  const interp = { ...result.interpretation, label: rg(result.interpretation.label), description: rg(result.interpretation.description), recommendation: rg(result.interpretation.recommendation) };
  const { card: cardCfg, tone } = getResultCardConfig(scale);
  const at = toDate((result as { completedAt?: unknown }).completedAt);
  const alertLevel = result.alertLevel ?? 0;
  const crisis = getCrisisResources()[0];
  const crisisTel = crisis?.phone ?? '1515';

  const retake = () => {
    trackAccueil('go', { to: intime ? 'test_intime' : 'test', from: 'resultat' });
    if (intime) navigate(isSexualFilterComplete() ? `/assessment/test/${scale.id}` : `/assessment/sexual?from=espace&test=${scale.id}`);
    else navigate('/', { state: { prescribe: scale.id } });
  };
  const talk = () => openDrLoChat({ draft: `Je voudrais parler de mon résultat « ${interp.label} » au test ${scale.name}.`, source: 'resultat' });

  return (
    <DrLoShell back={backTo} genre={ob?.genre} palette={palette}>
      <p style={{ margin: '18px 0 10px', fontSize: 11.5, color: DC.faint, fontWeight: 600 }}>
        {intime ? 'Vie intime' : scale.category === 'bonus' ? 'Test bonus' : 'Profil psychologique'} · {scale.name}
        {at ? ` · ${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()}` : ''}
      </p>

      <ResultCard ref={cardRef} scale={scale} result={result} size="full" />

      <div style={{ display: 'flex', gap: 9, marginTop: 11 }}>
        {cardCfg.shareable && tone !== 'sober' && (
          <button onClick={() => { if (cardRef.current) void shareResultCard(cardRef.current, scale.id); }} className="drl-btn" style={{ ...BTN, border: 0, background: DC.gold, color: DC.ink }}>
            <Upload size={15} aria-hidden="true" /> Partager ma carte
          </button>
        )}
        <button onClick={retake} className="drl-btn" style={{ ...BTN, background: DC.glass, color: DC.text, border: `1px solid ${DC.line}` }}>
          <RefreshCw size={15} aria-hidden="true" /> Le refaire
        </button>
      </div>

      {alertLevel >= 2 && (
        <div role="note" style={{ ...SEC, background: 'rgba(240,154,122,.10)', borderColor: 'rgba(240,154,122,.45)' }}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: DC.soft }}>
            Ce résultat mérite qu'on en parle avec quelqu'un. Si c'est dur maintenant, appelle le {crisisTel}, à toute heure.
          </p>
          <a href={`tel:${crisisTel.replace(/\s/g, '')}`} className="drl-btn" style={{ marginTop: 10, minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F6C2AE', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
            <Phone size={15} aria-hidden="true" /> Appeler
          </a>
        </div>
      )}

      {interp.referralRequired && alertLevel < 2 && scale.warningMessage && (
        <div style={{ ...SEC, background: 'rgba(249,115,22,.10)', borderColor: 'rgba(249,115,22,.45)', display: 'flex', gap: 10 }}>
          <AlertTriangle size={18} style={{ color: '#FDBA74', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#FDBA74' }}>Consultation recommandée</p>
            <p style={{ margin: 0, fontSize: 13, color: '#FED7AA', lineHeight: 1.5 }}>{scale.warningMessage}</p>
          </div>
        </div>
      )}

      <div style={SEC}>
        <span style={LAB}>Ce que ça veut dire</span>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.65, color: DC.soft }}>{interp.description}</p>
        {interp.recommendation && (
          <div style={{ marginTop: 13, background: 'rgba(157,191,175,.14)', borderRadius: 13, padding: '12px 13px', display: 'flex', gap: 10 }}>
            <Sparkles size={15} style={{ color: DC.sage, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: DC.soft }}><b style={{ color: DC.sage }}>À retenir :</b> {interp.recommendation}</p>
          </div>
        )}
      </div>

      {uid && currentUser && (
        <div style={{ marginTop: 14 }}>
          <ConseilsCard
            userId={currentUser.id} scaleId={scale.id} scaleName={scale.name}
            score={result.totalScore} scoreMax={scale.scoreRange.max}
            niveau={interp.label} severity={interp.severity}
            prenom={ob?.prenom ?? undefined} genre={ob?.genre ?? undefined}
            interpretation={interp.description}
          />
        </div>
      )}

      <button onClick={talk} className="drl-btn" style={{ ...SEC, width: '100%', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, color: DC.text, fontFamily: 'inherit' }}>
        <MessageCircle size={20} color={palette.accent} aria-hidden="true" />
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700 }}>En parler à Dr Lô</span>
          <span style={{ display: 'block', fontSize: 12.5, color: DC.faint, marginTop: 2 }}>Il connaît ce résultat et peut t'aider à aller plus loin.</span>
        </span>
        <ChevronRight size={18} color={DC.faint} aria-hidden="true" />
      </button>
    </DrLoShell>
  );
};

export default ResultatPage;
