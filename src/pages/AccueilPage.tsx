/**
 * AccueilPage — la page d'accueil de Health-e (« / »).
 * Elle présente ce dont les gens ont besoin : un test à la une, les nouveautés (vocaux, textes, outils), les chaînes,
 * des portes d'entrée par situation. Le chat n'est plus ici : il vit dans l'onglet Compagnon (/compagnon).
 * Le nom de Dr Lô n'apparaît que sur un contenu qu'il a fait (« par Dr Lô », en petit), sur un message qu'il a envoyé,
 * et, pour un visiteur, dans la ligne « Créé par Dr Lô, médecin » : qui est derrière, la première question en arrivant d'une vidéo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, CloudSun, Heart, Wind, PenLine, Wrench, MessageCircleQuestion } from 'lucide-react';
import { usePalette, DC, card } from '../components/accueil/DrLoShell';
import HealthLogo from '../components/brand/HealthLogo';
import { addDays, type Programme } from '../utils/programme';
import { loadProgramme } from '../services/programmeService';
import type { MoodMap } from '../utils/moodLog';
import HomeProgramme from '../components/accueil/HomeProgramme';
import { MoodSheet } from '../components/accueil/HomeSheets';
import HomePenc from '../components/penc/HomePenc';
import { useLaunch } from '../hooks/useLaunch';
import { HScroll, SectionTitle, NewsCard, ChannelCard, WideLink, tintOf, type NewsItem } from '../components/accueil/HomeParts';
import { RealDrLoPhoto } from '../components/accueil/RealDrLoBadge';
import CompanionMark from '../components/accueil/CompanionMark';
import { getCompanionColor } from '../utils/companion';
import { GrewCard } from '../components/accueil/CompanionGrowth';
import AccueilSeoSections from '../components/accueil/AccueilSeoSections';
import { useAuth } from '../contexts/AuthContext';
import { getOnboardingProfile } from '../utils/onboardingProfile';
import { getScaleById } from '../data/scales';
import { getScaleMeta } from '../utils/scaleMeta';
import { getMoment, greetingFor, type MomentPalette } from '../utils/drloMoment';
import { pickNextScale, firstName } from '../utils/accueilFlow';
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
import { pickHomeNext, sinceLabel } from '../utils/homeNext';
import { toDate } from '../utils/drLoGuide';
import { TOTEM_IMAGES } from '../data/totemImages';
import type { TotemAnimal } from '../utils/totemAlgorithm';
import { DailyGiftCard } from '../components/koris/GiftCards';
import { claimReferralRewardOnce } from '../services/korisGiftService';
import { useKoris } from '../contexts/KorisContext';
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
  const launch = useLaunch();
  // Tant que la compatibilité n'est pas ouverte, « Mon couple coince » mène au test d'attachement (le couple, vu de soi)
  const needs = NEEDS.map(n => (n.to === '/assessment/compatibility' && !launch.on('compat') ? { ...n, to: '/compagnon', state: { prescribe: 'ecr_r' } } : n));
  return (
    <>
      <SectionTitle>Qu'est-ce qui t'amène ?</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {needs.map(n => (
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
/** Les nouveautés suivent le lancement : publications et chaînes avec les chaînes (vague 3), outils avec la routine (vague 2). */
function newsItems(feed: HomeFeed, connected: boolean, show: { channels: boolean; tools: boolean } = { channels: true, tools: true }): NewsItem[] {
  const now = Date.now();
  const out: (NewsItem & { at: number })[] = [];
  if (show.channels) feed.latest.forEach(p => out.push({
    key: `p${p.id}`, at: p.at, kicker: p.hasAudio ? 'VOCAL' : 'TEXTE', title: p.title, tint: p.hasAudio ? DC.gold : DC.sage,
    meta: `${p.channelName} · par Dr Lô · ${agoLabel(p.at, now)}`, to: connected ? `/chaines/${p.channelId}` : `/c/${p.channelId}`,
  }));
  if (show.channels) feed.channels.filter(c => c.at && now - c.at < 30 * 864e5).forEach(c => out.push({
    key: `c${c.id}`, at: c.at, kicker: 'NOUVELLE CHAÎNE', title: c.name, tint: tintOf(c.id), meta: agoLabel(c.at, now), to: connected ? `/chaines/${c.id}` : `/c/${c.id}`,
  }));
  if (connected && show.tools) feed.tools.filter(t => t.at && now - t.at < 60 * 864e5).forEach(t => out.push({
    key: `t${t.id}`, at: t.at, kicker: 'OUTIL', title: t.title, tint: DC.intime, meta: t.minutes ? `${t.minutes} min · ${agoLabel(t.at, now)}` : agoLabel(t.at, now), to: `/pratique/${t.id}?from=/`,
  }));
  return out.sort((a, b) => b.at - a.at).slice(0, 8);
}

