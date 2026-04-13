/**
 * FloatingKori — Bouton flottant circulaire en bas à gauche affichant
 * l'image kori.png avec le solde en badge. Clic → panneau détaillé.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useKoris } from '../../contexts/KorisContext';
import KorisFloatingPanel from './KorisFloatingPanel';

const KORI_IMG = '/kori.png';

const FloatingKori: React.FC = () => {
  const { balance, loading, spendTick, lastSpentCost, dailyRefillAmount, walletInitialized } = useKoris();
  const [panelOpen, setPanelOpen] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [floatAnim, setFloatAnim] = useState<{ text: string; color: string } | null>(null);
  const [pulseGreen, setPulseGreen] = useState(false);
  const prevSpendTick = useRef(spendTick);
  const prevRefill = useRef(0);

  // Spend animation: shake + "-N" float
  useEffect(() => {
    if (spendTick > prevSpendTick.current && lastSpentCost > 0) {
      setShaking(true);
      setFloatAnim({ text: `-${lastSpentCost}`, color: '#DC2626' });
      const t1 = setTimeout(() => setShaking(false), 500);
      const t2 = setTimeout(() => setFloatAnim(null), 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevSpendTick.current = spendTick;
  }, [spendTick, lastSpentCost]);

  // Refill / reset animation: pulse green + "10 ✓" or "+25" float
  useEffect(() => {
    const amount = walletInitialized ? 25 : dailyRefillAmount;
    if (amount > 0 && amount !== prevRefill.current) {
      prevRefill.current = amount;
      const timer = setTimeout(() => {
        setPulseGreen(true);
        // Daily reset: show "10 ✓" (not "+10" since it's a reset, not an addition)
        // Welcome bonus: show "+25"
        const text = walletInitialized ? `+${amount}` : `${amount} ✓`;
        setFloatAnim({ text, color: '#059669' });
        setTimeout(() => setPulseGreen(false), 800);
        setTimeout(() => setFloatAnim(null), 1500);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [dailyRefillAmount, walletInitialized]);

  if (loading) return null;

  const badgeColor = balance === 0 ? '#DC2626' : balance <= 3 ? '#D97706' : '#0D9488';

  return (
    <>
      {/* Floating button */}
      <div
        style={{
          position: 'fixed',
          bottom: 80,
          left: 20,
          zIndex: 50,
        }}
      >
        {/* Float animation text */}
        {floatAnim && (
          <div
            key={`${floatAnim.text}-${Date.now()}`}
            style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 14,
              fontWeight: 800,
              color: floatAnim.color,
              pointerEvents: 'none',
              animation: 'koriFloatUp 1.2s ease-out forwards',
              fontFamily: "'Inter', -apple-system, sans-serif",
              textShadow: '0 1px 4px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
            }}
          >
            {floatAnim.text}
          </div>
        )}

        <button
          data-kori-float-btn
          onClick={() => setPanelOpen(!panelOpen)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'visible',
            background: 'transparent',
            boxShadow: pulseGreen
              ? '0 0 0 6px rgba(5,150,105,0.3), 0 4px 16px rgba(0,0,0,0.15)'
              : '0 4px 16px rgba(0,0,0,0.15)',
            animation: shaking ? 'koriShake 0.4s ease-in-out' : undefined,
            transition: 'box-shadow 0.3s',
          }}
        >
          {/* Kori image */}
          <img
            src={KORI_IMG}
            alt="Kori"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Balance badge */}
          <div
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 22,
              height: 22,
              borderRadius: 11,
              background: badgeColor,
              color: 'white',
              fontSize: 11,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              fontFamily: "'Inter', -apple-system, sans-serif",
              border: '2px solid white',
            }}
          >
            {balance}
          </div>
        </button>
      </div>

      {/* Panel */}
      {panelOpen && <KorisFloatingPanel onClose={() => setPanelOpen(false)} />}

      {/* Animations CSS */}
      <style>{`
        @keyframes koriShake {
          0%, 100% { transform: translateX(0) rotate(0); }
          20% { transform: translateX(-4px) rotate(-5deg); }
          40% { transform: translateX(4px) rotate(5deg); }
          60% { transform: translateX(-3px) rotate(-3deg); }
          80% { transform: translateX(2px) rotate(2deg); }
        }
        @keyframes koriFloatUp {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
        }
        @media (max-width: 374px) {
          [data-kori-float-btn] {
            width: 48px !important;
            height: 48px !important;
          }
          [data-kori-float-btn] img {
            width: 48px !important;
            height: 48px !important;
          }
        }
      `}</style>
    </>
  );
};

export default FloatingKori;
