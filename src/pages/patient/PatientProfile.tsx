import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Edit2, Camera, Upload, CheckCircle, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import {
  getPatientProfile, 
  updatePatientProfile, 
  validatePatientProfile,
  createDefaultPatientProfile,
  subscribeToPatientProfile,
  type PatientProfile as PatientProfileType 
} from '../../services/profileService';
import { getFirestoreConnectionStatus, forceFirestoreOnline, getFirestoreInstance } from '../../utils/firebase';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getDoc, doc as firestoreDoc } from 'firebase/firestore';
import { uploadAndSaveProfileImage } from '../../services/profileService';

const PatientProfile: React.FC = () => {
  const { currentUser } = useAuth();
  console.log('🔎 currentUser:', currentUser);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(getFirestoreConnectionStatus());
  const [isLocalEnvironment, setIsLocalEnvironment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0); // ✅ Added retry counter

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // État du profil patient
const [patientInfo, setPatientInfo] = useState<Partial<PatientProfileType>>({
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: 'F',
  address: '',
  profileImage: '',
  medicalHistory: '',
  allergies: '',
  medications: '',
  emergencyContact: {
    name: '',
    phone: '',
    relationship: ''
  }
});
  const isRunningInBolt = typeof window !== 'undefined' &&
  (window.location.hostname.includes('localhost') ||
   window.location.hostname.includes('bolt.run') ||
   window.location.hostname.includes('webcontainer'));
  
  // Check if running in local environment
  useEffect(() => {
    const isLocal = typeof window !== 'undefined' && 
                   (window.location.hostname === 'localhost' || 
                    window.location.hostname.includes('webcontainer'));
    setIsLocalEnvironment(isLocal);
  }, []);

  // Monitor connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      setConnectionStatus(getFirestoreConnectionStatus());
    };

    // Update connection status every 5 seconds
    const interval = setInterval(updateConnectionStatus, 5000);

    // Listen for online/offline events
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
      isMountedRef.current = false;
    };
  }, []);

  // ✅ FIXED: Added retry mechanism and better error handling
  useEffect(() => {
    console.log("👷‍♂️ PatientProfile component mounted");
    console.log('🔄 Loading patient profile effect running, retry count:', retryCount);
    
    const loadProfile = async () => {
      if (!currentUser?.id) {
        console.log('⚠️ No currentUser.id available, skipping profile load');
        setLoading(false); // ✅ FIXED: Set loading to false when no user
        return;
      }

      try {
        setLoading(true);
        setErrorMessage('');
        
        console.log('🔄 Loading patient profile for user:', currentUser.id);
        
        // ✅ FIXED: Direct document access by userId
        const profile = await getPatientProfile(currentUser.id);
        console.log('📦 Données reçues de Firestore:', profile);
        console.log('👀 profile loaded:', profile);
        if (!profile) {
          console.log('⚠️ No profile found, creating default profile');
          
          // Get user data
          const db = getFirestoreInstance();
          if (!db) throw new Error('Firestore not available');
          
          const userRef = firestoreDoc(db, 'users', currentUser.id);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            throw new Error('Utilisateur non trouvé');
          }
          
          const userData = userSnap.data();
          
          // Create default profile
          const newProfile = await createDefaultPatientProfile(
            currentUser.id,
            userData.name || currentUser.name || 'Patient',
            userData.email || currentUser.email || ''
          );
          
          if (isMountedRef.current) {
            console.log('🆕 Profil par défaut créé:', newProfile);
            setPatientInfo(newProfile);
            setLoading(false);
            console.log("✅ Fin de chargement exécuté");
          }
        } else {
          // Mettre à jour l'état avec les données du profil
          if (isMountedRef.current) {
            console.log('👀 Setting patientInfo with profile:', profile);
            console.log('📬 Je vais mettre à jour patientInfo avec:', {
              name: profile.name || '',
              email: profile.email || '',
              phone: profile.phone || '',
              address: profile.address || '',
              gender: profile.gender || 'F',
              dateOfBirth: profile.dateOfBirth || '',
              profileImage: profile.profileImage || '',
              medicalHistory: profile.medicalHistory || '',
              medications: profile.medications || '',
              allergies: profile.allergies || '',
              emergencyContact: {
                name: profile.emergencyContact?.name || '',
                phone: profile.emergencyContact?.phone || '',
                relationship: profile.emergencyContact?.relationship || ''
              }
            });
            setPatientInfo({
              name: profile.name || '',
              email: profile.email || '',
              phone: profile.phone || '',
              address: profile.address || '',
              gender: profile.gender || 'F',
              dateOfBirth: profile.dateOfBirth || '',
              profileImage: profile.profileImage || '',
              medicalHistory: profile.medicalHistory || '',
              medications: profile.medications || '',
              allergies: profile.allergies || '',
              emergencyContact: {
                name: profile.emergencyContact?.name || '',
                phone: profile.emergencyContact?.phone || '',
                relationship: profile.emergencyContact?.relationship || ''
              }
            });
            console.log('✅ patientInfo updated:', profile);
            setLoading(false);
          }
        }
        
        // Mettre en place l'abonnement aux changements
        // ✅ FIXED: Direct document subscription
        const unsubscribe = subscribeToPatientProfile(currentUser.id, (updatedProfile) => {
          if (updatedProfile && isMountedRef.current) {
            console.log('🔄 Mise à jour du profil via Firestore:', updatedProfile);
            setPatientInfo({
              name: updatedProfile.name || '',
              email: updatedProfile.email || '',
              phone: updatedProfile.phone || '',
              address: updatedProfile.address || '',
              gender: updatedProfile.gender || 'F',
              dateOfBirth: updatedProfile.dateOfBirth || '',
              profileImage: updatedProfile.profileImage || '',
              medicalHistory: updatedProfile.medicalHistory || '',
              medications: updatedProfile.medications || '',
              allergies: updatedProfile.allergies || '',
              emergencyContact: {
                name: updatedProfile.emergencyContact?.name || '',
                phone: updatedProfile.emergencyContact?.phone || '',
                relationship: updatedProfile.emergencyContact?.relationship || ''
              }
            });
          }
        });
        
        unsubscribeRef.current = unsubscribe;
        
        if (isMountedRef.current) {
          setLoading(false);
        }
        
      } catch (error) {
        console.error('❌ Error loading profile:', error);
        
        // Initialiser avec les données de base de l'utilisateur même en cas d'erreur
        if (isMountedRef.current) {
          setPatientInfo((prev) => ({
            ...prev,
            name: currentUser.name || prev?.name || '',
            email: currentUser.email || prev?.email || '',
            profileImage: currentUser.profileImage || prev?.profileImage || '',
            gender: prev?.gender || 'F',
            emergencyContact: {
              ...prev?.emergencyContact,
            },
          }));
        }
        
        if (isLocalEnvironment) {
          setErrorMessage('Mode développement détecté. Certaines fonctionnalités Firestore peuvent être limitées.');
        } else if (error instanceof Error && error.message.includes('Target ID already exists')) {
          setErrorMessage('Problème de cache Firestore. Cliquez sur "Réessayer" pour résoudre le problème.');
        } else if (!navigator.onLine) {
          setErrorMessage('Vous êtes hors ligne. Les modifications seront enregistrées lorsque vous serez de nouveau en ligne.');
        } else {
          setErrorMessage('Erreur lors du chargement du profil. Cliquez sur "Réessayer".');
        }
        
        // ✅ FIXED: Set loading to false on error
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    
    return () => {
      // Nettoyer l'abonnement lors du démontage du composant
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser, isLocalEnvironment, retryCount]); // ✅ FIXED: Added retryCount dependency

  useEffect(() => {
    console.log('🌀 Current loading state:', loading);
  }, [loading]);

  useEffect(() => {
    console.log('👀 patientInfo final:', patientInfo);
  }, [patientInfo]);

  // ✅ FIXED: Additional effect to ensure loading is set to false when patientInfo is populated
  useEffect(() => {
    if (patientInfo && Object.keys(patientInfo).length > 0 && loading) {
      console.log('✅ Setting loading to false based on patientInfo being populated');
      setLoading(false);
    }
  }, [patientInfo, loading]);

  const handleRetry = async () => {
    console.log('🔄 Retrying profile load...');
    setIsRetrying(true);
    setErrorMessage('');
    
    try {
      console.log('🔄 Attempting to reconnect to Firestore...');
      
      await forceFirestoreOnline();
      
      setConnectionStatus(getFirestoreConnectionStatus());
      
      // ✅ FIXED: Trigger a retry by incrementing retryCount
      setRetryCount(prev => prev + 1);
      
      console.log('✅ Retry initiated');
    } catch (error) {
      console.error('❌ Error retrying profile load:', error);
      
      if (isLocalEnvironment) {
        setErrorMessage('Reconnexion impossible en environnement local. Déployez l\'application pour tester la connectivité Firestore.');
      } else if (!navigator.onLine) {
        setErrorMessage('Vous êtes hors ligne. Les modifications seront enregistrées lorsque vous serez de nouveau en ligne.');
      } else {
        setErrorMessage('Impossible de se reconnecter. Vérifiez votre connexion internet et réessayez dans quelques instants.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsRetrying(false);
      }
    }
  };

  const handleImageClick = () => {
    if (!isUploadingImage) {
      fileInputRef.current?.click();
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('L\'image ne doit pas dépasser 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Veuillez sélectionner un fichier image valide');
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage('');
    setUploadProgress(0);

    try {
      console.log('📤 Starting complete image upload and save process...');
      
      const downloadURL = await uploadAndSaveProfileImage(
        file, 
        currentUser.id, 
        'patient',
        (progress) => {
          if (isMountedRef.current) {
            setUploadProgress(progress);
          }
          console.log(`📊 Upload progress: ${progress}%`);
        }
      );
      
      if (isMountedRef.current) {
        setPatientInfo(prev => ({ ...prev, profileImage: downloadURL }));
      }
      
      if (isMountedRef.current) {
        setSaveSuccess(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveSuccess(false);
          }
        }, 3000);
      }
      
      console.log('✅ Profile image upload and save completed successfully');
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors du téléchargement');
    } finally {
      if (isMountedRef.current) {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;

    setErrorMessage('');
    setSaveSuccess(false);

    // Validation
    const validationErrors = validatePatientProfile(patientInfo);
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors.join(', '));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      // ✅ FIXED: Direct document update by userId
      await updatePatientProfile(currentUser.id, patientInfo);
      
      setSaveSuccess(true);
      
      // Redirect to dashboard after successful save
      setRedirecting(true);
      setTimeout(() => {
        if (isMountedRef.current) {
          navigate('/patient/dashboard');
        }
      }, 2000);
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      
      if (isLocalEnvironment) {
        setErrorMessage('Mode développement détecté. Les modifications seront enregistrées lors du déploiement.');
      } else if (!navigator.onLine) {
        setErrorMessage('Vous êtes hors ligne. Les modifications seront enregistrées lorsque vous serez de nouveau en ligne.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof PatientProfileType, value: string | number | undefined) => {
    setPatientInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setPatientInfo(prev => ({
      ...prev,
      emergencyContact: {
        name: prev.emergencyContact?.name ?? '',
        phone: prev.emergencyContact?.phone ?? '',
        relationship: prev.emergencyContact?.relationship ?? '',
        [field]: value
      }
    }));
  };
if (!patientInfo) {
  return <div className="text-center p-6">Chargement du profil...</div>;
}
  if (loading) {
    console.log('⏳ Still loading...')
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-lg text-gray-600">Chargement du profil...</p>
            <div className="mt-4 flex items-center justify-center">
              {connectionStatus.isOnline ? (
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mon profil</h1>
          <div className="flex items-center space-x-3">
            {/* Connection Status Indicator */}
            <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
              connectionStatus.isOnline && connectionStatus.isInitialized
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus.isOnline && connectionStatus.isInitialized ? (
                <>
                  <Wifi className="h-4 w-4 mr-1" />
                  Connecté
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 mr-1" />
                  Hors ligne
                </>
              )}
            </div>
            
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={isSaving || isUploadingImage || isRetrying || redirecting}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                isEditing
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              } ${isSaving || isUploadingImage || isRetrying || redirecting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isEditing ? (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </>
              ) : (
                <>
                  <Edit2 className="h-5 w-5 mr-2" />
                  Modifier
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages de succès et d'erreur */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {redirecting 
              ? "Vos modifications ont été enregistrées avec succès. Redirection vers le tableau de bord..." 
              : "Vos modifications ont été enregistrées avec succès"}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {errorMessage}
            </div>
            <button 
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center"
            >
              {isRetrying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Reconnexion...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </>
              )}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Photo de profil */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Photo de profil</h2>
            <div className="flex items-center space-x-4">
              <div className="relative group cursor-pointer" onClick={handleImageClick}>
                <img
                  src={patientInfo.profileImage || 'https://via.placeholder.com/150?text=Photo'}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover group-hover:opacity-75 transition-opacity"
                />
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <div className="text-white text-xs">{uploadProgress}%</div>
                    </div>
                  </div>
                )}
                {!isUploadingImage && isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black bg-opacity-50 rounded-full p-3">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}
              </div>
              {isEditing && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                  <button
                    type="button"
                    onClick={handleImageClick}
                    disabled={isUploadingImage}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isUploadingImage ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-pulse" />
                        Téléchargement... {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Changer la photo
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-sm text-gray-500">
                    JPG, PNG. Taille maximale : 5MB
                  </p>
                  {isUploadingImage && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Informations personnelles */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Informations personnelles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={patientInfo.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.name || 'Non renseigné'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={patientInfo?.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.email || 'Non renseigné'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={patientInfo?.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.phone || 'Non renseigné'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de naissance
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={patientInfo.dateOfBirth || ''}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">
                    {patientInfo.dateOfBirth ? new Date(patientInfo.dateOfBirth).toLocaleDateString() : 'Non renseigné'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genre
                </label>
                {isEditing ? (
                  <select
                    value={patientInfo?.gender || 'F'}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="O">Autre</option>
                  </select>
                ) : (
                  <p className="text-gray-900">
                    {patientInfo.gender === 'M' ? 'Masculin' : 
                     patientInfo.gender === 'F' ? 'Féminin' : 
                     patientInfo.gender === 'O' ? 'Autre' : 'Non renseigné'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={patientInfo?.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.address || 'Non renseigné'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Informations médicales */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Informations médicales</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antécédents médicaux
                </label>
                {isEditing ? (
                  <textarea
                    value={patientInfo?.medicalHistory || ''}
                    onChange={(e) => handleChange('medicalHistory', e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.medicalHistory || 'Aucun antécédent médical particulier'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergies
                </label>
                {isEditing ? (
                  <textarea
                    value={patientInfo?.allergies || ''}
                    onChange={(e) => handleChange('allergies', e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.allergies || 'Aucune allergie connue'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Médicaments en cours
                </label>
                {isEditing ? (
                  <textarea
                    value={patientInfo?.medications || ''}
                    onChange={(e) => handleChange('medications', e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.medications || 'Aucun médicament en cours'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact d'urgence */}
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Contact d'urgence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du contact
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={patientInfo?.emergencyContact?.name || ''}
                    onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.emergencyContact?.name || 'Non renseigné'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone du contact
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={patientInfo?.emergencyContact?.phone || ''}
                    onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.emergencyContact?.phone || 'Non renseigné'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relation
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={patientInfo?.emergencyContact?.relationship || ''}
                    onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{patientInfo.emergencyContact?.relationship || 'Non renseigné'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
// Firestore doc helper for compatibility (if not imported from firebase/firestore)

import type { Firestore } from 'firebase/firestore';

function doc(db: Firestore, collectionPath: string, id: string) {
  return firestoreDoc(db, collectionPath, id);
}