const Discover: React.FC<{ feed: HomeFeed | null; connected: boolean; channels?: boolean; tools?: boolean }> = ({ feed, connected, channels = true, tools = true }) => {
  const news = useMemo(() => (feed ? newsItems(feed, connected, { channels, tools }) : []), [feed, connected, channels, tools]);
  return (
    <>
      {news.length > 0 && (
        <>
          <SectionTitle>Nouveautés</SectionTitle>
          <HScroll label="Nouveautés">{news.map(n => <NewsCard key={n.key} item={n} />)}</HScroll>
        </>
      )}
      {channels && feed && feed.channels.length > 0 && (
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
    <WideLink to="/boite-a-questions" title="Dépose-la, en anonyme" sub="L'équipe lit tout et répond à certaines : ici, ou dans une vidéo." tint={DC.confier} icon={<MessageCircleQuestion size={24} color={DC.confier} aria-hidden="true" />} />
  </>
);

const WhenItRises: React.FC<{ confier?: boolean }> = ({ confier = true }) => {
  const navigate = useNavigate();
  const btn: React.CSSProperties = { flex: 1, minHeight: 56, borderRadius: 16, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  return (
    <>
      <SectionTitle>Quand ça monte</SectionTitle>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => navigate('/compagnon', { state: { breath: true } })} className="drl-btn" style={btn}><Wind size={18} color={DC.sage} aria-hidden="true" /> Respirer 1 min</button>
        {confier && <button onClick={() => navigate('/compagnon', { state: { tab: 'confier' } })} className="drl-btn" style={btn}><PenLine size={18} color={DC.confier} aria-hidden="true" /> Me confier</button>}
      </div>
    </>
  );
};

/** Le crochet de l'animal intérieur : de vraies images, pas une ligne de texte. */
const TEASER: TotemAnimal[] = ['lion', 'cerf', 'dauphin', 'panthere', 'hibou'];
const AnimalTeaser: React.FC<{ palette: MomentPalette }> = ({ palette }) => (
  <Link to="/espace/mental" onClick={() => trackAccueil('go', { to: 'animal_teaser', from: 'accueil' })} className="drl-btn"
    style={{ ...card, marginTop: 0, display: 'block', textDecoration: 'none', color: DC.text, borderColor: `${DC.gold}55`, background: `radial-gradient(90% 70% at 100% 0%, ${DC.gold}22, transparent 70%), ${DC.glass}` }}>
    <div aria-hidden="true" style={{ display: 'flex' }}>
      {TEASER.map((a, i) => (
        <img key={a} src={TOTEM_IMAGES[a]} alt="" width={56} height={56} loading="lazy"
          style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', marginLeft: i ? -12 : 0, border: '2px solid #1C150F', boxShadow: '0 6px 16px rgba(0,0,0,.35)' }} />
      ))}
    </div>
    <p style={{ margin: '12px 0 0', fontFamily: 'Fraunces, serif', fontSize: 21, lineHeight: 1.25, fontWeight: 600, color: DC.title }}>12 animaux. Lequel es-tu, au fond ?</p>
    <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.45, color: DC.muted }}>7 tests courts, et ton animal intérieur se révèle : une carte à partager, sans rien dévoiler d'intime.</p>
    <span style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: palette.accent }}>Découvrir le mien <ArrowRight size={16} aria-hidden="true" /></span>
  </Link>
);

/** Qui est derrière : la première question d'une personne qui arrive d'une vidéo. */
const TrustRow: React.FC<{ palette: MomentPalette }> = ({ palette }) => (
  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
    <span aria-hidden="true" style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', background: 'rgba(242,182,109,.12)', border: `1px solid ${palette.accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HealthLogo variant="mark" height={16} /></span>
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: DC.soft }}>
      <b style={{ color: DC.title }}>Pensé par une équipe de professionnels de santé.</b><br />Privé, sans jugement, en wolof et en français.
    </p>
  </div>
);

