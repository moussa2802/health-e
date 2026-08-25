import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const ConfirmResetModal: React.FC<ConfirmResetModalProps> = ({
  isOpen, onClose, onConfirm, loading = false,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (isOpen) { setStep(1); setConfirmText(''); }
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatch = confirmText.trim().toUpperCase() === 'RÉINITIALISER';

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
        <div className="bg-card rounded-block max-w-[440px] w-full p-8 text-center shadow-lift">
          <Loader2 size={40} className="animate-spin text-danger mx-auto mb-4" />
          <p className="text-base font-semibold text-ink">Réinitialisation en cours…</p>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
        <div className="bg-card rounded-block max-w-[440px] w-full p-8 text-center shadow-lift">
          <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={28} className="text-danger" />
          </div>
          <h2 className="font-display text-xl font-bold text-ink mb-2">Réinitialiser ton profil ?</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-6">
            Tous tes résultats de tests, synthèses Dr Lô et codes de compatibilité seront
            supprimés définitivement. Ton compte et tes préférences seront conservés.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-paper-dark text-ink font-semibold text-[15px] border-none cursor-pointer hover:bg-line transition-colors">
              Annuler
            </button>
            <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl bg-danger text-white font-semibold text-[15px] border-none cursor-pointer hover:bg-danger/90 transition-colors">
              Continuer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-card rounded-block max-w-[440px] w-full p-8 text-center shadow-lift">
        <h2 className="font-display text-xl font-bold text-ink mb-2">Confirmation finale</h2>
        <p className="text-sm text-ink-soft leading-relaxed mb-6">
          Cette action est irréversible. Tape <strong className="text-danger">RÉINITIALISER</strong> pour confirmer.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="RÉINITIALISER"
          className="w-full p-3 rounded-xl border-2 border-line text-[15px] text-center font-semibold tracking-wider outline-none mb-4 focus:border-accent"
          autoFocus
        />
        <button
          disabled={!isMatch}
          onClick={onConfirm}
          className={`w-full py-3 rounded-xl text-[15px] font-semibold border-none transition-colors ${
            isMatch ? 'bg-danger text-white cursor-pointer hover:bg-danger/90' : 'bg-danger/30 text-white/60 cursor-not-allowed'
          }`}
        >
          Confirmer la réinitialisation
        </button>
        <button onClick={onClose} className="mt-4 bg-transparent border-none text-muted text-sm cursor-pointer underline">
          Annuler
        </button>
      </div>
    </div>
  );
};

export default ConfirmResetModal;
