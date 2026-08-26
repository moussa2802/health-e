/**
 * NoKorisModal — Modal quand l'utilisateur n'a plus assez de Koris.
 * Propose d'acheter des Koris via PayTech.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useKoris } from '../../contexts/KorisContext';

const KORI_IMG = '/kori.png';

const NoKorisModal: React.FC = () => {
  const { showNoKorisModal, setShowNoKorisModal, balance } = useKoris();
  const navigate = useNavigate();

  if (!showNoKorisModal) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={() => setShowNoKorisModal(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-block px-6 py-8 max-w-[380px] w-full text-center shadow-lift"
      >
        <img
          src={KORI_IMG}
          alt="Kori"
          className="w-[72px] h-[72px] rounded-full object-cover mx-auto mb-4 block border-[3px] border-gold/20"
          style={{ opacity: 0.6, filter: 'grayscale(30%)' }}
        />

        <h3 className="font-display text-lg font-semibold text-ink m-0 mb-2">
          Plus assez de Koris
        </h3>

        <p className="text-sm text-ink-soft m-0 mb-5 leading-relaxed">
          Il te reste{' '}
          <strong className="text-gold inline-flex items-center gap-1">
            <img src={KORI_IMG} alt="" className="w-4 h-4 rounded-full object-cover align-middle" />
            {balance}
          </strong>{' '}
          Kori{balance !== 1 ? 's' : ''}.
          {' '}Recharge ton solde pour continuer à utiliser Dr Lô et les analyses.
        </p>

        <button
          onClick={() => {
            setShowNoKorisModal(false);
            navigate('/acheter-koris');
          }}
          className="w-full py-3 rounded-xl border-0 bg-gold text-white text-sm font-semibold cursor-pointer hover:bg-gold/90 transition-colors mb-3"
        >
          Acheter des Koris
        </button>

        <button
          onClick={() => setShowNoKorisModal(false)}
          className="w-full py-2.5 rounded-xl border border-line bg-transparent text-sm text-ink-soft font-medium cursor-pointer hover:bg-paper transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
};

export default NoKorisModal;
