import React from 'react';
import { Shield, Lock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Privacy: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Lock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            {language === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}
          </h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="prose max-w-none">
            {language === 'fr' ? (
              <>
                <h2>Introduction</h2>
                <p>
                  Chez Health-e, nous prenons très au sérieux la protection de vos données personnelles. 
                  Cette politique de confidentialité explique comment nous collectons, utilisons, partageons 
                  et protégeons vos informations lorsque vous utilisez notre plateforme de téléconsultation.
                </p>
                
                <h3>Informations que nous collectons</h3>
                <p>Nous collectons plusieurs types d'informations, notamment :</p>
                <ul>
                  <li><strong>Informations personnelles</strong> : nom, adresse email, numéro de téléphone, date de naissance, genre</li>
                  <li><strong>Informations médicales</strong> : antécédents médicaux, symptômes, diagnostics, traitements</li>
                  <li><strong>Informations de connexion</strong> : adresse IP, type d'appareil, navigateur, pages visitées</li>
                  <li><strong>Informations de paiement</strong> : coordonnées bancaires (traitées de manière sécurisée par nos prestataires de paiement)</li>
                </ul>
                
                <h3>Comment nous utilisons vos informations</h3>
                <p>Nous utilisons vos informations pour :</p>
                <ul>
                  <li>Fournir, maintenir et améliorer nos services</li>
                  <li>Faciliter les consultations entre patients et professionnels de santé</li>
                  <li>Traiter les paiements et gérer votre compte</li>
                  <li>Communiquer avec vous concernant votre compte ou nos services</li>
                  <li>Respecter nos obligations légales et réglementaires</li>
                  <li>Prévenir la fraude et améliorer la sécurité de notre plateforme</li>
                </ul>
                
                <h3>Partage de vos informations</h3>
                <p>
                  Nous ne vendons jamais vos informations personnelles. Nous partageons vos informations uniquement dans les cas suivants :
                </p>
                <ul>
                  <li>Avec les professionnels de santé que vous consultez</li>
                  <li>Avec nos prestataires de services qui nous aident à exploiter notre plateforme</li>
                  <li>Si nécessaire pour respecter la loi ou protéger nos droits</li>
                  <li>En cas de fusion, vente ou transfert d'actifs (vos données resteraient soumises à notre politique de confidentialité)</li>
                </ul>
                
                <h3>Sécurité des données</h3>
                <p>
                  Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données, notamment :
                </p>
                <ul>
                  <li>Chiffrement des données en transit et au repos</li>
                  <li>Contrôles d'accès stricts pour nos employés</li>
                  <li>Surveillance continue de notre infrastructure</li>
                  <li>Audits de sécurité réguliers</li>
                </ul>
                
                <h3>Vos droits</h3>
                <p>
                  Selon votre lieu de résidence, vous pouvez avoir certains droits concernant vos données personnelles, notamment :
                </p>
                <ul>
                  <li>Accéder à vos données personnelles</li>
                  <li>Corriger des données inexactes</li>
                  <li>Supprimer vos données</li>
                  <li>Limiter ou vous opposer au traitement de vos données</li>
                  <li>Recevoir vos données dans un format structuré (portabilité)</li>
                  <li>Retirer votre consentement à tout moment</li>
                </ul>
                
                <h3>Conservation des données</h3>
                <p>
                  Nous conservons vos données aussi longtemps que nécessaire pour fournir nos services 
                  et respecter nos obligations légales. La durée de conservation varie selon le type de 
                  données et les exigences légales applicables.
                </p>
                
                <h3>Modifications de cette politique</h3>
                <p>
                  Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. 
                  Nous vous informerons de tout changement important par email ou par notification sur notre plateforme.
                </p>
                
                <h3>Nous contacter</h3>
                <p>
                  Si vous avez des questions concernant cette politique de confidentialité ou nos pratiques 
                  en matière de données, veuillez nous contacter à privacy@health-e.com.
                </p>
              </>
            ) : (
              <>
                <h2>Introduction</h2>
                <p>
                  At Health-e, we take the protection of your personal data very seriously. 
                  This privacy policy explains how we collect, use, share, and protect your 
                  information when you use our teleconsultation platform.
                </p>
                
                <h3>Information We Collect</h3>
                <p>We collect several types of information, including:</p>
                <ul>
                  <li><strong>Personal information</strong>: name, email address, phone number, date of birth, gender</li>
                  <li><strong>Medical information</strong>: medical history, symptoms, diagnoses, treatments</li>
                  <li><strong>Connection information</strong>: IP address, device type, browser, pages visited</li>
                  <li><strong>Payment information</strong>: banking details (securely processed by our payment providers)</li>
                </ul>
                
                <h3>How We Use Your Information</h3>
                <p>We use your information to:</p>
                <ul>
                  <li>Provide, maintain, and improve our services</li>
                  <li>Facilitate consultations between patients and healthcare professionals</li>
                  <li>Process payments and manage your account</li>
                  <li>Communicate with you regarding your account or our services</li>
                  <li>Comply with our legal and regulatory obligations</li>
                  <li>Prevent fraud and enhance the security of our platform</li>
                </ul>
                
                <h3>Sharing Your Information</h3>
                <p>
                  We never sell your personal information. We share your information only in the following cases:
                </p>
                <ul>
                  <li>With healthcare professionals you consult with</li>
                  <li>With service providers who help us operate our platform</li>
                  <li>If necessary to comply with the law or protect our rights</li>
                  <li>In case of merger, sale, or transfer of assets (your data would remain subject to our privacy policy)</li>
                </ul>
                
                <h3>Data Security</h3>
                <p>
                  We implement technical and organizational security measures to protect your data, including:
                </p>
                <ul>
                  <li>Encryption of data in transit and at rest</li>
                  <li>Strict access controls for our employees</li>
                  <li>Continuous monitoring of our infrastructure</li>
                  <li>Regular security audits</li>
                </ul>
                
                <h3>Your Rights</h3>
                <p>
                  Depending on your place of residence, you may have certain rights regarding your personal data, including:
                </p>
                <ul>
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Delete your data</li>
                  <li>Limit or object to the processing of your data</li>
                  <li>Receive your data in a structured format (portability)</li>
                  <li>Withdraw your consent at any time</li>
                </ul>
                
                <h3>Data Retention</h3>
                <p>
                  We retain your data as long as necessary to provide our services and comply with our legal obligations. 
                  The retention period varies depending on the type of data and applicable legal requirements.
                </p>
                
                <h3>Changes to This Policy</h3>
                <p>
                  We may update this privacy policy from time to time. We will notify you of any significant 
                  changes by email or through a notification on our platform.
                </p>
                
                <h3>Contact Us</h3>
                <p>
                  If you have any questions about this privacy policy or our data practices, 
                  please contact us at privacy@health-e.com.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;