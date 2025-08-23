import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, X, Play, Pause } from "lucide-react";
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
              <div className="w-full h-32 sm:h-40 md:h-48 lg:h-52">
                <video
                  ref={videoRef}
                  src={content.videoUrl}
                  className="w-full h-full object-cover rounded-t-xl"
                  poster={content.imageUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={(e) => e.stopPropagation()}
                  muted
                  playsInline
                />
              </div>
              <div
                className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer rounded-t-xl"
                onClick={handleVideoPlay}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center">
                  {isPlaying ? (
                    <Pause className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  ) : (
                    <Play className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-32 sm:h-40 md:h-48 lg:h-52">
              <LazyImage
                src={content.imageUrl}
                alt={content.title}
                className="w-full h-full object-cover rounded-t-xl"
              />
            </div>
          )}

          {showType && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 text-xs font-bold rounded">
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
                {language === "fr" ? "Lire plus" : "Read more"}
              </button>
            )}
            {expanded && (
              <button
                onClick={() => setExpanded(false)}
                className="text-blue-500 hover:text-blue-700 mt-2 text-sm font-medium"
              >
                {language === "fr" ? "Réduire" : "Show less"}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
            <div>
              <p className="font-medium">{content.author}</p>
              {content.role && (
                <p className="text-sm text-gray-500">{content.role}</p>
              )}
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-xs sm:max-w-md md:max-w-3xl max-h-[95vh] overflow-y-auto">
            <div className="relative">
              {content.videoUrl ? (
                <div className="relative w-full">
                  <video
                    ref={modalVideoRef}
                    src={content.videoUrl}
                    className="w-full h-auto max-h-96 object-contain rounded-t-lg"
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
                    className="w-full h-auto max-h-96 object-contain rounded-t-lg"
                  />
                </div>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-2 right-2 bg-white rounded-full p-1.5 sm:p-2 shadow-md hover:bg-gray-100 transition-colors z-10"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                {content.title}
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center mb-4 gap-1 sm:gap-0">
                <p className="font-medium">{content.author}</p>
                {content.role && (
                  <p className="text-sm text-gray-500 sm:ml-2">
                    • {content.role}
                  </p>
                )}
              </div>

              <div className="prose max-w-none">
                <p className="whitespace-pre-line text-sm sm:text-base">
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
