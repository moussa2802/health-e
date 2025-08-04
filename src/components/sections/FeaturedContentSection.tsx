import React, { useState, useEffect } from 'react';
import { getFeaturedContent, ContentItem } from '../../services/contentService';
import LoadingSpinner from '../ui/LoadingSpinner';
import ContentCard from './ContentCard';
import { useLanguage } from '../../contexts/LanguageContext';

const FeaturedContentSection: React.FC = () => {
  const [featuredContent, setFeaturedContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    const fetchFeaturedContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const content = await getFeaturedContent();
        setFeaturedContent(content);
      } catch (err) {
        console.error('Error fetching featured content:', err);
        // Don't set error, just use fallback content
        console.log('Using fallback content due to fetch error');
        setFeaturedContent([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedContent();
  }, [language]);

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }


  // If no featured content from Firestore, use fallback data
  const displayContent = featuredContent.length > 0 ? featuredContent : [
    {
      id: '1',
      type: 'testimonial',
      title: language === 'fr' ? "Mon expérience avec Health-e" : "My experience with Health-e",
      description: language === 'fr' 
        ? "Health-e m'a permis de consulter un psychologue depuis chez moi. L'expérience a été excellente et très professionnelle."
        : "Health-e allowed me to consult a psychologist from home. The experience was excellent and very professional.",
      author: "Aminata K.",
      role: language === 'fr' ? "Patiente" : "Patient",
      imageUrl: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150",
      featured: true,
      createdAt: null as any,
      updatedAt: null as any
    },
    {
      id: '2',
      type: 'health-tip',
      title: language === 'fr' ? "Conseils pour une bonne santé mentale" : "Tips for good mental health",
      description: language === 'fr'
        ? "Pratiquez la méditation quotidiennement, maintenez une activité physique régulière et assurez-vous de dormir suffisamment pour préserver votre santé mentale."
        : "Practice meditation daily, maintain regular physical activity, and ensure you get enough sleep to preserve your mental health.",
      author: "Dr. Moussa S.",
      role: language === 'fr' ? "Psychologue" : "Psychologist",
      imageUrl: "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=600",
      featured: true,
      createdAt: null as any,
      updatedAt: null as any
    },
    {
      id: '3',
      type: 'testimonial',
      title: language === 'fr' ? "Consultation discrète" : "Discreet consultation",
      description: language === 'fr'
        ? "Consultation discrète et efficace. Je recommande vivement cette plateforme pour tous ceux qui cherchent des conseils en santé sexuelle."
        : "Discreet and effective consultation. I highly recommend this platform for anyone seeking sexual health advice.",
      author: "Fatou D.",
      role: language === 'fr' ? "Patiente" : "Patient",
      imageUrl: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150",
      featured: true,
      createdAt: null as any,
      updatedAt: null as any
    }
  ];

  // If no content to display, don't render the section
  if (displayContent.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-4">
        {language === 'fr' ? 'Témoignages et conseils santé' : 'Testimonials and Health Tips'}
      </h2>
      <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
        {language === 'fr' 
          ? 'Découvrez les retours d\'expérience de nos patients et les conseils de nos professionnels'
          : 'Discover feedback from our patients and advice from our professionals'}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayContent.map((item) => (
          <ContentCard key={item.id} content={item} />
        ))}
      </div>
    </div>
  );
};

export default FeaturedContentSection;