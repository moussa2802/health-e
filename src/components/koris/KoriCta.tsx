import React from 'react';
import { Loader2 } from 'lucide-react';
import { useKoris } from '../../contexts/KorisContext';
import { CREDIT, credits } from '../../config/creditName';
import { usePalette } from '../accueil/DrLoShell';
import { COLOR } from '../../design/charte';

const KORI_IMG = CREDIT.img;

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
  const { balance, openNoKorisModal } = useKoris();
  const palette = usePalette();
  const isPrimaryV = variant === 'primary';
  const mainStyle: React.CSSProperties = isPrimaryV
    ? { padding: '6px 6px 6px 20px', minHeight: 52, background: palette.primary, color: COLOR.onAction }
    : { padding: '6px 6px 6px 20px', minHeight: 52, background: 'transparent', color: COLOR.text, border: `1px solid ${COLOR.lineStrong}` };
  const pillStyle: React.CSSProperties = isPrimaryV
    ? { background: 'rgba(28,20,13,.14)', border: '1px solid rgba(28,20,13,.18)' }
    : { background: COLOR.glass, border: `1px solid ${COLOR.line}` };

  const effectiveCost = isFree ? 0 : cost;
  const insufficient = !isFree && balance < effectiveCost;

  const handleClick = () => {
    if (loading || disabled) return;
    if (insufficient) {
      openNoKorisModal(label, effectiveCost);
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
          className="w-full cursor-pointer font-sans rounded-[14px] flex items-center justify-between gap-3"
          style={{ padding: '6px 6px 6px 20px', minHeight: 52, background: 'transparent', border: `1.5px solid ${COLOR.action}`, color: COLOR.title }}
          aria-label={`Il te manque ${credits(missing)}, recharger`}
        >
          <span className="text-[15px] font-bold tracking-tight">
            Il te manque {credits(missing)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5" style={{ background: palette.primary, color: COLOR.onAction }}>
            <span className="text-[13px] font-extrabold tracking-wide uppercase">Recharger</span>
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
          className="w-full border-0 cursor-pointer font-sans rounded-[14px] flex items-center justify-between gap-3 disabled:opacity-60 disabled:cursor-default"
          style={mainStyle}
          aria-label={`${label}, gratuit`}
        >
          <span className="text-[15px] font-bold tracking-tight">{label}</span>
          {loading ? (
            <Loader2 size={18} className="animate-spin mr-3" />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5" style={pillStyle}>
              <span className="text-[13px] font-extrabold tracking-wide uppercase">Gratuit</span>
            </span>
          )}
        </button>
        {freeReason && (
          <p className="flex items-center justify-center gap-1.5 mt-2 text-xs font-semibold" style={{ color: COLOR.muted }}>{freeReason}</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className="w-full cursor-pointer font-sans rounded-[14px] flex items-center justify-between gap-3 disabled:opacity-60 disabled:cursor-default"
        style={{ ...mainStyle, border: isPrimaryV ? 0 : mainStyle.border }}
        aria-label={`${label}, ${credits(effectiveCost)}`}
      >
        <span className="text-[15px] font-bold tracking-tight">{label}</span>
        {loading ? (
          <Loader2 size={18} className="animate-spin mr-3" />
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2"
            style={pillStyle}
          >
            <img src={KORI_IMG} alt="" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-[17px] font-bold leading-none">{effectiveCost}</span>
          </span>
        )}
      </button>
      <BalanceLine balance={balance} />
    </div>
  );
};

const BalanceLine: React.FC<{ balance: number }> = ({ balance }) => (
  <p className="flex items-center justify-center gap-1.5 mt-2 text-xs font-semibold" style={{ color: COLOR.muted }}>
    <img src={KORI_IMG} alt="" className="w-4 h-4 rounded-full object-cover" />
    Ton solde : <b style={{ color: COLOR.soft }}>{credits(balance)}</b>
  </p>
);

export default KoriCta;
