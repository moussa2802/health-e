import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, X, Play } from "lucide-react";
import LazyImage from "../ui/LazyImage";
import { ContentItem } from "../../services/contentService";
import { useLanguage } from "../../contexts/LanguageContext";

interface ContentCardProps {
  content: ContentItem;
  showType?: boolean;
}

const ContentCard: React.FC<ContentCardProps> = ({
  content,
  showType = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { language } = useLanguage();
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const MAX_CHARS = 150;
  const isLongText = content.description.length > MAX_CHARS;
  const previewText = isLongText
    ? `${content.description.substring(0, MAX_CHARS)}...`
    : content.description;

  // Handle video play - always open modal
  const handleVideoPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Always open modal when play button is clicked
    setShowModal(true);
  };

  // Cleanup video when modal closes
  useEffect(() => {
    if (!showModal && modalVideoRef.current) {
      modalVideoRef.current.pause();
    }
  }, [showModal]);

  return (
    <>
      <div className="bg-card rounded-card border border-line shadow-soft overflow-hidden hover:shadow-lift transition-shadow h-full flex flex-col">
        <div className="relative">
          {content.videoUrl ? (
            <div className="relative">
              <div className="w-full h-32 sm:h-40 md:h-48 lg:h-52">
                <LazyImage
                  src={content.imageUrl}
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute inset-0 bg-ink/40 flex items-center justify-center cursor-pointer"
                onClick={handleVideoPlay}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-card rounded-full flex items-center justify-center shadow-soft">
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-32 sm:h-40 md:h-48 lg:h-52">
              <LazyImage
                src={content.imageUrl}
                alt={content.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {showType && (
            <div className="absolute top-2 left-2 bg-ink text-white px-2 py-1 text-xs font-bold rounded-pill">
              {content.type === "testimonial"
                ? language === "fr"
                  ? "Témoignage"
                  : "Testimonial"
                : language === "fr"
                ? "Conseil santé"
                : "Health Tip"}
            </div>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-display text-xl font-bold mb-2 text-ink">{content.title}</h3>

          <div className="mb-4 flex-1">
            <p className="text-ink-soft">
              {expanded ? content.description : previewText}
            </p>
            {isLongText && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-accent hover:text-ink mt-2 text-sm font-medium"
              >
                {language === "fr" ? "Lire plus" : "Read more"}
              </button>
            )}
            {expanded && (
              <button
                onClick={() => setExpanded(false)}
                className="text-accent hover:text-ink mt-2 text-sm font-medium"
              >
                {language === "fr" ? "Réduire" : "Show less"}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-line">
            <div>
              <p className="font-medium text-ink">{content.author}</p>
              {content.role && (
                <p className="text-sm text-muted">{content.role}</p>
              )}
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="text-accent hover:text-ink flex items-center text-sm font-medium"
            >
              <span className="mr-1">
                {language === "fr" ? "Voir tout" : "View full"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Full content modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-card rounded-block w-full max-w-xs sm:max-w-md md:max-w-3xl max-h-[95vh] overflow-y-auto shadow-lift">
            <div className="relative">
              {content.videoUrl ? (
                <div className="relative w-full">
                  <video
                    ref={modalVideoRef}
                    src={content.videoUrl}
                    className="w-full h-auto max-h-96 object-contain rounded-t-block"
                    controls
                    poster={content.imageUrl}
                    autoPlay
                    playsInline
                  />
                </div>
              ) : (
                <div className="w-full">
                  <LazyImage
                    src={content.imageUrl}
                    alt={content.title}
                    className="w-full h-auto max-h-96 object-contain rounded-t-block"
                  />
                </div>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-2 right-2 bg-card rounded-full p-1.5 sm:p-2 shadow-soft hover:bg-paper transition-colors z-10"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-ink-soft" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-2 text-ink">
                {content.title}
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center mb-4 gap-1 sm:gap-0">
                <p className="font-medium text-ink">{content.author}</p>
                {content.role && (
                  <p className="text-sm text-muted sm:ml-2">
                    • {content.role}
                  </p>
                )}
              </div>

              <div className="prose max-w-none">
                <p className="whitespace-pre-line text-sm sm:text-base text-ink-soft">
                  {content.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentCard;
