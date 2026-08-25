import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import type { AnswerOption } from '../../../types/assessment';

interface AgreementScaleInputProps {
  options: AnswerOption[];
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  accentColor?: string;
}

const AgreementScaleInput: React.FC<AgreementScaleInputProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  accentColor = '#4A5D57',
}) => {
  const sorted = [...options].sort((a, b) => a.value - b.value);
  const groupRef = useRef<HTMLDivElement>(null);
  const stacked = sorted.length >= 6;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (disabled) return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= sorted.length) {
        handleSelect(sorted[n - 1].value);
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus(1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(-1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sorted, disabled, value]);

  function moveFocus(dir: number) {
    if (!groupRef.current) return;
    const btns = Array.from(groupRef.current.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const idx = btns.findIndex(b => b === document.activeElement);
    const next = btns[idx + dir];
    if (next) next.focus();
  }

  function handleSelect(v: number) {
    if (disabled) return;
    try { navigator.vibrate?.(8); } catch {}
    onChange(v);
  }

  const selectedOpt = sorted.find(o => o.value === value);

  if (stacked) {
    return (
      <div ref={groupRef} role="radiogroup" aria-label="Échelle d'accord">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((opt, i) => {
            const selected = value === opt.value;
            const fillWidth = ((i + 1) / sorted.length) * 100;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${i + 1} — ${opt.label}`}
                tabIndex={selected || (value === undefined && i === 0) ? 0 : -1}
                disabled={disabled}
                onClick={() => handleSelect(opt.value)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: selected ? accentColor : '#FFFFFF',
                  border: selected ? `1.5px solid ${accentColor}` : '1.5px solid #E7E4DA',
                  borderRadius: 13,
                  padding: '0 12px',
                  minHeight: 46,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'border-color 0.16s, transform 0.16s',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {!selected && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${fillWidth}%`,
                    background: accentColor,
                    opacity: 0.085,
                  }} />
                )}
                <span style={{
                  position: 'relative',
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: selected ? 'rgba(244,241,233,0.22)' : '#F1EEE4',
                  color: selected ? '#F4F1E9' : '#4B4D55',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{
                  position: 'relative',
                  flex: 1,
                  fontSize: 13.5,
                  fontWeight: 650,
                  color: selected ? '#F4F1E9' : '#17181B',
                }}>
                  {opt.label}
                </span>
                <span style={{
                  position: 'relative',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: selected ? 'none' : '2px solid #D8D2C2',
                  background: selected ? '#F4F1E9' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {selected && <Check size={11} color={accentColor} strokeWidth={3.4} />}
                </span>
              </button>
            );
          })}
        </div>

        {selectedOpt && (
          <div style={{
            marginTop: 12,
            background: '#E4EAE6',
            borderRadius: 13,
            padding: '11px 13px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeInUp 0.28s ease',
          }}>
            <Check size={16} color={accentColor} strokeWidth={2.4} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12.5, color: '#33413C' }}>
              Ta réponse : <b style={{ color: accentColor }}>{selectedOpt.value} — {selectedOpt.label}</b>
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={groupRef} role="radiogroup" aria-label="Échelle d'accord">
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E7E4DA',
        borderRadius: 18,
        padding: '14px 10px 12px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0 4px',
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 11, color: '#8A8C95', fontWeight: 700 }}>{sorted[0].label}</span>
          <span style={{ fontSize: 11, color: '#8A8C95', fontWeight: 700 }}>{sorted[sorted.length - 1].label}</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 4,
        }}>
          {sorted.map((opt, i) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${i + 1} — ${opt.label}`}
                tabIndex={selected || (value === undefined && i === 0) ? 0 : -1}
                disabled={disabled}
                onClick={() => handleSelect(opt.value)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 7,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  fontFamily: 'inherit',
                  minHeight: 44,
                }}
              >
                <span style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  fontStyle: 'normal',
                  transition: 'transform 0.2s cubic-bezier(.3,1.4,.5,1), background 0.18s, border-color 0.18s, color 0.18s',
                  background: selected ? accentColor : '#FFFFFF',
                  color: selected ? '#F4F1E9' : '#4B4D55',
                  border: selected ? `1.5px solid ${accentColor}` : '1.5px solid #DCD6C6',
                  transform: selected ? 'scale(1.1)' : 'none',
                }}>
                  {i + 1}
                </span>
                <span style={{
                  fontSize: 9.5,
                  lineHeight: 1.2,
                  fontWeight: selected ? 700 : 600,
                  color: selected ? accentColor : '#8A8C95',
                  textAlign: 'center',
                  maxWidth: 60,
                  transition: 'color 0.18s',
                }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedOpt && (
        <div style={{
          marginTop: 12,
          background: '#E4EAE6',
          borderRadius: 13,
          padding: '11px 13px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'fadeInUp 0.28s ease',
        }}>
          <Check size={16} color={accentColor} strokeWidth={2.4} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: '#33413C' }}>
            Ta réponse : <b style={{ color: accentColor }}>{selectedOpt.value} — {selectedOpt.label}</b>
          </p>
        </div>
      )}
    </div>
  );
};

export default AgreementScaleInput;
