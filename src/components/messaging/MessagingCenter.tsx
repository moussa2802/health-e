import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Search,
  Send,
  ChevronLeft,
  X,
  Plus,
  User,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  MessageCircle,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
} from "lucide-react";
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  getOrCreateConversation,
  markMessagesAsRead,
  searchUsers,
  clearMessageCaches,
  type Message,
  type Conversation,
} from "../../services/messageService";
import LoadingSpinner from "../ui/LoadingSpinner";
import {
  ensureFirestoreReady,
  resetFirestoreConnection,
} from "../../utils/firebase";

const MessagingCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] =
    useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [searchResults, setUserSearchResults] = useState<
    Array<{ id: string; name: string; type: string; profileImage?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      console.log("🌐 Connection restored");

      // Ensure Firestore is ready when connection is restored
      ensureFirestoreReady()
        .then(() => {
          console.log("✅ Firestore ready after connection restored");
        })
        .catch((error) => {
          console.warn(
            "⚠️ Failed to ensure Firestore is ready after connection restored:",
            error
          );
        });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setError(
        "Connexion internet perdue. Reconnexion automatique en cours..."
      );
      console.log("📡 Connection lost");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // S'abonner aux conversations de l'utilisateur avec gestion d'erreur améliorée
  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    console.log("🔔 Setting up conversations subscription...");
    setLoading(true);
    setError(null);

    // Clean up any existing subscription
    if (unsubscribeConversations.current) {
      console.log("🧹 Cleaning up existing conversations subscription");
      unsubscribeConversations.current();
      unsubscribeConversations.current = null;
    }

    // CRITICAL: Ensure Firestore is ready before setting up subscription
    ensureFirestoreReady()
      .then(() => {
        console.log("✅ Firestore ready for conversations subscription");
      })
      .catch((error) => {
        console.warn(
          "⚠️ Failed to ensure Firestore is ready before conversations subscription:",
          error
        );
      })
      .finally(() => {
        try {
          const unsubscribe = subscribeToConversations(
            currentUser.id,
            (conversations) => {
              console.log("✅ Received conversations:", conversations.length);
              setConversations(conversations);
              setLoading(false);
              setError(null);
            }
          );

          unsubscribeConversations.current = unsubscribe;
        } catch (error) {
          console.error(
            "❌ Failed to set up conversations subscription:",
            error
          );
          setError("Erreur lors de la configuration des conversations");
          setLoading(false);
        }
      });
  }, [currentUser?.id]);

  // S'abonner aux messages de la conversation sélectionnée
  useEffect(() => {
    if (!selectedConversation?.id || !currentUser?.id) {
      return;
    }

    console.log(
      "🔔 Setting up messages subscription for conversation:",
      selectedConversation.id
    );

    // Clean up any existing subscription
    if (unsubscribeMessages.current) {
      console.log("🧹 Cleaning up existing messages subscription");
      unsubscribeMessages.current();
      unsubscribeMessages.current = null;
    }

    try {
      const unsubscribe = subscribeToMessages(
        selectedConversation.id,
        (messages) => {
          console.log("✅ Received messages:", messages.length);
          setMessages(messages);

          // Marquer les messages comme lus
          if (messages.length > 0) {
            markMessagesAsRead(selectedConversation.id, currentUser.id);
          }
        }
      );

      unsubscribeMessages.current = unsubscribe;
    } catch (error) {
      console.error("❌ Failed to set up messages subscription:", error);
    }
  }, [selectedConversation?.id, currentUser?.id]);

  // Recherche d'utilisateurs
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (userSearchTerm.length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchUsers(
            userSearchTerm,
            currentUser?.id || "",
            currentUser?.type as "patient" | "professional" | "admin"
          );
          setUserSearchResults(results);
        } catch (error) {
          console.error("❌ Error searching users:", error);
          setUserSearchResults([]);
        }
      }, 300);
    } else {
      setUserSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [userSearchTerm, currentUser?.id, currentUser?.type]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeConversations.current) {
        unsubscribeConversations.current();
      }
      if (unsubscribeMessages.current) {
        unsubscribeMessages.current();
      }
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleRetry = async () => {
    setError(null);

    try {
      await resetFirestoreConnection();
      console.log("✅ Firestore connection reset");

      // Clear existing data
      setConversations([]);
      setMessages([]);
      setSelectedConversation(null);

      // Clear caches
      await clearMessageCaches();
      console.log("✅ Message caches cleared");

      // Force re-subscription by updating currentUser dependency
      // This will trigger the useEffect that sets up conversations subscription
    } catch (error) {
      console.error("❌ Error during retry:", error);
      setError("Erreur lors de la reconnexion");
    }
  };

  const handleSendMessage = async () => {
    if (
      !newMessage.trim() ||
      !selectedConversation ||
      !currentUser?.id ||
      sendingMessage
    ) {
      return;
    }

    setSendingMessage(true);
    try {
      await sendMessage(
        selectedConversation.id,
        currentUser.id,
        currentUser.name,
        currentUser.type as "patient" | "professional" | "admin",
        newMessage.trim()
      );
      setNewMessage("");
    } catch (error) {
      console.error("❌ Error sending message:", error);
      setError("Erreur lors de l'envoi du message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStartNewConversation = async (targetUser: {
    id: string;
    name: string;
    type: string;
  }) => {
    if (!currentUser?.id) return;

    try {
      const conversationId = await getOrCreateConversation(
        currentUser.id,
        currentUser.name,
        currentUser.type as "patient" | "professional" | "admin",
        targetUser.id,
        targetUser.name,
        targetUser.type as "patient" | "professional" | "admin"
      );

      // Trouver la conversation dans la liste
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        setShowNewConversationModal(false);
        setUserSearchTerm("");
        setUserSearchResults([]);
        setShowMobileConversation(true);
      }
    } catch (error) {
      console.error("❌ Error starting new conversation:", error);
      setError("Erreur lors de la création de la conversation");
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    const otherParticipantId = conversation.participants.find(
      (id) => id !== currentUser?.id
    );
    if (!otherParticipantId) return null;

    return {
      id: otherParticipantId,
      name:
        conversation.participantNames[otherParticipantId] ||
        "Utilisateur inconnu",
      type: conversation.participantTypes[otherParticipantId] || "unknown",
    };
  };

  const formatConversationTime = (timestamp: any) => {
    if (!timestamp) return "";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (diffInHours < 48) {
        return "Hier";
      } else {
        return date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
        });
      }
    } catch (error) {
      console.error("❌ Error formatting conversation time:", error);
      return "";
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("❌ Error formatting message time:", error);
      return "";
    }
  };

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchTerm) return true;

    const otherParticipant = getOtherParticipant(conversation);
    if (!otherParticipant) return false;

    return otherParticipant.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg text-gray-600">
            Chargement des conversations...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Erreur de connexion
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
    <div className="h-[calc(100vh-8rem)] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex h-full bg-white">
        {/* Liste des conversations - Colonne gauche */}
        <div
          className={`w-full md:w-1/3 bg-white border-r border-gray-100 ${
            showMobileConversation ? "hidden md:block" : "block"
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Messages</h2>
                  <p className="text-blue-100 text-sm">
                    {conversations.length} conversations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 text-sm font-medium">
                    En ligne
                  </span>
                </div>
                <button
                  onClick={() => setShowNewConversationModal(true)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <Plus className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-gray-900 placeholder-gray-500"
            />
          </div>

          {/* Liste des conversations */}
          <div className="overflow-y-auto h-[calc(100%-8rem)]">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {conversations.length === 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 mb-3">Aucune conversation</p>
                      <button
                        onClick={() => setShowNewConversationModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 text-sm font-medium"
                      >
                        Démarrer une conversation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Aucun résultat</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2">
                {filteredConversations.map((conversation) => {
                  const otherParticipant = getOtherParticipant(conversation);
                  if (!otherParticipant) return null;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        setShowMobileConversation(true);
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 rounded-xl transition-all duration-200 mb-2 ${
                        selectedConversation?.id === conversation.id
                          ? "bg-blue-50 border border-blue-200 shadow-sm"
                          : "hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {otherParticipant.name}
                            </h3>
                            {conversation.lastMessage && (
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {formatConversationTime(
                                  conversation.lastMessage.timestamp
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm text-gray-500 capitalize">
                              {otherParticipant.type === "professional"
                                ? "Professionnel"
                                : otherParticipant.type === "admin"
                                ? "Administrateur"
                                : "Patient"}
                            </p>
                            {conversation.lastMessage && (
                              <p className="text-sm text-gray-500 truncate max-w-32">
                                {conversation.lastMessage.senderId ===
                                currentUser?.id
                                  ? "Vous: "
                                  : ""}
                                {conversation.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Zone de chat - Colonne droite */}
        <div
          className={`w-full md:w-2/3 flex flex-col bg-white ${
            !showMobileConversation ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedConversation ? (
            <>
              {/* En-tête du chat */}
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center">
                  <button
                    onClick={() => setShowMobileConversation(false)}
                    className="md:hidden mr-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    {(() => {
                      const otherParticipant =
                        getOtherParticipant(selectedConversation);
                      return otherParticipant ? (
                        <>
                          <h2 className="font-semibold text-gray-900 text-lg">
                            {otherParticipant.name}
                          </h2>
                          <p className="text-sm text-gray-500 capitalize">
                            {otherParticipant.type === "professional"
                              ? "Professionnel"
                              : otherParticipant.type === "admin"
                              ? "Administrateur"
                              : "Patient"}
                          </p>
                        </>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200">
                      <Phone className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200">
                      <Video className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white"
              >
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-white rounded-2xl shadow-sm inline-block">
                      <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        Début de la conversation
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === currentUser?.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                          message.senderId === currentUser?.id
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">
                          {message.content}
                        </p>
                        <p
                          className={`text-xs mt-2 ${
                            message.senderId === currentUser?.id
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Zone de saisie */}
              <div className="p-6 border-t border-gray-100 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-3"
                >
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Écrivez votre message..."
                      className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      disabled={sendingMessage || !isOnline}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage || !isOnline}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {sendingMessage ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </form>
                {!isOnline && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                    Connexion internet requise pour envoyer des messages
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center max-w-md">
                <div className="p-6 bg-white rounded-2xl shadow-lg">
                  <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Sélectionnez une conversation
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Choisissez une conversation pour commencer à discuter
                  </p>
                  <button
                    onClick={() => setShowNewConversationModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Plus className="h-5 w-5" />
                    Nouvelle conversation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nouvelle conversation */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Nouvelle conversation
              </h2>
              <button
                onClick={() => setShowNewConversationModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechercher un utilisateur
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Tapez un nom..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartNewConversation(user)}
                      className="w-full p-4 text-left hover:bg-white transition-all duration-200 flex items-center space-x-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500 capitalize">
                          {user.type === "professional"
                            ? "Professionnel"
                            : user.type === "admin"
                            ? "Administrateur"
                            : "Patient"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {userSearchTerm.length >= 2 && searchResults.length === 0 && (
                <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-xl">
                  <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">Aucun utilisateur trouvé</p>
                </div>
              )}

              {userSearchTerm.length < 2 && (
                <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-xl">
                  <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">
                    Tapez au moins 2 caractères pour rechercher
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingCenter;
