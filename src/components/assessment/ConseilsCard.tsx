import React, { useState, useCallback } from 'react';
import { getOrGenerateConseils, type CachedConseils, type GenerateConseilsParams } from '../../services/conseilsService';

// ── Types ─────────────────────────────────────────────────────────────────────

type CardState = 'idle' | 'loading' | 'success' | 'error';

interface ConseilsCardProps {
  userId: string;
  scaleId: string;
  scaleName: string;
  score: number;
  scoreMax: number;
  niveau: string;
  severity: string;
  prenom?: string;
  genre?: string;
  interpretation?: string;
}

// ── Helper: format relative date ──────────────────────────────────────────────

function formatRelativeDate(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  } catch {
    return '';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const ConseilsCard: React.FC<ConseilsCardProps> = ({
  userId,
  scaleId,
  scaleName,
  score,
  scoreMax,
  niveau,
  severity,
  prenom,
  genre,
  interpretation,
}) => {
  const [state, setState] = useState<CardState>('idle');
  const [data, setData] = useState<CachedConseils | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    setState('loading');
    setError(null);
    try {
      const params: GenerateConseilsParams = {
        userId,
        scaleId,
        scaleName,
        score,
        scoreMax,
        niveau,
        severity,
        prenom,
        genre,
        interpretation,
        forceRefresh,
      };
      const result = await getOrGenerateConseils(params);
      setData(result);
      setState('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setState('error');
    }
  }, [userId, scaleId, scaleName, score, scoreMax, niveau, severity, prenom, genre, interpretation]);

  // ── IDLE — button to trigger ──
  if (state === 'idle') {
    return (
      <button
        onClick={() => load(false)}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #F0FDF4, #EFF6FF)',
          border: '1.5px solid rgba(59,130,246,0.2)',
          borderRadius: 18,
          padding: '18px 22px',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: '0 2px 12px rgba(59,130,246,0.06)',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3B82F6, #10B981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
          boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
        }}>
          💡
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0A2342' }}>
            Mes conseils personnalisés
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
            Dr Lô analyse ton résultat pour te donner 3 conseils concrets
          </p>
        </div>
        <div style={{
          background: 'linear-gradient(135deg,#3B82F6,#10B981)',
          color: 'white', borderRadius: 10,
          padding: '7px 14px', fontSize: 12, fontWeight: 700,
          flexShrink: 0,
        }}>
          Voir →
        </div>
      </button>
    );
  }

  // ── LOADING ──
  if (state === 'loading') {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1.5px solid rgba(59,130,246,0.18)',
        borderRadius: 18,
        padding: '20px 22px',
        boxShadow: '0 4px 20px rgba(59,130,246,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            💡
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0A2342' }}>
              Mes conseils personnalisés
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>Génération en cours…</p>
          </div>
          <div style={{
            width: 18, height: 18,
            border: '2.5px solid #3B82F6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
        </div>
        <div style={{ background: '#F8FAFF', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
            Dr Lô analyse ton résultat et prépare 3 conseils personnalisés… 🔄
          </p>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (state === 'error') {
    return (
      <div style={{
        background: '#FFF7ED', border: '1.5px solid rgba(249,115,22,0.3)',
        borderRadius: 18, padding: '18px 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#9A3412' }}>
            Impossible de générer les conseils
          </p>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#C2410C' }}>{error}</p>
        <button
          onClick={() => load(false)}
          style={{
            background: 'linear-gradient(135deg,#F97316,#EF4444)',
            color: 'white', border: 'none',
            padding: '8px 16px', borderRadius: 10,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  // ── SUCCESS ──
  if (state === 'success' && data) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.98)',
        border: '1.5px solid rgba(16,185,129,0.2)',
        borderRadius: 18,
        padding: '20px 22px',
        boxShadow: '0 4px 20px rgba(16,185,129,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative blob */}
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
          }}>
            💡
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0A2342' }}>
              Mes conseils personnalisés
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>
              Analyse Dr Lô · {niveau}
            </p>
          </div>
          {data.fromCache && (
            <span style={{
              background: '#F0FDF4', border: '1px solid rgba(16,185,129,0.3)',
              color: '#16A34A', fontSize: 10, fontWeight: 700,
              padding: '3px 8px', borderRadius: 8, flexShrink: 0,
            }}>
              ✓ Sauvegardé
            </span>
          )}
        </div>

        {/* Signification */}
        <div style={{
          background: 'linear-gradient(135deg, #F0FDF4, #EFF6FF)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          border: '1px solid rgba(16,185,129,0.15)',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📌 Ce que ça veut dire
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
            {data.signification}
          </p>
        </div>

        {/* 3 conseils */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ✅ Mes 3 conseils
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.conseils.map((conseil, i) => (
              <div
                key={i}
                style={{
                  background: '#F8FAFF',
                  borderRadius: 12,
                  padding: '12px 14px',
                  borderLeft: '3px solid #3B82F6',
                }}
              >
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#0A2342' }}>
                  {conseil.titre}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                  {conseil.texte}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Exercice de la semaine */}
        <div style={{
          background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)',
          borderRadius: 12, padding: '14px 16px',
          border: '1px solid rgba(59,130,246,0.15)',
          marginBottom: data.avis_pro ? 16 : 14,
        }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🏋️ Exercice de la semaine
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#0A2342' }}>
            {data.exercice.titre}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
            {data.exercice.description}
          </p>
        </div>

        {/* Avis pro (si score critique) */}
        {data.avis_pro && (
          <div style={{
            background: '#FFF7ED',
            borderRadius: 12, padding: '12px 14px',
            border: '1px solid rgba(249,115,22,0.2)',
            marginBottom: 14,
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚕️ Avis du Dr Lô
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#9A3412', lineHeight: 1.6 }}>
              {data.avis_pro}
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
          borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12,
        }}>
          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>
            {data.fromCache ? `✓ Analyse sauvegardée · ${formatRelativeDate(data.generatedAt)}` : '✓ Analyse générée et sauvegardée'}
          </p>
          <button
            onClick={() => load(true)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#3B82F6', fontSize: 11, fontWeight: 600,
              padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
            }}
          >
            🔄 Actualiser
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ConseilsCard;
