import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Play, Plus, Trash2, Edit2, Save, X, Upload, Image, RefreshCw, AlertCircle, CheckCircle, Video } from 'lucide-react';
import { storage } from '../../utils/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  getAllContent, 
  createContent, 
  updateContent, 
  deleteContent,
  ContentItem 
} from '../../services/contentService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../contexts/LanguageContext';

const AdminContent: React.FC = () => {
  const { language } = useLanguage();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState<Partial<ContentItem>>({
    type: 'testimonial',
    title: '',
    description: '',
    author: '',
    role: '',
    imageUrl: '',
    videoUrl: '',
    featured: false
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [videoOnly, setVideoOnly] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch all content on component mount
  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const contentItems = await getAllContent();
      setContents(contentItems);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(language === 'fr' 
        ? 'Échec du chargement du contenu. Veuillez réessayer.' 
        : 'Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showAddForm || editingId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddForm, editingId]);

  // Set videoOnly state when video is selected or cleared
  useEffect(() => {
    setVideoOnly(!!videoPreview);
  }, [videoPreview]);

  const uploadToFirebase = async (file: File, folder: string): Promise<string> => {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `${folder}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file to Firebase:', error);
      throw new Error(language === 'fr' ? 'Erreur lors du téléchargement du fichier' : 'Error uploading file');
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadError(language === 'fr' 
          ? "L'image ne doit pas dépasser 5MB" 
          : "Image must not exceed 5MB");
        return;
      }

      if (!file.type.startsWith('image/')) {
        setUploadError(language === 'fr'
          ? 'Veuillez sélectionner un fichier image valide'
          : 'Please select a valid image file');
        return;
      }

      setIsUploadingImage(true);
      setUploadError('');

      try {
        const downloadURL = await uploadToFirebase(file, 'content/images');
        setSelectedImage(file);
        setImagePreview(downloadURL);
        setNewContent({ ...newContent, imageUrl: downloadURL });
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : (language === 'fr' 
          ? "Erreur lors du téléchargement de l'image" 
          : 'Error uploading image'));
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setUploadError(language === 'fr'
          ? 'La vidéo ne doit pas dépasser 50MB'
          : 'Video must not exceed 50MB');
        return;
      }

      if (!file.type.startsWith('video/')) {
        setUploadError(language === 'fr'
          ? 'Veuillez sélectionner un fichier vidéo valide'
          : 'Please select a valid video file');
        return;
      }

      setIsUploadingVideo(true);
      setUploadError('');

      try {
        const downloadURL = await uploadToFirebase(file, 'content/videos');
        setSelectedVideo(file);
        setVideoPreview(downloadURL);
        setNewContent({ ...newContent, videoUrl: downloadURL });
        
        // If no image is selected and we're uploading a video, generate a placeholder image
        if (!newContent.imageUrl && !imagePreview) {
          // Create a video element to extract thumbnail
          const video = document.createElement('video');
          video.src = downloadURL;
          video.crossOrigin = 'anonymous';
          video.muted = true;
          
          // Try to extract thumbnail from video
          video.onloadeddata = async () => {
            try {
              // Play the video briefly to load a frame
              video.currentTime = 1; // Seek to 1 second
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Create a canvas to capture the frame
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              
              // Draw the video frame to the canvas
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Convert canvas to blob
                canvas.toBlob(async (blob) => {
                  if (blob) {
                    // Upload the blob as an image
                    const thumbnailFile = new File([blob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    try {
                      const thumbnailUrl = await uploadToFirebase(thumbnailFile, 'content/thumbnails');
                      setImagePreview(thumbnailUrl);
                      setNewContent(prev => ({ ...prev, imageUrl: thumbnailUrl }));
                    } catch (error) {
                      console.error('Error uploading thumbnail:', error);
                      // Use a default placeholder if thumbnail extraction fails
                      const placeholderImage = "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1";
                      setImagePreview(placeholderImage);
                      setNewContent(prev => ({ ...prev, imageUrl: placeholderImage }));
                    }
                  }
                }, 'image/jpeg', 0.8);
              }
            } catch (error) {
              console.error('Error extracting thumbnail:', error);
              // Use a default placeholder if thumbnail extraction fails
              const placeholderImage = "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1";
              setImagePreview(placeholderImage);
              setNewContent(prev => ({ ...prev, imageUrl: placeholderImage }));
            }
          };
          
          video.onerror = () => {
            // Use a default placeholder if video loading fails
            const placeholderImage = "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1";
            setImagePreview(placeholderImage);
            setNewContent(prev => ({ ...prev, imageUrl: placeholderImage }));
          };
          
          // Load the video
          video.load();
        }
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : (language === 'fr'
          ? 'Erreur lors du téléchargement de la vidéo'
          : 'Error uploading video'));
      } finally {
        setIsUploadingVideo(false);
      }
    }
  };

  const handleEdit = (content: ContentItem) => {
    setEditingId(content.id);
    setNewContent(content);
    setImagePreview(content.imageUrl);
    setVideoPreview(content.videoUrl || '');
    setVideoOnly(!!content.videoUrl);
  };

  const handleSave = async (id: string) => {
    // Validate required fields
    if (!newContent.title || !newContent.description || !newContent.author) {
      setUploadError(language === 'fr'
        ? 'Veuillez remplir tous les champs obligatoires'
        : 'Please fill all required fields');
      return;
    }
    
    // Validate that either image or video is provided
    if (!newContent.imageUrl && !newContent.videoUrl) {
      setUploadError(language === 'fr'
        ? 'Veuillez télécharger une image ou une vidéo'
        : 'Please upload either an image or a video');
      return;
    }
    
    setIsSaving(true);
    
    try {
      await updateContent(id, newContent as Partial<ContentItem>);
      
      // Update local state
      setContents(contents.map(content => 
        content.id === id ? { ...content, ...newContent } as ContentItem : content
      ));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error('Error updating content:', error);
      setUploadError(language === 'fr'
        ? 'Échec de la mise à jour du contenu. Veuillez réessayer.'
        : 'Failed to update content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    // Validate required fields
    if (!newContent.title || !newContent.description || !newContent.author) {
      setUploadError(language === 'fr'
        ? 'Veuillez remplir tous les champs obligatoires'
        : 'Please fill all required fields');
      return;
    }
    
    // Validate that either image or video is provided
    if (!newContent.imageUrl && !newContent.videoUrl) {
      setUploadError(language === 'fr'
        ? 'Veuillez télécharger une image ou une vidéo'
        : 'Please upload either an image or a video');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const contentId = await createContent(newContent as Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>);
      
      // Fetch updated content list to ensure we have the server-generated fields
      await fetchContent();
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error('Error adding content:', error);
      setUploadError(language === 'fr'
        ? 'Échec de l\'ajout du contenu. Veuillez réessayer.'
        : 'Failed to add content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'fr' 
      ? 'Êtes-vous sûr de vouloir supprimer ce contenu ?' 
      : 'Are you sure you want to delete this content?')) {
      return;
    }
    
    try {
      await deleteContent(id);
      setContents(contents.filter(content => content.id !== id));
    } catch (error) {
      console.error('Error deleting content:', error);
      alert(language === 'fr'
        ? 'Échec de la suppression du contenu. Veuillez réessayer.'
        : 'Failed to delete content. Please try again.');
    }
  };

  const resetForm = () => {
    setNewContent({ 
      type: 'testimonial',
      title: '',
      description: '',
      author: '',
      role: '',
      imageUrl: '',
      videoUrl: '',
      featured: false
    });
    setSelectedImage(null);
    setSelectedVideo(null);
    setImagePreview('');
    setVideoPreview('');
    setUploadError('');
    setVideoOnly(false);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-4 text-lg text-gray-600">
              {language === 'fr' ? 'Chargement du contenu...' : 'Loading content...'}
            </span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {language === 'fr' ? 'Gestion du contenu' : 'Content Management'}
          </h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Ajouter du contenu' : 'Add Content'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
            <button 
              onClick={fetchContent}
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Réessayer' : 'Retry'}
            </button>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {(showAddForm || editingId) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingId 
                    ? (language === 'fr' ? 'Modifier le contenu' : 'Edit Content')
                    : (language === 'fr' ? 'Ajouter du contenu' : 'Add Content')}
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 flex-1">
                {uploadError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {uploadError}
                  </div>
                )}

                {saveSuccess && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {language === 'fr' 
                      ? 'Contenu enregistré avec succès !' 
                      : 'Content saved successfully!'}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Type de contenu' : 'Content Type'}
                    </label>
                    <select
                      value={newContent.type}
                      onChange={(e) => setNewContent({ ...newContent, type: e.target.value as 'testimonial' | 'health-tip' })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="testimonial">{language === 'fr' ? 'Témoignage' : 'Testimonial'}</option>
                      <option value="health-tip">{language === 'fr' ? 'Conseil santé' : 'Health Tip'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Titre' : 'Title'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newContent.title || ''}
                      onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Description' : 'Description'} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newContent.description || ''}
                      onChange={(e) => setNewContent({ ...newContent, description: e.target.value })}
                      rows={3}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Auteur' : 'Author'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newContent.author || ''}
                      onChange={(e) => setNewContent({ ...newContent, author: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Rôle/Titre' : 'Role/Title'}
                    </label>
                    <input
                      type="text"
                      value={newContent.role || ''}
                      onChange={(e) => setNewContent({ ...newContent, role: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={newContent.featured || false}
                      onChange={(e) => setNewContent({ ...newContent, featured: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                      {language === 'fr' ? 'Mis en avant sur la page d\'accueil' : 'Featured on homepage'}
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Vidéo' : 'Video'}
                    </label>
                    <div className="mt-1 flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={isUploadingVideo}
                        className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploadingVideo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                            {language === 'fr' ? 'Téléchargement...' : 'Uploading...'}
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4 mr-2" />
                            {language === 'fr' ? 'Choisir une vidéo' : 'Choose a video'}
                          </>
                        )}
                      </button>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="hidden"
                        disabled={isUploadingVideo}
                      />
                      {videoPreview && (
                        <div className="relative">
                          <video
                            src={videoPreview}
                            className="h-20 w-20 object-cover rounded"
                            controls
                          />
                          <button
                            onClick={() => {
                              setVideoPreview('');
                              setSelectedVideo(null);
                              setNewContent({ ...newContent, videoUrl: '' });
                              setVideoOnly(false);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {language === 'fr'
                        ? 'Format MP4, WebM. Taille maximale 50MB. La vidéo sera stockée dans Firebase Storage.'
                        : 'MP4, WebM format. Max size 50MB. The video will be stored in Firebase Storage.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Image' : 'Image'}
                      {!videoOnly && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                      {videoOnly && (
                        <span className="text-gray-500 text-xs ml-2">
                          {language === 'fr' ? '(générée automatiquement à partir de la vidéo)' : '(automatically generated from video)'}
                        </span>
                      )}
                    </label>
                    <div className="mt-1 flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploadingImage || videoOnly}
                        className={`px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 flex items-center ${
                          isUploadingImage || videoOnly ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isUploadingImage ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                            {language === 'fr' ? 'Téléchargement...' : 'Uploading...'}
                          </>
                        ) : (
                          <>
                            <Image className="h-4 w-4 mr-2" />
                            {language === 'fr' ? 'Choisir une image' : 'Choose an image'}
                          </>
                        )}
                      </button>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={isUploadingImage || videoOnly}
                      />
                      {imagePreview && (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-20 w-20 object-cover rounded"
                          />
                          <button
                            onClick={() => {
                              // Only allow removing the image if there's no video
                              if (!videoOnly) {
                                setImagePreview('');
                                setSelectedImage(null);
                                setNewContent({ ...newContent, imageUrl: '' });
                              }
                            }}
                            className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 ${
                              videoOnly ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={videoOnly}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {language === 'fr' 
                        ? 'Format JPG, PNG. Taille maximale 5MB. L\'image sera stockée dans Firebase Storage.'
                        : 'JPG, PNG format. Max size 5MB. The image will be stored in Firebase Storage.'}
                    </p>
                    {videoOnly && (
                      <p className="mt-1 text-sm text-blue-500">
                        {language === 'fr' 
                          ? 'Une miniature a été générée automatiquement à partir de la vidéo.'
                          : 'A thumbnail has been automatically generated from the video.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t p-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={() => editingId ? handleSave(editingId) : handleAdd()}
                  disabled={isUploadingImage || isUploadingVideo || isSaving}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSaving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {language === 'fr' ? 'Enregistrement...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingId 
                        ? (language === 'fr' ? 'Enregistrer les modifications' : 'Save Changes')
                        : (language === 'fr' ? 'Ajouter le contenu' : 'Add Content')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content List */}
        {contents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {language === 'fr' ? 'Aucun contenu pour le moment' : 'No content yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {language === 'fr' 
                ? 'Commencez par ajouter votre premier élément de contenu'
                : 'Get started by adding your first content item'}
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Ajouter du contenu' : 'Add Content'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contents.map((content) => (
              <div
                key={content.id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={content.imageUrl}
                    alt={content.title}
                    className="w-full h-48 object-cover"
                  />
                  {content.videoUrl && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        <Play className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  )}
                  {content.featured && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 text-xs font-bold rounded">
                      {language === 'fr' ? 'Mis en avant' : 'Featured'}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      onClick={() => handleEdit(content)}
                      className="p-2 bg-white rounded-full text-blue-500 hover:text-blue-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(content.id)}
                      className="p-2 bg-white rounded-full text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full mb-2 bg-blue-100 text-blue-800">
                    {content.type === 'testimonial' 
                      ? (language === 'fr' ? 'Témoignage' : 'Testimonial')
                      : (language === 'fr' ? 'Conseil santé' : 'Health Tip')}
                  </span>
                  <h3 className="font-semibold text-lg mb-2">{content.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{content.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{content.author}</p>
                      <p className="text-sm text-gray-500">{content.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminContent;