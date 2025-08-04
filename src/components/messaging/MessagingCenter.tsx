import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Send, ChevronLeft, X, Plus, User, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { 
  subscribeToConversations, 
  subscribeToMessages, 
  sendMessage, 
  getOrCreateConversation,
  markMessagesAsRead,
  searchUsers,
  clearMessageCaches,
  type Message,
  type Conversation 
} from '../../services/messageService';
import LoadingSpinner from '../ui/LoadingSpinner';
import { ensureFirestoreReady, resetFirestoreConnection } from '../../utils/firebase';

const MessagingCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setUserSearchResults] = useState<Array<{id: string, name: string, type: string, profileImage?: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const unsubscribeConversations = useRef<(() => void) | null>(null);
  const unsubscribeMessages = useRef<(() => void) | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Surveiller l'état de la connexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError(null);
      console.log('🌐 Connection restored');
      
      // Ensure Firestore is ready when connection is restored
      ensureFirestoreReady()
        .then(() => {
          console.log('✅ Firestore ready after connection restored');
        })
        .catch(error => {
          console.warn('⚠️ Failed to ensure Firestore is ready after connection restored:', error);
        });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setError('Connexion internet perdue. Reconnexion automatique en cours...');
      console.log('📡 Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // S'abonner aux conversations de l'utilisateur avec gestion d'erreur améliorée
   useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    console.log('🔔 Setting up conversations subscription...');
    setLoading(true);
    setError(null);
    
    // Clean up any existing subscription
    if (unsubscribeConversations.current) {
      console.log('🧹 Cleaning up existing conversations subscription');
      unsubscribeConversations.current();
      unsubscribeConversations.current = null;
    }
    
    // CRITICAL: Ensure Firestore is ready before setting up subscription
    ensureFirestoreReady()
      .then(() => {
        console.log('✅ Firestore ready for conversations subscription');
      })
      .catch(error => {
        console.warn('⚠️ Failed to ensure Firestore is ready before conversations subscription:', error);
      })
      .finally(() => {
        try {
          unsubscribeConversations.current = subscribeToConversations(
            currentUser.id,
            (conversationsData) => {
              console.log(`✅ Received ${conversationsData.length} conversations`);
              setConversations(conversationsData);
              console.log('📨 Conversations reçues :', conversationsData);
              setLoading(false);
              setError(null);
              setRetryCount(0);
            }
          );

          // Timeout de sécurité pour arrêter le loading si rien ne se passe
          const timeoutId = setTimeout(() => {
  if (loading) {
    if (conversations.length === 0) {
      console.log('✅ Aucune conversation trouvée, arrêt du chargement sans erreur');
      setLoading(false); // On arrête le loading même si le tableau est vide
    } else {
      console.warn('⚠️ Conversations loading timeout');
      setLoading(false);
      setError('Chargement lent détecté. Vérifiez votre connexion internet.');
    }
  }
}, 15000); // ou un autre délai si tu veux (10-15s)

          return () => {
            clearTimeout(timeoutId);
            if (unsubscribeConversations.current) {
              unsubscribeConversations.current();
              unsubscribeConversations.current = null;
            }
          };
        } catch (error) {
          console.error('❌ Error setting up conversations subscription:', error);
          setLoading(false);
          setError('Erreur lors du chargement des conversations. Veuillez réessayer.');
        }
      });
      
    return () => {
      if (unsubscribeConversations.current) {
        unsubscribeConversations.current();
        unsubscribeConversations.current = null;
      }
    };
  }, [currentUser?.id, retryCount]);

  // S'abonner aux messages de la conversation sélectionnée
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    console.log('🔔 Setting up messages subscription for conversation:', selectedConversation.id);
    
    // Clean up any existing subscription
    if (unsubscribeMessages.current) {
      console.log('🧹 Cleaning up existing messages subscription');
      unsubscribeMessages.current();
      unsubscribeMessages.current = null;
    }

    // CRITICAL: Ensure Firestore is ready before setting up subscription
    ensureFirestoreReady()
      .then(() => {
        console.log('✅ Firestore ready for messages subscription');
        
        unsubscribeMessages.current = subscribeToMessages(
          selectedConversation.id,
          (messagesData) => {
            console.log(`✅ Received ${messagesData.length} messages`);
            setMessages(messagesData);
            // Marquer les messages comme lus
            if (currentUser?.id) {
              markMessagesAsRead(selectedConversation.id, currentUser.id);
            }
            
            // Scroll to bottom after messages are loaded
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          }
        );
      })
      .catch(error => {
        console.warn('⚠️ Failed to ensure Firestore is ready before messages subscription:', error);
        
        // Try to subscribe anyway
        unsubscribeMessages.current = subscribeToMessages(
          selectedConversation.id,
          (messagesData) => {
            console.log(`✅ Received ${messagesData.length} messages`);
            setMessages(messagesData);
            // Marquer les messages comme lus
            if (currentUser?.id) {
              markMessagesAsRead(selectedConversation.id, currentUser.id);
            }
            
            // Scroll to bottom after messages are loaded
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          }
        );
      });

    return () => {
      if (unsubscribeMessages.current) {
        unsubscribeMessages.current();
        unsubscribeMessages.current = null;
      }
    };
  }, [selectedConversation, currentUser?.id]);

  // Faire défiler vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Rechercher des utilisateurs avec debounce optimisé
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (userSearchTerm.length >= 2 && currentUser) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(userSearchTerm, currentUser.id, currentUser.type as any)
          .then(setUserSearchResults)
          .catch(error => {
            console.error('❌ Error searching users:', error);
            setUserSearchResults([]);
          });
      }, 300); // Debounce de 300ms
    } else {
      setUserSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [userSearchTerm, currentUser]);

  const handleRetry = async () => {
    console.log('🔄 Retrying conversations loading...');
    clearMessageCaches(); // Nettoyer les caches
    
    // CRITICAL: Reset Firestore connection before retrying
    try {
      // Reset Firestore connection first
      await resetFirestoreConnection();
      console.log('✅ Firestore connection reset before retry');
      
      // Then ensure it's ready
      await ensureFirestoreReady();
      console.log('✅ Firestore ready before retry');
    } catch (error) {
      console.warn('⚠️ Failed to reset/ensure Firestore before retry:', error);
    }
    
    setRetryCount(prev => prev + 1);
  };

  const filteredConversations = conversations.filter(conversation => {
    if (!currentUser?.id) return false;
    
    const otherParticipantId = conversation.participants.find(id => id !== currentUser.id);
    const otherParticipantName = otherParticipantId ? conversation.participantNames[otherParticipantId] : '';
    
    return otherParticipantName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || !currentUser || sendingMessage) return;

    setSendingMessage(true);
    try {
      // CRITICAL: Ensure Firestore is ready before sending message
      await ensureFirestoreReady();
      
      await sendMessage(
        selectedConversation.id,
        currentUser.id,
        currentUser.name,
        currentUser.type as any,
        newMessage.trim()
      );
      setNewMessage('');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStartNewConversation = async (targetUser: {id: string, name: string, type: string}) => {
    if (!currentUser) return;

    try {
      console.log('💬 Starting new conversation with:', targetUser.name);
      
      // CRITICAL: Ensure Firestore is ready before creating conversation
      await ensureFirestoreReady();
      
      const conversationId = await getOrCreateConversation(
        currentUser.id,
        currentUser.name,
        currentUser.type as any,
        targetUser.id,
        targetUser.name,
        targetUser.type as any
      );

      // Trouver la conversation dans la liste ou attendre qu'elle apparaisse
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        setShowMobileConversation(true);
      } else {
        // Si la conversation n'est pas encore dans la liste, on peut la créer temporairement
        const tempConversation: Conversation = {
          id: conversationId,
          participants: [currentUser.id, targetUser.id],
          participantNames: {
            [currentUser.id]: currentUser.name,
            [targetUser.id]: targetUser.name
          },
          participantTypes: {
            [currentUser.id]: currentUser.type as any,
            [targetUser.id]: targetUser.type as any
          },
          type: 'patient-professional',
          createdAt: new Date() as any,
          updatedAt: new Date() as any
        };
        setSelectedConversation(tempConversation);
        setShowMobileConversation(true);
      }

      setShowNewConversationModal(false);
      setUserSearchTerm('');
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      alert('Erreur lors de la création de la conversation. Veuillez réessayer.');
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (!currentUser?.id) return null;
    
    const otherParticipantId = conversation.participants.find(id => id !== currentUser.id);
    if (!otherParticipantId) return null;
    
    return {
      id: otherParticipantId,
      name: conversation.participantNames[otherParticipantId],
      type: conversation.participantTypes[otherParticipantId]
    };
  };

  const formatConversationTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 60) {
        return `${minutes}m`;
      } else if (hours < 24) {
        return `${hours}h`;
      } else {
        return `${days}j`;
      }
    } catch (error) {
      return '';
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] bg-white rounded-xl shadow-md overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg text-gray-600">Chargement des conversations...</p>
          <p className="mt-2 text-sm text-gray-500">
            {!isOnline ? 'Connexion internet requise' : 'Première connexion en cours, cela peut prendre quelques instants'}
          </p>
          <div className="mt-4 flex items-center justify-center">
            {isOnline ? (
              <div className="flex items-center text-green-600">
                <Wifi className="h-4 w-4 mr-1" />
                <span className="text-sm">En ligne</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <WifiOff className="h-4 w-4 mr-1" />
                <span className="text-sm">Hors ligne</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] bg-white rounded-xl shadow-md overflow-hidden flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Problème de chargement
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </button>
            <div className="flex items-center justify-center">
              {isOnline ? (
                <div className="flex items-center text-green-600">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span className="text-sm">Connexion active</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span className="text-sm">Pas de connexion internet</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-xl shadow-md overflow-hidden">
      <div className="flex h-full">
        {/* Liste des conversations */}
        <div className={`w-full md:w-1/3 border-r border-gray-200 ${
          showMobileConversation ? 'hidden md:block' : 'block'
        }`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Messages</h2>
              <div className="flex items-center space-x-2">
                {/* Indicateur de connexion */}
                <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                  isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </div>
                <button
                  onClick={() => setShowNewConversationModal(true)}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                  title="Nouvelle conversation"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une conversation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto h-[calc(100%-8rem)]">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {conversations.length === 0 ? (
                  <div>
                    <p className="mb-2">Aucune conversation</p>
                    <button
                      onClick={() => setShowNewConversationModal(true)}
                      className="text-blue-500 hover:text-blue-600 text-sm"
                    >
                      Démarrer une conversation
                    </button>
                  </div>
                ) : (
                  'Aucun résultat'
                )}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                if (!otherParticipant) return null;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      setShowMobileConversation(true);
                    }}
                    className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium truncate">{otherParticipant.name}</h3>
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatConversationTime(conversation.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm text-gray-500 capitalize">
                            {otherParticipant.type === 'professional' ? 'Professionnel' : 
                             otherParticipant.type === 'admin' ? 'Administrateur' : 'Patient'}
                          </p>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-500 truncate max-w-32">
                              {conversation.lastMessage.senderId === currentUser?.id ? 'Vous: ' : ''}
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Zone de chat */}
        <div className={`w-full md:w-2/3 flex flex-col ${
          !showMobileConversation ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedConversation ? (
            <>
              {/* En-tête du chat */}
              <div className="p-4 border-b border-gray-200 flex items-center">
                <button
                  onClick={() => setShowMobileConversation(false)}
                  className="md:hidden mr-2 text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
                <div className="ml-3 flex-1">
                  {(() => {
                    const otherParticipant = getOtherParticipant(selectedConversation);
                    return otherParticipant ? (
                      <>
                        <h2 className="font-medium">{otherParticipant.name}</h2>
                        <p className="text-sm text-gray-500 capitalize">
                          {otherParticipant.type === 'professional' ? 'Professionnel' : 
                           otherParticipant.type === 'admin' ? 'Administrateur' : 'Patient'}
                        </p>
                      </>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm">
                    Début de la conversation
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          message.senderId === currentUser?.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderId === currentUser?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Zone de saisie */}
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={sendingMessage || !isOnline}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage || !isOnline}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {sendingMessage ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </form>
                {!isOnline && (
                  <p className="text-xs text-red-500 mt-1">Connexion internet requise pour envoyer des messages</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <p className="text-gray-500 mb-4">Sélectionnez une conversation pour commencer</p>
                <button
                  onClick={() => setShowNewConversationModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Nouvelle conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nouvelle conversation */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Nouvelle conversation</h2>
              <button
                onClick={() => setShowNewConversationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rechercher un utilisateur
                </label>
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Tapez un nom..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartNewConversation(user)}
                      className="w-full p-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500 capitalize">
                          {user.type === 'professional' ? 'Professionnel' : 
                           user.type === 'admin' ? 'Administrateur' : 'Patient'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {userSearchTerm.length >= 2 && searchResults.length === 0 && (
                <p className="text-gray-500 text-sm">Aucun utilisateur trouvé</p>
              )}

              {userSearchTerm.length < 2 && (
                <p className="text-gray-500 text-sm">Tapez au moins 2 caractères pour rechercher</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingCenter;