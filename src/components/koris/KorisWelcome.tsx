/**
 * KorisWelcome — Toast animé pour welcome bonus et reset quotidien.
 *
 * Phase Bienvenue (nouveau wallet): "Bienvenue ! 25 Koris offerts"
 * Phase Quotidienne (daily reset):  "Tes 10 Koris du jour sont prêts !"
 * Phase switch (welcome→daily):     "Phase quotidienne activée — 10 Koris/jour"
 */

import React, { useState, useEffect } from 'react';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_WELCOME_BONUS, KORIS_DAILY_AMOUNT } from '../../services/korisService';

const KORI_IMG = '/kori.png';

const KorisWelcome: React.FC = () => {
  const { walletJustCreated, dailyResetAmount, phaseSwitched, walletInitialized, dailyRefillAmount } = useKoris();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const isWelcome = walletJustCreated || walletInitialized;
  const isDailyReset = !isWelcome && (dailyResetAmount > 0 || dailyRefillAmount > 0) && !phaseSwitched;
  const isPhaseSwitch = phaseSwitched && !isWelcome;

  const shouldShow = isWelcome || isDailyReset || isPhaseSwitch;

  useEffect(() => {
    if (!shouldShow) return;

    const showTimer = setTimeout(() => setVisible(true), 800);
    const hideTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => setVisible(false), 400);
    }, 5500);

    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [shouldShow]);

  if (!visible) return null;

  let title: string;
  let subtitle: string;

  if (isWelcome) {
    title = `Bienvenue ! +${KORIS_WELCOME_BONUS} Koris offerts`;
    subtitle = 'Utilise-les pour discuter avec Dr Lô';
  } else if (isPhaseSwitch) {
    title = `Phase quotidienne activée`;
    subtitle = `${KORIS_DAILY_AMOUNT} Koris par jour — bonne continuation !`;
  } else {
    title = `Tes ${KORIS_DAILY_AMOUNT} Koris du jour sont prêts !`;
    subtitle = 'Ta recharge quotidienne est arrivée';
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: `translateX(-50%) translateY(${exiting ? '-20px' : '0'})`,
        zIndex: 9998,
        background: isWelcome
          ? 'linear-gradient(135deg, #0D9488, #059669)'
          : isPhaseSwitch
            ? 'linear-gradient(135deg, #D97706, #F59E0B)'
            : 'linear-gradient(135deg, #059669, #047857)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: "'Inter', -apple-system, sans-serif",
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.4s, transform 0.4s',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <img
        src={KORI_IMG}
        alt="Kori"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(255,255,255,0.3)',
        }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>{subtitle}</div>
      </div>
      <button
        onClick={() => { setExiting(true); setTimeout(() => setVisible(false), 300); }}
        style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
          padding: '3px 7px', color: 'white', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, marginLeft: 4,
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default KorisWelcome;
