/**
 * AccueilPage — la page d'accueil de Health-e (« / »).
 * Elle présente ce dont les gens ont besoin : un test à la une, les nouveautés (vocaux, textes, outils), les chaînes,
 * des portes d'entrée par situation. Le chat n'est plus ici : il vit dans l'onglet Compagnon (/compagnon).
 * Le nom de Dr Lô n'apparaît que sur un contenu qu'il a fait (« par Dr Lô », en petit) ou sur un message qu'il a envoyé.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CloudSun, Heart, Sparkles, Wind, PenLine, Wrench, MessageCircleQuestion } from 'lucide-react';
import { usePalette, DC, card } from '../components/accueil/DrLoShell';
import { MoodSheet } from '../components/accueil/HomeSheets';
import { HScroll, SectionTitle, NewsCard, ChannelCard, WideLink, tintOf, type NewsItem } from '../components/accueil/HomeParts';
import { RealDrLoPhoto } from '../components/accueil/RealDrLoBadge';
import AccueilSeoSections from '../components/accueil/AccueilSeoSections';
import { useAuth } from '../contexts/AuthContext';
import { getOnboardingProfile } from '../utils/onboardingProfile';
import { getScaleById } from '../data/scales';
import { getScaleMeta } from '../utils/scaleMeta';
import { getMoment, greetingFor, type MomentPalette } from '../utils/drloMoment';
import { pickNextScale } from '../utils/accueilFlow';
import { getTotemProgress } from '../utils/totemAlgorithm';
import { getProfileProgress } from '../services/evaluationService';
import { fetchMoods } from '../services/moodService';
import { dayKey } from '../utils/moodLog';
import { getInbox, type InboxItem } from '../services/drloBroadcastService';
import { getChannelNews } from '../services/drloChannelService';
import { getDrloStatus, captureReferral, type DrloStatus } from '../services/drloQuestionService';
import { myPractices, type Mine } from '../services/practiceService';
import { agoLabel, DEFAULT_FEATURED, getHomeFeed, type Featured, type HomeFeed } from '../services/homeFeedService';
import { trackAccueil } from '../utils/accueilTracking';
import type { ScaleResult } from '../types/assessment';

/** Les portes d'entrée par situation : chacune mène à un test ou à une action qui existe déjà. */
const NEEDS: { label: string; to: string; state?: unknown }[] = [
  { label: 'Je stresse trop', to: '/compagnon', state: { prescribe: 'pss10' } },
  { label: 'Mon couple coince', to: '/assessment/compatibility' },
  { label: 'Je dors mal', to: '/compagnon', state: { prescribe: 'bonus_sommeil' } },
  { label: 'Je veux me comprendre', to: '/compagnon', state: { prescribe: 'big_five' } },
];

/** Le test à la une : celui choisi dans l'espace Dr Lô, sinon le test par défaut (jamais un test qui n'existe plus). */
function pickFeatured(feed: HomeFeed | null): Featured {
  const f = feed?.featured;
  return f && getScaleById(f.scaleId) ? f : DEFAULT_FEATURED;
}

