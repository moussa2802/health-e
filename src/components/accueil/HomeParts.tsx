/**
 * HomeParts — les petites pièces de l'accueil : titre de section, rangée qui défile, carte de nouveauté, carte de chaîne.
 * Aucune n'affiche « Dr Lô » d'elle-même : le nom n'apparaît que sur un contenu qu'il a fait (la mention « par Dr Lô »
 * est donnée par l'appelant) ou sur un message qu'il a envoyé.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import Illustration from './Illustration';
import { ArrowRight, ClipboardList, Headphones, MessageCircle, Radio, Sparkles, Wrench } from 'lucide-react';
import { DC } from './DrLoShell';
import { categoryLabel } from '../../services/drloChannelService';
import type { HomeChannel } from '../../services/homeFeedService';

/**
 * Le système de l'accueil : un seul espacement entre les cartes, une seule hauteur d'image, une seule marge intérieure.
 * Les cartes avec image (ImageCard) : Pénc mi, le cas du soir. Les petites cartes en ligne (CompactRow) : humeur, question, respirer…
 */
export const GAP = 14;
export const PAD = 16;
export const IMG_H = 150;
export const RADIUS = 20;

export const SectionTitle: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: `26px 0 ${GAP - 4}px` }}>
    <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>{children}</h2>
    {aside}
  </div>
);

/** Une rangée qui défile sur le côté, jusqu'au bord de l'écran. */
export const HScroll: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div role="list" aria-label={label}
    style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -18px', padding: '2px 18px 6px', scrollSnapType: 'x proximity', scrollPaddingLeft: 18, WebkitOverflowScrolling: 'touch' }}>
    {children}
  </div>
);

