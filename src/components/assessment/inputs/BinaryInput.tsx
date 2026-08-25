import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import type { AnswerOption } from '../../../types/assessment';
import type { ExperienceTone } from '../../../types/experience';

interface BinaryInputProps {
  options: AnswerOption[];
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  accentColor?: string;
  tone?: ExperienceTone;
  onSkip?: () => void;
}

const BinaryInput: React.FC<BinaryInputProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  accentColor = '#8F6A1F',
  tone = 'playful',
  onSkip,
}) => {
  const isPlayful = tone === 'playful';
  const [bounceIdx, setBounceIdx] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function handleSelect(opt: AnswerOption, idx: number) {
    if (disabled) return;
    try { navigator.vibrate?.(8); } catch {}

    if (isPlayful) {
      setBounceIdx(idx);
      timerRef.current = window.setTimeout(() => setBounceIdx(null), 340);
    }

    onChange(opt.value);
  }

  const selectedColor = isPlayful ? accentColor : '#6B7280';
  const selectedBg = isPlayful ? accentColor : '#9CA3AF';

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Choix binaire"
        style={{ display: 'flex', gap: 12 }}
      >
        {options.map((opt, idx) => {
          const selected = value === opt.value;
          const bouncing = isPlayful && bounceIdx === idx;

          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              tabIndex={selected || (value === undefined && idx === 0) ? 0 : -1}
              disabled={disabled}
              onClick={() => handleSelect(opt, idx)}
              style={{
                position: 'relative',
                flex: 1,
                minHeight: 64,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                borderRadius: 16,
                border: selected
                  ? `2px solid ${selectedColor}`
                  : '2px solid #E7E4DA',
                background: selected ? `${selectedBg}0F` : '#FFFFFF',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: isPlayful
                  ? 'transform 0.26s cubic-bezier(.3,1.5,.5,1), border-color 0.18s, background 0.18s'
                  : 'border-color 0.18s, background 0.18s',
                transform: bouncing ? 'scale(1.06)' : 'none',
                boxShadow: selected
                  ? `0 2px 12px ${selectedColor}18`
                  : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{
                fontSize: 15,
                fontWeight: 700,
                color: selected ? selectedColor : '#374151',
                transition: 'color 0.18s',
              }}>
                {opt.label}
              </span>
              {opt.subtitle && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: selected ? selectedColor : '#94A3B8',
                  opacity: selected ? 0.8 : 1,
                  textAlign: 'center',
                  padding: '0 8px',
                  lineHeight: 1.3,
                }}>
                  {opt.subtitle}
                </span>
              )}
              {selected && (
                <span style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: selectedColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!isPlayful && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          style={{
            display: 'block',
            margin: '14px auto 0',
            padding: '4px 12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            color: '#94A3B8',
            fontFamily: 'inherit',
          }}
        >
          Je préfère ne pas répondre
        </button>
      )}
    </div>
  );
};

export default BinaryInput;