const FeaturedCard: React.FC<{ featured: Featured; guest: boolean; palette: MomentPalette }> = ({ featured, guest, palette }) => {
  const navigate = useNavigate();
  const meta = getScaleMeta(featured.scaleId);
  const minutes = getScaleById(featured.scaleId)?.timeEstimateMinutes ?? 3;
  const title = featured.label || meta.label;
  return (
    <section aria-label="À la une" style={{ ...card, marginTop: 18, padding: 18, borderColor: 'rgba(242,182,109,.5)', background: 'linear-gradient(150deg, rgba(242,182,109,.2), rgba(255,255,255,.04))' }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', color: palette.accent }}>{featured.label ? 'VU DANS LA VIDÉO' : 'COMMENCE ICI'}</p>
      <h2 style={{ margin: '8px 0 0', fontFamily: 'Fraunces, serif', fontSize: 26, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>{title}</h2>
      <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>{meta.description}</p>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: DC.muted }}>{minutes} min · {guest ? 'Gratuit pour commencer · Privé' : 'Privé'}</p>
      <button onClick={() => { trackAccueil('go', { to: 'featured_test', from: 'accueil' }); navigate('/compagnon', { state: { prescribe: featured.scaleId } }); }} className="drl-btn"
        style={{ marginTop: 14, width: '100%', minHeight: 52, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        Faire le test <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
};

const NeedChips: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <SectionTitle>Qu'est-ce qui t'amène ?</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {NEEDS.map(n => (
          <button key={n.label} onClick={() => { trackAccueil('go', { to: 'need', from: 'accueil' }); navigate(n.to, n.state ? { state: n.state } : undefined); }} className="drl-btn"
            style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            {n.label}
          </button>
        ))}
      </div>
    </>
  );
};

/** Nouveautés : derniers contenus ouverts à tous, nouvelles chaînes et (pour les connectés) nouveaux outils, du plus récent au plus ancien. */
function newsItems(feed: HomeFeed, connected: boolean): NewsItem[] {
  const now = Date.now();
  const out: (NewsItem & { at: number })[] = [];
  feed.latest.forEach(p => out.push({
    key: `p${p.id}`, at: p.at, kicker: p.hasAudio ? 'VOCAL' : 'TEXTE', title: p.title, tint: p.hasAudio ? DC.gold : DC.sage,
    meta: `${p.channelName} · par Dr Lô · ${agoLabel(p.at, now)}`, to: connected ? `/chaines/${p.channelId}` : `/c/${p.channelId}`,
  }));
  feed.channels.filter(c => c.at && now - c.at < 30 * 864e5).forEach(c => out.push({
    key: `c${c.id}`, at: c.at, kicker: 'NOUVELLE CHAÎNE', title: c.name, tint: tintOf(c.id), meta: agoLabel(c.at, now), to: connected ? `/chaines/${c.id}` : `/c/${c.id}`,
  }));
  if (connected) feed.tools.filter(t => t.at && now - t.at < 60 * 864e5).forEach(t => out.push({
    key: `t${t.id}`, at: t.at, kicker: 'OUTIL', title: t.title, tint: DC.intime, meta: t.minutes ? `${t.minutes} min · ${agoLabel(t.at, now)}` : agoLabel(t.at, now), to: `/pratique/${t.id}?from=/`,
  }));
  return out.sort((a, b) => b.at - a.at).slice(0, 8);
}

const Discover: React.FC<{ feed: HomeFeed | null; connected: boolean }> = ({ feed, connected }) => {
  const news = useMemo(() => (feed ? newsItems(feed, connected) : []), [feed, connected]);
  return (
    <>
      {news.length > 0 && (
        <>
          <SectionTitle>Nouveautés</SectionTitle>
          <HScroll label="Nouveautés">{news.map(n => <NewsCard key={n.key} item={n} />)}</HScroll>
        </>
      )}
      {feed && feed.channels.length > 0 && (
        <>
          <SectionTitle aside={connected ? <Link to="/chaines" style={{ fontSize: 14, fontWeight: 700, color: DC.gold, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>Tout voir</Link> : undefined}>Les chaînes</SectionTitle>
          <HScroll label="Les chaînes">{feed.channels.map(c => <ChannelCard key={c.id} c={c} to={connected ? `/chaines/${c.id}` : `/c/${c.id}`} />)}</HScroll>
        </>
      )}
    </>
  );
};

/** La boîte à questions : anonyme, sans compte, sans promesse de réponse. */
const AskBox: React.FC = () => (
  <>
    <SectionTitle>Une question ?</SectionTitle>
    <WideLink to="/boite-a-questions" title="Dépose-la, en anonyme" sub="Dr Lô lit tout et répond à certaines : ici, ou dans une vidéo." tint={DC.confier} icon={<MessageCircleQuestion size={24} color={DC.confier} aria-hidden="true" />} />
  </>
);

const WhenItRises: React.FC = () => {
  const navigate = useNavigate();
  const btn: React.CSSProperties = { flex: 1, minHeight: 56, borderRadius: 16, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  return (
    <>
      <SectionTitle>Quand ça monte</SectionTitle>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => navigate('/compagnon', { state: { breath: true } })} className="drl-btn" style={btn}><Wind size={18} color={DC.sage} aria-hidden="true" /> Respirer 1 min</button>
        <button onClick={() => navigate('/compagnon', { state: { tab: 'confier' } })} className="drl-btn" style={btn}><PenLine size={18} color={DC.confier} aria-hidden="true" /> Me confier</button>
      </div>
    </>
  );
};

// ───────── Visiteur ─────────
const VisitorHome: React.FC<{ feed: HomeFeed | null; palette: MomentPalette }> = ({ feed, palette }) => {
  const navigate = useNavigate();
  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: DC.title }}>Health-e</span>
        <button onClick={() => navigate('/compagnon', { state: { signup: true } })} className="drl-btn"
          style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Se connecter
        </button>
      </header>
      <h1 style={{ margin: '18px 0 0', fontFamily: 'Fraunces, serif', fontSize: 34, lineHeight: 1.15, fontWeight: 600, color: DC.title }}>Comprends ce que tu ressens.</h1>
      <p style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.5, color: DC.soft }}>Des tests, des vocaux et des outils pour ton bien-être. Privé, en wolof et en français.</p>
      <FeaturedCard featured={pickFeatured(feed)} guest palette={palette} />
      <Discover feed={feed} connected={false} />
      <NeedChips />
      <SectionTitle>Ton animal intérieur</SectionTitle>
      <WideLink to="/espace/mental" kicker="7 TESTS, UN RÉSULTAT À PARTAGER" title="Quel animal es-tu vraiment ?" tint={DC.gold} icon={<Sparkles size={24} color={DC.gold} aria-hidden="true" />} />
      <SectionTitle>À deux</SectionTitle>
      <WideLink to="/assessment/compatibility" title="Comparez vos profils" sub="Partenaire, crush ou ami : un code à partager, une analyse croisée." tint={DC.social} icon={<Heart size={24} color={DC.social} aria-hidden="true" />} />
      <AskBox />
      <WhenItRises />
    </>
  );
};

