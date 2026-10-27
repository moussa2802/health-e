import React from "react";
import { Link } from "react-router-dom";
import { Lock, Check, Mail, AlertTriangle } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const Privacy: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-[#130F0C] px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#A79E90] no-underline hover:text-[#F2B66D]">
          ← Accueil
        </Link>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.08]">
            <Lock className="h-8 w-8 text-[#9DBFAF]" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[#F4EEE4]">
            {language === "fr"
              ? "Politique de confidentialité"
              : "Privacy Policy"}
          </h1>
        </div>

        <div className="rounded-block border border-white/[0.12] bg-white/[0.05] p-6 shadow-none sm:p-8">
          <div className="text-[#CFC6B8]">
            {language === "fr" ? (
              <>
                <section className="mb-8">
                  <h2 className="font-display mb-3 text-2xl font-semibold text-[#F4EEE4]">
                    Introduction
                  </h2>
                  <p className="leading-relaxed">
                    Chez Health-e, la protection de vos données personnelles est
                    une priorité. Cette politique de confidentialité explique
                    comment nous collectons, utilisons et protégeons vos
                    informations personnelles dans le cadre de l’utilisation de
                    notre plateforme de mise en relation pour la téléconsultation
                    en profil psychologique et vie intime.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    1. Informations que nous collectons
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    Nous collectons uniquement les données strictement nécessaires
                    au fonctionnement de notre service :
                  </p>
                  <ul className="mb-4 space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        <strong className="text-[#F4EEE4]">Informations personnelles</strong> : nom, adresse
                        email, numéro de téléphone, genre, date de naissance ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        <strong className="text-[#F4EEE4]">Informations techniques</strong> : adresse IP, type
                        d’appareil, navigateur, journaux de connexion ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        <strong className="text-[#F4EEE4]">Informations de paiement</strong> : coordonnées
                        bancaires (traitées de manière sécurisée par un prestataire
                        tiers agréé).
                      </span>
                    </li>
                  </ul>
                  <p className="flex gap-2 rounded-card border border-white/[0.12] bg-[#130F0C] p-4 leading-relaxed">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#F09A7A]" />
                    <span>
                      Nous ne collectons ni ne stockons vos données médicales,
                      symptômes, diagnostics ou traitements. Ces informations
                      relèvent exclusivement de l’échange entre le patient et le
                      professionnel de santé, qui en assure la confidentialité et la
                      gestion selon la réglementation de son pays.
                    </span>
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    2. Comment nous utilisons vos informations
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Gérer votre compte utilisateur ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        Organiser les rendez-vous entre patients et professionnels ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        Assurer le bon fonctionnement et la sécurité technique de la
                        plateforme ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Traiter les paiements via un prestataire sécurisé ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        Vous informer en cas de mise à jour de nos services ou
                        conditions.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    3. Partage de vos informations
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    Nous ne vendons jamais vos données personnelles. Nous
                    partageons uniquement certaines données (nom, contact,
                    créneaux de rendez-vous) :
                  </p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Avec le professionnel de santé que vous consultez ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        Avec nos partenaires techniques de confiance (hébergement,
                        paiement, notifications), sous contrat de confidentialité ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        Si la loi l’exige, en réponse à une autorité compétente.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    4. Sécurité des données
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    Nous mettons en œuvre des mesures techniques et
                    organisationnelles strictes pour sécuriser vos données
                    personnelles :
                  </p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Chiffrement des échanges (HTTPS) ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Accès limité aux données ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Surveillance de notre infrastructure ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Respect des bonnes pratiques en cybersécurité.</span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    5. Vos droits
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    Selon votre pays de résidence (ex. Sénégal, Canada, Union
                    européenne), vous pouvez exercer les droits suivants :
                  </p>
                  <ul className="mb-4 space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Accéder à vos données personnelles ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Rectifier des informations inexactes ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Supprimer votre compte et vos données associées ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Retirer votre consentement à tout moment ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        Demander une copie de vos données dans un format lisible.
                      </span>
                    </li>
                  </ul>
                  <p className="flex flex-wrap items-center gap-1 leading-relaxed">
                    <Mail className="h-4 w-4 flex-shrink-0 text-[#F2B66D]" />
                    Vous pouvez exercer ces droits à tout moment en nous
                    contactant à :
                    <a
                      href="mailto:healthe.service@gmail.com"
                      className="font-medium text-[#F2B66D] hover:text-[#F2B66D]/80"
                    >
                      healthe.service@gmail.com
                    </a>
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    6. Conservation des données
                  </h3>
                  <p className="leading-relaxed">
                    Nous ne conservons vos données que pour la durée strictement
                    nécessaire à la gestion de votre compte et au respect de nos
                    obligations légales (notamment en matière de facturation).
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    7. Modifications de cette politique
                  </h3>
                  <p className="leading-relaxed">
                    Nous pouvons mettre à jour cette politique à tout moment. En
                    cas de modification majeure, vous serez notifié par email ou
                    via une notification sur la plateforme.
                  </p>
                </section>

                <section className="mb-0">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    8. Nous contacter
                  </h3>
                  <p className="leading-relaxed">
                    Pour toute question liée à vos données personnelles ou à cette
                    politique :
                    <a
                      href="mailto:healthe.service@gmail.com"
                      className="font-medium text-[#F2B66D] hover:text-[#F2B66D]/80"
                    >
                      {" "}
                      healthe.service@gmail.com
                    </a>
                  </p>
                </section>
              </>
            ) : (
              <>
                <section className="mb-8">
                  <h2 className="font-display mb-3 text-2xl font-semibold text-[#F4EEE4]">
                    Introduction
                  </h2>
                  <p className="leading-relaxed">
                    At Health-e, protecting your personal data is a priority. This
                    privacy policy explains how we collect, use, and protect your
                    personal information when using our matching platform for
                    teleconsultations in mental health and intimate health.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    1. Information We Collect
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    We only collect the data strictly necessary for the operation
                    of our service:
                  </p>
                  <ul className="mb-4 space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        <strong className="text-[#F4EEE4]">Personal information</strong>: name, email address,
                        phone number, gender, date of birth;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        <strong className="text-[#F4EEE4]">Technical information</strong>: IP address, device
                        type, browser, connection logs;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        <strong className="text-[#F4EEE4]">Payment information</strong>: banking details
                        (processed securely by an approved third-party provider).
                      </span>
                    </li>
                  </ul>
                  <p className="flex gap-2 rounded-card border border-white/[0.12] bg-[#130F0C] p-4 leading-relaxed">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#F09A7A]" />
                    <span>
                      We do not collect or store your medical data, symptoms,
                      diagnoses, or treatments. This information is strictly
                      exchanged between the patient and the healthcare professional,
                      who ensures its confidentiality and management in accordance
                      with the regulations of their country.
                    </span>
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    2. How We Use Your Information
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Manage your user account;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        Schedule appointments between patients and professionals;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        Ensure the proper functioning and technical security of the
                        platform;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Process payments through a secure provider;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Inform you of updates to our services or terms.</span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    3. Sharing Your Information
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    We never sell your personal data. We only share certain data
                    (name, contact, appointment slots):
                  </p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>With the healthcare professional you consult;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        With trusted technical partners (hosting, payments,
                        notifications) under confidentiality agreements;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>
                        When required by law, in response to a competent authority.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    4. Data Security
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    We implement strict technical and organizational measures to
                    secure your personal data:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Encrypted communications (HTTPS);</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Limited access to data;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Monitoring of our infrastructure;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Adherence to cybersecurity best practices.</span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    5. Your Rights
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    Depending on your country of residence (e.g., Senegal, Canada,
                    European Union), you may exercise the following rights:
                  </p>
                  <ul className="mb-4 space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Access your personal data;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Rectify inaccurate information;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Delete your account and associated data;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Withdraw your consent at any time;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#9DBFAF]" />
                      <span>Request a copy of your data in a readable format.</span>
                    </li>
                  </ul>
                  <p className="flex flex-wrap items-center gap-1 leading-relaxed">
                    <Mail className="h-4 w-4 flex-shrink-0 text-[#F2B66D]" />
                    You can exercise these rights at any time by contacting us
                    at:
                    <a
                      href="mailto:healthe.service@gmail.com"
                      className="font-medium text-[#F2B66D] hover:text-[#F2B66D]/80"
                    >
                      healthe.service@gmail.com
                    </a>
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    6. Data Retention
                  </h3>
                  <p className="leading-relaxed">
                    We retain your data only for as long as strictly necessary to
                    manage your account and to meet our legal obligations
                    (including billing requirements).
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    7. Changes to This Policy
                  </h3>
                  <p className="leading-relaxed">
                    We may update this policy at any time. In case of a major
                    change, you will be notified by email or via a notification on
                    the platform.
                  </p>
                </section>

                <section className="mb-0">
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#F4EEE4]">
                    8. Contact Us
                  </h3>
                  <p className="leading-relaxed">
                    For any questions related to your personal data or this
                    policy:
                    <a
                      href="mailto:healthe.service@gmail.com"
                      className="font-medium text-[#F2B66D] hover:text-[#F2B66D]/80"
                    >
                      {" "}
                      healthe.service@gmail.com
                    </a>
                  </p>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
