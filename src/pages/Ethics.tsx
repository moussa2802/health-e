import React from 'react';
import { Shield, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Ethics: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            {language === 'fr' ? 'Règles d\'éthique' : 'Code of Ethics'}
          </h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="prose max-w-none">
            {language === 'fr' ? (
              <>
                <h2>Notre engagement éthique</h2>
                <p>
                  Health-e s'engage à fournir des services de santé mentale et sexuelle de haute qualité, 
                  dans le respect des principes éthiques fondamentaux. Notre plateforme est conçue pour 
                  faciliter l'accès aux soins tout en maintenant les plus hauts standards professionnels.
                </p>
                
                <h3>Principes fondamentaux</h3>
                <ul>
                  <li><strong>Confidentialité</strong> - Nous protégeons rigoureusement les informations personnelles et médicales de nos utilisateurs.</li>
                  <li><strong>Respect</strong> - Nous traitons tous les utilisateurs avec dignité, sans discrimination d'aucune sorte.</li>
                  <li><strong>Compétence</strong> - Nous vérifions les qualifications de tous les professionnels sur notre plateforme.</li>
                  <li><strong>Intégrité</strong> - Nous maintenons des standards élevés d'honnêteté et de transparence.</li>
                  <li><strong>Responsabilité</strong> - Nous assumons la responsabilité de nos actions et décisions.</li>
                </ul>
                
                <h3>Engagements des professionnels</h3>
                <p>
                  Tous les professionnels de santé sur Health-e s'engagent à:
                </p>
                <ul>
                  <li>Respecter la confidentialité des patients</li>
                  <li>Fournir des soins basés sur les meilleures pratiques et preuves scientifiques</li>
                  <li>Maintenir à jour leurs connaissances et compétences professionnelles</li>
                  <li>Référer les patients à d'autres spécialistes lorsque nécessaire</li>
                  <li>Éviter tout conflit d'intérêt qui pourrait compromettre les soins</li>
                </ul>
                
                <h3>Engagements des patients</h3>
                <p>
                  Les patients utilisant Health-e s'engagent à:
                </p>
                <ul>
                  <li>Fournir des informations précises et complètes sur leur état de santé</li>
                  <li>Respecter les rendez-vous programmés ou les annuler dans un délai raisonnable</li>
                  <li>Suivre les recommandations et traitements prescrits</li>
                  <li>Traiter les professionnels avec respect</li>
                  <li>Ne pas utiliser la plateforme pour des activités frauduleuses ou inappropriées</li>
                </ul>
                
                <h3>Surveillance et amélioration continue</h3>
                <p>
                  Health-e surveille en permanence la qualité des services fournis et sollicite 
                  activement les retours des utilisateurs pour améliorer continuellement notre plateforme.
                </p>
                
                <h3>Signalement des préoccupations éthiques</h3>
                <p>
                  Si vous avez des préoccupations concernant des questions éthiques liées à notre 
                  plateforme, veuillez nous contacter à ethics@health-e.com. Toutes les préoccupations 
                  seront traitées avec sérieux et confidentialité.
                </p>
              </>
            ) : (
              <>
                <h2>Our Ethical Commitment</h2>
                <p>
                  Health-e is committed to providing high-quality mental and sexual health services 
                  while respecting fundamental ethical principles. Our platform is designed to 
                  facilitate access to care while maintaining the highest professional standards.
                </p>
                
                <h3>Core Principles</h3>
                <ul>
                  <li><strong>Confidentiality</strong> - We rigorously protect the personal and medical information of our users.</li>
                  <li><strong>Respect</strong> - We treat all users with dignity, without discrimination of any kind.</li>
                  <li><strong>Competence</strong> - We verify the qualifications of all professionals on our platform.</li>
                  <li><strong>Integrity</strong> - We maintain high standards of honesty and transparency.</li>
                  <li><strong>Responsibility</strong> - We take responsibility for our actions and decisions.</li>
                </ul>
                
                <h3>Professional Commitments</h3>
                <p>
                  All healthcare professionals on Health-e commit to:
                </p>
                <ul>
                  <li>Respect patient confidentiality</li>
                  <li>Provide care based on best practices and scientific evidence</li>
                  <li>Keep their professional knowledge and skills up to date</li>
                  <li>Refer patients to other specialists when necessary</li>
                  <li>Avoid any conflict of interest that could compromise care</li>
                </ul>
                
                <h3>Patient Commitments</h3>
                <p>
                  Patients using Health-e commit to:
                </p>
                <ul>
                  <li>Provide accurate and complete information about their health status</li>
                  <li>Respect scheduled appointments or cancel them within a reasonable timeframe</li>
                  <li>Follow prescribed recommendations and treatments</li>
                  <li>Treat professionals with respect</li>
                  <li>Not use the platform for fraudulent or inappropriate activities</li>
                </ul>
                
                <h3>Monitoring and Continuous Improvement</h3>
                <p>
                  Health-e continuously monitors the quality of services provided and actively 
                  solicits user feedback to continuously improve our platform.
                </p>
                
                <h3>Reporting Ethical Concerns</h3>
                <p>
                  If you have concerns about ethical issues related to our platform, please 
                  contact us at ethics@health-e.com. All concerns will be treated with 
                  seriousness and confidentiality.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ethics;