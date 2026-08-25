import React from 'react';
import { Upload } from 'lucide-react';
import type { AssessmentScale, ScaleResult } from '../../types/assessment';
import { getResultCardConfig } from '../../data/experiences';
import { getBigFiveProfile, getBigFiveSummary, BAND_LABEL } from '../../utils/bigFiveProfile';
import TestSignature from './TestSignature';

interface ResultCardProps {
  scale: AssessmentScale;
  result?: ScaleResult;
  size: 'compact' | 'full' | 'export';
  onShare?: () => void;
  signatureValues?: { value: number; max: number }[];
}

function catKey(category: string): string {
  if (category === 'mental_health') return 'mental';
  if (category === 'sexual_health') return 'sexual';
  return 'bonus';
}

const HALO: Record<string, string> = {
  mental: 'radial-gradient(circle at 35% 35%,rgba(122,150,140,.4),rgba(122,150,140,0) 70%)',
  bonus:  'radial-gradient(circle at 35% 35%,rgba(183,138,46,.42),rgba(183,138,46,0) 70%)',
  sexual: 'radial-gradient(circle at 35% 35%,rgba(201,96,63,.42),rgba(201,96,63,0) 70%)',
  mute:   'radial-gradient(circle at 35% 35%,rgba(150,158,162,.2),rgba(150,158,162,0) 70%)',
};

const HALO_FULL: Record<string, string> = {
  mental: 'radial-gradient(circle at 35% 35%,rgba(122,150,140,.42),rgba(122,150,140,0) 70%)',
  bonus:  'radial-gradient(circle at 35% 35%,rgba(183,138,46,.45),rgba(183,138,46,0) 70%)',
  sexual: 'radial-gradient(circle at 35% 35%,rgba(201,96,63,.45),rgba(201,96,63,0) 70%)',
  mute:   'radial-gradient(circle at 35% 35%,rgba(150,158,162,.22),rgba(150,158,162,0) 70%)',
};

const ITALIC_CLR: Record<string, string> = { mental: '#A8C4B6', bonus: '#E5C88A', sexual: '#E9A88C' };
const SIG_CLR: Record<string, string> = { mental: '#9FBCAF', bonus: '#E5C88A', sexual: '#E9A88C' };

const GAUGE_CLR: Record<string, string> = {
  none: '#7FA98F', minimal: '#7FA98F', positive: '#7FA98F',
  mild: '#B78A2E', moderate: '#C9773F',
  severe: '#B44A46', alert: '#B44A46',
};

const CAT_LABEL: Record<string, string> = {
  mental: 'Profil psychologique',
  bonus: 'Test bonus',
  sexual: 'Vie intime',
};

function toDate(d: Date | string | any): Date {
  if (d && typeof d.toDate === 'function') return d.toDate();
  if (typeof d === 'string') return new Date(d);
  return d;
}

