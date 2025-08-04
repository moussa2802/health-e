import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, X, Play, Pause } from 'lucide-react';
import LazyImage from '../ui/LazyImage';
import { ContentItem } from '../../services/contentService';
import { useLanguage } from '../../contexts/LanguageContext';

interface ContentCardProps {
  content: ContentItem;
  showType?: boolean;
}

const ContentCard: React.FC<ContentCardProps> = ({ content, showType = true }) => {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  
  const MAX_CHARS = 150;
  const isLongText = content.description.length > MAX_CHARS;
  const previewText = isLongText 
    ? `${content.description.substring(0, MAX_CHARS)}...` 
    : content.description;

  // Handle video play/pause in card
  const handleVideoPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      // If video isn't loaded yet, open modal
      setShowModal(true);
    }
  };

  // Cleanup video when modal closes
  useEffect(() => {
    if (!showModal && modalVideoRef.current) {
      modalVideoRef.current.pause();
    }
  }, [showModal]);

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
        <div className="relative">
          {content.videoUrl ? (
            <div className="relative">
              <div className="w-full h-48">
                <video
                  ref={videoRef}
                  src={content.videoUrl}
                  className="w-full h-full object-cover"
                  poster={content.imageUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={(e) => e.stopPropagation()}
                  muted
                />
              </div>
              <div 
                className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer"
                onClick={handleVideoPlay}
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  {isPlaying ? (
                    <Pause className="h-6 w-6 text-blue-600" />
                  ) : (
                    <Play className="h-6 w-6 text-blue-600" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <LazyImage
              src={content.imageUrl}
              alt={content.title}
              className="w-full h-48 object-cover"
            />
          )}
          
          {showType && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 text-xs font-bold rounded">
              {content.type === 'testimonial' 
                ? (language === 'fr' ? 'Témoignage' : 'Testimonial')
                : (language === 'fr' ? 'Conseil santé' : 'Health Tip')}
            </div>
          )}
        </div>
        
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-xl font-bold mb-2">{content.title}</h3>
          
          <div className="mb-4 flex-1">
            <p className="text-gray-600">
              {expanded ? content.description : previewText}
            </p>
            {isLongText && !expanded && (
              <button 
                onClick={() => setExpanded(true)}
                className="text-blue-500 hover:text-blue-700 mt-2 text-sm font-medium"
              >
                {language === 'fr' ? 'Lire plus' : 'Read more'}
              </button>
            )}
            {expanded && (
              <button 
                onClick={() => setExpanded(false)}
                className="text-blue-500 hover:text-blue-700 mt-2 text-sm font-medium"
              >
                {language === 'fr' ? 'Réduire' : 'Show less'}
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
            <div>
              <p className="font-medium">{content.author}</p>
              {content.role && <p className="text-sm text-gray-500">{content.role}</p>}
            </div>
            
            <button 
              onClick={() => setShowModal(true)}
              className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
            >
              <span className="mr-1">{language === 'fr' ? 'Voir tout' : 'View full'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Full content modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              {content.videoUrl ? (
                <div className="relative w-full h-64">
                  <video
                    ref={modalVideoRef}
                    src={content.videoUrl}
                    className="w-full h-full object-cover"
                    controls
                    poster={content.imageUrl}
                    autoPlay
                  />
                </div>
              ) : (
                <LazyImage
                  src={content.imageUrl}
                  alt={content.title}
                  className="w-full h-64 object-cover"
                />
              )}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{content.title}</h2>
              <div className="flex items-center mb-4">
                <p className="font-medium">{content.author}</p>
                {content.role && <p className="text-sm text-gray-500 ml-2">• {content.role}</p>}
              </div>
              
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{content.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentCard;