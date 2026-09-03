import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Droplet, Heart, Shield } from 'lucide-react';
import type { Archetype, KeyDimension } from '../../utils/profileArchetype';
import TestSignature from './TestSignature';
import InfoTip from '../Onboarding/InfoTip';

const TRAIT_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'Haut potentiel': Sparkles,
  'Hypersensible': Droplet,
  'Empathique': Heart,
  'Résilient': Shield,
  'Confiant': Shield,
  'Attachement sécure': Heart,
  'Sensible': Droplet,
  'Curieux': Sparkles,
  'En chemin': Sparkles,
};

const DIM_NAME_MAP: Record<string, string> = {
  'Stabilité émotionnelle': 'Stabilité émot.',
};

function shortDimName(name: string): string {
  return DIM_NAME_MAP[name] ?? name;
}

function shortDimLabel(label: string, dimName: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('élev') || lower.includes('haute') || lower.includes('fort') || lower.includes('haut') || lower.includes('solid') || lower.includes('bon')) return 'Élevée';
  if (lower.includes('modér') || lower.includes('moyen') || lower.includes('normal') || lower.includes('dans la moyenne')) return 'Moyenne';
  if (lower.includes('basse') || lower.includes('bas') || lower.includes('faible') || lower.includes('minim') || lower.includes('fragile')) return 'Basse';
  const cleaned = label.replace(new RegExp(dimName, 'i'), '').trim();
  return cleaned || label;
}

const DrLoAvatar: React.FC<{ size: number; fontSize: number }> = ({ size, fontSize }) => {
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);

  if (failed) {
    return (
      <div
        className="flex items-center justify-center font-display font-semibold flex-shrink-0"
        style={{
          width: size, height: size, borderRadius: '50%',
          background: '#F5E4DC', color: '#C9603F', fontSize,
        }}
      >
        DL
      </div>
    );
  }

  return (
    <img
      src="/dr-lo.png"
      alt="Dr Lô"
      onError={handleError}
      className="flex-shrink-0"
      style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', background: '#F5E4DC',
      }}
    />
  );
};

interface ShareableProfileCardProps {
  archetype: Archetype;
  dimensions: KeyDimension[];
  quote: string;
  completedCount: number;
  totalCount: number;
  pct: number;
  variant?: 'screen' | 'export';
  signatureValues?: { value: number; max: number }[];
}

