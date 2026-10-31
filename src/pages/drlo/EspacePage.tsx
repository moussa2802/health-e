/**
 * EspacePage — « Mon espace bien-être » (/espace), un tap après le premier écran.
 * Pour toi aujourd'hui, les quatre domaines (Mental, Humeur, Social, Intime masqué par défaut),
 * le portrait, la météo de la semaine, l'animal intérieur et les raccourcis. Tout renvoie vers Dr Lô
 * ou vers les pages existantes (tests, journal, compatibilité, défis).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, CalendarCheck, CloudSun, Crown, Eye, EyeOff, Heart, Sparkles, Users, Wrench } from 'lucide-react';
import { collection, getCountFromServer } from 'firebase/firestore';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import MoodIcon from '../../components/accueil/MoodIcon';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getGenderHiddenIds } from '../../utils/scaleVisibility';
import { getProfileProgress } from '../../services/evaluationService';
import { getAllGuestResults, getGuestCount, GUEST_MAX_TESTS } from '../../utils/guestSession';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import { computePortrait, pickGuideMessage, toDate, type LastTest } from '../../utils/drLoGuide';
import { pickNextScale } from '../../utils/accueilFlow';
import { getScaleMeta } from '../../utils/scaleMeta';
import { dayKey, moodById, type MoodMap } from '../../utils/moodLog';
import { fetchMoods } from '../../services/moodService';
import { lastDays, MOOD_SCORE, WEEKDAYS, weekdayIndex } from '../../utils/moodInsights';
import { addDays } from '../../utils/cycleCalc';
import { getTotemProgress, getTotemSignature, totemMeaning, type TotemAnimal } from '../../utils/totemAlgorithm';
import { trackAccueil } from '../../utils/accueilTracking';
import { openDrLoChat } from '../../components/DrLoChat/drLoEvents';
import PaliersCard from '../../components/accueil/PaliersCard';
import DrloMemoryCard from '../../components/accueil/DrloMemoryCard';
import { myPractices, PLACES_MAX, type Mine } from '../../services/practiceService';
import { getDrloStatus, registerReferralIfAny, type DrloStatus } from '../../services/drloQuestionService';
import type { ScaleResult } from '../../types/assessment';

import CompanionMark from '../../components/accueil/CompanionMark';
const SHOW_INTIME_KEY = 'he_espace_show_intime';
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const h2: React.CSSProperties = { margin: 0, fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: DC.title };

const EspacePage: React.FC = () => {
  const navigate = useNavigate();
  const palette = usePalette();
  const { currentUser, isAuthenticated } = useAuth();
  const uid = isAuthenticated && currentUser ? currentUser.id : null;
  const ob = getOnboardingProfile();
  const prenom = ob?.prenom || currentUser?.name?.split(' ')[0];
  const genre = ob?.genre;
  const today = dayKey();

  const [results, setResults] = useState<Record<string, ScaleResult>>({});
  const [totem, setTotem] = useState<{ animal: string; revealedAt: unknown; pending?: string | null } | null>(null);
  const [defis, setDefis] = useState(0);
  const [counts, setCounts] = useState({ journal: 0, chats: 0 });
  const [moods, setMoods] = useState<MoodMap>({});
  const [loaded, setLoaded] = useState(false);
  const [drlo, setDrlo] = useState<DrloStatus | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [showIntime, setShowIntime] = useState(() => { try { return localStorage.getItem(SHOW_INTIME_KEY) === '1'; } catch { return false; } });

  useEffect(() => {
    let off = false;
    trackAccueil('espace_view', { guest: !uid });
    fetchMoods(uid, addDays(today, -6)).then(m => { if (!off) setMoods(m); });
    if (!uid) {
      setResults(getAllGuestResults());
      setLoaded(true);
      return () => { off = true; };
    }
    myPractices().then(m => { if (!off) setMine(m); }).catch(() => {});
    registerReferralIfAny().finally(() => getDrloStatus().then(st => { if (!off) setDrlo(st); }).catch(() => {}));
    getProfileProgress(uid).then(p => {
      if (off) return;
      setResults(p.scaleResults ?? {});
      setTotem(p.totem ? { animal: p.totem.animal, revealedAt: p.totem.revealedAt, pending: p.totem.pendingAnimal } : null);
      setDefis(p.activeDefis?.length ?? 0);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    const fs = db;
    if (fs) {
      Promise.all([
        getCountFromServer(collection(fs, 'users', uid, 'journal')).then(c => c.data().count).catch(() => 0),
        getCountFromServer(collection(fs, 'users', uid, 'chat_dr_lo')).then(c => c.data().count).catch(() => 0),
      ]).then(([journal, chats]) => { if (!off) setCounts({ journal, chats }); });
    }
    return () => { off = true; };
  }, [uid, today]);

  const doneIds = Object.keys(results);
  // Mêmes listes que les pages Mental et Intime (tests masqués selon le genre exclus) : les compteurs concordent.
  const hiddenIds = ob ? getGenderHiddenIds(ob) : [];
  const mentalScales = MENTAL_HEALTH_SCALES.filter(s => !hiddenIds.includes(s.id));
  const sexualScales = SEXUAL_HEALTH_SCALES.filter(s => !hiddenIds.includes(s.id));
  const doneMental = mentalScales.filter(s => results[s.id]).length;
  const doneSexual = sexualScales.filter(s => results[s.id]).length;
  const totalCore = mentalScales.length + sexualScales.length;
  const portrait = computePortrait({ doneCore: doneMental + doneSexual, totalCore, journalCount: counts.journal, chatCount: counts.chats });
  const next = pickNextScale('decouvre', doneIds);
  const totemProgress = getTotemProgress(results);
  const totemRevealed = !!totem?.animal && !!totem.revealedAt;

  const lastTest: LastTest | null = useMemo(() => {
    let lt: LastTest | null = null;
    for (const [scaleId, r] of Object.entries(results)) {
      const at = toDate((r as { completedAt?: unknown }).completedAt);
      if (at && (!lt || at > lt.completedAt)) lt = { scaleId, label: getScaleMeta(scaleId).label, completedAt: at };
    }
    return lt;
  }, [results]);

  const guide = pickGuideMessage({
    isAuthenticated: !!uid, prenom, doneCore: doneMental + doneSexual, totalCore,
    guestCount: getGuestCount(), guestMax: GUEST_MAX_TESTS,
    totemMissing: totemProgress.missing.length, totemReady: totemProgress.missing.length === 0 && !totemRevealed, totemRevealed,
    journalToday: uid ? !!moods[today] : null, lastTest, dismissedFollowUps: [], now: new Date(),
  });

  const onGuide = () => {
    const a = guide.action;
    // Un seul Dr Lô : la discussion s'ouvre dans la conversation de l'accueil
    if (a.kind === 'chat') openDrLoChat({ greeting: a.greeting ?? undefined, source: 'espace' });
    else if (a.kind === 'reveal_totem') navigate('/assessment/totem');
    else if (a.kind === 'journal') navigate('/compagnon', { state: { openMood: true } });
    else if (a.kind === 'signup') navigate('/compagnon', { state: { signup: true } });
    else navigate('/compagnon', { state: next ? { prescribe: next } : undefined });
  };

  // Météo de la semaine
  const week = lastDays(today, 7);
  const weekScores = week.map(d => (moods[d] ? MOOD_SCORE[moods[d].mood] : null)).filter((x): x is number => x !== null);
  const weekAvg = weekScores.length ? weekScores.reduce((a, b) => a + b, 0) / weekScores.length : null;
  const humeurWord = weekAvg === null ? 'À noter' : weekAvg >= 4 ? 'Éclaircies' : weekAvg >= 3 ? 'Variable' : 'Ciel chargé';

  const toggleIntime = () => {
    const v = !showIntime;
    setShowIntime(v);
    try { localStorage.setItem(SHOW_INTIME_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  };

  const d = new Date();
  const dateLabel = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  const tile = (accent: string): React.CSSProperties => ({
    ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none', color: DC.text,
    borderColor: `${accent}55`, background: `${accent}12`, minHeight: 104, cursor: 'pointer',
  });
  const domains = [
    { key: 'mental', label: 'Mental', icon: Brain, color: DC.sage, word: doneMental ? `${doneMental} / ${mentalScales.length} tests` : 'À découvrir', to: '/espace/mental' },
    { key: 'humeur', label: 'Humeur', icon: CloudSun, color: DC.gold, word: humeurWord, to: '/humeur' },
    { key: 'social', label: 'Compatibilité', icon: Users, color: DC.social, word: 'Toi et l\'autre', to: '/assessment/compatibility' },
  ];

  return (
    <DrLoShell genre={genre} palette={palette}>
      <div style={{ marginTop: 18 }}>
        <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
        <h1 style={{ margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>Mon espace bien-être</h1>
      </div>

      {/* Pour toi aujourd'hui */}
      <section aria-label="Pour toi aujourd'hui" style={{ ...card, marginTop: 16, borderColor: 'rgba(242,182,109,.3)', background: 'rgba(242,182,109,.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CompanionMark size={36} ring={palette.accent} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.accent }}>Pour toi aujourd'hui</p>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.soft }}>{loaded ? guide.text : '…'}</p>
        {/* Ton animal intérieur (ou, tant qu'il n'est pas révélé, le portrait qui se dessine) */}
        {loaded && (totemRevealed ? (
          <Link to="/assessment/totem" className="drl-btn" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: 'rgba(233,200,143,.08)', border: '1px solid rgba(233,200,143,.25)', color: DC.text, textDecoration: 'none' }}>
            <Sparkles size={20} color={DC.gold} aria-hidden="true" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, color: DC.faint }}>Ton animal intérieur</span>
              <span style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600 }}>{getTotemSignature(totem!.animal as TotemAnimal)?.label ?? totem!.animal}</span>
              <span style={{ display: 'block', fontSize: 13, color: DC.muted, lineHeight: 1.4 }}>{totemMeaning(totem!.animal as TotemAnimal, genre === 'femme' ? 'femme' : 'homme')}</span>
              {totem!.pending && totem!.pending !== totem!.animal && (
                <span style={{ display: 'block', marginTop: 4, fontSize: 13, fontWeight: 700, color: DC.gold }}>Ton animal intérieur a évolué : viens découvrir le nouveau</span>
              )}
            </span>
            <ArrowRight size={16} color={DC.muted} aria-hidden="true" />
          </Link>
        ) : totemProgress.missing.length === 0 ? (
          <Link to="/assessment/totem" className="drl-btn" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'rgba(233,200,143,.08)', border: '1px solid rgba(233,200,143,.25)', color: DC.text, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
            <Sparkles size={18} color={DC.gold} aria-hidden="true" /> Ton animal intérieur est prêt : viens le découvrir <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, color: DC.muted }}>
              <span>Ton portrait se dessine · encore {totemProgress.missing.length} test{totemProgress.missing.length > 1 ? 's' : ''} pour ton animal intérieur</span>
              <b style={{ color: palette.accent, whiteSpace: 'nowrap' }}>{portrait} %</b>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={portrait} aria-label="Portrait" style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.08)', marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${portrait}%`, height: '100%', background: palette.primary }} />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button onClick={onGuide} className="drl-btn"
            style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {guide.cta}
          </button>
          {guide.action.kind !== 'chat' && (
            <Link to="/" className="drl-btn" style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              Discuter avec mon compagnon
            </Link>
          )}
        </div>
      </section>

      {/* Ton équilibre */}
      <section aria-label="Tes domaines" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={h2}>Ton équilibre</h2>
          <span style={{ fontSize: 13, color: DC.faint }}>Touche un domaine</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
          {domains.filter(dm => dm.key === 'mental').map(dm => (
            <Link key={dm.key} to={dm.to} className="drl-btn" style={tile(dm.color)}>
              <dm.icon size={20} color={dm.color} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{dm.label}</span>
              <span style={{ fontSize: 13, color: DC.muted }}>{dm.word}</span>
            </Link>
          ))}
          {/* Intime : toute la tuile s'ouvre ; l'œil ne fait que cacher le chiffre sur cet écran */}
          <div style={{ position: 'relative' }}>
            <Link to="/espace/intime" className="drl-btn" style={{ ...tile(DC.intime), height: '100%', boxSizing: 'border-box' }}>
              <Heart size={20} color={DC.intime} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Intime</span>
              <span style={{ fontSize: 13, color: showIntime ? DC.muted : DC.faint }}>
                {!uid ? 'Avec un espace personnel' : !showIntime ? 'En toute discrétion' : doneSexual ? `${doneSexual} / ${sexualScales.length} tests` : 'À découvrir'}
              </span>
            </Link>
            {uid && (
              <button onClick={toggleIntime} aria-label={showIntime ? 'Cacher mon avancée intime sur cet écran' : 'Afficher mon avancée intime sur cet écran'} className="drl-btn"
                style={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 10, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {showIntime ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            )}
          </div>
          {domains.filter(dm => dm.key === 'humeur').map(dm => (
            <Link key={dm.key} to={dm.to} className="drl-btn" style={tile(dm.color)}>
              <dm.icon size={20} color={dm.color} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{dm.label}</span>
              <span style={{ fontSize: 13, color: DC.muted }}>{dm.word}</span>
            </Link>
          ))}
          <button onClick={() => navigate('/journal')} className="drl-btn" style={{ ...tile(DC.confier), textAlign: 'left' }}>
            <BookOpen size={20} color={DC.confier} aria-hidden="true" />
            <span style={{ fontSize: 15, fontWeight: 700 }}>Journal</span>
            <span style={{ fontSize: 13, color: DC.muted }}>{counts.journal ? `${counts.journal} page${counts.journal > 1 ? 's' : ''} · écrire, relire` : 'Écrire, te confier'}</span>
          </button>
          {domains.filter(dm => dm.key === 'social').map(dm => (
            <Link key={dm.key} to={dm.to} className="drl-btn" style={tile(dm.color)}>
              <dm.icon size={20} color={dm.color} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{dm.label}</span>
              <span style={{ fontSize: 13, color: DC.muted }}>{dm.word}</span>
            </Link>
          ))}
          <button onClick={() => (uid ? navigate('/defi') : navigate('/compagnon', { state: { signup: true } }))} className="drl-btn" style={{ ...tile(DC.gold), textAlign: 'left' }}>
            <Crown size={20} color={DC.gold} aria-hidden="true" />
            <span style={{ fontSize: 15, fontWeight: 700 }}>Défi</span>
            <span style={{ fontSize: 13, color: DC.muted }}>{defis ? `${defis} en cours` : 'Qui te connaît le mieux ?'}</span>
          </button>
          {uid && (
            <Link to="/routine" className="drl-btn" style={tile(DC.sage)}>
              <CalendarCheck size={20} color={DC.sage} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Ma routine</span>
              <span style={{ fontSize: 13, color: DC.muted }}>{mine && mine.places.used > 0 ? `${mine.places.used} place${mine.places.used > 1 ? 's' : ''} sur ${PLACES_MAX}` : 'Apprendre un outil'}</span>
            </Link>
          )}
          {uid && (
            <Link to="/boite-a-outils" className="drl-btn" style={tile(DC.gold)}>
              <Wrench size={20} color={DC.gold} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Boîte à outils</span>
              <span style={{ fontSize: 13, color: DC.muted }}>{mine && mine.toolbox.length > 0 ? `${mine.toolbox.length} outil${mine.toolbox.length > 1 ? 's' : ''} prêt${mine.toolbox.length > 1 ? 's' : ''}` : 'Pour quand ça monte'}</span>
            </Link>
          )}
        </div>

      </section>

      {/* Météo intérieure */}
      <section aria-label="Ta météo intérieure" style={{ ...card, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={h2}>Ta météo intérieure</h2>
          <Link to="/humeur" style={{ fontSize: 13, fontWeight: 700, color: palette.accent }}>Voir le mois</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginTop: 12 }}>
          {week.map(day => {
            const e = moods[day];
            const def = e ? moodById(e.mood) : null;
            return (
              <div key={day} aria-label={`${day === today ? 'Aujourd\'hui' : day} : ${def ? def.label : 'pas noté'}`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: def ? '1px solid rgba(255,255,255,.10)' : '1.5px dashed rgba(255,255,255,.16)', background: def ? 'rgba(255,255,255,.06)' : 'transparent' }}>
                  {def ? <MoodIcon id={def.id} color={def.color} size={20} /> : <span style={{ color: DC.faint, fontSize: 16 }}>{day === today ? '+' : ''}</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: day === today ? palette.accent : DC.faint }}>{day === today ? 'Auj.' : WEEKDAYS[weekdayIndex(day)]}</span>
              </div>
            );
          })}
        </div>
        {!moods[today] && (
          <button onClick={() => navigate('/compagnon', { state: { openMood: true } })} className="drl-btn"
            style={{ marginTop: 12, width: '100%', minHeight: 46, borderRadius: 14, border: '1px solid rgba(242,182,109,.4)', background: 'rgba(242,182,109,.10)', color: DC.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Comment tu te sens aujourd'hui ? · 30 s
          </button>
        )}
      </section>

      {uid && <DrloMemoryCard uid={uid} palette={palette} />}

      {/* Ton chemin vers Dr Lô (paliers) */}
      {drlo && <PaliersCard status={drlo} palette={palette} />}

      <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>
        Des tendances, jamais des notes. Pas de diagnostic · Urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a>
      </p>
    </DrLoShell>
  );
};

export default EspacePage;
