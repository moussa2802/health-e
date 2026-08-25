import React from 'react';

interface SignatureAnswer {
  value: number;
  max: number;
}

interface TestSignatureProps {
  answers: SignatureAnswer[];
  totalItems: number;
  mode: 'progress' | 'final';
  accentColor?: string;
  size?: number;
}

const TestSignature: React.FC<TestSignatureProps> = ({
  answers,
  totalItems,
  mode,
  accentColor = '#4A5D57',
  size = 120,
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.42;
  const minR = size * 0.1;
  const n = Math.max(totalItems, 3);
  const isFinal = mode === 'final';

  const getPoint = (index: number, radius: number) => {
    const angle = (index / n) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  };

  const points = answers.map((a, i) => {
    const normalized = a.max > 0 ? a.value / a.max : 0;
    const r = isFinal
      ? minR + normalized * (maxR - minR)
      : minR + 0.45 * (maxR - minR);
    return getPoint(i, r);
  });

  const pathD = points.length >= 3
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'
    : '';

  const rings = [0.33, 0.66, 1].map(f => minR + f * (maxR - minR));

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ overflow: 'visible' }}
    >
      {rings.map((r, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={`${accentColor}${isFinal ? '18' : '10'}`}
          strokeWidth={0.75}
          strokeDasharray={isFinal ? 'none' : '2 3'}
        />
      ))}

      {Array.from({ length: answers.length }).map((_, i) => {
        const end = getPoint(i, maxR);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={end.x} y2={end.y}
            stroke={`${accentColor}${isFinal ? '22' : '12'}`}
            strokeWidth={0.5}
          />
        );
      })}

      {pathD && (
        <path
          d={pathD}
          fill={`${accentColor}${isFinal ? '18' : '08'}`}
          stroke={accentColor}
          strokeWidth={isFinal ? 1.5 : 0.75}
          strokeLinejoin="round"
          opacity={isFinal ? 1 : 0.6}
          style={{ transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      )}

      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x} cy={p.y}
          r={isFinal ? 3 : 2}
          fill={accentColor}
          opacity={isFinal ? 1 : 0.5}
          style={{ transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      ))}

      <circle cx={cx} cy={cy} r={1.5} fill={accentColor} opacity={0.3} />
    </svg>
  );
};

export default TestSignature;
