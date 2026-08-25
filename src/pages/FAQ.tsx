import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('general');

  const faqItems: FAQItem[] = [
    {
      category: 'general',
      question: "Qu'est-ce que Health-e ?",
      answer: "Health-e est une plateforme de téléconsultation qui met en relation les patients avec des professionnels de santé qualifiés pour des consultations en ligne. Nous nous spécialisons dans le profil psychologique et la vie intime, offrant un accès facile et confidentiel aux soins de santé."
    },
    {
      category: 'general',
      question: "Comment fonctionne la téléconsultation ?",
      answer: "La téléconsultation se déroule via notre plateforme sécurisée. Vous pouvez choisir entre une consultation vidéo, audio ou par chat. Il vous suffit de vous connecter à l'heure du rendez-vous depuis votre ordinateur ou votre smartphone. Aucune installation de logiciel n'est nécessaire."
    },
    {
      category: 'appointments',
      question: "Comment prendre rendez-vous ?",
      answer: "Pour prendre rendez-vous, il suffit de : 1) Créer un compte ou vous connecter, 2) Choisir un professionnel de santé, 3) Sélectionner un créneau horaire disponible, 4) Confirmer votre rendez-vous. Vous recevrez une confirmation par email avec toutes les informations nécessaires."
    },
    {
      category: 'appointments',
      question: "Puis-je annuler ou reporter mon rendez-vous ?",
      answer: "Oui, vous pouvez annuler ou reporter votre rendez-vous jusqu'à 24 heures avant l'heure prévue. Pour ce faire, connectez-vous à votre compte et accédez à la section 'Mes rendez-vous'."
    },
    {
      category: 'technical',
      question: "Quels sont les prérequis techniques ?",
      answer: "Pour une consultation vidéo, vous avez besoin : d'une connexion internet stable, d'un appareil avec caméra et microphone (ordinateur, smartphone ou tablette), et d'un navigateur web récent. Pour les consultations audio ou chat, seule une connexion internet est nécessaire."
    },
    {
      category: 'technical',
      question: "La plateforme est-elle sécurisée ?",
      answer: "Oui, Health-e utilise un système de cryptage de bout en bout pour toutes les communications. Vos données médicales et personnelles sont stockées de manière sécurisée conformément aux normes de protection des données en vigueur."
    },
    {
      category: 'payment',
      question: "Quels sont les moyens de paiement acceptés ?",
      answer: "Nous acceptons plusieurs moyens de paiement : Wave, Orange Money, cartes bancaires. Le paiement est sécurisé et doit être effectué au moment de la réservation du rendez-vous."
    },
    {
      category: 'payment',
      question: "Y a-t-il des consultations gratuites ?",
      answer: "Certains professionnels proposent des consultations gratuites, notamment pour une première prise de contact. Ces disponibilités sont clairement indiquées sur leur profil."
    },
    {
      category: 'professionals',
      question: "Comment sont sélectionnés les professionnels ?",
      answer: "Tous nos professionnels sont diplômés et certifiés dans leur domaine. Nous vérifions leurs qualifications et leur expérience avant de les accepter sur la plateforme. Ils sont régulièrement évalués pour garantir la qualité des soins."
    },
    {
      category: 'professionals',
      question: "Puis-je choisir mon professionnel de santé ?",
      answer: "Oui, vous pouvez choisir librement votre professionnel de santé. Vous pouvez consulter leur profil, spécialités, langues parlées et avis des patients pour faire votre choix."
    }
  ];

  const categories = [
    { id: 'general', name: 'Général' },
    { id: 'appointments', name: 'Rendez-vous' },
    { id: 'technical', name: 'Technique' },
    { id: 'payment', name: 'Paiement' },
    { id: 'professionals', name: 'Professionnels' }
  ];

  const toggleItem = (index: number) => {
    setOpenItems(openItems.includes(index)
      ? openItems.filter(i => i !== index)
      : [...openItems, index]
    );
  };

  const filteredItems = faqItems.filter(item =>
    activeCategory === 'all' || item.category === activeCategory
  );

  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft">
            <HelpCircle className="h-8 w-8 text-sage" />
          </div>
          <h1 className="font-display mb-4 text-4xl font-bold text-ink">
            Foire aux questions
          </h1>
          <p className="text-lg text-ink-soft">
            Trouvez rapidement des réponses à vos questions sur Health-e
          </p>
        </div>

        {/* Categories */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-ink text-white'
                  : 'border border-line bg-card text-ink-soft hover:bg-paper'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="overflow-hidden rounded-block border border-line bg-card shadow-soft">
          {filteredItems.map((item, index) => (
            <div key={index} className="border-b border-line last:border-0">
              <button
                onClick={() => toggleItem(index)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-paper"
              >
                <span className="text-lg font-medium text-ink">
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-muted transition-transform duration-200 ${
                    openItems.includes(index) ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openItems.includes(index) && (
                <div className="px-6 pb-4">
                  <p className="whitespace-pre-line text-ink-soft">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <p className="text-ink-soft">
            Vous n'avez pas trouvé la réponse à votre question ?
          </p>
          <a
            href="/contact"
            className="mt-4 inline-block rounded-pill bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent/90"
          >
            Contactez-nous
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
