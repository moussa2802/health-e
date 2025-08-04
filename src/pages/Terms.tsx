import React from 'react';
import { FileText, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Terms: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            {language === 'fr' ? 'Conditions d\'utilisation' : 'Terms of Use'}
          </h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="prose max-w-none">
            {language === 'fr' ? (
              <>
                <h2>Bienvenue sur Health-e</h2>
                <p>
                  En accédant à notre plateforme et en l'utilisant, vous acceptez d'être lié par les présentes 
                  conditions d'utilisation. Veuillez les lire attentivement avant d'utiliser notre service.
                </p>
                
                <h3>1. Acceptation des conditions</h3>
                <p>
                  En utilisant Health-e, vous acceptez ces conditions d'utilisation dans leur intégralité. 
                  Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre plateforme.
                </p>
                
                <h3>2. Description du service</h3>
                <p>
                  Health-e est une plateforme de téléconsultation qui met en relation des patients avec des 
                  professionnels de santé qualifiés pour des consultations en ligne dans les domaines de la 
                  santé mentale et sexuelle.
                </p>
                
                <h3>3. Éligibilité</h3>
                <p>
                  Pour utiliser Health-e, vous devez avoir au moins 18 ans et être capable de former un 
                  contrat juridiquement contraignant. Si vous utilisez le service au nom d'une organisation, 
                  vous déclarez avoir l'autorité pour engager cette organisation.
                </p>
                
                <h3>4. Comptes utilisateurs</h3>
                <p>
                  Vous êtes responsable de maintenir la confidentialité de vos informations de compte et de 
                  toutes les activités qui se produisent sous votre compte. Vous devez nous informer immédiatement 
                  de toute utilisation non autorisée de votre compte.
                </p>
                
                <h3>5. Responsabilités des utilisateurs</h3>
                <h4>Pour les patients :</h4>
                <ul>
                  <li>Fournir des informations précises et complètes</li>
                  <li>Respecter les rendez-vous programmés</li>
                  <li>Utiliser le service pour des besoins légitimes de santé</li>
                  <li>Ne pas enregistrer ou partager les consultations sans consentement</li>
                </ul>
                
                <h4>Pour les professionnels :</h4>
                <ul>
                  <li>Maintenir des qualifications professionnelles valides</li>
                  <li>Fournir des soins conformes aux normes professionnelles</li>
                  <li>Respecter la confidentialité des patients</li>
                  <li>Être disponible pendant les heures indiquées</li>
                </ul>
                
                <h3>6. Limitations du service</h3>
                <p>
                  Health-e n'est pas conçu pour les urgences médicales. En cas d'urgence, veuillez contacter 
                  les services d'urgence locaux. Notre plateforme ne remplace pas les soins médicaux en personne 
                  lorsque ceux-ci sont nécessaires.
                </p>
                
                <h3>7. Paiements et remboursements</h3>
                <p>
                  Les tarifs des consultations sont indiqués avant la prise de rendez-vous. Les paiements sont 
                  traités de manière sécurisée. Les conditions de remboursement varient selon les circonstances 
                  et sont détaillées dans notre politique de remboursement.
                </p>
                
                <h3>8. Propriété intellectuelle</h3>
                <p>
                  Tout le contenu et les fonctionnalités de Health-e sont protégés par les lois sur la propriété 
                  intellectuelle. Vous ne pouvez pas reproduire, distribuer, ou créer des œuvres dérivées sans 
                  notre autorisation écrite.
                </p>
                
                <h3>9. Confidentialité</h3>
                <p>
                  Votre utilisation de Health-e est également régie par notre Politique de confidentialité, 
                  qui explique comment nous collectons, utilisons et protégeons vos informations.
                </p>
                
                <h3>10. Limitation de responsabilité</h3>
                <p>
                  Health-e et ses affiliés ne seront pas responsables des dommages indirects, accessoires, 
                  spéciaux, consécutifs ou punitifs résultant de votre utilisation ou de votre incapacité 
                  à utiliser le service.
                </p>
                
                <h3>11. Indemnisation</h3>
                <p>
                  Vous acceptez d'indemniser et de dégager de toute responsabilité Health-e et ses affiliés 
                  contre toute réclamation, perte, responsabilité, dépense ou dommage résultant de votre 
                  violation de ces conditions.
                </p>
                
                <h3>12. Modifications des conditions</h3>
                <p>
                  Nous pouvons modifier ces conditions à tout moment. Les modifications entreront en vigueur 
                  dès leur publication. Votre utilisation continue du service après ces modifications constitue 
                  votre acceptation des nouvelles conditions.
                </p>
                
                <h3>13. Résiliation</h3>
                <p>
                  Nous pouvons résilier ou suspendre votre accès à Health-e immédiatement, sans préavis ni 
                  responsabilité, pour quelque raison que ce soit, y compris, sans limitation, si vous violez 
                  ces conditions.
                </p>
                
                <h3>14. Loi applicable</h3>
                <p>
                  Ces conditions sont régies par les lois du Sénégal et du Canada, sans égard aux principes 
                  de conflits de lois.
                </p>
                
                <h3>15. Contact</h3>
                <p>
                  Si vous avez des questions concernant ces conditions, veuillez nous contacter à terms@health-e.com.
                </p>
              </>
            ) : (
              <>
                <h2>Welcome to Health-e</h2>
                <p>
                  By accessing and using our platform, you agree to be bound by these Terms of Use. 
                  Please read them carefully before using our service.
                </p>
                
                <h3>1. Acceptance of Terms</h3>
                <p>
                  By using Health-e, you accept these Terms of Use in their entirety. 
                  If you do not accept these terms, please do not use our platform.
                </p>
                
                <h3>2. Service Description</h3>
                <p>
                  Health-e is a teleconsultation platform that connects patients with qualified healthcare 
                  professionals for online consultations in the fields of mental and sexual health.
                </p>
                
                <h3>3. Eligibility</h3>
                <p>
                  To use Health-e, you must be at least 18 years old and capable of forming a legally binding 
                  contract. If you are using the service on behalf of an organization, you represent that you 
                  have the authority to bind that organization.
                </p>
                
                <h3>4. User Accounts</h3>
                <p>
                  You are responsible for maintaining the confidentiality of your account information and for 
                  all activities that occur under your account. You must notify us immediately of any unauthorized 
                  use of your account.
                </p>
                
                <h3>5. User Responsibilities</h3>
                <h4>For Patients:</h4>
                <ul>
                  <li>Provide accurate and complete information</li>
                  <li>Respect scheduled appointments</li>
                  <li>Use the service for legitimate health needs</li>
                  <li>Do not record or share consultations without consent</li>
                </ul>
                
                <h4>For Professionals:</h4>
                <ul>
                  <li>Maintain valid professional qualifications</li>
                  <li>Provide care in accordance with professional standards</li>
                  <li>Respect patient confidentiality</li>
                  <li>Be available during indicated hours</li>
                </ul>
                
                <h3>6. Service Limitations</h3>
                <p>
                  Health-e is not designed for medical emergencies. In case of emergency, please contact local 
                  emergency services. Our platform does not replace in-person medical care when necessary.
                </p>
                
                <h3>7. Payments and Refunds</h3>
                <p>
                  Consultation fees are indicated before booking. Payments are processed securely. Refund 
                  conditions vary depending on circumstances and are detailed in our refund policy.
                </p>
                
                <h3>8. Intellectual Property</h3>
                <p>
                  All content and functionality of Health-e are protected by intellectual property laws. 
                  You may not reproduce, distribute, or create derivative works without our written permission.
                </p>
                
                <h3>9. Privacy</h3>
                <p>
                  Your use of Health-e is also governed by our Privacy Policy, which explains how we collect, 
                  use, and protect your information.
                </p>
                
                <h3>10. Limitation of Liability</h3>
                <p>
                  Health-e and its affiliates will not be liable for any indirect, incidental, special, 
                  consequential, or punitive damages resulting from your use of or inability to use the service.
                </p>
                
                <h3>11. Indemnification</h3>
                <p>
                  You agree to indemnify and hold harmless Health-e and its affiliates against any claim, 
                  loss, liability, expense, or damage arising from your violation of these terms.
                </p>
                
                <h3>12. Modifications to Terms</h3>
                <p>
                  We may modify these terms at any time. Modifications will be effective upon posting. 
                  Your continued use of the service after such modifications constitutes your acceptance 
                  of the new terms.
                </p>
                
                <h3>13. Termination</h3>
                <p>
                  We may terminate or suspend your access to Health-e immediately, without prior notice or 
                  liability, for any reason, including, without limitation, if you breach these terms.
                </p>
                
                <h3>14. Governing Law</h3>
                <p>
                  These terms are governed by the laws of Senegal and Canada, without regard to conflict of law principles.
                </p>
                
                <h3>15. Contact</h3>
                <p>
                  If you have any questions about these terms, please contact us at terms@health-e.com.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;