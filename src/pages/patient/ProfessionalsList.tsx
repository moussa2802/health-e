import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfessionals } from '../../hooks/useProfessionals';
import { Star, Search, Filter, Languages, Clock, Calendar, CheckCircle, User, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ProfessionalsList = () => {
  const { specialty } = useParams<{ specialty: 'mental' | 'sexual' }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProfessionals, setFilteredProfessionals] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Utiliser le hook useProfessionals avec le filtre de spécialité
  const { professionals, loading, error, refreshProfessionals } = useProfessionals(specialty);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
  const filtered = professionals
    .filter(professional => professional.isActive && professional.isApproved)
    .filter(professional =>
      searchTerm === '' ||
      professional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );
  setFilteredProfessionals(filtered);
}, [searchTerm, professionals]);

  const getServiceColors = () => {
    return specialty === 'mental' 
      ? { primary: 'blue', accent: 'teal' }
      : { primary: 'rose', accent: 'pink' };
  };

  const colors = getServiceColors();

  // Utility function to check if a value exists
  const safeValue = (value: any, defaultValue: any = '') => {
    return value !== undefined && value !== null ? value : defaultValue;
  };

  // Utility function to check if a value exists and is an array
  const safeArray = (arr: any): any[] => {
    return Array.isArray(arr) ? arr : [];
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-lg text-gray-600">Chargement des professionnels...</p>
            <p className="mt-2 text-sm text-gray-500">
              {specialty === 'mental' ? 'Santé mentale' : 'Santé sexuelle'}
            </p>
            <div className="mt-4 flex items-center justify-center">
              {isOnline ? (
                <div className="flex items-center text-green-600">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span className="text-sm">En ligne</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span className="text-sm">Hors ligne</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 mr-3" />
              <div>
                <h3 className="font-bold">Erreur de chargement</h3>
                <p className="mt-1">{error}</p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={refreshProfessionals}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors inline-flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </button>
              <div className="flex items-center">
                {isOnline ? (
                  <div className="flex items-center text-green-600">
                    <Wifi className="h-4 w-4 mr-1" />
                    <span className="text-sm">Connexion active</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <WifiOff className="h-4 w-4 mr-1" />
                    <span className="text-sm">Pas de connexion</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-4 text-${colors.primary}-600`}>
          {specialty === 'mental' ? 'Santé mentale' : 'Santé sexuelle'}
        </h1>
        <p className="text-gray-600 mb-4">
          {filteredProfessionals.length} professionnel{filteredProfessionals.length > 1 ? 's' : ''} 
          {professionals.length !== filteredProfessionals.length && ` sur ${professionals.length} disponible${professionals.length > 1 ? 's' : ''}`}
        </p>
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher un professionnel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-${colors.primary}-500 focus:border-transparent`}
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
      </div>

      {filteredProfessionals.length === 0 ? (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun professionnel trouvé</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Essayez de modifier votre recherche.'
              : 'Aucun professionnel n\'est encore disponible dans cette catégorie.'
            }
          </p>
          {!isOnline && (
            <div className="mt-4 flex items-center justify-center text-red-600">
              <WifiOff className="h-4 w-4 mr-1" />
              <span className="text-sm">Vérifiez votre connexion internet</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProfessionals.map((professional) => {
            // Safety checks for each professional
            const professionalName = safeValue(professional.name, 'Nom non disponible');
            const professionalSpecialty = safeValue(professional.specialty, 'Spécialité non précisée');
            const professionalDescription = safeValue(professional.description, 'Description non disponible');
            const professionalRating = safeValue(professional.rating, 0);
            const professionalReviews = safeValue(professional.reviews, 0);
            const professionalPrice = professional.price;
            const professionalCurrency = safeValue(professional.currency, 'XOF');
            const professionalLanguages = safeArray(professional.languages);
            const professionalAvailability = safeArray(professional.availability);
            const isAvailableNow = false; // Désactivé temporairement

            return (
              <div 
                key={professional.id} 
                className={`bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg hover:scale-[1.01] border-l-4 border-${colors.primary}-500`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/4 bg-gray-50 relative">
                    {professional.profileImage ? (
                      <img 
                        src={professional.profileImage} 
                        alt={professionalName} 
                        className="h-64 md:h-full w-full object-cover object-center"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`h-64 md:h-full w-full flex items-center justify-center bg-gray-200 ${professional.profileImage ? 'hidden' : ''}`}>
                      <User className="h-16 w-16 text-gray-400" />
                    </div>
                    {isAvailableNow && (
                      <div className={`absolute top-4 right-4 bg-${colors.primary}-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center`}>
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        Disponible maintenant
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 md:w-3/4 flex flex-col">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{professionalName}</h2>
                        <p className={`text-${colors.primary}-600 font-medium`}>{professionalSpecialty}</p>
                      </div>
                      
                      <div className="flex items-center mt-2 md:mt-0">
                        <Star className="h-5 w-5 text-yellow-400 fill-current" />
                        <span className="ml-1 font-medium">{professionalRating}</span>
                        <span className="ml-1 text-gray-500">({professionalReviews} avis)</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">{professionalDescription}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="flex items-center">
                        <Languages className={`h-5 w-5 text-${colors.primary}-500 mr-2`} />
                        <span className="text-sm text-gray-600">
                          {professionalLanguages.length > 0 ? professionalLanguages.join(', ') : 'Langues non précisées'}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <Clock className={`h-5 w-5 text-${colors.primary}-500 mr-2`} />
                        <span className="text-sm text-gray-600">
                          {professionalAvailability.length > 0 ? professionalAvailability[0]?.day || 'Disponibilité à définir' : 'Disponibilité à définir'}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <Calendar className={`h-5 w-5 text-${colors.primary}-500 mr-2`} />
                        <span className="text-sm text-gray-600">
                          {professionalAvailability.length} jour{professionalAvailability.length > 1 ? 's' : ''} disponible{professionalAvailability.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-auto">
                      <div className={`text-lg font-bold text-${colors.primary}-600 mb-4 sm:mb-0`}>
                        {professionalPrice === null 
                          ? 'Tarif sur demande'
                          : `${professionalPrice.toLocaleString()} ${professionalCurrency} / consultation`
                        }
                      </div>
                      
                      <div className="flex space-x-4">
                        <Link
                          to={`/professional/${professional.id}`}
                          className={`px-4 py-2 border border-${colors.primary}-500 text-${colors.primary}-500 rounded-md hover:bg-${colors.primary}-50 transition-colors`}
                          onClick={() => {
                            // Preload professional data in sessionStorage
                            try {
                              sessionStorage.setItem(`professional_${professional.id}`, JSON.stringify(professional));
                            } catch (error) {
                              console.warn('Failed to cache professional data:', error);
                            }
                          }}
                        >
                          Voir le profil
                        </Link>
                        <Link
                          to={`/book/${professional.id}`}
                          className={`px-4 py-2 ${
                            isAvailableNow 
                              ? `bg-green-500 hover:bg-green-600` 
                              : `bg-${colors.primary}-500 hover:bg-${colors.primary}-600`
                          } text-white rounded-md transition-colors`}
                          onClick={() => {
                            // Preload professional data in sessionStorage
                            try {
                              sessionStorage.setItem(`professional_${professional.id}`, JSON.stringify(professional));
                            } catch (error) {
                              console.warn('Failed to cache professional data:', error);
                            }
                          }}
                        >
                          {isAvailableNow ? 'Consulter maintenant' : 'Prendre RDV'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProfessionalsList;