/**
 * KorisWelcome — Toast animé pour le bonus de bienvenue.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_WELCOME_BONUS } from '../../services/korisService';
import { CREDIT, credits } from '../../config/creditName';

const KORI_IMG = CREDIT.img;

const KorisWelcome: React.FC = () => {
  const { walletJustCreated } = useKoris();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const isWelcome = walletJustCreated;

  useEffect(() => {
    if (!isWelcome) return;

    const showTimer = setTimeout(() => setVisible(true), 800);
    const hideTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => setVisible(false), 400);
    }, 5500);

    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [isWelcome]);

  if (!visible) return null;

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
        alt=""
        className="w-9 h-9 rounded-full object-cover border-2 border-white/30"
      />
      <div>
        <div className="text-[13px] font-bold">On t'offre 500 F {CREDIT.ofMany} pour commencer</div>
        <div className="text-[11px] opacity-85 mt-0.5">+{credits(KORIS_WELCOME_BONUS)} — discute avec Dr Lô, fais tes tests</div>
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
