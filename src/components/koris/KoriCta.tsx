import React from 'react';
import { Loader2 } from 'lucide-react';
import { useKoris } from '../../contexts/KorisContext';
import { useNavigate } from 'react-router-dom';

const KORI_IMG = '/kori.png';

type Variant = 'primary' | 'outline';

interface Props {
  label: string;
  cost: number;
  isFree?: boolean;
  freeReason?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: Variant;
  className?: string;
}

const KoriCta: React.FC<Props> = ({
  label,
  cost,
  isFree = false,
  freeReason,
  loading = false,
  disabled = false,
  onClick,
  variant = 'primary',
  className = '',
}) => {
  const { balance, setShowNoKorisModal } = useKoris();
  const navigate = useNavigate();

  const effectiveCost = isFree ? 0 : cost;
  const insufficient = !isFree && balance < effectiveCost;

  const handleClick = () => {
    if (loading || disabled) return;
    if (insufficient) {
      setShowNoKorisModal(true);
      navigate('/acheter-koris');
      return;
    }
    onClick();
  };

  if (insufficient) {
    const missing = effectiveCost - balance;
    return (
      <div className={className}>
        <button
          onClick={handleClick}
          className="w-full border-[1.5px] border-accent cursor-pointer font-sans rounded-[16px] flex items-center justify-between gap-3 bg-card shadow-soft transition-transform hover:-translate-y-px"
          style={{ padding: '6px 6px 6px 20px' }}
          aria-label={`Il te manque ${missing} Kori${missing > 1 ? 's' : ''}, recharger`}
        >
          <span className="text-[15px] font-bold text-ink tracking-tight">
            Il te manque {missing} Kori{missing > 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-accent-soft border border-transparent rounded-xl px-3.5 py-2.5">
            <span className="text-[12.5px] font-extrabold text-accent tracking-wide uppercase">Recharger</span>
          </span>
        </button>
        <BalanceLine balance={balance} />
      </div>
    );
  }

  if (isFree) {
    return (
      <div className={className}>
        <button
          onClick={handleClick}
          disabled={loading || disabled}
          className="w-full border-0 cursor-pointer font-sans rounded-[16px] flex items-center justify-between gap-3 bg-ink text-[#F4F1E9] shadow-soft transition-transform hover:-translate-y-px disabled:opacity-60 disabled:cursor-default disabled:transform-none"
          style={{ padding: '6px 6px 6px 20px' }}
          aria-label={`${label}, gratuit`}
        >
          <span className="text-[15px] font-bold tracking-tight">{label}</span>
          {loading ? (
            <Loader2 size={18} className="animate-spin mr-3" />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(159,188,175,.22)', border: '1px solid rgba(159,188,175,.35)' }}>
              <span className="text-[12.5px] font-extrabold tracking-wide uppercase">Gratuit</span>
            </span>
          )}
        </button>
        {freeReason && (
          <p className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted font-semibold">{freeReason}</p>
        )}
      </div>
    );
  }

  const isPrimary = variant === 'primary';

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className={`w-full border-0 cursor-pointer font-sans rounded-[16px] flex items-center justify-between gap-3 shadow-soft transition-transform hover:-translate-y-px disabled:opacity-60 disabled:cursor-default disabled:transform-none ${
          isPrimary ? 'bg-ink text-[#F4F1E9]' : 'bg-card text-ink border border-line'
        }`}
        style={{ padding: '6px 6px 6px 20px' }}
        aria-label={`${label}, ${effectiveCost} Kori${effectiveCost > 1 ? 's' : ''}`}
      >
        <span className="text-[15px] font-bold tracking-tight">{label}</span>
        {loading ? (
          <Loader2 size={18} className="animate-spin mr-3" />
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2"
            style={{
              background: 'rgba(244,241,233,.14)',
              border: '1px solid rgba(244,241,233,.16)',
            }}
          >
            <img src={KORI_IMG} alt="" className="w-6 h-6 rounded-full object-cover" />
            <span className="font-display text-[17px] font-semibold leading-none">{effectiveCost}</span>
          </span>
        )}
      </button>
      <BalanceLine balance={balance} />
    </div>
  );
};

const BalanceLine: React.FC<{ balance: number }> = ({ balance }) => (
  <p className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted font-semibold">
    <img src={KORI_IMG} alt="" className="w-4 h-4 rounded-full object-cover" />
    Ton solde : <b className="text-ink-soft">{balance} Koris</b>
  </p>
);

export default KoriCta;
