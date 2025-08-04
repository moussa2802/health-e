import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Heart, Mail, Shield, Facebook, Instagram, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  const { t, language } = useLanguage();
  
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Branding Column */}
          <div>
            <h3 className="text-xl font-bold mb-4">Health-e</h3>
            <p className="text-gray-400">
              {language === 'fr' 
                ? 'Une collaboration Sénégal–Canada pour votre santé mentale et sexuelle'
                : 'A Senegal–Canada collaboration for your mental and sexual health'}
            </p>
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{language === 'fr' ? 'Services' : 'Services'}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/professionals/mental" className="text-gray-400 hover:text-white transition-colors">
                  {language === 'fr' ? 'Santé mentale' : 'Mental Health'}
                </Link>
              </li>
              <li>
                <Link to="/professionals/sexual" className="text-gray-400 hover:text-white transition-colors">
                  {language === 'fr' ? 'Santé sexuelle' : 'Sexual Health'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{language === 'fr' ? 'Support' : 'Support'}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/faq" className="text-gray-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">
                  {language === 'fr' ? 'Contact' : 'Contact'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{language === 'fr' ? 'Légal' : 'Legal'}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/confidentialite" className="text-gray-400 hover:text-white transition-colors">
                  {language === 'fr' ? 'Confidentialité' : 'Privacy'}
                </Link>
              </li>
              <li>
                <Link to="/conditions" className="text-gray-400 hover:text-white transition-colors">
                  {language === 'fr' ? 'Conditions d\'utilisation' : 'Terms of Use'}
                </Link>
              </li>
              <li>
                <Link to="/ethique" className="text-gray-400 hover:text-white transition-colors">
                  {language === 'fr' ? 'Règles d\'éthique' : 'Code of Ethics'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section with Flags and Social Media */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img 
                src="https://flagcdn.com/w40/sn.png" 
                alt="Drapeau du Sénégal" 
                className="w-6 h-4 rounded shadow-sm"
              />
              <img 
                src="https://flagcdn.com/w40/ca.png" 
                alt="Drapeau du Canada" 
                className="w-6 h-4 rounded shadow-sm ml-2"
              />
              <span className="ml-4 text-gray-400">
                © {new Date().getFullYear()} Health-e. {language === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}
              </span>
            </div>

            {/* Social Media Links */}
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;