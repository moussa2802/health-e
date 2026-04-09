import React from "react";
import { Lock } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const Privacy: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Lock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            {language === "fr"
              ? "Politique de confidentialité"
              : "Privacy Policy"}
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="prose max-w-none">
            {language === "fr" ? (
              <>
                <h2>Introduction</h2>
                <p>
                  Chez Health-e, la protection de vos données personnelles est
                  une priorité. Cette politique de confidentialité explique
                  comment nous collectons, utilisons et protégeons vos
                  informations personnelles dans le cadre de l’utilisation de
                  notre plateforme de mise en relation pour la téléconsultation
                  en profil psychologique et vie intime.
                </p>

                <h3>1. Informations que nous collectons</h3>
                <p>
                  Nous collectons uniquement les données strictement nécessaires
                  au fonctionnement de notre service :
                </p>
                <ul>
                  <li>
                    <strong>Informations personnelles</strong> : nom, adresse
                    email, numéro de téléphone, genre, date de naissance ;
                  </li>
                  <li>
                    <strong>Informations techniques</strong> : adresse IP, type
                    d’appareil, navigateur, journaux de connexion ;
                  </li>
                  <li>
                    <strong>Informations de paiement</strong> : coordonnées
                    bancaires (traitées de manière sécurisée par un prestataire
                    tiers agréé).
                  </li>
                </ul>
                <p>
                  🛑 Nous ne collectons ni ne stockons vos données médicales,
                  symptômes, diagnostics ou traitements. Ces informations
                  relèvent exclusivement de l’échange entre le patient et le
                  professionnel de santé, qui en assure la confidentialité et la
                  gestion selon la réglementation de son pays.
                </p>

                <h3>2. Comment nous utilisons vos informations</h3>
                <ul>
                  <li>Gérer votre compte utilisateur ;</li>
                  <li>
                    Organiser les rendez-vous entre patients et professionnels ;
                  </li>
                  <li>
                    Assurer le bon fonctionnement et la sécurité technique de la
                    plateforme ;
                  </li>
                  <li>Traiter les paiements via un prestataire sécurisé ;</li>
                  <li>
                    Vous informer en cas de mise à jour de nos services ou
                    conditions.
                  </li>
                </ul>

                <h3>3. Partage de vos informations</h3>
                <p>
                  Nous ne vendons jamais vos données personnelles. Nous
                  partageons uniquement certaines données (nom, contact,
                  créneaux de rendez-vous) :
                </p>
                <ul>
                  <li>Avec le professionnel de santé que vous consultez ;</li>
                  <li>
                    Avec nos partenaires techniques de confiance (hébergement,
                    paiement, notifications), sous contrat de confidentialité ;
                  </li>
                  <li>
                    Si la loi l’exige, en réponse à une autorité compétente.
                  </li>
                </ul>

                <h3>4. Sécurité des données</h3>
                <p>
                  Nous mettons en œuvre des mesures techniques et
                  organisationnelles strictes pour sécuriser vos données
                  personnelles :
                </p>
                <ul>
                  <li>Chiffrement des échanges (HTTPS) ;</li>
                  <li>Accès limité aux données ;</li>
                  <li>Surveillance de notre infrastructure ;</li>
                  <li>Respect des bonnes pratiques en cybersécurité.</li>
                </ul>

                <h3>5. Vos droits</h3>
                <p>
                  Selon votre pays de résidence (ex. Sénégal, Canada, Union
                  européenne), vous pouvez exercer les droits suivants :
                </p>
                <ul>
                  <li>Accéder à vos données personnelles ;</li>
                  <li>Rectifier des informations inexactes ;</li>
                  <li>Supprimer votre compte et vos données associées ;</li>
                  <li>Retirer votre consentement à tout moment ;</li>
                  <li>
                    Demander une copie de vos données dans un format lisible.
                  </li>
                </ul>
                <p>
                  📧 Vous pouvez exercer ces droits à tout moment en nous
                  contactant à :
                  <a
                    href="mailto:healthe.service@gmail.com"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {" "}
                    healthe.service@gmail.com
                  </a>
                </p>

                <h3>6. Conservation des données</h3>
                <p>
                  Nous ne conservons vos données que pour la durée strictement
                  nécessaire à la gestion de votre compte et au respect de nos
                  obligations légales (notamment en matière de facturation).
                </p>

                <h3>7. Modifications de cette politique</h3>
                <p>
                  Nous pouvons mettre à jour cette politique à tout moment. En
                  cas de modification majeure, vous serez notifié par email ou
                  via une notification sur la plateforme.
                </p>

                <h3>8. Nous contacter</h3>
                <p>
                  Pour toute question liée à vos données personnelles ou à cette
                  politique :
                  <a
                    href="mailto:healthe.service@gmail.com"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {" "}
                    healthe.service@gmail.com
                  </a>
                </p>
              </>
            ) : (
              <>
                <h2>Introduction</h2>
                <p>
                  At Health-e, protecting your personal data is a priority. This
                  privacy policy explains how we collect, use, and protect your
                  personal information when using our matching platform for
                  teleconsultations in mental health and intimate health.
                </p>

                <h3>1. Information We Collect</h3>
                <p>
                  We only collect the data strictly necessary for the operation
                  of our service:
                </p>
                <ul>
                  <li>
                    <strong>Personal information</strong>: name, email address,
                    phone number, gender, date of birth;
                  </li>
                  <li>
                    <strong>Technical information</strong>: IP address, device
                    type, browser, connection logs;
                  </li>
                  <li>
                    <strong>Payment information</strong>: banking details
                    (processed securely by an approved third-party provider).
                  </li>
                </ul>
                <p>
                  🛑 We do not collect or store your medical data, symptoms,
                  diagnoses, or treatments. This information is strictly
                  exchanged between the patient and the healthcare professional,
                  who ensures its confidentiality and management in accordance
                  with the regulations of their country.
                </p>

                <h3>2. How We Use Your Information</h3>
                <ul>
                  <li>Manage your user account;</li>
                  <li>
                    Schedule appointments between patients and professionals;
                  </li>
                  <li>
                    Ensure the proper functioning and technical security of the
                    platform;
                  </li>
                  <li>Process payments through a secure provider;</li>
                  <li>Inform you of updates to our services or terms.</li>
                </ul>

                <h3>3. Sharing Your Information</h3>
                <p>
                  We never sell your personal data. We only share certain data
                  (name, contact, appointment slots):
                </p>
                <ul>
                  <li>With the healthcare professional you consult;</li>
                  <li>
                    With trusted technical partners (hosting, payments,
                    notifications) under confidentiality agreements;
                  </li>
                  <li>
                    When required by law, in response to a competent authority.
                  </li>
                </ul>

                <h3>4. Data Security</h3>
                <p>
                  We implement strict technical and organizational measures to
                  secure your personal data:
                </p>
                <ul>
                  <li>Encrypted communications (HTTPS);</li>
                  <li>Limited access to data;</li>
                  <li>Monitoring of our infrastructure;</li>
                  <li>Adherence to cybersecurity best practices.</li>
                </ul>

                <h3>5. Your Rights</h3>
                <p>
                  Depending on your country of residence (e.g., Senegal, Canada,
                  European Union), you may exercise the following rights:
                </p>
                <ul>
                  <li>Access your personal data;</li>
                  <li>Rectify inaccurate information;</li>
                  <li>Delete your account and associated data;</li>
                  <li>Withdraw your consent at any time;</li>
                  <li>Request a copy of your data in a readable format.</li>
                </ul>
                <p>
                  📧 You can exercise these rights at any time by contacting us
                  at:
                  <a
                    href="mailto:healthe.service@gmail.com"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {" "}
                    healthe.service@gmail.com
                  </a>
                </p>

                <h3>6. Data Retention</h3>
                <p>
                  We retain your data only for as long as strictly necessary to
                  manage your account and to meet our legal obligations
                  (including billing requirements).
                </p>

                <h3>7. Changes to This Policy</h3>
                <p>
                  We may update this policy at any time. In case of a major
                  change, you will be notified by email or via a notification on
                  the platform.
                </p>

                <h3>8. Contact Us</h3>
                <p>
                  For any questions related to your personal data or this
                  policy:
                  <a
                    href="mailto:healthe.service@gmail.com"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {" "}
                    healthe.service@gmail.com
                  </a>
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
