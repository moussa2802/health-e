import React from 'react';

interface GameTeaserProps {
  onClick?: () => void;
  subtitle?: string;
}

const GameTeaser: React.FC<GameTeaserProps> = ({ onClick, subtitle }) => {
  return (
    <div
      className="bg-card border border-line rounded-[14px] p-3.5 shadow-soft flex flex-col justify-between cursor-default"
      style={{ minHeight: 96 }}
      onClick={onClick}
    >
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg leading-none">👀</span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(201,96,63,.12)', color: '#C9603F' }}
          >
            Bientôt
          </span>
        </div>
        <p className="text-[13px] font-bold text-ink m-0 mt-1.5 leading-tight">
          Kan moo ma gën a xam ?
        </p>
      </div>
      <p className="text-[11px] text-muted m-0 mt-1.5 leading-snug">
        {subtitle ?? 'Bientôt…'}
      </p>
    </div>
  );
};

export default GameTeaser;
