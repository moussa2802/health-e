/**
 * KorisWelcome — Toast animé pour welcome bonus et reset quotidien.
 *
 * Phase Bienvenue (nouveau wallet): "Bienvenue ! 25 Koris offerts"
 * Phase Quotidienne (daily reset):  "Tes 10 Koris du jour sont prêts !"
 * Phase switch (welcome→daily):     "Phase quotidienne activée — 10 Koris/jour"
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
      className="fixed top-20 left-1/2 z-[9998] bg-gold text-white px-5 py-3 rounded-block shadow-lift flex items-center gap-2.5"
      style={{
        transform: `translateX(-50%) translateY(${exiting ? '-20px' : '0'})`,
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.4s, transform 0.4s',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <img
        src={KORI_IMG}
        alt="Kori"
        className="w-9 h-9 rounded-full object-cover border-2 border-white/30"
      />
      <div>
        <div className="text-[13px] font-bold">{title}</div>
        <div className="text-[11px] opacity-85 mt-0.5">{subtitle}</div>
      </div>
      <button
        onClick={() => { setExiting(true); setTimeout(() => setVisible(false), 300); }}
        className="bg-white/20 border-0 rounded-lg px-1.5 py-1 text-white cursor-pointer ml-1 hover:bg-white/30 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
};

export default KorisWelcome;
