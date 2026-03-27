import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Heart, Shield, ChevronRight, Copy, Check, Activity, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrCreateUserProfile } from '../../services/evaluationService';

const AssessmentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [compatibilityId, setCompatibilityId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setLoadingProfile(true);
      getOrCreateUserProfile(currentUser.id, currentUser.name)
        .then((profile) => setCompatibilityId(profile.compatibilityId))
        .catch(() => setCompatibilityId(null))
        .finally(() => setLoadingProfile(false));
    }
  }, [isAuthenticated, currentUser]);

  const handleCopy = async () => {
    if (!compatibilityId) return;
    try {
      await navigator.clipboard.writeText(compatibilityId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencieux
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Activity size={16} />
          <span>Évaluations scientifiques validées</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
          Évaluez votre{' '}
          <span className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
            bien-être
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Des outils d'auto-évaluation cliniquement validés pour mieux comprendre votre santé mentale et sexuelle.
          Vos résultats restent privés et peuvent être partagés avec votre professionnel de santé.
        </p>
        <button
          onClick={() => navigate('/assessment/select')}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-violet-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
        >
          Commencer une évaluation personnalisée
          <ChevronRight size={18} />
        </button>
      </section>

      {/* 2 Category Cards */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Santé mentale */}
          <Link
            to="/assessment/select"
            className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200"
          >
            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-sky-200 transition-colors">
              <Brain size={24} className="text-sky-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Santé mentale</h2>
            <p className="text-sm text-gray-500 mb-3">
              Anxiété, dépression, stress, personnalité, résilience et bien plus encore.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
                14 évaluations disponibles
              </span>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-sky-500 transition-colors" />
            </div>
          </Link>

          {/* Santé sexuelle */}
          <Link
            to="/assessment/select"
            className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-violet-300 transition-all duration-200"
          >
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-200 transition-colors">
              <Heart size={24} className="text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Santé sexuelle</h2>
            <p className="text-sm text-gray-500 mb-3">
              Satisfaction, désir, intimité, communication et bien-être relationnel.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                  10 évaluations disponibles
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <Lock size={10} />
                  Confidentiel
                </span>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-violet-500 transition-colors" />
            </div>
          </Link>
        </div>
      </section>

      {/* Compatibility ID Section */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Votre ID de compatibilité</h2>
              {isAuthenticated ? (
                loadingProfile ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    Chargement de votre identifiant...
                  </div>
                ) : compatibilityId ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      Partagez cet identifiant avec un proche pour découvrir votre compatibilité.
                    </p>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-base font-mono font-bold text-gray-800 tracking-wider">
                        {compatibilityId}
                      </code>
                      <button
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                          copied
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
                        }`}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? "Copié !": "Copier"}
                      </button>
                    </div>
                    <Link
                      to="/assessment/compatibility"
                      className="inline-flex items-center gap-1.5 mt-3 text-sm text-sky-600 hover:text-sky-700 font-medium"
                    >
                      Tester ma compatibilité avec un proche
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-red-500">Impossible de charger votre identifiant.</p>
                )
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Créez un compte gratuit pour obtenir votre identifiant unique et partager vos résultats avec vos proches.
                  </p>
                  <Link
                    to="/patient/access"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-md transition-all duration-200"
                  >
                    Créer un compte
                    <ChevronRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Footer */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Shield size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 leading-relaxed">
            <strong>Important :</strong> Ces évaluations ne remplacent pas une consultation professionnelle.
            Elles sont fournies à titre informatif uniquement. En cas de détresse ou d'urgence, consultez
            un professionnel de santé qualifié.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AssessmentHomePage;
