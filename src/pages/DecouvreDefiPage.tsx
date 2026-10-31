import '../components/accueil/accueil.css';
import React from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Sparkles, Clock, CheckCircle } from 'lucide-react';

import lionImg from '../assets/totems/lion.jpg';
import loupImg from '../assets/totems/loup.jpg';
import cerfImg from '../assets/totems/cerf.jpg';
import dauphinImg from '../assets/totems/dauphin.jpg';
import tortueImg from '../assets/totems/tortue.jpg';
import hibouImg from '../assets/totems/hibou.jpg';
import aigleImg from '../assets/totems/aigle.jpg';
import elephantImg from '../assets/totems/elephant.jpg';
import panthereImg from '../assets/totems/panthere.jpg';
import renardImg from '../assets/totems/renard.jpg';
import chevalImg from '../assets/totems/cheval.jpg';
import oursImg from '../assets/totems/ours.jpg';
import { credits, cap } from '../config/creditName';

const TOTEMS: { key: string; label: string; emoji: string; img: string }[] = [
  { key: 'lion', label: 'Lion', emoji: '🦁', img: lionImg },
  { key: 'aigle', label: 'Aigle', emoji: '🦅', img: aigleImg },
  { key: 'dauphin', label: 'Dauphin', emoji: '🐬', img: dauphinImg },
  { key: 'loup', label: 'Loup', emoji: '🐺', img: loupImg },
  { key: 'elephant', label: 'Éléphant', emoji: '🐘', img: elephantImg },
  { key: 'panthere', label: 'Panthère', emoji: '🐆', img: panthereImg },
  { key: 'renard', label: 'Renard', emoji: '🦊', img: renardImg },
  { key: 'tortue', label: 'Tortue', emoji: '🐢', img: tortueImg },
  { key: 'hibou', label: 'Hibou', emoji: '🦉', img: hibouImg },
  { key: 'cerf', label: 'Cerf', emoji: '🦌', img: cerfImg },
  { key: 'cheval', label: 'Cheval', emoji: '🐎', img: chevalImg },
  { key: 'ours', label: 'Ours', emoji: '🐻', img: oursImg },
];

interface LocationState {
  creatorTotem?: string | null;
  creatorName?: string;
}

const DecouvreDefiPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const ref = params.get('ref') || '';

  const state = (location.state || {}) as LocationState;
  const creatorTotem = state.creatorTotem || null;
  const creatorName = state.creatorName || null;
  const totemData = creatorTotem ? TOTEMS.find(t => t.key === creatorTotem) : null;

  const signupUrl = `/patient/access?mode=signup&returnTo=/assessment`;

  return (
    <div className="min-h-screen bg-paper drl-screen drl-page">
      <div className="max-w-[600px] mx-auto px-5 py-8">
        {/* Creator totem banner */}
        {totemData && creatorName && (
          <div
            className="rounded-2xl p-5 mb-6 text-center"
            style={{ background: 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)' }}
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-3 border-2 border-gold/30">
              <img src={totemData.img} alt={totemData.label} className="w-full h-full object-cover" />
            </div>
            <p className="text-[15px] font-bold text-[#F4F1E9] m-0">
              {creatorName} est {totemData.label} {totemData.emoji}
            </p>
            <p className="text-[13px] text-gold/80 m-0 mt-1">
              Et toi, c'est quoi ton animal intérieur ?
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-8">
          {!totemData && (
            <div className="w-16 h-16 rounded-2xl bg-gold-soft flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-gold" />
            </div>
          )}
          <h1 className="font-display text-2xl font-bold text-ink m-0 mb-2">
            {totemData ? 'Découvre ton animal totem' : 'Quel est ton animal totem ?'}
          </h1>
          <p className="text-[15px] text-muted m-0 leading-relaxed">
            Découvre ta personnalité profonde grâce à 7 tests scientifiques
          </p>
        </div>

        {/* Totem grid */}
        <div className="grid grid-cols-4 gap-2.5 mb-8">
          {TOTEMS.map(t => (
            <div key={t.key} className="text-center">
              <div className={`aspect-square rounded-xl overflow-hidden mb-1 border ${
                creatorTotem === t.key ? 'border-gold border-2' : 'border-line'
              }`}>
                <img src={t.img} alt={t.label} className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] text-muted font-medium">{t.label}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-5 mb-8">
          <div className="flex items-center gap-1.5 text-[13px] text-ink font-medium">
            <CheckCircle size={14} className="text-gold" />
            7 tests
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-ink font-medium">
            <Clock size={14} className="text-gold" />
            15 min
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-ink font-medium">
            <Sparkles size={14} className="text-gold" />
            {cap(credits(25))} offertes
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate(signupUrl)}
          className="w-full py-4 rounded-[14px] border-none bg-gold text-white text-[16px] font-bold cursor-pointer shadow-soft"
        >
          Découvrir mon animal intérieur
        </button>

        <p className="text-[13px] text-muted text-center m-0 mt-3">
          Gratuit et confidentiel
        </p>
      </div>
    </div>
  );
};

export default DecouvreDefiPage;
