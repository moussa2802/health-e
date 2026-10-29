/** Premier écran : ce qui rend accro, en images (totem, compatibilité, Défi), et « Tes prochaines découvertes » pour les connectés. */
import React from 'react';
import { ArrowRight, Heart, Users, Sparkles } from 'lucide-react';
import { TOTEM_IMAGES } from '../../data/totemImages';
import { getScaleMeta } from '../../utils/scaleMeta';
import { DC } from './DrLoShell';

const cardStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
  borderRadius: 18, border: `1px solid ${DC.line}`, background: DC.glass, padding: 12, color: DC.text, minHeight: 84,
};

const Arrow = () => <ArrowRight size={16} color={DC.muted} aria-hidden="true" style={{ flexShrink: 0 }} />;

const Text: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <span style={{ flex: 1, minWidth: 0 }}>
    <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: DC.title }}>{title}</span>
    <span style={{ display: 'block', fontSize: 13, lineHeight: 1.45, color: DC.muted, marginTop: 2 }}>{sub}</span>
  </span>
);

const Badge: React.FC<{ children: React.ReactNode; bg: string }> = ({ children, bg }) => (
  <span aria-hidden="true" style={{ width: 60, height: 60, borderRadius: 16, flexShrink: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
);

export const ShowcaseCards: React.FC<{ onTotem: () => void; onCompat: () => void; onDefi: () => void }> = ({ onTotem, onCompat, onDefi }) => (
  <section aria-label="Ce que tu peux découvrir" style={{ marginTop: 18, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <button type="button" onClick={onTotem} className="drl-btn" style={cardStyle}>
      <span aria-hidden="true" style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
        {(['loup', 'lion', 'aigle'] as const).map((a, i) => (
          <span key={a} style={{ position: 'absolute', left: i * 14, top: i === 1 ? 0 : 8, width: 32, height: 44, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.2)', zIndex: i === 1 ? 2 : 1 }}>
            <img src={TOTEM_IMAGES[a]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(5px) brightness(.7)', transform: 'scale(1.2)' }} />
          </span>
        ))}
      </span>
      <Text title="Découvre ton animal-totem" sub="Lion, loup, hibou… 12 animaux. Lequel te ressemble vraiment ?" />
      <Arrow />
    </button>
    <button type="button" onClick={onCompat} className="drl-btn" style={cardStyle}>
      <Badge bg="rgba(232,102,79,.18)"><Heart size={26} color="#F09A7A" aria-hidden="true" /></Badge>
      <Text title="Teste ta compatibilité" sub="Avec ton ou ta partenaire, un crush ou un ami. Un code à partager, un score à deux." />
      <Arrow />
    </button>
    <button type="button" onClick={onDefi} className="drl-btn" style={cardStyle}>
      <Badge bg="rgba(242,182,109,.16)"><Users size={26} color={DC.gold} aria-hidden="true" /></Badge>
      <Text title="Tes proches te connaissent-ils ?" sub="Lance un défi à tes amis : qui te connaît le mieux ?" />
      <Arrow />
    </button>
  </section>
);

export const DiscoveryRow: React.FC<{ ids: string[]; onStart: (id: string) => void }> = ({ ids, onStart }) => {
  if (ids.length === 0) return null;
  return (
    <section aria-label="Tes prochaines découvertes" style={{ marginTop: 22 }}>
      <p style={{ margin: '0 4px 8px', fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: DC.faint }}>Tes prochaines découvertes</p>
      <div style={{ display: 'grid', gridTemplateColumns: ids.length > 1 ? '1fr 1fr' : '1fr', gap: 10 }}>
        {ids.map(id => {
          const m = getScaleMeta(id);
          return (
            <button key={id} type="button" onClick={() => onStart(id)} className="drl-btn"
              style={{ ...cardStyle, flexDirection: 'column', alignItems: 'flex-start', gap: 8, minHeight: 112 }}>
              <Sparkles size={18} color={DC.gold} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700, color: DC.title, lineHeight: 1.25 }}>{m.label}</span>
              <span style={{ fontSize: 13, lineHeight: 1.4, color: DC.muted, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