const TINTS = [DC.sage, DC.gold, DC.intime, DC.confier, DC.social];
export const tintOf = (id: string) => TINTS[[...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % TINTS.length];

export interface NewsItem { key: string; kicker: string; title: string; meta: string; to: string; tint: string }

/** L'icône d'une nouveauté, d'après son étiquette (vocal, outil, test, chaîne…). */
function newsIcon(kicker: string) {
  const k = kicker.toLowerCase();
  if (k.includes('vocal') || k.includes('épisode') || k.includes('audio')) return Headphones;
  if (k.includes('outil') || k.includes('pratique') || k.includes('exercice')) return Wrench;
  if (k.includes('test')) return ClipboardList;
  if (k.includes('chaîne') || k.includes('pénc')) return Radio;
  if (k.includes('message') || k.includes('question')) return MessageCircle;
  return Sparkles;
}

/** Une nouveauté : une icône et une étiquette (vocal, texte, outil…), un titre, une ligne discrète. */
export const NewsCard: React.FC<{ item: NewsItem }> = ({ item }) => {
  const Icon = newsIcon(item.kicker);
  return (
  <Link role="listitem" to={item.to} className="drl-btn"
    style={{ flex: '0 0 220px', scrollSnapAlign: 'start', boxSizing: 'border-box', minHeight: 150, padding: 14, borderRadius: 20, textDecoration: 'none', color: DC.text,
      border: `1px solid ${item.tint}44`, background: `radial-gradient(120% 90% at 0% 0%, ${item.tint}30, transparent 60%), linear-gradient(170deg, rgba(255,255,255,.06), rgba(255,255,255,.02))`, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden="true" style={{ width: 30, height: 30, flex: 'none', borderRadius: 10, background: `${item.tint}2E`, color: item.tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} /></span>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.1em', color: item.tint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.kicker}</span>
    </span>
    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 18, lineHeight: 1.25, fontWeight: 600, color: DC.title, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</span>
    <span style={{ marginTop: 'auto', fontSize: 13, color: DC.muted, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.meta}</span>
  </Link>
  );
};

/** Une chaîne : son nom et ses thèmes, rien d'autre. */
export const ChannelCard: React.FC<{ c: HomeChannel; to: string }> = ({ c, to }) => {
  const tint = tintOf(c.id);
  const cats = (c.categories ?? []).slice(0, 2).map(categoryLabel).join(' · ');
  return (
    <Link role="listitem" to={to} className="drl-btn"
      style={{ flex: '0 0 150px', scrollSnapAlign: 'start', boxSizing: 'border-box', borderRadius: 18, overflow: 'hidden', textDecoration: 'none', color: DC.text, border: `1px solid ${DC.line}`, background: DC.glass, display: 'flex', flexDirection: 'column' }}>
      {c.imageUrl ? (
        <div aria-hidden="true" style={{ height: 96, background: `center / cover url(${c.imageUrl})` }} />
      ) : (
        <div aria-hidden="true" style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(120% 90% at 20% 10%, ${tint}55, transparent 60%), linear-gradient(135deg, ${tint}33, rgba(28,20,13,.6))` }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 52, lineHeight: 1, color: tint, opacity: 0.55 }}>{(c.name.trim()[0] || '·').toUpperCase()}</span>
        </div>
      )}
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.name}</span>
        {cats && <span style={{ fontSize: 13, color: DC.faint }}>{cats}</span>}
      </div>
    </Link>
  );
};

/**
 * La petite carte en ligne : icône (dans une pastille de 40 px), titre, sous-titre, flèche. Toujours la même hauteur.
 * Un lien (« to ») ou un bouton (« onClick »).
 */
export const CompactRow: React.FC<{ to?: string; state?: unknown; onClick?: () => void; kicker?: string; title: string; sub?: string; tint?: string; icon?: React.ReactNode }> = ({ to, state, onClick, kicker, title, sub, tint = DC.gold, icon }) => {
  const style: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, padding: `12px ${PAD - 2}px`, minHeight: 76, borderRadius: RADIUS - 2,
    textDecoration: 'none', textAlign: 'left', color: DC.text, border: `1px solid ${tint}55`, background: `linear-gradient(135deg, ${tint}24, ${tint}07 70%)`, cursor: 'pointer', fontFamily: 'inherit',
  };
  const inner = (
    <>
      {icon && <span aria-hidden="true" style={{ width: 40, height: 40, flex: 'none', borderRadius: 12, background: `${tint}2E`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        {kicker && <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '.1em', color: tint }}>{kicker}</span>}
        <span style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 18, lineHeight: 1.25, fontWeight: 600, color: DC.title }}>{title}</span>
        {sub && <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 2, fontSize: 14, lineHeight: 1.4, color: DC.muted }}>{sub}</span>}
      </span>
      <ArrowRight size={18} color={DC.muted} aria-hidden="true" style={{ flexShrink: 0 }} />
    </>
  );
  return to
    ? <Link to={to} state={state} className="drl-btn" style={style}>{inner}</Link>
    : <button type="button" onClick={onClick} className="drl-btn" style={style}>{inner}</button>;
};

/** Ancien nom, gardé : un lien plein de la largeur = une petite carte en ligne. */
export const WideLink: React.FC<{ to: string; state?: unknown; kicker?: string; title: string; sub?: string; tint?: string; icon?: React.ReactNode }> = (p) => <CompactRow {...p} />;

/** Une pile de cartes, avec l'espacement unique de l'accueil. */
export const Stack: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>{children}</div>
);

/**
 * La carte avec image : l'image DANS la carte, en haut (hauteur fixe, recadrée au centre), puis un surtitre, le titre,
 * une ligne, et en bas un bouton (« footer ») ou une flèche. Sans fichier image : un dégradé avec le motif « fallback ».
 */
export const ImageCard: React.FC<{
  /** Absent : la carte n'est pas un lien (ex. un épisode pas encore ouvert) */
  to?: string; image: string | null; tint: string; fallback?: React.ReactNode; kicker?: React.ReactNode; title: React.ReactNode; line?: React.ReactNode;
  footer?: React.ReactNode; label?: string;
}> = ({ to, image, tint, fallback, kicker, title, line, footer, label }) => (
  <article style={{ borderRadius: RADIUS, overflow: 'hidden', border: `1px solid ${tint}44`, background: `linear-gradient(170deg, ${tint}14, rgba(255,255,255,.03) 60%)` }}>
    {(() => {
      const body = (
        <>
          <Illustration src={image} height={IMG_H} tint={tint} radius={0} fallback={fallback} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `12px ${PAD}px ${footer ? 4 : 14}px` }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              {kicker && <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: tint }}>{kicker}</span>}
              <span style={{ display: 'block', marginTop: kicker ? 4 : 0, fontFamily: 'Fraunces, serif', fontSize: 19, lineHeight: 1.25, fontWeight: 600, color: DC.title }}>{title}</span>
              {line && <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 2, fontSize: 14, lineHeight: 1.4, color: DC.muted }}>{line}</span>}
            </span>
            {!footer && to && <ArrowRight size={18} color={DC.muted} aria-hidden="true" style={{ flexShrink: 0 }} />}
          </span>
        </>
      );
      return to
        ? <Link to={to} aria-label={label} className="drl-btn" style={{ display: 'block', textDecoration: 'none', color: DC.text }}>{body}</Link>
        : <div style={{ color: DC.text }}>{body}</div>;
    })()}
    {footer && <div style={{ padding: `8px ${PAD}px 14px` }}>{footer}</div>}
  </article>
);
