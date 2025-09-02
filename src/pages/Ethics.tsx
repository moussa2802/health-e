import React from "react";
import { Shield, Check } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const Ethics: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            {language === "fr" ? "Règles d'éthique" : "Code of Ethics"}
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="prose max-w-none">
            {language === "fr" ? (
              <>
                <h2>Notre engagement éthique</h2>
                <p>
                  Health-e s'engage à faciliter l'accès à des services de santé
                  mentale et de santé intime de haute qualité, en mettant en
                  relation les patients et des professionnels qualifiés. Nous
                  assurons cette mission dans le respect des principes éthiques
                  fondamentaux, tout en jouant un rôle d'intermédiaire neutre et
                  sécurisé. Notre plateforme est conçue pour offrir un
                  environnement fiable, confidentiel et respectueux, propice à
                  l'accompagnement des usagers.
                </p>

                <h3>Principes fondamentaux</h3>
                <ul>
                  <li>
                    <strong>Confidentialité</strong> : Nous protégeons
                    rigoureusement les données personnelles des utilisateurs
                    (nom, contact, rendez-vous), sans stocker de dossiers
                    médicaux. Le suivi médical et la tenue du dossier sont
                    assurés directement par le professionnel de santé.
                  </li>
                  <li>
                    <strong>Respect</strong> : Nous traitons tous les
                    utilisateurs avec dignité, sans discrimination d'aucune
                    sorte.
                  </li>
                  <li>
                    <strong>Compétence</strong> : Nous vérifions les
                    qualifications et l'expérience de tous les professionnels
                    présents sur notre plateforme.
                  </li>
                  <li>
                    <strong>Intégrité</strong> : Nous maintenons des standards
                    élevés d'honnêteté, de transparence et d'indépendance.
                  </li>
                  <li>
                    <strong>Responsabilité</strong> : Nous assumons la
                    responsabilité de la qualité technique et éthique de la
                    plateforme, tout en distinguant clairement notre rôle de
                    celui des professionnels de santé.
                  </li>
                </ul>

                <h3>Engagements des professionnels</h3>
                <p>
                  Tous les professionnels de santé présents sur Health-e
                  s'engagent à :
                </p>
                <ul>
                  <li>
                    Respecter strictement la confidentialité des patients ;
                  </li>
                  <li>
                    Fournir des soins fondés sur les meilleures pratiques et les
                    preuves scientifiques reconnues ;
                  </li>
                  <li>
                    Maintenir à jour leurs connaissances et compétences
                    professionnelles ;
                  </li>
                  <li>
                    Référer les patients à d'autres spécialistes ou structures
                    si nécessaire ;
                  </li>
                  <li>
                    Éviter tout conflit d'intérêt qui pourrait compromettre la
                    qualité des soins ;
                  </li>
                  <li>
                    Assurer eux-mêmes la tenue et la conservation des dossiers
                    médicaux, conformément aux exigences légales de leur pays
                    d'exercice.
                  </li>
                </ul>

                <h3>Engagements des patients</h3>
                <p>
                  Les patients utilisant la plateforme Health-e s'engagent à :
                </p>
                <ul>
                  <li>
                    Fournir des informations exactes et complètes sur leur état
                    de santé ;
                  </li>
                  <li>
                    Respecter les rendez-vous fixés ou les annuler dans un délai
                    raisonnable ;
                  </li>
                  <li>
                    Suivre les recommandations et traitements proposés par les
                    professionnels ;
                  </li>
                  <li>
                    Traiter les professionnels avec courtoisie et respect ;
                  </li>
                  <li>
                    Ne pas utiliser la plateforme pour des activités
                    frauduleuses, abusives ou inappropriées.
                  </li>
                </ul>

                <h3>Surveillance et amélioration continue</h3>
                <p>
                  Health-e veille à la qualité de l'expérience utilisateur sur
                  la plateforme et au respect des engagements éthiques par les
                  professionnels de santé. Nous ne supervisons pas le contenu
                  médical des consultations, qui relève de la responsabilité
                  exclusive des praticiens.
                </p>

                <h3>Signalement des préoccupations éthiques</h3>
                <p>
                  Si vous avez des préoccupations concernant des questions
                  éthiques liées à notre plateforme, vous pouvez nous écrire à
                  l'adresse suivante : 📧{" "}
                  <a
                    href="mailto:healthe.service@gmail.com"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    healthe.service@gmail.com
                  </a>
                  Toutes les préoccupations seront traitées avec sérieux,
                  impartialité et confidentialité.
                </p>
              </>
            ) : (
              <>
                <h2>Our Ethical Commitment</h2>
                <p>
                  Health-e is committed to facilitating access to high-quality
                  mental and intimate health services, connecting patients with
                  qualified professionals. We fulfill this mission while
                  respecting fundamental ethical principles, serving as a
                  neutral and secure intermediary. Our platform is designed to
                  provide a reliable, confidential, and respectful environment
                  conducive to user support.
                </p>

                <h3>Core Principles</h3>
                <ul>
                  <li>
                    <strong>Confidentiality</strong>: We rigorously protect
                    users' personal data (name, contact, appointments), without
                    storing medical records. Medical follow-up and record
                    keeping are handled directly by the healthcare professional.
                  </li>
                  <li>
                    <strong>Respect</strong>: We treat all users with dignity,
                    without discrimination of any kind.
                  </li>
                  <li>
                    <strong>Competence</strong>: We verify the qualifications
                    and experience of all professionals on our platform.
                  </li>
                  <li>
                    <strong>Integrity</strong>: We maintain high standards of
                    honesty, transparency, and independence.
                  </li>
                  <li>
                    <strong>Responsibility</strong>: We assume responsibility
                    for the technical and ethical quality of the platform, while
                    clearly distinguishing our role from that of healthcare
                    professionals.
                  </li>
                </ul>

                <h3>Professional Commitments</h3>
                <p>All healthcare professionals on Health-e commit to:</p>
                <ul>
                  <li>Strictly respect patient confidentiality;</li>
                  <li>
                    Provide care based on best practices and recognized
                    scientific evidence;
                  </li>
                  <li>
                    Keep their professional knowledge and skills up to date;
                  </li>
                  <li>
                    Refer patients to other specialists or facilities when
                    necessary;
                  </li>
                  <li>
                    Avoid any conflict of interest that could compromise the
                    quality of care;
                  </li>
                  <li>
                    Ensure themselves the maintenance and preservation of
                    medical records, in accordance with the legal requirements
                    of their country of practice.
                  </li>
                </ul>

                <h3>Patient Commitments</h3>
                <p>Patients using the Health-e platform commit to:</p>
                <ul>
                  <li>
                    Provide accurate and complete information about their health
                    status;
                  </li>
                  <li>
                    Respect scheduled appointments or cancel them within a
                    reasonable timeframe;
                  </li>
                  <li>
                    Follow recommendations and treatments proposed by
                    professionals;
                  </li>
                  <li>Treat professionals with courtesy and respect;</li>
                  <li>
                    Not use the platform for fraudulent, abusive, or
                    inappropriate activities.
                  </li>
                </ul>

                <h3>Monitoring and Continuous Improvement</h3>
                <p>
                  Health-e ensures the quality of the user experience on the
                  platform and compliance with ethical commitments by healthcare
                  professionals. We do not supervise the medical content of
                  consultations, which remains the exclusive responsibility of
                  practitioners.
                </p>

                <h3>Reporting Ethical Concerns</h3>
                <p>
                  If you have concerns about ethical issues related to our
                  platform, you can write to us at the following address: 📧{" "}
                  <a
                    href="mailto:healthe.service@gmail.com"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    healthe.service@gmail.com
                  </a>
                  All concerns will be treated with seriousness, impartiality,
                  and confidentiality.
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