function fmtDate(d: Date | string | any): string {
  return toDate(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function splitTitle(label: string, color: string): React.ReactNode {
  const words = label.trim().split(/\s+/);
  if (words.length <= 1) return <em style={{ fontStyle: 'italic', color }}>{label}</em>;
  const last = words.pop()!;
  return <>{words.join(' ')} <em style={{ fontStyle: 'italic', color }}>{last}</em></>;
}

function dimLabel(pct: number): string {
  if (pct <= 35) return 'Basse';
  if (pct <= 65) return 'Moyenne';
  return 'Élevée';
}

function dimColor(pct: number, catColor: string): string {
  if (pct > 70) return catColor;
  if (pct > 40) return '#B0A894';
  return '#C9A15E';
}

function shortSubscaleLabel(label: string): string {
  return label.split(/\s+/)[0].replace(/'$/, '');
}

interface DimRow {
  label: string;
  pct: number;
  valueLabel: string;
  color: string;
}

function getDimensionRows(scale: AssessmentScale, result: ScaleResult, cat: string): DimRow[] {
  const sigClr = SIG_CLR[cat] ?? '#9FBCAF';

  if (scale.id === 'big_five') {
    const dims = getBigFiveProfile(result);
    return dims.map(d => {
      const pct = (d.score / 10) * 100;
      return {
        label: d.label === 'Stabilité émotionnelle' ? 'Stabilité ém.' : d.label,
        pct,
        valueLabel: BAND_LABEL[d.band],
        color: dimColor(pct, sigClr),
      };
    });
  }

  if (!scale.subscales || !result.subscaleScores) return [];
  return scale.subscales.map(sub => {
    const score = result.subscaleScores?.[sub.key] ?? 0;
    const range = sub.range;
    const pct = range.max === range.min ? 0 : ((score - range.min) / (range.max - range.min)) * 100;
    return {
      label: shortSubscaleLabel(sub.label),
      pct: Math.max(0, Math.min(100, pct)),
      valueLabel: dimLabel(pct),
      color: sigClr,
    };
  });
}

const ResultCard = React.forwardRef<HTMLDivElement, ResultCardProps>(({ scale, result, size, onShare, signatureValues }, ref) => {
  const { card, tone } = getResultCardConfig(scale);
  const cat = catKey(scale.category);
  const isSober = tone === 'sober';
  const isEmpty = !result;
  const isCompact = size === 'compact';
  const isFull = size === 'full';
  const interp = result?.interpretation;

  const bg = isSober
    ? 'linear-gradient(168deg,#232528 0%,#2B2D30 100%)'
    : isEmpty
      ? 'linear-gradient(168deg,#212220 0%,#2A2B28 100%)'
      : 'linear-gradient(168deg,#1B1C1A 0%,#232421 55%,#2B2924 100%)';

  const haloMap = isFull ? HALO_FULL : HALO;
  const halo = isSober || isEmpty ? haloMap.mute : (haloMap[cat] ?? haloMap.mental);
  const italicClr = ITALIC_CLR[cat] ?? '#A8C4B6';
  const sigClr = SIG_CLR[cat] ?? '#9FBCAF';
  const scorableCount = scale.items.filter(i => !i.noScore).length;

  const bands = React.useMemo(() => {
    if (!scale.interpretation?.length) return [];
    const total = scale.scoreRange.max - scale.scoreRange.min + 1;
    return scale.interpretation.map(r => ({
      left: ((r.min - scale.scoreRange.min) / total) * 100,
      width: ((r.max - r.min + 1) / total) * 100,
      color: GAUGE_CLR[r.severity] ?? '#B78A2E',
      label: r.label,
      rMin: r.min,
      rMax: r.max,
    }));
  }, [scale]);

  const activeBand = result
    ? bands.findIndex(b => result.totalScore >= b.rMin && result.totalScore <= b.rMax)
    : -1;

  const cursorPct = result
    ? Math.min(100, Math.max(0, ((result.totalScore - scale.scoreRange.min) / (scale.scoreRange.max - scale.scoreRange.min)) * 100))
    : 0;

  const cursorClr = activeBand >= 0 ? bands[activeBand].color : '#B78A2E';

  const haloSize = isCompact ? 260 : 300;
  const haloOffset = isCompact ? -100 : -110;
  const sigSize = isCompact ? 80 : 120;

  const z2: React.CSSProperties = { position: 'relative', zIndex: 2 };

  const dimRows = (card.variant === 'dimensions' && result) ? getDimensionRows(scale, result, cat) : [];
  const bigFiveSummary = (card.variant === 'dimensions' && scale.id === 'big_five' && result)
    ? getBigFiveSummary(getBigFiveProfile(result))
    : null;

  const renderGauge = () => (
    <div
      style={{ ...z2, marginTop: isFull ? 22 : 16 }}
      role="meter"
      aria-label={`${interp?.label ?? ''}, ${result!.totalScore} sur ${scale.scoreRange.max}`}
      aria-valuemin={scale.scoreRange.min}
      aria-valuemax={scale.scoreRange.max}
      aria-valuenow={result!.totalScore}
    >
      <div style={{ height: isFull ? 7 : 6, borderRadius: 20, background: 'rgba(241,236,225,.14)', position: 'relative' }}>
        {bands.map((b, i) => (
          <span key={i} style={{
            position: 'absolute', top: 0, bottom: 0, borderRadius: 20,
            left: `${b.left}%`, width: `${b.width}%`, background: b.color,
          }} />
        ))}
        <span style={{
          position: 'absolute', top: -4, width: isFull ? 15 : 14, height: isFull ? 15 : 14, borderRadius: '50%',
          border: '3px solid #1B1C1A', background: cursorClr,
          left: `${cursorPct}%`, transform: 'translateX(-50%)',
        }} />
      </div>
      <div style={{ display: 'flex', marginTop: isFull ? 9 : 8 }}>
        {bands.map((b, i) => {
          const active = i === activeBand;
          return (
            <span key={i} style={{
              flex: 1, fontSize: isFull ? 10 : 9.5, fontWeight: active ? 800 : 600,
              color: active ? '#F1ECE1' : '#A79F8F',
              textAlign: i === 0 ? 'left' : i === bands.length - 1 ? 'right' : 'center',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {b.label}
            </span>
          );
        })}
      </div>
    </div>
  );

  const renderDims = () => (
    <div style={{ ...z2, marginTop: isFull ? 22 : 16, display: 'flex', flexDirection: 'column', gap: isFull ? 10 : 9 }}>
      {dimRows.map((d, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: `${isFull ? 96 : 88}px 1fr auto`,
          alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: isFull ? 11.5 : 11, color: '#D5CDBD', fontWeight: 600 }}>{d.label}</span>
          <div style={{ height: 6, borderRadius: 20, background: 'rgba(241,236,225,.13)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 20, background: d.color,
              width: `${d.pct}%`, transition: 'width .9s cubic-bezier(.2,.8,.2,1)',
            }} />
          </div>
          <span style={{ fontSize: isFull ? 10 : 9.5, fontWeight: 700, color: '#EDE7DB', minWidth: isFull ? 52 : 48, textAlign: 'right' }}>
            {d.valueLabel}
          </span>
        </div>
      ))}
    </div>
  );

  const renderSignature = (centered = false) => {
    if (!signatureValues || signatureValues.length < 3) return null;
    return (
      <div style={{ ...z2, ...(centered ? { display: 'flex', justifyContent: 'center', marginTop: isFull ? 26 : 16 } : { flex: '0 0 auto' }) }}>
        <TestSignature
          answers={signatureValues}
          totalItems={scorableCount}
          mode="final"
          accentColor={sigClr}
          size={sigSize}
        />
      </div>
    );
  };

  const renderBrandRow = () => (
    <div style={{ ...z2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 9, background: '#F1ECE1', color: '#1B1C1A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Fraunces',Georgia,serif", fontWeight: 600, fontSize: 14,
        }}>h</div>
        <b style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>Health-e</b>
      </div>
      <span style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase',
        color: '#BFB7A6', border: '1px solid rgba(241,236,225,.2)', borderRadius: 20, padding: '4px 10px',
      }}>
        {isSober ? 'Espace confidentiel' : (CAT_LABEL[cat] ?? 'Profil psychologique')}
      </span>
    </div>
  );

  const renderCareBox = () => (
    <div style={{
      ...z2, marginTop: 20, background: 'rgba(241,236,225,.07)',
      border: '1px solid rgba(241,236,225,.13)', borderRadius: 15, padding: 14,
      display: 'flex', gap: 11,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9FB0AA" strokeWidth="2" style={{ flex: '0 0 auto', marginTop: 1 }}>
        <path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5C19 15.5 12 20 12 20z"/>
      </svg>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: '#CFC9B7' }}>
        Si quelque chose remonte, tu n'as pas à le porter seul.
      </p>
    </div>
  );

  const cardPadding = isCompact ? '22px 20px 20px' : '26px 24px 22px';
  const cardRadius = isCompact ? 22 : 26;

  return (
    <div
      ref={ref}
      style={{
        borderRadius: cardRadius,
        position: 'relative',
        overflow: 'hidden',
        color: '#F1ECE1',
        padding: cardPadding,
        background: bg,
        boxShadow: '0 1px 2px rgba(23,24,27,.04),0 8px 24px rgba(23,24,27,.06)',
        ...(isFull ? { display: 'flex', flexDirection: 'column', minHeight: 0 } : {}),
      }}
      aria-label={
        isEmpty
          ? `${scale.name} — pas encore passé`
          : `${interp?.label ?? ''}, ${result.totalScore} sur ${scale.scoreRange.max}`
      }
    >
      {/* Halo */}
      <div style={{
        position: 'absolute', width: haloSize, height: haloSize, borderRadius: '50%',
        top: haloOffset, right: isCompact ? -90 : -110, pointerEvents: 'none', background: halo,
      }} />
      {/* Second halo for full size */}
      {isFull && (
        <div style={{
          position: 'absolute', width: 220, height: 220, borderRadius: '50%',
          bottom: -110, left: -80, pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 50%,rgba(241,236,225,.07),rgba(241,236,225,0) 70%)',
        }} />
      )}

      {/* ═══ FULL SIZE ═══ */}
      {isFull && !isEmpty && (
        <>
          {renderBrandRow()}

          {isSober ? (
            /* ── Full + Sober ── */
            <>
              <div style={{ ...z2, textAlign: 'center', marginTop: 30 }}>
                <p style={RES_LAB}>C'est terminé</p>
                <h1 style={RES_H1}>Merci d'avoir<br />pris ce temps.</h1>
                <p style={RES_SUB}>
                  Répondre à ces questions demande du courage. Ton résultat détaillé t'attend, à lire quand tu te sens prêt.
                </p>
              </div>
              {renderCareBox()}
              <div style={{ ...FOOT_FULL, marginTop: 'auto' }}>
                <span>Résultat privé</span>
                <span />
              </div>
            </>
          ) : card.variant === 'dimensions' ? (
            /* ── Full + Dimensions ── */
            <>
              <div style={{ ...z2, textAlign: 'center', marginTop: 22 }}>
                <p style={RES_LAB}>
                  {scale.id === 'big_five' ? 'Ta personnalité' : 'Ton résultat'}
                </p>
                <h1 style={RES_H1}>
                  {bigFiveSummary
                    ? splitTitle(bigFiveSummary.title, italicClr)
                    : splitTitle(interp?.label ?? '', italicClr)}
                </h1>
              </div>
              {renderDims()}
              <div style={{ ...FOOT_FULL, marginTop: 'auto' }}>
                <span>health-e.app</span>
                <span><b style={{ color: '#DCD3C4', fontWeight: 700 }}>{fmtDate(result.completedAt)}</b></span>
              </div>
            </>
          ) : (
            /* ── Full + Score / Statement ── */
            <>
              {renderSignature(true)}
              <div style={{ ...z2, textAlign: 'center', marginTop: 20 }}>
                <p style={RES_LAB}>
                  {card.variant === 'statement' ? scale.name : 'Ton résultat'}
                </p>
                <h1 style={RES_H1}>
                  {splitTitle(interp?.label ?? '', italicClr)}
                </h1>
                <p style={RES_SUB}>{interp?.description ?? ''}</p>
              </div>
              {bands.length > 0 && renderGauge()}
              {card.variant === 'statement' && (
                <p style={{ ...z2, margin: '14px 0 0', fontSize: 10.5, color: '#8A8478', fontStyle: 'italic', textAlign: 'center' }}>
                  Ce test n'est pas un diagnostic.
                </p>
              )}
              <div style={{ ...FOOT_FULL, marginTop: 'auto' }}>
                <span>health-e.app</span>
                <span><b style={{ color: '#DCD3C4', fontWeight: 700 }}>{fmtDate(result.completedAt)}</b></span>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══ COMPACT SIZE ═══ */}
      {isCompact && isEmpty && (
        /* ── Empty state ── */
        <>
          <p style={{ ...ST, ...z2 }}>Pas encore passé</p>
          <h2 style={{ ...TT(true), ...z2 }}>
            Ta carte<br />t'attend.
          </h2>
          <p style={{ ...DESC, ...z2, maxWidth: 270 }}>
            {scale.items.length} questions, {scale.timeEstimateMinutes} min.
            {' '}À la fin, tu obtiens ton niveau, ta signature et le suivi dans le temps.
          </p>

          <div style={{ ...z2, display: 'flex', alignItems: 'center', gap: 15, marginTop: 16, opacity: 0.32 }}>
            <TestSignature
              answers={Array.from({ length: scorableCount }, () => ({ value: 1, max: 3 }))}
              totalItems={scorableCount}
              mode="final"
              accentColor="#7E8A85"
              size={sigSize}
            />
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: '#9A9384' }}>
              Ta signature se dessinera ici, réponse après réponse.
            </p>
          </div>

          <div style={FT}>
            <span>Test validé cliniquement</span>
            <span style={{ fontWeight: 700, color: '#DCD3C4' }}>{scale.shortName}</span>
          </div>
        </>
      )}

      {isCompact && !isEmpty && isSober && (
        /* ── Compact + Sober ── */
        <>
          <p style={{ ...ST, ...z2 }}>Ton résultat</p>
          <h2 style={{ ...TT(true), ...z2 }}>{interp?.label ?? ''}</h2>
          <p style={{ ...DESC, ...z2 }}>{interp?.description ?? ''}</p>
          <div style={FT}>
            <span>Résultat privé · jamais partagé</span>
            <span style={{ fontWeight: 700, color: '#DCD3C4' }}>{fmtDate(result.completedAt)}</span>
          </div>
        </>
      )}

      {isCompact && !isEmpty && !isSober && card.variant === 'score' && (
        /* ── Compact + Score ── */
        <>
          <p style={{ ...ST, ...z2 }}>Ton dernier résultat</p>
          <h2 style={{ ...TT(true), ...z2 }}>
            {splitTitle(interp?.label ?? '', italicClr)}
          </h2>

          <div style={{ ...z2, display: 'flex', alignItems: 'center', gap: 15, marginTop: 16 }}>
            {renderSignature()}
            <div>
              <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 32, fontWeight: 600, lineHeight: 1 }}>
                {result.totalScore}
                <small style={{ fontSize: 15, color: '#A79F8F', fontWeight: 400 }}>/{scale.scoreRange.max}</small>
              </div>
              <p style={{
                margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.6, color: '#CFC9B7',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>
                {interp?.description ?? ''}
              </p>
            </div>
          </div>

          {bands.length > 0 && renderGauge()}

          <div style={FT}>
            <span>Passé le <b style={{ color: '#DCD3C4', fontWeight: 700 }}>{fmtDate(result.completedAt)}</b></span>
            {card.shareable && onShare && (
              <button onClick={onShare} style={SHARE_BTN}>
                <Upload size={11} />Partager
              </button>
            )}
          </div>
        </>
      )}

      {isCompact && !isEmpty && !isSober && card.variant === 'dimensions' && (
        /* ── Compact + Dimensions ── */
        <>
          <p style={{ ...ST, ...z2 }}>Ton dernier résultat</p>
          <h2 style={{ ...TT(true), ...z2 }}>
            {bigFiveSummary
              ? splitTitle(bigFiveSummary.title, italicClr)
              : splitTitle(interp?.label ?? '', italicClr)}
          </h2>
          <p style={{ ...DESC, ...z2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
            {interp?.description ?? ''}
          </p>
          {renderDims()}
          <div style={FT}>
            <span>Passé le <b style={{ color: '#DCD3C4', fontWeight: 700 }}>{fmtDate(result.completedAt)}</b></span>
            {card.shareable && onShare && (
              <button onClick={onShare} style={SHARE_BTN}>
                <Upload size={11} />Partager
              </button>
            )}
          </div>
        </>
      )}

      {isCompact && !isEmpty && !isSober && card.variant === 'statement' && (
        /* ── Compact + Statement ── */
        <>
          <p style={{ ...ST, ...z2 }}>Ton résultat</p>
          <h2 style={{ ...TT(true), ...z2 }}>
            {splitTitle(interp?.label ?? '', italicClr)}
          </h2>

          <div style={{ ...z2, display: 'flex', alignItems: 'center', gap: 15, marginTop: 16 }}>
            {renderSignature()}
            <div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: '#CFC9B7' }}>
                {interp?.description ?? ''}
              </p>
            </div>
          </div>

          {bands.length > 0 && renderGauge()}

          <p style={{ ...z2, margin: '12px 0 0', fontSize: 10, color: '#8A8478', fontStyle: 'italic' }}>
            Ce test n'est pas un diagnostic.
          </p>

          <div style={FT}>
            <span>Passé le <b style={{ color: '#DCD3C4', fontWeight: 700 }}>{fmtDate(result.completedAt)}</b></span>
            {card.shareable && onShare && (
              <button onClick={onShare} style={SHARE_BTN}>
                <Upload size={11} />Partager
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
});

/* ── Style constants ── */

const ST: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.13em',
  textTransform: 'uppercase', color: '#BFB7A6', margin: 0,
};

function TT(compact: boolean): React.CSSProperties {
  return {
    fontFamily: "'Fraunces',Georgia,serif",
    fontSize: compact ? 25 : 29, fontWeight: 600,
    lineHeight: 1.14, margin: '8px 0 0', letterSpacing: '-0.01em',
  };
}

const DESC: React.CSSProperties = {
  margin: '11px 0 0', fontSize: 12.5, lineHeight: 1.6, color: '#CFC9B7',
};

const FT: React.CSSProperties = {
  position: 'relative', zIndex: 2, marginTop: 16, paddingTop: 13,
  borderTop: '1px solid rgba(241,236,225,.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  fontSize: 10.5, color: '#A79F8F',
};

const FOOT_FULL: React.CSSProperties = {
  position: 'relative', zIndex: 2, paddingTop: 20,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  fontSize: 10.5, color: '#A79F8F',
};

const SHARE_BTN: React.CSSProperties = {
  background: 'rgba(241,236,225,.1)', border: '1px solid rgba(241,236,225,.18)',
  color: '#EDE7DB', borderRadius: 20, padding: '6px 12px',
  fontFamily: 'inherit', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};

const RES_LAB: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em',
  textTransform: 'uppercase', color: '#BFB7A6', margin: 0,
};

const RES_H1: React.CSSProperties = {
  fontFamily: "'Fraunces',Georgia,serif",
  fontSize: 29, fontWeight: 600, lineHeight: 1.12,
  margin: '9px 0 0', letterSpacing: '-0.01em',
};

const RES_SUB: React.CSSProperties = {
  fontSize: 13, lineHeight: 1.6, color: '#CFC9B7',
  margin: '12px auto 0', maxWidth: 270,
};

export default ResultCard;
