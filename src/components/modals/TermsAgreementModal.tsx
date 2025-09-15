import React, { useState } from "react";
import { X, Check, AlertTriangle } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Link } from "react-router-dom";

interface TermsAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const TermsAgreementModal: React.FC<TermsAgreementModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const { language } = useLanguage();
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (!agreed) {
      setShowError(true);
      return;
    }

    onAccept();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {language === "fr"
              ? "Conditions d'utilisation et confidentialité"
              : "Terms of Use and Privacy"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-blue-700">
              {language === "fr"
                ? "Avant de continuer, veuillez lire et accepter nos conditions d'utilisation, notre politique de confidentialité et nos règles d'éthique."
                : "Before continuing, please read and accept our terms of use, privacy policy, and code of ethics."}
            </p>
          </div>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">
                {language === "fr"
                  ? "Résumé des conditions d'utilisation"
                  : "Terms of Use Summary"}
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                <li>
                  {language === "fr"
                    ? "Vous devez avoir au moins 18 ans pour utiliser ce service"
                    : "You must be at least 18 years old to use this service"}
                </li>
                <li>
                  {language === "fr"
                    ? "Vous êtes responsable de maintenir la confidentialité de votre compte"
                    : "You are responsible for maintaining the confidentiality of your account"}
                </li>
                <li>
                  {language === "fr"
                    ? "Health-e n'est pas conçu pour les urgences médicales"
                    : "Health-e is not designed for medical emergencies"}
                </li>
                <li>
                  {language === "fr"
                    ? "Nous pouvons modifier ces conditions à tout moment"
                    : "We may modify these terms at any time"}
                </li>
              </ul>
              <Link
                to="/conditions"
                target="_blank"
                className="text-blue-500 hover:text-blue-700 text-sm mt-2 inline-block"
              >
                {language === "fr"
                  ? "Lire les conditions complètes"
                  : "Read full terms"}
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">
                {language === "fr"
                  ? "Résumé de la politique de confidentialité"
                  : "Privacy Policy Summary"}
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                <li>
                  {language === "fr"
                    ? "Nous collectons vos informations personnelles et médicales"
                    : "We collect your personal and medical information"}
                </li>
                <li>
                  {language === "fr"
                    ? "Vos données sont chiffrées et sécurisées"
                    : "Your data is encrypted and secured"}
                </li>
                <li>
                  {language === "fr"
                    ? "Nous ne vendons jamais vos informations personnelles"
                    : "We never sell your personal information"}
                </li>
                <li>
                  {language === "fr"
                    ? "Vous avez des droits concernant vos données"
                    : "You have rights regarding your data"}
                </li>
              </ul>
              <Link
                to="/confidentialite"
                target="_blank"
                className="text-blue-500 hover:text-blue-700 text-sm mt-2 inline-block"
              >
                {language === "fr"
                  ? "Lire la politique complète"
                  : "Read full policy"}
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">
                {language === "fr"
                  ? "Résumé des règles d'éthique"
                  : "Code of Ethics Summary"}
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                <li>
                  {language === "fr"
                    ? "Nous respectons la confidentialité des patients"
                    : "We respect patient confidentiality"}
                </li>
                <li>
                  {language === "fr"
                    ? "Tous les professionnels sont qualifiés et vérifiés"
                    : "All professionals are qualified and verified"}
                </li>
                <li>
                  {language === "fr"
                    ? "Nous maintenons des standards élevés d'intégrité"
                    : "We maintain high standards of integrity"}
                </li>
                <li>
                  {language === "fr"
                    ? "Nous nous engageons à améliorer continuellement nos services"
                    : "We are committed to continuously improving our services"}
                </li>
              </ul>
              <Link
                to="/ethique"
                target="_blank"
                className="text-blue-500 hover:text-blue-700 text-sm mt-2 inline-block"
              >
                {language === "fr"
                  ? "Lire les règles complètes"
                  : "Read full code"}
              </Link>
            </div>

            <div className="flex items-start mt-4">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (e.target.checked) setShowError(false);
                }}
                className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200 ${
                  showError ? "border-red-500 ring-2 ring-red-200" : ""
                }`}
              />
              <label
                htmlFor="agree-terms"
                className={`ml-2 block text-sm transition-colors duration-200 ${
                  showError ? "text-red-600" : "text-gray-700"
                }`}
              >
                {language === "fr"
                  ? "J'ai lu et j'accepte les conditions d'utilisation, la politique de confidentialité et les règles d'éthique de Health-e"
                  : "I have read and agree to Health-e's Terms of Use, Privacy Policy, and Code of Ethics"}
              </label>
            </div>

            {showError && (
              <div className="flex items-center text-red-500 text-sm mt-2">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {language === "fr"
                  ? "Veuillez d'abord lire et cocher la case pour accepter les conditions"
                  : "Please read and check the box to accept the terms first"}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {language === "fr" ? "Annuler" : "Cancel"}
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
          >
            <Check className="h-4 w-4 mr-2" />
            {language === "fr" ? "J'accepte" : "I Accept"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAgreementModal;
