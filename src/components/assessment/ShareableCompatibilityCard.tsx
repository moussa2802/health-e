import React from 'react';
import { Heart, Users, Briefcase, Home } from 'lucide-react';
import { getRelationshipLabel } from '../../utils/relationshipTypes';

function scoreLabel(score: number): string {
  if (score >= 75) return 'Très bonne compatibilité';
  if (score >= 50) return 'Compatibilité modérée';
  return 'Des zones à explorer ensemble';
}

function scoreColor(score: number): string {
  if (score >= 75) return '#4A5D57';
  if (score >= 50) return '#8F6A1F';
  return '#B5522F';
}

function scoreBg(score: number): string {
  if (score >= 75) return 'rgba(74,93,87,.12)';
  if (score >= 50) return 'rgba(143,106,31,.10)';
  return 'rgba(181,82,47,.10)';
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  amoureux: Heart,
  famille: Home,
  amitie: Users,
  professionnel: Briefcase,
};

function getCategoryFromRelType(relTypeId: string): string {
  const map: Record<string, string> = {};
  const cats = ['amoureux', 'famille', 'amitie', 'professionnel'];
  const subTypes: Record<string, string[]> = {
    amoureux: ['crush', 'debut_relation', 'en_couple', 'couple_etabli', 'maries_recent', 'maries_longtemps', 'relation_distance', 'relation_complexe'],
    famille: ['pere', 'mere', 'frere_soeur', 'enfant', 'famille_elargie'],
    amitie: ['meilleur_ami', 'ami_proche', 'connaissance', 'coloc'],
    professionnel: ['collegue', 'manager', 'associe', 'mentor'],
  };
  for (const cat of cats) {
    for (const sub of subTypes[cat] ?? []) {
      map[sub] = cat;
    }
  }
  return map[relTypeId] ?? 'amoureux';
}

interface Props {
  prenom1: string;
  prenom2: string;
  globalScore: number;
  relationshipType: string;
  strengths: string[];
  claudeNarrative?: string;
}

const ShareableCompatibilityCard: React.FC<Props> = ({
  prenom1,
  prenom2,
  globalScore,
  relationshipType,
  strengths,
  claudeNarrative,
}) => {
  const color = scoreColor(globalScore);
  const label = scoreLabel(globalScore);
  const bg = scoreBg(globalScore);
  const category = getCategoryFromRelType(relationshipType);
  const CatIcon = CATEGORY_ICONS[category] ?? Heart;
  const relLabel = getRelationshipLabel(relationshipType);

  const positiveStrengths = strengths
    .map(s => s.replace(/^Bonne harmonie sur\s*:\s*/i, ''))
    .slice(0, 3);

  const pct = globalScore / 100;
  const R = 62;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct);

  return (
    <div
      style={{
        width: 400,
        minHeight: 480,
        background: 'linear-gradient(170deg, #1B1C1A 0%, #2A2723 45%, #3A2C25 100%)',
        borderRadius: 28,
        padding: '36px 28px 28px',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#F4F1E9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow */}
      <div style={{
        position: 'absolute', top: -60, right: -60,
        width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Names */}
      <div style={{ textAlign: 'center', marginBottom: 6, position: 'relative', zIndex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(244,241,233,.5)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Compatibilité
        </p>
        <h2 style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {prenom1} <span style={{ color: 'rgba(244,241,233,.35)', fontWeight: 400 }}>&</span> {prenom2}
        </h2>
      </div>

      {/* Relationship type badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(244,241,233,.08)', border: '1px solid rgba(244,241,233,.12)',
        borderRadius: 20, padding: '5px 14px 5px 10px', marginTop: 10, marginBottom: 28,
      }}>
        <CatIcon size={14} style={{ color: 'rgba(244,241,233,.6)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(244,241,233,.7)' }}>{relLabel}</span>
      </div>

      {/* Score ring */}
      <div style={{ position: 'relative', width: 152, height: 152, marginBottom: 20 }}>
        <svg width="152" height="152" viewBox="0 0 152 152" style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle cx="76" cy="76" r={R} fill="none" stroke="rgba(244,241,233,.08)" strokeWidth="8" />
          <circle
            cx="76" cy="76" r={R}
            fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 76 76)"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, color }}>{globalScore}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(244,241,233,.4)', marginTop: 2 }}>/100</span>
        </div>
      </div>

      {/* Score label */}
      <div style={{
        background: bg, borderRadius: 14, padding: '8px 20px', marginBottom: 20,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{label}</span>
      </div>

      {/* Positive strengths (privacy-safe) */}
      {positiveStrengths.length > 0 && (
        <div style={{
          width: '100%', background: 'rgba(244,241,233,.05)',
          border: '1px solid rgba(244,241,233,.08)',
          borderRadius: 16, padding: '14px 18px',
          marginBottom: 24,
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'rgba(244,241,233,.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Points d'harmonie
          </p>
          {positiveStrengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 6 : 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(244,241,233,.75)' }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dr Lô narrative */}
      {claudeNarrative && (
        <div style={{
          width: '100%', background: 'rgba(244,241,233,.05)',
          border: '1px solid rgba(244,241,233,.08)',
          borderRadius: 16, padding: '16px 18px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: '#F5E4DC', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#C9603F',
            }}>DL</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(244,241,233,.6)' }}>Analyse du Dr Lô</span>
          </div>
          <p style={{
            margin: 0, fontSize: 12, lineHeight: 1.7, fontWeight: 400,
            color: 'rgba(244,241,233,.65)', whiteSpace: 'pre-wrap',
          }}>{claudeNarrative}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 'auto', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: '1px solid rgba(244,241,233,.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: 'rgba(244,241,233,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(244,241,233,.7)' }}>H</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(244,241,233,.4)' }}>health-e.sn</span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(244,241,233,.25)' }}>Découvre ta compatibilité</span>
      </div>
    </div>
  );
};

export default ShareableCompatibilityCard;
