import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Lightbulb, RefreshCw, AlertTriangle, Loader2, Check, Dumbbell, Pin, Stethoscope } from 'lucide-react';
import { getOrGenerateConseils, type CachedConseils, type GenerateConseilsParams } from '../../services/conseilsService';
import { useKoris } from '../../contexts/KorisContext';
import { isAiAvailable } from '../../utils/aiCircuitBreaker';

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
  autoLoad?: boolean;
}

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

const ConseilsCard: React.FC<ConseilsCardProps> = ({
  userId, scaleId, scaleName, score, scoreMax,
  niveau, severity, prenom, genre, interpretation,
  autoLoad = false,
}) => {
  const [state, setState] = useState<CardState>(autoLoad ? 'loading' : 'idle');
  const [data, setData] = useState<CachedConseils | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoLoaded = useRef(false);
  const { canAfford, getCost, refreshBalance } = useKoris();
  const conseilsCost = getCost('conseils');

  const load = useCallback(async (forceRefresh = false) => {
    setState('loading');
    setError(null);
    try {
      const params: GenerateConseilsParams = {
        userId, scaleId, scaleName, score, scoreMax,
        niveau, severity, prenom, genre, interpretation, forceRefresh,
      };
      const result = await getOrGenerateConseils(params);
      setData(result);
      setState('success');
      if (!result.fromCache) {
        await refreshBalance();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setState('error');
      await refreshBalance();
    }
  }, [userId, scaleId, scaleName, score, scoreMax, niveau, severity, prenom, genre, interpretation, refreshBalance]);

  useEffect(() => {
    if (autoLoad && !autoLoaded.current) {
      autoLoaded.current = true;
      load(false);
    }
  }, [autoLoad, load]);

  const handleGenerateConseils = async () => {
    load(false);
  };

  if (state === 'idle') {
    const affordable = canAfford('conseils') && isAiAvailable();
    return (
      <button
        onClick={handleGenerateConseils}
        disabled={!affordable}
        className={`w-full rounded-card border p-5 text-left flex items-center gap-4 transition-all duration-200 ${
          affordable
            ? 'bg-card border-line shadow-soft hover-lift cursor-pointer'
            : 'bg-paper border-line opacity-60 cursor-not-allowed'
        }`}
      >
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${affordable ? 'bg-sage' : 'bg-muted'}`}>
          <Lightbulb size={20} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-ink">Mes conseils personnalisés</p>
          <p className="text-xs text-muted mt-0.5">Dr Lô analyse ton résultat pour te donner 3 conseils concrets</p>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className={`text-xs font-bold text-white px-3.5 py-1.5 rounded-xl ${affordable ? 'bg-sage' : 'bg-muted'}`}>
            Générer
          </span>
          {conseilsCost > 0 && (
            <span className={`text-[10px] font-bold ${affordable ? 'text-sage' : 'text-muted'}`}>
              {conseilsCost} Kori{conseilsCost > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>
    );
  }

  if (state === 'loading') {
    return (
      <div className="bg-card rounded-card border border-line p-5 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center flex-shrink-0">
            <Lightbulb size={18} color="white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">Mes conseils personnalisés</p>
            <p className="text-xs text-muted">Génération en cours…</p>
          </div>
          <Loader2 size={18} className="animate-spin text-sage flex-shrink-0" />
        </div>
        <div className="bg-paper rounded-xl p-4">
          <p className="text-[13px] text-muted leading-relaxed">
            Dr Lô analyse ton résultat et prépare 3 conseils personnalisés…
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-accent-soft rounded-card border border-accent/20 p-5">
        <div className="flex items-center gap-2.5 mb-2.5">
          <AlertTriangle size={18} className="text-danger" />
          <p className="text-sm font-bold text-danger">Impossible de générer les conseils</p>
        </div>
        <p className="text-[13px] text-danger/80 mb-3">{error}</p>
        <button
          onClick={() => load(false)}
          className="bg-accent text-white border-none px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-accent/90 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (state === 'success' && data) {
    return (
      <div className="bg-card rounded-card border border-sage/15 p-5 shadow-soft relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center flex-shrink-0 shadow-soft">
            <Lightbulb size={18} color="white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">Mes conseils personnalisés</p>
            <p className="text-xs text-muted">Analyse Dr Lô · {niveau}</p>
          </div>
          {data.fromCache && (
            <span className="bg-sage-soft text-ok text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 flex items-center gap-1">
              <Check size={10} /> Sauvegardé
            </span>
          )}
        </div>

        <div className="bg-sage-soft rounded-xl p-4 mb-4 border border-sage/10">
          <p className="text-[11px] font-bold text-sage uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Pin size={12} /> Ce que ça veut dire
          </p>
          <p className="text-[13px] text-ink-soft leading-relaxed">{data.signification}</p>
        </div>

        <div className="mb-4">
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
            <Check size={12} /> Mes 3 conseils
          </p>
          <div className="flex flex-col gap-2.5">
            {data.conseils.map((conseil, i) => (
              <div key={i} className="bg-paper rounded-xl p-3.5 border-l-[3px] border-accent">
                <p className="text-[13px] font-bold text-ink mb-1">{conseil.titre}</p>
                <p className="text-[13px] text-ink-soft leading-relaxed">{conseil.texte}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gold-soft rounded-xl p-4 border border-gold/10 mb-4">
          <p className="text-[11px] font-bold text-gold uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Dumbbell size={12} /> Exercice de la semaine
          </p>
          <p className="text-[13px] font-bold text-ink mb-1">{data.exercice.titre}</p>
          <p className="text-[13px] text-ink-soft leading-relaxed">{data.exercice.description}</p>
        </div>

        {data.avis_pro && (
          <div className="bg-accent-soft rounded-xl p-3.5 border border-accent/15 mb-4">
            <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Stethoscope size={12} /> Avis du Dr Lô
            </p>
            <p className="text-[13px] text-accent leading-relaxed">{data.avis_pro}</p>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 border-t border-line pt-3">
          <p className="text-[11px] text-muted">
            {data.fromCache ? `Analyse sauvegardée · ${formatRelativeDate(data.generatedAt)}` : 'Analyse générée et sauvegardée'}
          </p>
          <button
            onClick={() => load(true)}
            disabled={!canAfford('conseils') || !isAiAvailable()}
            className={`flex items-center gap-1.5 bg-transparent border text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              canAfford('conseils') && isAiAvailable()
                ? 'border-sage/20 text-sage cursor-pointer hover:bg-sage-soft'
                : 'border-line text-muted cursor-not-allowed'
            }`}
          >
            <RefreshCw size={11} /> Actualiser {conseilsCost > 0 && `(${conseilsCost}K)`}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ConseilsCard;