const ShareableProfileCard: React.FC<ShareableProfileCardProps> = ({
  archetype,
  dimensions,
  quote,
  completedCount,
  pct,
  variant = 'screen',
  signatureValues,
}) => {
  const [mounted, setMounted] = useState(false);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (variant === 'export') {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, [variant]);

  const isExport = variant === 'export';
  const wrapStyle: React.CSSProperties = isExport
    ? { width: 1080, height: 1350, fontSize: '2.5em' }
    : {};

  return (
    <div
      className="relative overflow-hidden text-[#F1ECE1]"
      style={{
        borderRadius: isExport ? 70 : 28,
        background: 'linear-gradient(165deg, #201F1C 0%, #2A2723 55%, #3A2C25 100%)',
        padding: isExport ? '65px 60px 55px' : '26px 24px 22px',
        display: 'flex',
        flexDirection: 'column',
        aspectRatio: undefined,
        boxShadow: isExport ? 'none' : '0 1px 2px rgba(23,24,27,.05), 0 12px 30px rgba(23,24,27,.10)',
        ...wrapStyle,
      }}
    >
      {/* Glows */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: isExport ? 700 : 280, height: isExport ? 700 : 280,
          borderRadius: '50%', top: isExport ? -225 : -90, right: isExport ? -225 : -90,
          background: 'radial-gradient(circle at 35% 35%, rgba(201,96,63,.55), rgba(201,96,63,0) 68%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: isExport ? 550 : 220, height: isExport ? 550 : 220,
          borderRadius: '50%', bottom: isExport ? -250 : -100, left: isExport ? -175 : -70,
          background: 'radial-gradient(circle at 50% 50%, rgba(74,93,87,.45), rgba(74,93,87,0) 70%)',
        }}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center" style={{ gap: isExport ? 22 : 9 }}>
          <div
            className="flex items-center justify-center font-display font-semibold"
            style={{
              width: isExport ? 70 : 28, height: isExport ? 70 : 28,
              borderRadius: isExport ? 22 : 9,
              background: '#F1ECE1', color: '#201F1C',
              fontSize: isExport ? 38 : 15,
            }}
          >
            h
          </div>
          <b style={{ fontSize: isExport ? 35 : 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Health-e
          </b>
        </div>
        <span
          style={{
            fontSize: isExport ? 26 : 10.5,
            fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#C9B7A6',
            border: '1px solid rgba(241,236,225,.22)',
            borderRadius: 20, padding: isExport ? '10px 25px' : '4px 10px',
          }}
        >
          Profil psychologique
        </span>
      </div>

      {/* Archetype */}
      <div className="relative z-10" style={{ marginTop: isExport ? 45 : 18 }}>
        <div
          className="flex items-center gap-1.5"
          style={{
            fontSize: isExport ? 31 : 12.5,
            color: '#C9B7A6', fontWeight: 600, letterSpacing: '0.02em',
          }}
        >
          Ton archétype
          {!isExport && (
            <InfoTip
              variant="dark"
              text={archetype.description}
            />
          )}
        </div>
        <h1
          className="font-display"
          style={{
            fontWeight: 600, margin: isExport ? '12px 0 0' : '5px 0 0',
            fontSize: isExport ? 82 : 33, lineHeight: 1.08, letterSpacing: '-0.01em',
          }}
        >
          {archetype.title}{' '}
          <em style={{ fontStyle: 'italic', color: '#E9A88C' }}>{archetype.subtitle}</em>
        </h1>
      </div>

      {/* Signature */}
      {signatureValues && signatureValues.length >= 3 && (
        <div
          className="relative z-10 flex items-center justify-center"
          style={{ marginTop: isExport ? 40 : 16 }}
        >
          <TestSignature
            answers={signatureValues}
            totalItems={signatureValues.length}
            mode="final"
            accentColor="#E9A88C"
            size={isExport ? 240 : 96}
          />
        </div>
      )}

      {/* Traits */}
      <div
        className="relative z-10 flex flex-wrap"
        style={{ gap: isExport ? 18 : 7, marginTop: isExport ? 40 : 16 }}
      >
        {archetype.traits.map((trait) => {
          const Icon = TRAIT_ICONS[trait] ?? Sparkles;
          return (
            <span
              key={trait}
              className="inline-flex items-center"
              style={{
                gap: isExport ? 15 : 6,
                fontSize: isExport ? 30 : 12, fontWeight: 600,
                background: 'rgba(241,236,225,.08)',
                border: '1px solid rgba(241,236,225,.16)',
                borderRadius: 20,
                padding: isExport ? '15px 28px' : '6px 11px',
                color: '#EDE7DB',
              }}
            >
              <Icon size={isExport ? 32 : 13} className="text-[#E9A88C]" />
              {trait}
            </span>
          );
        })}
      </div>

      {/* Dimensions */}
      <div
        className="relative z-10 flex flex-col"
        style={{ marginTop: isExport ? 'auto' : 20, paddingTop: isExport ? 50 : 0, gap: isExport ? 28 : 11 }}
      >
        {dimensions.map((dim, i) => (
          <div
            key={dim.scaleId}
            style={{
              display: 'grid',
              gridTemplateColumns: isExport ? 'auto minmax(120px,1fr) 80px' : 'auto minmax(48px,1fr) 52px',
              alignItems: 'center',
              gap: isExport ? 28 : 11,
            }}
          >
            <span
              style={{
                fontSize: isExport ? 31 : 12.5,
                color: '#D8D0C2', fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {shortDimName(dim.name)}
            </span>
            <div
              style={{
                height: isExport ? 18 : 7,
                borderRadius: 20, overflow: 'hidden',
                background: 'rgba(241,236,225,.13)',
              }}
            >
              <div
                ref={(el) => { barsRef.current[i] = el; }}
                style={{
                  height: '100%', borderRadius: 20,
                  backgroundColor: dim.color,
                  width: mounted ? `${Math.max(dim.pct, 4)}%` : '0%',
                  transition: variant === 'export' ? 'none' : 'width 1s cubic-bezier(.2,.8,.2,1)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: isExport ? 28 : 11,
                fontWeight: 700, color: '#EDE7DB',
                textAlign: 'right',
              }}
            >
              {shortDimLabel(dim.label, dim.name)}
            </span>
          </div>
        ))}
      </div>

      {/* Quote */}
      {quote && (
        <div
          className="relative z-10 flex"
          style={{
            marginTop: isExport ? 45 : 18,
            padding: isExport ? '35px 38px' : '14px 15px',
            borderRadius: isExport ? 40 : 16,
            background: 'rgba(241,236,225,.07)',
            border: '1px solid rgba(241,236,225,.14)',
            gap: isExport ? 28 : 11,
          }}
        >
          <DrLoAvatar size={isExport ? 85 : 34} fontSize={isExport ? 38 : 15} />
          <p
            style={{
              margin: 0, lineHeight: 1.5, color: '#E7E0D3',
              fontSize: isExport ? 31 : 12.5,
            }}
          >
            « {quote} » — <b style={{ color: '#F1ECE1' }}>Dr Lô</b>
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        className="relative z-10 flex items-center justify-between"
        style={{
          marginTop: isExport ? 35 : 14,
          fontSize: isExport ? 28 : 11, color: '#B4A897',
        }}
      >
        <span>
          Découvre ton profil sur <b style={{ color: '#DCD3C4', fontWeight: 700 }}>health-e.app</b>
        </span>
        <span>{completedCount} tests · {pct}%</span>
      </div>
    </div>
  );
};

export default ShareableProfileCard;
