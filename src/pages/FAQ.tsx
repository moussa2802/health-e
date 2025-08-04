import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
      answer: "Health-e est une plateforme de téléconsultation qui met en relation les patients avec des professionnels de santé qualifiés pour des consultations en ligne. Nous nous spécialisons dans la santé mentale et sexuelle, offrant un accès facile et confidentiel aux soins de santé."
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Foire aux questions
          </h1>
          <p className="text-lg text-gray-600">
            Trouvez rapidement des réponses à vos questions sur Health-e
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {filteredItems.map((item, index) => (
            <div key={index} className="border-b border-gray-200 last:border-0">
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg font-medium text-gray-900">
                  {item.question}
                </span>
                {openItems.includes(index) ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {openItems.includes(index) && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 whitespace-pre-line">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Vous n'avez pas trouvé la réponse à votre question ?
          </p>
          <a
            href="/contact"
            className="inline-block mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Contactez-nous
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;