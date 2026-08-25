import React from 'react';
import { TrendingUp, TrendingDown, Trash2, CheckCircle, Clock } from 'lucide-react';
import { getBigFiveProfile, BAND_LABEL } from '../../utils/bigFiveProfile';
import type { ScaleResult } from '../../types/assessment';

interface TestHistoryPanelProps {
  scaleId: string;
  scaleName: string;
  scoreMax: number;
  currentScore: number;
  currentLabel: string;
  currentSeverity: string;
  currentDate: Date | string;
  history: Array<{
    id?: string;
    attemptNumber: number;
    totalScore: number;
    subscaleScores?: Record<string, number> | null;
    interpretation: { label: string; severity: string };
    completedAt: Date | string;
  }>;
  onDeleteEntry?: (entryId: string) => void;
  bigFiveMode?: boolean;
  currentSubscaleScores?: Record<string, number>;
}

const severityColors: Record<string, string> = {
  none: '#3C7A5A', minimal: '#3C7A5A', positive: '#3C7A5A',
  mild: '#8F6A1F', moderate: '#B5522F',
  severe: '#B23A3A', alert: '#B23A3A',
};

function toDate(d: Date | string | any): Date {
  if (d && typeof d.toDate === 'function') return d.toDate();
  if (typeof d === 'string') return new Date(d);
  return d;
}

function formatDate(d: Date | string | any): string {
  return toDate(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTopTraits(subscaleScores: Record<string, number> | null | undefined): string {
  if (!subscaleScores) return '';
  const fakeResult: ScaleResult = {
    scaleId: 'big_five', totalScore: 0,
    subscaleScores: subscaleScores as Record<string, number>,
    interpretation: { min: 0, max: 0, label: '', severity: '', description: '', referralRequired: false, recommendation: '' },
    completedAt: new Date(),
  };
  const dims = getBigFiveProfile(fakeResult);
  if (dims.length < 2) return '';
  return `${dims[0].label} (${BAND_LABEL[dims[0].band].toLowerCase()}) · ${dims[1].label} (${BAND_LABEL[dims[1].band].toLowerCase()})`;
}

const TestHistoryPanel: React.FC<TestHistoryPanelProps> = ({
  scaleName, scoreMax, currentScore, currentLabel, currentSeverity,
  currentDate, history, onDeleteEntry, bigFiveMode, currentSubscaleScores,
}) => {
  const sortedHistory = [...history].sort((a, b) => toDate(a.completedAt).getTime() - toDate(b.completedAt).getTime());
  const currentAttempt = sortedHistory.length > 0 ? Math.max(...sortedHistory.map(h => h.attemptNumber)) + 1 : 1;
  const firstEntry = sortedHistory.length > 0 ? sortedHistory[0] : null;
  const improved = firstEntry ? currentScore <= firstEntry.totalScore : false;
  const worsened = firstEntry ? currentScore > firstEntry.totalScore : false;
  const dotColor = severityColors[currentSeverity] || '#6E7078';

  const currentTraits = bigFiveMode ? getTopTraits(currentSubscaleScores) : '';

  return (
    <div className="bg-card rounded-card border border-line p-5 mt-4 shadow-soft">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-sage-soft flex items-center justify-center">
          <TrendingUp size={16} className="text-sage" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-ink">Évolution</h3>
          <p className="text-xs text-muted">{scaleName}</p>
        </div>
      </div>

      <div className="bg-sage-soft rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
        <CheckCircle size={18} className="text-ok flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-ink-soft font-semibold">
            Résultat actuel ({currentAttempt}e passage — {formatDate(currentDate)})
          </p>
          {bigFiveMode ? (
            <p className="text-[13px] font-semibold mt-1" style={{ color: '#4A5D57' }}>
              {currentTraits}
            </p>
          ) : (
            <p className="text-[15px] font-bold mt-1" style={{ color: dotColor }}>
              {currentScore} / {scoreMax} — {currentLabel}
            </p>
          )}
        </div>
      </div>

      {!bigFiveMode && firstEntry && (
        <div className={`flex items-center gap-1.5 mb-3.5 text-[13px] font-semibold ${improved ? 'text-ok' : worsened ? 'text-warn' : 'text-muted'}`}>
          {improved ? (
            <><TrendingUp size={15} /> En amélioration</>
          ) : worsened ? (
            <><TrendingDown size={15} /> Ton score a évolué — parles-en avec un professionnel si besoin</>
          ) : (
            'Score stable'
          )}
        </div>
      )}

      {sortedHistory.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="text-[11px] text-muted font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock size={11} /> Historique
          </p>
          {[...sortedHistory].reverse().map((entry, idx) => {
            const color = severityColors[entry.interpretation.severity] || '#6E7078';
            const entryTraits = bigFiveMode ? getTopTraits(entry.subscaleScores) : '';
            return (
              <div key={entry.id || idx} className={`flex items-center gap-2 py-2 ${idx < sortedHistory.length - 1 ? 'border-b border-paper' : ''}`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: bigFiveMode ? '#4A5D57' : color }} />
                <div className="flex-1 text-[13px] text-ink-soft min-w-0">
                  <span className="font-semibold">{entry.attemptNumber}e passage</span>{' '}
                  <span className="text-muted">({formatDate(entry.completedAt)})</span>
                  {bigFiveMode ? (
                    entryTraits ? <><br /><span style={{ color: '#4A5D57' }}>{entryTraits}</span></> : null
                  ) : (
                    <>
                      {' : '}
                      <span className="font-semibold" style={{ color }}>{entry.totalScore}/{scoreMax}</span>
                      {' — '}{entry.interpretation.label}
                    </>
                  )}
                </div>
                {onDeleteEntry && entry.id && (
                  <button
                    onClick={() => onDeleteEntry(entry.id!)}
                    className="p-1 rounded-md flex items-center bg-transparent border-none cursor-pointer hover:bg-paper-dark transition-colors flex-shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 size={13} className="text-line hover:text-danger" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sortedHistory.length === 0 && (
        <p className="text-[13px] text-muted text-center py-2">
          Premier passage — l'historique apparaîtra ici après ton prochain test.
        </p>
      )}
    </div>
  );
};

export default TestHistoryPanel;
