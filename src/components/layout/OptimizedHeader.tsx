import React, { useState, useEffect, memo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Globe, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { useDebounce } from '../../hooks/useDebounce';
import NotificationCenter from '../notifications/NotificationCenter';
import LanguageSelector from './LanguageSelector';
import LoadingSpinner from '../ui/LoadingSpinner';
import { ensureFirestoreReady, resetFirestoreConnection } from '../../utils/firebase';

const OptimizedHeader: React.FC = memo(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Debounce menu state changes to prevent excessive re-renders
  const debouncedMenuOpen = useDebounce(isMenuOpen, 100);
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);
  const toggleLanguageMenu = () => setIsLanguageMenuOpen(!isLanguageMenuOpen);
  
  // Close language menu when clicking outside
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
      
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileMenuOpen(false);
  };

  // Memoized navigation items to prevent re-creation
  const navigationItems = React.useMemo(() => {
    if (!isAuthenticated || !currentUser) return null;

    const dashboardPath = currentUser.type === 'patient' ? "/patient/dashboard" : 
                         currentUser.type === 'admin' ? "/admin/dashboard" : "/professional/dashboard";
    
    const messagesPath = currentUser.type === 'patient' ? "/patient/messages" : 
                        currentUser.type === 'admin' ? "/admin/messages" : "/professional/messages";

    const profilePath = currentUser.type === 'patient' ? "/patient/profile" : 
                       currentUser.type === 'admin' ? "/admin/dashboard" : "/professional/settings";

    return { dashboardPath, messagesPath, profilePath };
  }, [isAuthenticated, currentUser]);

  return (
    <header className="bg-gradient-to-r from-blue-500 to-teal-400 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold">Health-e</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {isAuthenticated && navigationItems && (
              <>
                <Link 
                  to={navigationItems.dashboardPath} 
                  className="hover:text-blue-100 transition"
                >
                  {t('nav.dashboard')}
                </Link>

                {/* Notification Center */}
                <NotificationCenter />
                
                <div className="relative" ref={profileMenuRef}>
                  <button 
                    onClick={toggleProfileMenu}
                    className="flex items-center hover:text-blue-100 transition focus:outline-none"
                  >
                    {currentUser?.profileImage ? (
                      <img 
                        src={currentUser.profileImage} 
                        alt={currentUser.name} 
                        className="w-8 h-8 rounded-full mr-2 object-cover" 
                        loading="lazy"
                      />
                    ) : (
                      <User className="w-5 h-5 mr-1" />
                    )}
                    <span>{currentUser?.name}</span>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {currentUser?.type === 'patient' ? 'Patient' : 
                       currentUser?.type === 'professional' ? 'Professionnel' : 
                       currentUser?.type === 'admin' ? 'Admin' : ''}
                    </span>
                  </button>
                  
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-medium text-gray-800">{currentUser?.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{currentUser?.type}</p>
                      </div>
                      <Link 
                        to={navigationItems.profilePath} 
                        className="block px-4 py-2 text-gray-800 hover:bg-gray-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        {t('nav.profile')}
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {!isAuthenticated && (
              <div className="flex items-center space-x-4">
                <Link to="/" className="hover:text-blue-100 transition">
                  {t('nav.home')}
                </Link>
              </div>
            )}

            {/* Flags */}
            <div className="flex items-center space-x-2 ml-4">
              <img 
                src="https://flagcdn.com/w40/sn.png" 
                alt="Drapeau du Sénégal" 
                className="w-6 h-4 rounded shadow-sm"
                loading="lazy"
              />
              <img 
                src="https://flagcdn.com/w40/ca.png" 
                alt="Drapeau du Canada" 
                className="w-6 h-4 rounded shadow-sm"
                loading="lazy"
              />
            </div>
            
            <div className="relative" ref={languageMenuRef}>
              <button
                onClick={toggleLanguageMenu}
                className="flex items-center hover:text-blue-100 transition focus:outline-none"
              >
                <Globe className="w-5 h-5" />
              </button>
              
              {isLanguageMenuOpen && (
                <LanguageSelector onClose={() => setIsLanguageMenuOpen(false)} />
              )}
            </div>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            {isAuthenticated && navigationItems && (
              <NotificationCenter />
            )}
            
            <button
              onClick={toggleLanguageMenu}
              className="text-white p-2 focus:outline-none mr-2"
            >
              <Globe className="w-5 h-5" />
            </button>
            
            <button 
              onClick={toggleMenu}
              className="text-white p-2 focus:outline-none"
            >
              {debouncedMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {debouncedMenuOpen && (
          <nav className="md:hidden pt-4 pb-2">
            {isAuthenticated && navigationItems ? (
              <>
                <Link 
                  to={navigationItems.dashboardPath} 
                  className="block py-2 hover:text-blue-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.dashboard')}
                </Link>
                <Link 
                  to={navigationItems.profilePath} 
                  className="block py-2 hover:text-blue-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.profile')}
                </Link>
                <Link 
                  to={navigationItems.messagesPath} 
                  className="block py-2 hover:text-blue-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Messages
                </Link>
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left py-2 hover:text-blue-100"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/" 
                  className="block py-2 hover:text-blue-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.home')}
                </Link>
              </>
            )}

            {/* Mobile Flags */}
            <div className="flex items-center space-x-2 py-2">
              <img 
                src="https://flagcdn.com/w40/sn.png" 
                alt="Drapeau du Sénégal" 
                className="w-6 h-4 rounded shadow-sm"
                loading="lazy"
              />
              <img 
                src="https://flagcdn.com/w40/ca.png" 
                alt="Drapeau du Canada" 
                className="w-6 h-4 rounded shadow-sm"
                loading="lazy"
              />
            </div>
          </nav>
        )}
        
        {/* Language Selector for Mobile */}
        {isLanguageMenuOpen && (
          <div className="md:hidden">
            <LanguageSelector onClose={() => setIsLanguageMenuOpen(false)} />
          </div>
        )}
      </div>
    </header>
  );
});

OptimizedHeader.displayName = 'OptimizedHeader';

export default OptimizedHeader;