import React from 'react';
import { TrendingUp, TrendingDown, Trash2, CheckCircle } from 'lucide-react';

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
    interpretation: { label: string; severity: string };
    completedAt: Date | string;
  }>;
  onDeleteEntry?: (entryId: string) => void;
}

const severityColors: Record<string, string> = {
  none: '#22C55E',
  minimal: '#22C55E',
  positive: '#22C55E',
  mild: '#F59E0B',
  moderate: '#F97316',
  severe: '#EF4444',
  alert: '#EF4444',
};

function toDate(d: Date | string | any): Date {
  if (d && typeof d.toDate === 'function') return d.toDate();
  if (typeof d === 'string') return new Date(d);
  return d;
}

function formatDate(d: Date | string | any): string {
  const date = toDate(d);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const TestHistoryPanel: React.FC<TestHistoryPanelProps> = ({
  scaleId,
  scaleName,
  scoreMax,
  currentScore,
  currentLabel,
  currentSeverity,
  currentDate,
  history,
  onDeleteEntry,
}) => {
  const sortedHistory = [...history].sort(
    (a, b) => toDate(a.completedAt).getTime() - toDate(b.completedAt).getTime()
  );

  const currentAttempt = sortedHistory.length > 0
    ? Math.max(...sortedHistory.map((h) => h.attemptNumber)) + 1
    : 1;

  const firstEntry = sortedHistory.length > 0 ? sortedHistory[0] : null;
  const improved = firstEntry ? currentScore <= firstEntry.totalScore : false;
  const worsened = firstEntry ? currentScore > firstEntry.totalScore : false;

  const severityColor = severityColors[currentSeverity] || '#6B7280';

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #E5E7EB',
        padding: 20,
        marginTop: 16,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>📈 Évolution</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
          {scaleName}
        </div>
      </div>

      {/* Current result highlight */}
      <div
        style={{
          background: '#F0FDF4',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <CheckCircle size={20} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#4B5563', fontWeight: 600 }}>
            Résultat actuel ({currentAttempt}e passage — {formatDate(currentDate)})
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: severityColor }}>
            {currentScore} / {scoreMax} — {currentLabel}
          </div>
        </div>
      </div>

      {/* Evolution indicator */}
      {firstEntry && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 14,
            fontSize: 13,
            fontWeight: 600,
            color: improved ? '#16A34A' : worsened ? '#EA580C' : '#6B7280',
          }}
        >
          {improved ? (
            <>
              <TrendingUp size={16} color="#16A34A" />
              <span>En amélioration 💪</span>
            </>
          ) : worsened ? (
            <>
              <TrendingDown size={16} color="#EA580C" />
              <span>Ton score a évolué — parles-en avec un professionnel si besoin</span>
            </>
          ) : (
            <span style={{ color: '#6B7280' }}>Score stable</span>
          )}
        </div>
      )}

      {/* Timeline of previous attempts */}
      {sortedHistory.length > 0 && (
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
            Historique
          </div>
          {[...sortedHistory].reverse().map((entry, idx) => {
            const dotColor = severityColors[entry.interpretation.severity] || '#6B7280';
            return (
              <div
                key={entry.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: idx < sortedHistory.length - 1 ? '1px solid #F9FAFB' : 'none',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, fontSize: 13, color: '#374151', minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{entry.attemptNumber}e passage</span>{' '}
                  <span style={{ color: '#6B7280' }}>({formatDate(entry.completedAt)})</span>
                  {' : '}
                  <span style={{ fontWeight: 600, color: dotColor }}>
                    {entry.totalScore}/{scoreMax}
                  </span>
                  {' — '}
                  {entry.interpretation.label}
                </div>
                {onDeleteEntry && entry.id && (
                  <button
                    onClick={() => onDeleteEntry(entry.id!)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                    title="Supprimer"
                  >
                    <Trash2 size={14} color="#D1D5DB" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {sortedHistory.length === 0 && (
        <div style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
          Premier passage — l'historique apparaîtra ici après ton prochain test.
        </div>
      )}
    </div>
  );
};

export default TestHistoryPanel;