// ───────── Visiteur ─────────
const VisitorHome: React.FC<{ feed: HomeFeed | null; palette: MomentPalette }> = ({ feed, palette }) => {
  const navigate = useNavigate();
  const launch = useLaunch();
  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <HealthLogo height={24} />
        <button onClick={() => navigate('/compagnon', { state: { signup: true } })} className="drl-btn"
          style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Se connecter
        </button>
      </header>
      <h1 style={{ margin: '18px 0 0', fontFamily: 'Fraunces, serif', fontSize: 34, lineHeight: 1.15, fontWeight: 600, color: DC.title }}>Comprends ce que tu ressens.</h1>
      <p style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.5, color: DC.soft }}>Des tests sérieux, expliqués simplement. Privé, gratuit pour commencer, en wolof et en français.</p>
      <TrustRow palette={palette} />
      <FeaturedCard featured={pickFeatured(feed)} guest palette={palette} />
      <SectionTitle>Ton animal intérieur</SectionTitle>
      <AnimalTeaser palette={palette} />
      <Discover feed={feed} connected={false} channels={launch.on('chaines')} tools={false} />
      <NeedChips />
      {launch.on('compat') && (
        <>
          <SectionTitle>À deux</SectionTitle>
          <WideLink to="/assessment/compatibility" title="Comparez vos profils" sub="Partenaire, crush ou ami : un code à partager, une analyse croisée." tint={DC.social} icon={<Heart size={24} color={DC.social} aria-hidden="true" />} />
        </>
      )}
      <AskBox />
      <WhenItRises confier={false} />
    </>
  );
};

