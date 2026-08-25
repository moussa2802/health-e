import React from "react";
import { FileText, Check, Mail } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const Terms: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft">
            <FileText className="h-8 w-8 text-sage" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">
            {language === "fr" ? "Conditions d'utilisation" : "Terms of Use"}
          </h1>
        </div>

        <div className="rounded-block border border-line bg-card p-6 shadow-soft sm:p-8">
          <div className="text-ink-soft">
            {language === "fr" ? (
              <>
                <section className="mb-8">
                  <h2 className="font-display mb-3 text-2xl font-semibold text-ink">
                    1. Bienvenue sur Health-e
                  </h2>
                  <p className="leading-relaxed">
                    En accédant à notre plateforme et en l'utilisant, vous
                    acceptez d'être lié par les présentes Conditions Générales
                    d'Utilisation. Veuillez les lire attentivement avant
                    d'utiliser notre service.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    2. Acceptation des conditions
                  </h3>
                  <p className="leading-relaxed">
                    En utilisant Health-e, vous acceptez ces conditions dans leur
                    intégralité. Si vous n'acceptez pas l'une quelconque de ces
                    clauses, veuillez ne pas utiliser notre plateforme.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    3. Description du service
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    Health-e est une plateforme de mise en relation qui permet aux
                    patients de consulter à distance des professionnels de santé
                    qualifiés dans les domaines du profil psychologique et de la vie
                    intime (psychologues, psychiatres, sexologues, gynécologues,
                    urologues).
                  </p>
                  <p className="leading-relaxed">
                    Health-e n'est pas un établissement de santé et n'intervient
                    pas dans le contenu des consultations, ni dans la gestion des
                    dossiers médicaux. Le rôle de la plateforme se limite à
                    fournir un cadre sécurisé, confidentiel et fonctionnel pour la
                    téléconsultation.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    4. Éligibilité
                  </h3>
                  <p className="leading-relaxed">
                    Pour utiliser Health-e, vous devez avoir au moins 18 ans et
                    être capable de contracter légalement. Si vous agissez au nom
                    d'une organisation, vous garantissez en avoir l'autorité.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    5. Comptes utilisateurs
                  </h3>
                  <p className="leading-relaxed">
                    Vous êtes responsable de votre compte Health-e, de la
                    confidentialité de vos identifiants, et de toute activité s'y
                    rattachant. En cas d'utilisation frauduleuse ou non autorisée,
                    vous devez nous en informer immédiatement.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    6. Responsabilités des utilisateurs
                  </h3>
                  <h4 className="mb-2 font-display text-base font-semibold text-ink">
                    Pour les patients :
                  </h4>
                  <ul className="mb-4 space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>Fournir des informations exactes et sincères ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Utiliser le service uniquement dans un cadre de santé
                        légitime et respectueux ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Respecter les rendez-vous fixés ou les annuler dans un délai
                        raisonnable ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Ne pas enregistrer, partager ou diffuser une consultation
                        sans consentement explicite.
                      </span>
                    </li>
                  </ul>

                  <h4 className="mb-2 font-display text-base font-semibold text-ink">
                    Pour les professionnels :
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Maintenir à jour leurs qualifications, diplômes et
                        autorisations légales d'exercice ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Respecter la confidentialité des patients et le secret
                        professionnel ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Assurer eux-mêmes la tenue et la conservation des dossiers
                        médicaux conformément à la législation de leur pays
                        d'exercice ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Être ponctuels et disponibles selon les créneaux proposés.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    7. Limitations du service
                  </h3>
                  <p className="leading-relaxed">
                    Health-e ne convient pas pour les situations d'urgence
                    médicale. En cas d'urgence, veuillez contacter immédiatement
                    les services médicaux d'urgence de votre localité. La
                    plateforme ne remplace pas une consultation médicale en
                    personne lorsque celle-ci est requise.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    8. Paiements et remboursements
                  </h3>
                  <p className="leading-relaxed">
                    Le tarif des consultations est clairement indiqué avant
                    validation. Les paiements sont traités via des services
                    sécurisés (Mobile Money, carte bancaire...). Les politiques de
                    remboursement sont disponibles dans la section dédiée et
                    peuvent varier selon les cas.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    9. Propriété intellectuelle
                  </h3>
                  <p className="leading-relaxed">
                    Tous les contenus, logos, interfaces et codes de la plateforme
                    Health-e sont protégés par les lois relatives à la propriété
                    intellectuelle. Aucune reproduction ou redistribution n'est
                    autorisée sans notre accord écrit.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    10. Confidentialité
                  </h3>
                  <p className="leading-relaxed">
                    Nous ne stockons pas de données médicales. Seules les données
                    nécessaires au bon fonctionnement du service (identifiants,
                    réservations, échanges techniques) sont collectées et
                    sécurisées. Votre utilisation du service est régie par notre
                    Politique de confidentialité.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    11. Limitation de responsabilité
                  </h3>
                  <p className="leading-relaxed">
                    Health-e agit uniquement en tant qu'intermédiaire technique.
                    Nous ne sommes pas responsables des actes médicaux posés, ni
                    des conséquences liées à une consultation, à l'exception des
                    dysfonctionnements techniques avérés de la plateforme. Notre
                    responsabilité ne pourra être engagée pour des dommages
                    indirects ou imprévus.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    12. Indemnisation
                  </h3>
                  <p className="leading-relaxed">
                    En utilisant notre service, vous acceptez d'indemniser
                    Health-e en cas de préjudice, plainte ou litige résultant
                    d'une violation de ces conditions de votre part.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    13. Modifications des conditions
                  </h3>
                  <p className="leading-relaxed">
                    Nous pouvons réviser ces conditions à tout moment. Les
                    modifications seront publiées sur la plateforme. En continuant
                    à utiliser Health-e, vous acceptez les nouvelles conditions en
                    vigueur.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    14. Résiliation
                  </h3>
                  <p className="leading-relaxed">
                    Nous nous réservons le droit de suspendre ou de supprimer un
                    compte utilisateur sans préavis, notamment en cas de
                    comportement abusif, frauduleux ou contraire à ces conditions.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    15. Loi applicable
                  </h3>
                  <p className="leading-relaxed">
                    Ces conditions sont régies par les lois en vigueur au Sénégal.
                    En cas de litige, une tentative de résolution à l'amiable sera
                    privilégiée avant toute procédure judiciaire.
                  </p>
                </section>

                <section className="mb-0">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    16. Contact
                  </h3>
                  <p className="flex flex-wrap items-center gap-1 leading-relaxed">
                    <Mail className="h-4 w-4 flex-shrink-0 text-accent" />
                    Pour toute question ou clarification :{" "}
                    <a
                      href="mailto:healthe.service@gmail.com"
                      className="font-medium text-accent hover:text-accent/80"
                    >
                      healthe.service@gmail.com
                    </a>
                  </p>
                </section>
              </>
            ) : (
              <>
                <section className="mb-8">
                  <h2 className="font-display mb-3 text-2xl font-semibold text-ink">
                    1. Welcome to Health-e
                  </h2>
                  <p className="leading-relaxed">
                    By accessing and using our platform, you agree to be bound by
                    these Terms and Conditions of Use. Please read them carefully
                    before using our service.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    2. Acceptance of Terms
                  </h3>
                  <p className="leading-relaxed">
                    By using Health-e, you accept these terms in their entirety.
                    If you do not accept any of these clauses, please do not use
                    our platform.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    3. Service Description
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    Health-e is a matching platform that allows patients to
                    consult remotely with qualified healthcare professionals in
                    the fields of mental health and intimate health
                    (psychologists, psychiatrists, sexologists, gynecologists,
                    urologists).
                  </p>
                  <p className="leading-relaxed">
                    Health-e is not a healthcare facility and does not intervene
                    in the content of consultations or in the management of
                    medical records. The platform's role is limited to providing a
                    secure, confidential, and functional framework for
                    teleconsultation.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    4. Eligibility
                  </h3>
                  <p className="leading-relaxed">
                    To use Health-e, you must be at least 18 years old and capable
                    of legally contracting. If you are acting on behalf of an
                    organization, you guarantee that you have the authority to do
                    so.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    5. User Accounts
                  </h3>
                  <p className="leading-relaxed">
                    You are responsible for your Health-e account, the
                    confidentiality of your credentials, and any activity related
                    to it. In case of fraudulent or unauthorized use, you must
                    inform us immediately.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    6. User Responsibilities
                  </h3>
                  <h4 className="mb-2 font-display text-base font-semibold text-ink">
                    For Patients:
                  </h4>
                  <ul className="mb-4 space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>Provide accurate and sincere information;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Use the service only in a legitimate and respectful health
                        context;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Respect scheduled appointments or cancel them within a
                        reasonable timeframe;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Do not record, share, or broadcast a consultation without
                        explicit consent.
                      </span>
                    </li>
                  </ul>

                  <h4 className="mb-2 font-display text-base font-semibold text-ink">
                    For Professionals:
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Keep their qualifications, diplomas, and legal practice
                        authorizations up to date;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Respect patient confidentiality and professional secrecy;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Ensure themselves the maintenance and preservation of
                        medical records in accordance with the legislation of their
                        country of practice;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Be punctual and available according to the proposed time
                        slots.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    7. Service Limitations
                  </h3>
                  <p className="leading-relaxed">
                    Health-e is not suitable for medical emergency situations. In
                    case of emergency, please contact the emergency medical
                    services in your locality immediately. The platform does not
                    replace an in-person medical consultation when required.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    8. Payments and Refunds
                  </h3>
                  <p className="leading-relaxed">
                    Consultation fees are clearly indicated before validation.
                    Payments are processed through secure services (Mobile Money,
                    bank card...). Refund policies are available in the dedicated
                    section and may vary depending on the case.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    9. Intellectual Property
                  </h3>
                  <p className="leading-relaxed">
                    All content, logos, interfaces, and codes of the Health-e
                    platform are protected by intellectual property laws. No
                    reproduction or redistribution is authorized without our
                    written agreement.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    10. Confidentiality
                  </h3>
                  <p className="leading-relaxed">
                    We do not store medical data. Only data necessary for the
                    proper functioning of the service (identifiers, reservations,
                    technical exchanges) are collected and secured. Your use of
                    the service is governed by our Privacy Policy.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    11. Limitation of Liability
                  </h3>
                  <p className="leading-relaxed">
                    Health-e acts solely as a technical intermediary. We are not
                    responsible for medical acts performed, nor for consequences
                    related to a consultation, except for proven technical
                    malfunctions of the platform. Our liability cannot be engaged
                    for indirect or unforeseen damages.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    12. Indemnification
                  </h3>
                  <p className="leading-relaxed">
                    By using our service, you agree to indemnify Health-e in case
                    of prejudice, complaint, or dispute resulting from a violation
                    of these terms on your part.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    13. Modifications to Terms
                  </h3>
                  <p className="leading-relaxed">
                    We may revise these terms at any time. Modifications will be
                    published on the platform. By continuing to use Health-e, you
                    accept the new terms in effect.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    14. Termination
                  </h3>
                  <p className="leading-relaxed">
                    We reserve the right to suspend or delete a user account
                    without notice, particularly in case of abusive, fraudulent,
                    or contrary behavior to these terms.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    15. Applicable Law
                  </h3>
                  <p className="leading-relaxed">
                    These terms are governed by the laws in force in Senegal. In
                    case of dispute, an amicable resolution attempt will be
                    preferred before any judicial procedure.
                  </p>
                </section>

                <section className="mb-0">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    16. Contact
                  </h3>
                  <p className="flex flex-wrap items-center gap-1 leading-relaxed">
                    <Mail className="h-4 w-4 flex-shrink-0 text-accent" />
                    For any questions or clarifications:{" "}
                    <a
                      href="mailto:healthe.service@gmail.com"
                      className="font-medium text-accent hover:text-accent/80"
                    >
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

export default Terms;
