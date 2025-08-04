import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import LazyImage from '../ui/LazyImage';
import { getAllContent, getContentByType, ContentItem } from '../../services/contentService';
import LoadingSpinner from '../ui/LoadingSpinner';
import ContentCard from './ContentCard';
import { useLanguage } from '../../contexts/LanguageContext';

const TestimonialsSection: React.FC = () => {
  const [testimonials, setTestimonials] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch only non-featured testimonials to avoid duplication
        const allContent = await getContentByType('testimonial');
        
        // Filter out featured content to avoid duplication with FeaturedContentSection
        const nonFeaturedTestimonials = allContent.filter(item => !item.featured);
        
        setTestimonials(nonFeaturedTestimonials);
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        setError(language === 'fr' 
          ? 'Impossible de charger les témoignages' 
          : 'Unable to load testimonials');
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [language]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        {error}
      </div>
    );
  }

  // If no testimonials from Firestore, use fallback data
  const displayTestimonials = testimonials.length > 0 ? testimonials : [
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
      createdAt: null as any,
      updatedAt: null as any
    },
    {
      id: '2',
      type: 'testimonial',
      title: language === 'fr' ? "Une plateforme intuitive" : "An intuitive platform",
      description: language === 'fr'
        ? "La plateforme facilite grandement mes consultations. Interface intuitive et patients satisfaits."
        : "The platform greatly facilitates my consultations. Intuitive interface and satisfied patients.",
      author: "Dr. Moussa S.",
      role: language === 'fr' ? "Psychologue" : "Psychologist",
      imageUrl: "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=150",
      createdAt: null as any,
      updatedAt: null as any
    },
    {
      id: '3',
      type: 'testimonial',
      title: language === 'fr' ? "Consultation discrète" : "Discreet consultation",
      description: language === 'fr'
        ? "Consultation discrète et efficace. Je recommande vivement cette plateforme."
        : "Discreet and effective consultation. I highly recommend this platform.",
      author: "Fatou D.",
      role: language === 'fr' ? "Patiente" : "Patient",
      imageUrl: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150",
      createdAt: null as any,
      updatedAt: null as any
    }
  ];

  // If no testimonials to display, don't render the section
  if (displayTestimonials.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {displayTestimonials.map((testimonial) => (
        <ContentCard key={testimonial.id} content={testimonial} showType={false} />
      ))}
    </div>
  );
};

export default TestimonialsSection;