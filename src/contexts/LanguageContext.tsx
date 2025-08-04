import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define available languages
export type Language = 'fr' | 'en';

// Create a type for the context value
type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Record<string, string>;
  t: (key: string) => string;
};

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Initial translations
const translationSets: Record<Language, Record<string, string>> = {
  fr: {
    // Common
    'app.name': 'Health-e',
    'app.tagline': 'Consultations en santé mentale et sexuelle',
    
    // Navigation
    'nav.home': 'Accueil',
    'nav.login': 'Se connecter',
    'nav.register': 'S\'inscrire',
    'nav.dashboard': 'Mon tableau de bord',
    'nav.profile': 'Profil',
    'nav.logout': 'Déconnexion',
    
    // Home page
    'home.title': 'Consultez des professionnels de santé en ligne',
    'home.subtitle': 'Rapide, confidentiel et adapté à vos besoins',
    'home.mentalHealth': 'Santé mentale',
    'home.sexualHealth': 'Santé sexuelle',
    'home.getStarted': 'Commencer',
    
    // Mental health descriptions
    'mental.description': 'Consultez des psychologues et psychiatres pour votre bien-être mental',
    'mental.professionals': 'Psychologues, Psychiatres',
    
    // Sexual health descriptions
    'sexual.description': 'Consultez des sexologues, gynécologues et urologues pour votre santé sexuelle',
    'sexual.professionals': 'Sexologues, Gynécologues, Urologues',
    
    // Professional listing
    'professionals.title': 'Nos professionnels',
    'professionals.filter': 'Filtrer',
    'professionals.search': 'Rechercher',
    'professionals.language': 'Langue',
    'professionals.specialty': 'Spécialité',
    'professionals.availability': 'Disponibilité',
    
    // Booking
    'booking.title': 'Prendre rendez-vous',
    'booking.selectDate': 'Sélectionnez une date',
    'booking.selectTime': 'Sélectionnez une heure',
    'booking.selectType': 'Type de consultation',
    'booking.video': 'Vidéo',
    'booking.audio': 'Audio',
    'booking.chat': 'Chat',
    'booking.confirm': 'Confirmer le rendez-vous',
    
    // Dashboard
    'dashboard.upcoming': 'Rendez-vous à venir',
    'dashboard.past': 'Rendez-vous passés',
    'dashboard.messages': 'Messages',
    
    // Consultation
    'consultation.waiting': 'En attente du professionnel...',
    'consultation.ended': 'Consultation terminée',
    'consultation.reconnecting': 'Reconnexion...',
    
    // Footer
    'footer.privacy': 'Confidentialité',
    'footer.terms': 'Conditions d\'utilisation',
    'footer.contact': 'Contact',
    'footer.rights': 'Tous droits réservés',
  },
  
  en: {
    // Common
    'app.name': 'Health-e',
    'app.tagline': 'Mental and sexual health consultations',
    
    // Navigation
    'nav.home': 'Home',
    'nav.login': 'Login',
    'nav.register': 'Sign up',
    'nav.dashboard': 'My Dashboard',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    
    // Home page
    'home.title': 'Consult healthcare professionals online',
    'home.subtitle': 'Fast, confidential and tailored to your needs',
    'home.mentalHealth': 'Mental Health',
    'home.sexualHealth': 'Sexual Health',
    'home.getStarted': 'Get Started',
    
    // Mental health descriptions
    'mental.description': 'Consult psychologists and psychiatrists for your mental well-being',
    'mental.professionals': 'Psychologists, Psychiatrists',
    
    // Sexual health descriptions
    'sexual.description': 'Consult sexologists, gynecologists and urologists for your sexual health',
    'sexual.professionals': 'Sexologists, Gynecologists, Urologists',
    
    // Professional listing
    'professionals.title': 'Our Professionals',
    'professionals.filter': 'Filter',
    'professionals.search': 'Search',
    'professionals.language': 'Language',
    'professionals.specialty': 'Specialty',
    'professionals.availability': 'Availability',
    
    // Booking
    'booking.title': 'Book an appointment',
    'booking.selectDate': 'Select a date',
    'booking.selectTime': 'Select a time',
    'booking.selectType': 'Consultation type',
    'booking.video': 'Video',
    'booking.audio': 'Audio',
    'booking.chat': 'Chat',
    'booking.confirm': 'Confirm appointment',
    
    // Dashboard
    'dashboard.upcoming': 'Upcoming appointments',
    'dashboard.past': 'Past appointments',
    'dashboard.messages': 'Messages',
    
    // Consultation
    'consultation.waiting': 'Waiting for professional...',
    'consultation.ended': 'Consultation ended',
    'consultation.reconnecting': 'Reconnecting...',
    
    // Footer
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms of Use',
    'footer.contact': 'Contact',
    'footer.rights': 'All rights reserved',
  }
};

// Props for the provider component
type LanguageProviderProps = {
  children: ReactNode;
};

// Create the provider component
export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguage] = useState<Language>('fr');
  const translations = translationSets[language];
  
  // Translation function
  const t = (key: string): string => {
    return translations[key] || key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};