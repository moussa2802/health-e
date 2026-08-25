import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import type { AnswerOption } from '../../../types/assessment';

interface ForcedChoiceInputProps {
  options: AnswerOption[];
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  accentColor?: string;
}

const ForcedChoiceInput: React.FC<ForcedChoiceInputProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  accentColor = '#8F6A1F',
}) => {
  const [bounceIdx, setBounceIdx] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function handleSelect(opt: AnswerOption, idx: number) {
    if (disabled) return;
    try { navigator.vibrate?.(8); } catch {}
    setBounceIdx(idx);
    timerRef.current = window.setTimeout(() => setBounceIdx(null), 340);
    onChange(opt.value);
  }

  return (
    <div role="radiogroup" aria-label="Choix forcé" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt, idx) => {
        const selected = value === opt.value;
        const bouncing = bounceIdx === idx;
        const letter = idx === 0 ? 'A' : 'B';

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${letter} — ${opt.label}`}
            tabIndex={selected || (value === undefined && idx === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => handleSelect(opt, idx)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '16px 18px',
              borderRadius: 16,
              border: selected
                ? `2px solid ${accentColor}`
                : '2px solid #E7E4DA',
              background: selected ? `${accentColor}0A` : '#FFFFFF',
              cursor: disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.26s cubic-bezier(.3,1.5,.5,1), border-color 0.18s, background 0.18s, box-shadow 0.18s',
              transform: bouncing ? 'scale(1.02)' : 'none',
              boxShadow: selected
                ? `0 2px 12px ${accentColor}18`
                : '0 1px 3px rgba(0,0,0,0.04)',
              minHeight: 64,
            }}
          >
            <span style={{
              width: 32,
              height: 32,
              minWidth: 32,
              borderRadius: 9,
              flexShrink: 0,
              background: selected ? accentColor : `${accentColor}12`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: selected ? '#fff' : accentColor,
              marginTop: 1,
              transition: 'all 0.18s ease',
            }}>
              {letter}
            </span>

            <span style={{
              flex: 1,
              fontSize: 14,
              fontWeight: selected ? 650 : 500,
              color: selected ? '#17181B' : '#374151',
              lineHeight: 1.45,
              minWidth: 0,
            }}>
              {opt.label}
            </span>

            {selected && (
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: accentColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <Check size={13} color="#fff" strokeWidth={2.5} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ForcedChoiceInput;
