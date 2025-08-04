import React from 'react';
import { useLanguage, Language } from '../../contexts/LanguageContext';

interface LanguageSelectorProps {
  onClose: () => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onClose }) => {
  const { language, setLanguage } = useLanguage();
  
  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' },
  ];
  
  const handleLanguageChange = (code: Language) => {
    setLanguage(code);
    onClose();
  };
  
  return (
    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code as Language)}
          className={`block w-full text-left px-4 py-2 ${
            language === lang.code ? 'bg-blue-100 text-blue-700' : 'text-gray-800 hover:bg-gray-100'
          }`}
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;