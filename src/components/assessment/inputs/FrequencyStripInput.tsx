import React, { useState, useEffect } from 'react';
import type { AnswerOption } from '../../../types/assessment';

const FILL_COUNTS: Record<number, number> = { 0: 0, 1: 4, 2: 9, 3: 13 };

interface FrequencyStripInputProps {
  options: AnswerOption[];
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  accentColor?: string;
}

const FrequencyStripInput: React.FC<FrequencyStripInputProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  accentColor = '#4A5D57',
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (disabled) return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= options.length) {
        onChange(options[n - 1].value);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [options, onChange, disabled]);

  const displayValue = hovered !== null ? hovered : value;
  const fillCount = displayValue !== undefined && displayValue !== null
    ? (FILL_COUNTS[displayValue] ?? 0)
    : 0;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 10.5,
        color: '#8A8C95',
        fontWeight: 600,
        marginBottom: 7,
      }}>
        <span>Aucun jour</span>
        <span>14 jours</span>
      </div>

      <div
        aria-hidden="true"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(14, 1fr)',
          gap: 4,
          marginBottom: 16,
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              borderRadius: 3,
              background: i < fillCount ? accentColor : '#E4E0D4',
              transition: 'background 0.28s, transform 0.28s',
              transform: i < fillCount ? 'scale(1.06)' : 'none',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((option, index) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onMouseEnter={() => !disabled && setHovered(option.value)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => !disabled && setHovered(option.value)}
              onBlur={() => setHovered(null)}
              onClick={() => !disabled && onChange(option.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                background: isSelected ? accentColor : '#FFFFFF',
                border: isSelected ? `1.5px solid ${accentColor}` : '1.5px solid #E7E4DA',
                borderRadius: 14,
                padding: '13px 15px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                transition: 'border-color 0.16s, transform 0.16s, background 0.16s',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                background: isSelected ? 'rgba(244,241,233,0.22)' : '#F1EEE4',
                color: isSelected ? '#F4F1E9' : '#8A8C95',
                fontSize: 10.5,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {index + 1}
              </span>
              <span style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 650,
                color: isSelected ? '#F4F1E9' : '#17181B',
              }}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FrequencyStripInput;
