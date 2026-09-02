import React, { useEffect, useState } from 'react';
import type { RadianceLevel } from '../../utils/totemAlgorithm';
import { RADIANCE_COLORS } from '../../utils/totemAlgorithm';

interface TotemAuraProps {
  level: RadianceLevel;
  children: React.ReactNode;
  showReward?: boolean;
  compact?: boolean;
}

const PULSE_DURATION: Record<RadianceLevel, string> = {
  fragile: '8s',
  intermediate: '6s',
  blooming: '4s',
  fully_blooming: '3.5s',
};

const TotemAura: React.FC<TotemAuraProps> = ({ level, children, showReward, compact }) => {
  const [rewardActive, setRewardActive] = useState(false);

  useEffect(() => {
    if (showReward) {
      setRewardActive(true);
      const t = setTimeout(() => setRewardActive(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showReward]);

  const colors = RADIANCE_COLORS[level];
  const pulseDur = PULSE_DURATION[level];
  const isFullyBlooming = level === 'fully_blooming';

  const auraSize = compact ? '130%' : '150%';
  const ringSize = compact ? '120%' : '130%';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ isolation: 'isolate' }}>
      <style>{`
        @keyframes totemPulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.06); }
        }
        @keyframes totemReward {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
        }
        @keyframes totemRing {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.03); }
        }
        @keyframes particleFloat {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          20% { opacity: 1; transform: translateY(-8px) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          .totem-aura-pulse, .totem-aura-ring, .totem-particle, .totem-reward-flash {
            animation: none !important;
          }
        }
      `}</style>

      {/* Aura glow layer */}
      <div
        className="totem-aura-pulse absolute rounded-full pointer-events-none"
        style={{
          width: auraSize,
          height: auraSize,
          top: '50%',
          left: '50%',
          background: `radial-gradient(ellipse at center, ${colors.primary} 20%, ${colors.secondary} 50%, transparent 80%)`,
          animation: `totemPulse ${pulseDur} ease-in-out infinite`,
          zIndex: -1,
          willChange: 'transform, opacity',
        }}
      />

      {/* Secondary outer glow for blooming+ */}
      {(level === 'blooming' || isFullyBlooming) && (
        <div
          className="totem-aura-pulse absolute rounded-full pointer-events-none"
          style={{
            width: compact ? '125%' : '140%',
            height: compact ? '125%' : '140%',
            top: '50%',
            left: '50%',
            background: `radial-gradient(ellipse at center, ${colors.glow}, transparent 65%)`,
            animation: `totemPulse ${pulseDur} ease-in-out infinite`,
            animationDelay: `-${parseFloat(pulseDur) / 2}s`,
            zIndex: -2,
            willChange: 'transform, opacity',
          }}
        />
      )}

      {/* Ring for fully blooming */}
      {isFullyBlooming && !compact && (
        <div
          className="totem-aura-ring absolute rounded-[32px] pointer-events-none"
          style={{
            width: ringSize,
            height: ringSize,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            border: '2px solid rgba(212, 173, 90, 0.35)',
            animation: `totemRing 3s ease-in-out infinite`,
            zIndex: -1,
            willChange: 'transform, opacity',
          }}
        />
      )}

      {/* Particles for fully blooming */}
      {isFullyBlooming && !compact && (
        <>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="totem-particle absolute pointer-events-none"
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: 'rgba(212, 173, 90, 0.6)',
                left: `${20 + i * 12}%`,
                bottom: '10%',
                animation: `particleFloat ${2.5 + i * 0.3}s ease-out infinite`,
                animationDelay: `${i * 0.5}s`,
                zIndex: 1,
                willChange: 'transform, opacity',
              }}
            />
          ))}
        </>
      )}

      {/* Reward flash */}
      {rewardActive && (
        <div
          className="totem-reward-flash absolute rounded-full pointer-events-none"
          style={{
            width: '150%',
            height: '150%',
            top: '50%',
            left: '50%',
            background: 'radial-gradient(ellipse at center, rgba(255, 220, 120, 0.5), rgba(212, 173, 90, 0.2), transparent 65%)',
            animation: 'totemReward 3s ease-out forwards',
            zIndex: 2,
            willChange: 'transform, opacity',
          }}
        />
      )}

      {/* Content (image) */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
};

export default TotemAura;
