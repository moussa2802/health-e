/**
 * FloatingKori — Bouton flottant circulaire en bas à gauche affichant
 * l'image kori.png avec le solde en badge. Clic → panneau détaillé.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useKoris } from '../../contexts/KorisContext';
import KorisFloatingPanel from './KorisFloatingPanel';

const KORI_IMG = '/kori.png';

const DANGER = '#B23A3A';
const WARN = '#B5732A';
const GOLD = '#8F6A1F';
const OK = '#3C7A5A';

const FloatingKori: React.FC = () => {
  const { balance, loading, spendTick, lastSpentCost, walletInitialized } = useKoris();
  const [panelOpen, setPanelOpen] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [floatAnim, setFloatAnim] = useState<{ text: string; color: string } | null>(null);
  const [pulseGreen, setPulseGreen] = useState(false);
  const prevSpendTick = useRef(spendTick);
  const prevWelcome = useRef(false);

  useEffect(() => {
    if (spendTick > prevSpendTick.current && lastSpentCost > 0) {
      setShaking(true);
      setFloatAnim({ text: `-${lastSpentCost}`, color: DANGER });
      const t1 = setTimeout(() => setShaking(false), 500);
      const t2 = setTimeout(() => setFloatAnim(null), 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevSpendTick.current = spendTick;
  }, [spendTick, lastSpentCost]);

  useEffect(() => {
    if (walletInitialized && !prevWelcome.current) {
      prevWelcome.current = true;
      const timer = setTimeout(() => {
        setPulseGreen(true);
        setFloatAnim({ text: '+25', color: OK });
        setTimeout(() => setPulseGreen(false), 800);
        setTimeout(() => setFloatAnim(null), 1500);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [walletInitialized]);

  if (loading) return null;

  const badgeColor = balance === 0 ? DANGER : balance <= 3 ? WARN : GOLD;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-20 left-5 z-50">
        {/* Float animation text */}
        {floatAnim && (
          <div
            key={`${floatAnim.text}-${Date.now()}`}
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-sm font-extrabold pointer-events-none whitespace-nowrap font-sans"
            style={{
              color: floatAnim.color,
              animation: 'koriFloatUp 1.2s ease-out forwards',
              textShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          >
            {floatAnim.text}
          </div>
        )}

        <button
          data-kori-float-btn
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-14 h-14 rounded-full border-0 p-0 cursor-pointer relative overflow-visible bg-transparent transition-shadow duration-300"
          style={{
            boxShadow: pulseGreen
              ? `0 0 0 6px ${OK}4D, 0 4px 16px rgba(0,0,0,0.15)`
              : '0 4px 16px rgba(0,0,0,0.15)',
            animation: shaking ? 'koriShake 0.4s ease-in-out' : undefined,
          }}
        >
          {/* Kori image */}
          <img
            src={KORI_IMG}
            alt="Kori"
            className="w-14 h-14 rounded-full object-cover block"
          />

          {/* Balance badge */}
          <div
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] rounded-full text-white text-[11px] font-extrabold flex items-center justify-center px-1.5 border-2 border-white font-sans"
            style={{ background: badgeColor, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
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