// ───────── Connecté ─────────
const ConnectedHome: React.FC<{ feed: HomeFeed | null; palette: MomentPalette; uid: string; prenom?: string }> = ({ feed, palette, uid, prenom }) => {
  const navigate = useNavigate();
  const [results, setResults] = useState<Record<string, ScaleResult> | null>(null);
  const [totemRevealed, setTotemRevealed] = useState(false);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [chBadge, setChBadge] = useState(0);
  const [mine, setMine] = useState<Mine | null>(null);
  const [moodDone, setMoodDone] = useState<boolean | null>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [drlo, setDrlo] = useState<DrloStatus | null>(null);
  const today = dayKey();

  useEffect(() => {
    let off = false;
    getProfileProgress(uid).then(p => { if (!off) { setResults(p.scaleResults ?? {}); setTotemRevealed(!!p.totem?.animal && !!p.totem.revealedAt); } }).catch(() => { if (!off) setResults({}); });
    getInbox().then(r => { if (!off) { setInbox(r.items); setUnread(r.unread); } }).catch(() => {});
    getChannelNews().then(r => { if (!off) setChBadge(r.badge); }).catch(() => {});
    myPractices().then(m => { if (!off) setMine(m); }).catch(() => {});
    fetchMoods(uid, today).then(m => { if (!off) setMoodDone(!!m[today]); }).catch(() => {});
    getDrloStatus().then(s => { if (!off) setDrlo(s); }).catch(() => {});
    return () => { off = true; };
  }, [uid, today]);

  // Ta suite : la prochaine chose à faire, une seule
  const suite = useMemo(() => {
    if (!results) return null;
    const prog = getTotemProgress(results);
    if (prog.missing.length > 0) {
      const n = prog.missing.length;
      return { kicker: 'TA SUITE', title: `Plus que ${n} test${n > 1 ? 's' : ''} pour découvrir ton animal intérieur`, cta: `Faire « ${getScaleMeta(prog.missing[0]).label} »`, go: () => navigate('/compagnon', { state: { prescribe: prog.missing[0] } }) };
    }
    if (!totemRevealed) return { kicker: 'TA SUITE', title: 'Ton animal intérieur est prêt', cta: 'Le découvrir', go: () => navigate('/assessment/totem') };
    const next = pickNextScale('decouvre', Object.keys(results));
    if (next) return { kicker: 'TA SUITE', title: `Ton prochain test : ${getScaleMeta(next).label}`, cta: 'Commencer', go: () => navigate('/compagnon', { state: { prescribe: next } }) };
    return null;
  }, [results, totemRevealed, navigate]);

  const lastMsg = inbox.find(i => !i.seen) ?? null;
  const learning = mine?.learning[0] ?? null;
  const stepsDone = drlo ? drlo.paliers.steps.filter(s => s.done).length : 0;

  return (
    <>
      <header style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>{greetingFor(getMoment(), prenom)}</h1>
      </header>

      {suite && (
        <section aria-label="Ta suite" style={{ ...card, marginTop: 14, padding: 16, borderColor: 'rgba(242,182,109,.5)', background: 'linear-gradient(150deg, rgba(242,182,109,.2), rgba(255,255,255,.04))' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', color: palette.accent }}>{suite.kicker}</p>
          <p style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 21, lineHeight: 1.25, fontWeight: 600, color: DC.title }}>{suite.title}</p>
          <button onClick={suite.go} className="drl-btn"
            style={{ marginTop: 12, minHeight: 48, padding: '0 20px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{suite.cta}</button>
        </section>
      )}

      {(lastMsg || chBadge > 0) && (
        <>
          <SectionTitle>Nouveau pour toi</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lastMsg && (
              <Link to={`/messages-dr-lo/${lastMsg.id}`} className="drl-btn" style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: DC.text, borderColor: 'rgba(242,182,109,.4)' }}>
                <RealDrLoPhoto size={44} palette={palette} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: palette.accent }}>Un message de Dr Lô{unread > 1 ? ` · ${unread} non lus` : ''}</span>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 15, lineHeight: 1.4, color: DC.soft }}>{lastMsg.text}</span>
                </span>
                <ArrowRight size={18} color={DC.muted} aria-hidden="true" />
              </Link>
            )}
            {chBadge > 0 && (
              <WideLink to="/chaines" title={`${chBadge} nouveauté${chBadge > 1 ? 's' : ''} dans tes chaînes`} tint={DC.gold} />
            )}
          </div>
        </>
      )}

      {learning && (
        <>
          <SectionTitle>Ta routine</SectionTitle>
          <WideLink to="/routine" kicker={learning.learning ? `JOUR ${learning.learning.day} SUR ${learning.learning.of}` : undefined} title={learning.title}
            sub={learning.learning?.ready ? 'À faire aujourd\'hui' : undefined} tint={DC.sage} icon={<Wrench size={22} color={DC.sage} aria-hidden="true" />} />
        </>
      )}

      {moodDone === false && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setMoodOpen(true)} className="drl-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14, minHeight: 64, borderRadius: 18, textAlign: 'left', color: DC.text, border: `1px solid ${DC.gold}55`, background: `${DC.gold}12`, cursor: 'pointer', fontFamily: 'inherit' }}>
            <CloudSun size={22} color={DC.gold} aria-hidden="true" />
            <span style={{ flex: 1 }}><span style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: DC.title }}>Comment tu te sens ?</span><span style={{ display: 'block', marginTop: 2, fontSize: 14, color: DC.muted }}>Note ton humeur en 30 secondes.</span></span>
          </button>
        </div>
      )}

      {moodOpen && <MoodSheet uid={uid} prenom={prenom} onNoted={() => setMoodDone(true)} onClose={() => setMoodOpen(false)} />}

      <Discover feed={feed} connected />

      {drlo && (
        <>
          <SectionTitle>Mon parcours</SectionTitle>
          <WideLink to="/question" kicker={`ÉTAPE ${Math.min(stepsDone + 1, drlo.paliers.steps.length)} SUR ${drlo.paliers.steps.length}`} title="Ta question privée au médecin" sub="Une réponse personnelle, au bout de ton parcours." tint={DC.gold} />
        </>
      )}
      <AskBox />
      <WhenItRises />
    </>
  );
};

