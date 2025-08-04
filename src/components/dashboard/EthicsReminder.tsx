import React from 'react';
import { Shield, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

interface EthicsReminderProps {
  userType: 'patient' | 'professional' | 'admin';
  onDismiss?: () => void;
  dismissable?: boolean;
}

const EthicsReminder: React.FC<EthicsReminderProps> = ({ 
  userType, 
  onDismiss, 
  dismissable = true 
}) => {
  const { language } = useLanguage();

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md relative">
      <div className="flex">
        <div className="flex-shrink-0">
          <Shield className="h-5 w-5 text-blue-500" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-blue-700">
            <span className="font-medium">
              {language === 'fr' ? 'Rappel : ' : 'Reminder: '}
            </span>
            {language === 'fr' 
              ? 'En utilisant cette plateforme, vous vous engagez à respecter nos ' 
              : 'By using this platform, you agree to respect our '}
            <Link to="/ethique" className="font-medium underline">
              {language === 'fr' ? 'règles d\'éthique' : 'code of ethics'}
            </Link>
            {language === 'fr' ? ', notre ' : ', our '}
            <Link to="/confidentialite" className="font-medium underline">
              {language === 'fr' ? 'politique de confidentialité' : 'privacy policy'}
            </Link>
            {language === 'fr' ? ' et nos ' : ' and our '}
            <Link to="/conditions" className="font-medium underline">
              {language === 'fr' ? 'conditions d\'utilisation' : 'terms of use'}
            </Link>.
          </p>
          
          {userType === 'professional' && (
            <p className="text-sm text-blue-700 mt-1">
              {language === 'fr'
                ? 'En tant que professionnel, vous êtes tenu de maintenir la confidentialité des informations des patients.'
                : 'As a professional, you are required to maintain the confidentiality of patient information.'}
            </p>
          )}
          
          {userType === 'patient' && (
            <p className="text-sm text-blue-700 mt-1">
              {language === 'fr'
                ? 'Vos informations médicales sont protégées et traitées avec la plus grande confidentialité.'
                : 'Your medical information is protected and treated with the utmost confidentiality.'}
            </p>
          )}
        </div>
      </div>
      
      {dismissable && onDismiss && (
        <button 
          onClick={onDismiss}
          className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"
          aria-label={language === 'fr' ? 'Fermer' : 'Close'}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default EthicsReminder;