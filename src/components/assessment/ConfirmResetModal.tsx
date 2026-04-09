import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ConfirmResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const ConfirmResetModal: React.FC<ConfirmResetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmText('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatch = confirmText.trim().toUpperCase() === 'RÉINITIALISER';

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxWidth: 440,
    width: '100%',
    padding: 32,
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '12px 0 8px',
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#555',
    marginBottom: 24,
  };

  const buttonRow: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  };

  const cancelBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 20px',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  };

  const dangerBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 20px',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#ef4444',
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  };

  const disabledBtnStyle: React.CSSProperties = {
    ...dangerBtnStyle,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid #d1d5db',
    fontSize: 15,
    outline: 'none',
    marginBottom: 16,
    boxSizing: 'border-box',
    textAlign: 'center',
    fontWeight: 600,
    letterSpacing: 1,
  };

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <Loader2
            size={40}
            style={{
              animation: 'spin 1s linear infinite',
              color: '#ef4444',
              margin: '0 auto 16px',
            }}
          />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>
            Réinitialisation en cours…
          </p>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 48, marginBottom: 4 }}>⚠️</div>
          <h2 style={titleStyle}>Réinitialiser ton profil ?</h2>
          <p style={bodyStyle}>
            Tous tes résultats de tests, synthèses Dr Lô et codes de compatibilité seront
            supprimés définitivement. Ton compte et tes préférences (genre, statut, etc.) seront
            conservés.
          </p>
          <div style={buttonRow}>
            <button style={cancelBtnStyle} onClick={onClose}>
              Annuler
            </button>
            <button style={dangerBtnStyle} onClick={() => setStep(2)}>
              Continuer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>Confirmation finale</h2>
        <p style={bodyStyle}>
          Cette action est irréversible. Tape{' '}
          <strong style={{ color: '#ef4444' }}>RÉINITIALISER</strong> pour confirmer.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="RÉINITIALISER"
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db';
          }}
          autoFocus
        />
        <button
          style={isMatch ? dangerBtnStyle : disabledBtnStyle}
          disabled={!isMatch}
          onClick={onConfirm}
        >
          Confirmer la réinitialisation
        </button>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmResetModal;