// ───────── Connecté ─────────
const ConnectedHome: React.FC<{ feed: HomeFeed | null; palette: MomentPalette; uid: string; prenom?: string }> = ({ feed, palette, uid, prenom }) => {
  const navigate = useNavigate();
  const [results, setResults] = useState<Record<string, ScaleResult> | null>(null);
  const [totemRevealed, setTotemRevealed] = useState(false);
  const { refreshBalance } = useKoris();
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [chBadge, setChBadge] = useState(0);
  const [mine, setMine] = useState<Mine | null>(null);
  const [moodDone, setMoodDone] = useState<boolean | null>(null);
  const [moods, setMoods] = useState<MoodMap>({});
  const [prog, setProg] = useState<Programme | null>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [drlo, setDrlo] = useState<DrloStatus | null>(null);
  const today = dayKey();
  const launch = useLaunch();
  const [pencLive, setPencLive] = useState(false);
  // La lumière du compagnon colore la carte vedette (et le fond de la page)
  const cc = getCompanionColor().hex;

  useEffect(() => {
    let off = false;
    getProfileProgress(uid).then(p => { if (!off) { setResults(p.scaleResults ?? {}); setTotemRevealed(!!p.totem?.animal && !!p.totem.revealedAt); } }).catch(() => { if (!off) setResults({}); });
    getInbox().then(r => { if (!off) { setInbox(r.items); setUnread(r.unread); } }).catch(() => {});
    getChannelNews().then(r => { if (!off) setChBadge(r.badge); }).catch(() => {});
    myPractices().then(m => { if (!off) setMine(m); }).catch(() => {});
    fetchMoods(uid, addDays(today, -35)).then(m => { if (!off) { setMoods(m); setMoodDone(!!m[today]); } }).catch(() => {});
    loadProgramme(uid).then(p => { if (!off) setProg(p); }).catch(() => {});
    getDrloStatus().then(s => { if (!off) setDrlo(s); }).catch(() => {});
    return () => { off = true; };
  }, [uid, today]);

  // Le test à la une : seulement s'il a été choisi dans l'espace Dr Lô, et pas déjà fait
  const featuredForYou = feed?.featured && getScaleById(feed.featured.scaleId) && results && !results[feed.featured.scaleId] ? feed.featured : null;

  // Ta suite : la prochaine chose à faire, une seule
  const suite = useMemo(() => {
    if (!results) return null;
    const prog = getTotemProgress(results);
    if (prog.missing.length > 0) {
      const n = prog.missing.length;
      return { kicker: 'TA SUITE', title: `Plus que ${n} test${n > 1 ? 's' : ''} pour découvrir ton animal intérieur`, cta: `Faire « ${getScaleMeta(prog.missing[0]).label} »`, go: () => navigate('/compagnon', { state: { prescribe: prog.missing[0] } }), id: prog.missing[0] };
    }
    if (!totemRevealed) return { kicker: 'TA SUITE', title: 'Ton animal intérieur est prêt', cta: 'Le découvrir', go: () => navigate('/assessment/totem'), id: '' };
    const next = pickNextScale('decouvre', Object.keys(results));
    if (next) return { kicker: 'TA SUITE', title: `Ton prochain test : ${getScaleMeta(next).label}`, cta: 'Commencer', go: () => navigate('/compagnon', { state: { prescribe: next } }), id: next };
    // Les 7 sont faits : un test du moment, sinon refaire un test d'état ancien. L'accueil n'est jamais vide.
    const dates = Object.fromEntries(Object.entries(results).map(([id, r]) => [id, toDate((r as { completedAt?: unknown }).completedAt)]));
    const more = pickHomeNext(dates, Date.now(), feed?.featured ? [feed.featured.scaleId] : []);
    if (more?.kind === 'new') return { kicker: 'À DÉCOUVRIR', title: `${getScaleMeta(more.id).label} : et toi, tu es comment ?`, cta: 'Faire le test', go: () => navigate('/compagnon', { state: { prescribe: more.id } }), id: more.id };
    if (more?.kind === 'retake') return { kicker: 'ÇA A BOUGÉ ?', title: `Ton test « ${getScaleMeta(more.id).label} » date de ${sinceLabel(more.days)}. Et aujourd'hui ?`, cta: 'Refaire le point', go: () => navigate('/compagnon', { state: { prescribe: more.id } }), id: more.id };
    return null;
  }, [results, totemRevealed, navigate, feed]);

  // Parrainage : la personne invitée a fait un test → elle et son parrain reçoivent des étincelles (une seule fois)
  useEffect(() => {
    if (!results || Object.keys(results).length === 0) return;
    claimReferralRewardOnce().then(n => { if (n > 0) refreshBalance().catch(() => {}); }).catch(() => {});
  }, [results, refreshBalance]);

  const lastMsg = inbox.find(i => !i.seen) ?? null;
  const learning = mine?.learning[0] ?? null;
  const stepsDone = drlo ? drlo.paliers.steps.filter(s => s.done).length : 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 36, marginBottom: 6 }}><HealthLogo height={20} /></div>
      <header style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>{greetingFor(getMoment(), prenom)}</h1>
        {/* Le compagnon vivant : il respire ici aussi, un tap ouvre la discussion */}
        <Link to="/compagnon" aria-label="Parler à mon compagnon" className="drl-btn" style={{ flexShrink: 0, borderRadius: '50%' }}>
          <CompanionMark size={56} live />
        </Link>
      </header>

      {/* Il a grandi : une fois par stade */}
      <GrewCard palette={palette} />

      {/* Une seule carte vedette : un Pénc en direct, sinon ta suite ; puis le test du moment, ton message, l'humeur */}
      <HomePenc palette={palette} full={launch.on('penc_page')} onLive={setPencLive} />

      {suite && !pencLive && (
        <section aria-label="Ta suite" style={{ ...card, marginTop: 14, padding: 16, position: 'relative', overflow: 'hidden', borderColor: `${cc}80`, background: `radial-gradient(60% 80% at 100% 0%, ${cc}4D, transparent 70%), linear-gradient(140deg, ${cc}33, rgba(26,18,11,.9) 65%)` }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', color: palette.accent }}>{suite.kicker}</p>
          <p style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 21, lineHeight: 1.25, fontWeight: 600, color: DC.title }}>{suite.title}</p>
          <button onClick={suite.go} className="drl-btn"
            style={{ marginTop: 12, minHeight: 48, padding: '0 20px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{suite.cta}</button>
        </section>
      )}

      {featuredForYou && featuredForYou.scaleId !== suite?.id && (
        <div style={{ marginTop: 14 }}>
          <WideLink to="/compagnon" state={{ prescribe: featuredForYou.scaleId }} kicker={featuredForYou.label ? 'VU DANS LA VIDÉO' : 'LE TEST DU MOMENT'}
            title={featuredForYou.label || getScaleMeta(featuredForYou.scaleId).label} tint={DC.sage}
            icon={<span aria-hidden="true" style={{ width: 40, height: 40, flex: 'none', borderRadius: 12, background: `${DC.sage}38`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardList size={20} color={DC.sage} /></span>} />
        </div>
      )}

      <DailyGiftCard palette={palette} />


      {(lastMsg || (chBadge > 0 && launch.on('chaines'))) && (
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
            {chBadge > 0 && launch.on('chaines') && (
              <WideLink to="/chaines" title={`${chBadge} nouveauté${chBadge > 1 ? 's' : ''} dans tes chaînes`} tint={DC.gold} />
            )}
          </div>
        </>
      )}

      {moodDone === false && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setMoodOpen(true)} className="drl-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14, minHeight: 64, borderRadius: 18, textAlign: 'left', color: DC.text, border: `1px solid ${DC.sage}55`, background: `linear-gradient(135deg, ${DC.sage}26, ${DC.sage}07 70%)`, cursor: 'pointer', fontFamily: 'inherit' }}>
            <CloudSun size={22} color={DC.sage} aria-hidden="true" />
            <span style={{ flex: 1 }}><span style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: DC.title }}>Comment tu te sens ?</span><span style={{ display: 'block', marginTop: 2, fontSize: 14, color: DC.muted }}>Note ton humeur en 30 secondes.</span></span>
          </button>
        </div>
      )}

      {moodOpen && <MoodSheet uid={uid} prenom={prenom} onNoted={() => { setMoodDone(true); setMoods(m => ({ ...m, [today]: { mood: 'bof', at: Date.now() } })); }} onClose={() => setMoodOpen(false)} />}

      {prog && launch.on('programme') && <HomeProgramme uid={uid} prog={prog} onProg={setProg} moods={moods} onMoods={setMoods} prenom={prenom} genre={getOnboardingProfile()?.genre ?? undefined} palette={palette} />}

      {learning && launch.on('routine') && (
        <>
          <SectionTitle>Ta routine</SectionTitle>
          <WideLink to="/routine" kicker={learning.learning ? `JOUR ${learning.learning.day} SUR ${learning.learning.of}` : undefined} title={learning.title}
            sub={learning.learning?.ready ? 'À faire aujourd\'hui' : undefined} tint={DC.sage} icon={<Wrench size={22} color={DC.sage} aria-hidden="true" />} />
        </>
      )}


      <Discover feed={feed} connected channels={launch.on('chaines')} tools={launch.on('routine')} />

      {drlo && launch.on('question') && (
        <>
          <SectionTitle>Mon parcours</SectionTitle>
          <WideLink to="/question" kicker={`ÉTAPE ${Math.min(stepsDone + 1, drlo.paliers.steps.length)} SUR ${drlo.paliers.steps.length}`} title="Ta question privée au médecin" sub="Une réponse personnelle, au bout de ton parcours." tint={DC.gold} />
        </>
      )}
      <AskBox />
      <WhenItRises confier={launch.on('confier')} />
    </>
  );
};

const AccueilPage: React.FC = () => {
  const location = useLocation();
  const palette = usePalette();
  const { isAuthenticated, authReady, currentUser } = useAuth();
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const ob = getOnboardingProfile();
  const prenom = firstName(ob?.prenom || currentUser?.name);

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
    <div className="drl-screen font-sans" style={{ minHeight: '100svh', background: isAuthenticated ? `radial-gradient(60% 28% at 85% 2%, ${getCompanionColor().hex}2B, transparent 70%), ${palette.bg}` : palette.bg, color: DC.text, ['--he-action' as string]: palette.primary } as React.CSSProperties}>
      <div className="drl-wrap" style={{ margin: '0 auto', padding: '16px 18px calc(92px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box' }}>
        {authReady && (isAuthenticated && currentUser
          ? <ConnectedHome feed={feed} palette={palette} uid={currentUser.id} prenom={prenom} />
          : <VisitorHome feed={feed} palette={palette} />)}
      </div>

      {/* Contenu indexable pour Google : inutile pour une personne connectée */}
      {authReady && !isAuthenticated && <AccueilSeoSections />}

      <div className="drl-wrap" style={{ margin: '0 auto', padding: '8px 18px calc(92px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', fontSize: 13, color: DC.faint, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