const AccueilPage: React.FC = () => {
  const location = useLocation();
  const palette = usePalette();
  const { isAuthenticated, authReady, currentUser } = useAuth();
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const ob = getOnboardingProfile();
  const prenom = ob?.prenom || currentUser?.name?.split(' ')[0];

  useEffect(() => { captureReferral(location.search); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let off = false;
    trackAccueil('home_view', { guest: !isAuthenticated });
    getHomeFeed().then(f => { if (!off) setFeed(f); }).catch(() => { if (!off) setFeed({ featured: null, channels: [], latest: [], tools: [] }); });
    return () => { off = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Les anciens liens de notification (« /?ouvrir=programme ») ouvrent la conversation, là où vit le programme
  if (new URLSearchParams(location.search).get('ouvrir')) return <Navigate to={{ pathname: '/compagnon', search: location.search }} replace />;

  return (
    <div className="drl-screen font-sans" style={{ minHeight: '100svh', background: palette.bg, color: DC.text, ['--he-action' as string]: palette.primary } as React.CSSProperties}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 18px calc(92px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box' }}>
        {authReady && (isAuthenticated && currentUser
          ? <ConnectedHome feed={feed} palette={palette} uid={currentUser.id} prenom={prenom} />
          : <VisitorHome feed={feed} palette={palette} />)}
      </div>

      {/* Contenu indexable pour Google : inutile pour une personne connectée */}
      {authReady && !isAuthenticated && <AccueilSeoSections />}

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '8px 18px calc(92px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', fontSize: 13, color: DC.faint, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span><strong style={{ color: DC.text }}>Health-e</strong> — Ces évaluations ne remplacent pas un professionnel de santé.</span>
        <nav aria-label="Liens du site" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 18px' }}>
          <Link to="/confidentialite" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', color: DC.faint, textDecoration: 'none' }}>Confidentialité</Link>
          <Link to="/conditions" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', color: DC.faint, textDecoration: 'none' }}>Conditions</Link>
          <Link to="/equipe" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', color: DC.faint, textDecoration: 'none' }}>Accès équipe</Link>
        </nav>
      </div>
    </div>
  );
};

export default AccueilPage;

/** Ces pièces sont aussi utilisées par les tests. */
export { pickFeatured, newsItems };
