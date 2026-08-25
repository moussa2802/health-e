import React from "react";
import { Shield, Check, Mail } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const Ethics: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft">
            <Shield className="h-8 w-8 text-sage" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">
            {language === "fr" ? "Règles d'éthique" : "Code of Ethics"}
          </h1>
        </div>

        <div className="rounded-block border border-line bg-card p-6 shadow-soft sm:p-8">
          <div className="text-ink-soft">
            {language === "fr" ? (
              <>
                <section className="mb-8">
                  <h2 className="font-display mb-3 text-2xl font-semibold text-ink">
                    Notre engagement éthique
                  </h2>
                  <p className="leading-relaxed">
                    Health-e s'engage à faciliter l'accès à des services de santé
                    mentale et de santé intime de haute qualité, en mettant en
                    relation les patients et des professionnels qualifiés. Nous
                    assurons cette mission dans le respect des principes éthiques
                    fondamentaux, tout en jouant un rôle d'intermédiaire neutre et
                    sécurisé. Notre plateforme est conçue pour offrir un
                    environnement fiable, confidentiel et respectueux, propice à
                    l'accompagnement des usagers.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Principes fondamentaux
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Confidentialité</strong> : Nous protégeons
                        rigoureusement les données personnelles des utilisateurs
                        (nom, contact, rendez-vous), sans stocker de dossiers
                        médicaux. Le suivi médical et la tenue du dossier sont
                        assurés directement par le professionnel de santé.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Respect</strong> : Nous traitons tous les
                        utilisateurs avec dignité, sans discrimination d'aucune
                        sorte.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Compétence</strong> : Nous vérifions les
                        qualifications et l'expérience de tous les professionnels
                        présents sur notre plateforme.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Intégrité</strong> : Nous maintenons des standards
                        élevés d'honnêteté, de transparence et d'indépendance.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Responsabilité</strong> : Nous assumons la
                        responsabilité de la qualité technique et éthique de la
                        plateforme, tout en distinguant clairement notre rôle de
                        celui des professionnels de santé.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Engagements des professionnels
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    Tous les professionnels de santé présents sur Health-e
                    s'engagent à :
                  </p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>Respecter strictement la confidentialité des patients ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Fournir des soins fondés sur les meilleures pratiques et les
                        preuves scientifiques reconnues ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Maintenir à jour leurs connaissances et compétences
                        professionnelles ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Référer les patients à d'autres spécialistes ou structures
                        si nécessaire ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Éviter tout conflit d'intérêt qui pourrait compromettre la
                        qualité des soins ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Assurer eux-mêmes la tenue et la conservation des dossiers
                        médicaux, conformément aux exigences légales de leur pays
                        d'exercice.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Engagements des patients
                  </h3>
                  <p className="mb-3 leading-relaxed">
                    Les patients utilisant la plateforme Health-e s'engagent à :
                  </p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Fournir des informations exactes et complètes sur leur état
                        de santé ;
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
                        Suivre les recommandations et traitements proposés par les
                        professionnels ;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>Traiter les professionnels avec courtoisie et respect ;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Ne pas utiliser la plateforme pour des activités
                        frauduleuses, abusives ou inappropriées.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Surveillance et amélioration continue
                  </h3>
                  <p className="leading-relaxed">
                    Health-e veille à la qualité de l'expérience utilisateur sur
                    la plateforme et au respect des engagements éthiques par les
                    professionnels de santé. Nous ne supervisons pas le contenu
                    médical des consultations, qui relève de la responsabilité
                    exclusive des praticiens.
                  </p>
                </section>

                <section className="mb-0">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Signalement des préoccupations éthiques
                  </h3>
                  <p className="leading-relaxed">
                    Si vous avez des préoccupations concernant des questions
                    éthiques liées à notre plateforme, vous pouvez nous écrire à
                    l'adresse suivante :{" "}
                    <a
                      href="mailto:healthe.service@gmail.com"
                      className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent/80"
                    >
                      <Mail className="h-4 w-4" />
                      healthe.service@gmail.com
                    </a>
                    Toutes les préoccupations seront traitées avec sérieux,
                    impartialité et confidentialité.
                  </p>
                </section>
              </>
            ) : (
              <>
                <section className="mb-8">
                  <h2 className="font-display mb-3 text-2xl font-semibold text-ink">
                    Our Ethical Commitment
                  </h2>
                  <p className="leading-relaxed">
                    Health-e is committed to facilitating access to high-quality
                    mental and intimate health services, connecting patients with
                    qualified professionals. We fulfill this mission while
                    respecting fundamental ethical principles, serving as a
                    neutral and secure intermediary. Our platform is designed to
                    provide a reliable, confidential, and respectful environment
                    conducive to user support.
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Core Principles
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Confidentiality</strong>: We rigorously protect
                        users' personal data (name, contact, appointments), without
                        storing medical records. Medical follow-up and record
                        keeping are handled directly by the healthcare professional.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Respect</strong>: We treat all users with dignity,
                        without discrimination of any kind.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Competence</strong>: We verify the qualifications
                        and experience of all professionals on our platform.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Integrity</strong>: We maintain high standards of
                        honesty, transparency, and independence.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        <strong className="text-ink">Responsibility</strong>: We assume responsibility
                        for the technical and ethical quality of the platform, while
                        clearly distinguishing our role from that of healthcare
                        professionals.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Professional Commitments
                  </h3>
                  <p className="mb-3 leading-relaxed">All healthcare professionals on Health-e commit to:</p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>Strictly respect patient confidentiality;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Provide care based on best practices and recognized
                        scientific evidence;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Keep their professional knowledge and skills up to date;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Refer patients to other specialists or facilities when
                        necessary;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Avoid any conflict of interest that could compromise the
                        quality of care;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Ensure themselves the maintenance and preservation of
                        medical records, in accordance with the legal requirements
                        of their country of practice.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Patient Commitments
                  </h3>
                  <p className="mb-3 leading-relaxed">Patients using the Health-e platform commit to:</p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Provide accurate and complete information about their health
                        status;
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
                        Follow recommendations and treatments proposed by
                        professionals;
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>Treat professionals with courtesy and respect;</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-sage" />
                      <span>
                        Not use the platform for fraudulent, abusive, or
                        inappropriate activities.
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Monitoring and Continuous Improvement
                  </h3>
                  <p className="leading-relaxed">
                    Health-e ensures the quality of the user experience on the
                    platform and compliance with ethical commitments by healthcare
                    professionals. We do not supervise the medical content of
                    consultations, which remains the exclusive responsibility of
                    practitioners.
                  </p>
                </section>

                <section className="mb-0">
                  <h3 className="font-display mb-3 text-xl font-semibold text-ink">
                    Reporting Ethical Concerns
                  </h3>
                  <p className="leading-relaxed">
                    If you have concerns about ethical issues related to our
                    platform, you can write to us at the following address:{" "}
                    <a
                      href="mailto:healthe.service@gmail.com"
                      className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent/80"
                    >
                      <Mail className="h-4 w-4" />
                      healthe.service@gmail.com
                    </a>
                    All concerns will be treated with seriousness, impartiality,
                    and confidentiality.
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

export default Ethics;
