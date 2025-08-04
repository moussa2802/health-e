import React, { useState, useEffect } from 'react';
import { Search, Filter, Send, Users, User, Check, X, Plus } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { 
  subscribeToConversations, 
  subscribeToMessages, 
  sendMessage, 
  getOrCreateConversation,
  searchUsers,
  sendBroadcastMessage,
  type Message,
  type Conversation 
} from '../../services/messageService';

interface Professional {
  id: string;
  name: string;
  specialty: string;
  type: 'mental' | 'sexual';
  languages: string[];
  isActive: boolean;
  lastSeen?: string;
}

const AdminMessages: React.FC = () => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Array<{id: string, name: string, type: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Broadcast message state
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'all' | 'professional' | 'patient'>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const specialties = ['Psychologue', 'Psychiatre', 'Sexologue', 'Gynécologue', 'Urologue'];

  // S'abonner aux conversations de l'admin
  useEffect(() => {
    if (!currentUser?.id) return;

    setLoading(true);
    
    const unsubscribe = subscribeToConversations(
      currentUser.id,
      (conversationsData) => {
        setConversations(conversationsData);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.id]);

  // S'abonner aux messages de la conversation sélectionnée
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(
      selectedConversation.id,
      (messagesData) => {
        setMessages(messagesData);
      }
    );

    return unsubscribe;
  }, [selectedConversation]);

  // Rechercher des utilisateurs
  useEffect(() => {
    if (searchTerm.length >= 2 && currentUser) {
      searchUsers(searchTerm, currentUser.id, 'admin')
        .then(setUserSearchResults)
        .catch(console.error);
    } else {
      setUserSearchResults([]);
    }
  }, [searchTerm, currentUser]);

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || !currentUser || sendingMessage) return;

    setSendingMessage(true);
    try {
      await sendMessage(
        selectedConversation.id,
        currentUser.id,
        currentUser.name,
        'admin',
        newMessage.trim()
      );
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStartNewConversation = async (targetUser: {id: string, name: string, type: string}) => {
    if (!currentUser) return;

    try {
      const conversationId = await getOrCreateConversation(
        currentUser.id,
        currentUser.name,
        'admin',
        targetUser.id,
        targetUser.name,
        targetUser.type as any
      );

      // Trouver la conversation dans la liste
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
      }

      setShowNewMessageModal(false);
      setSearchTerm('');
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Erreur lors de la création de la conversation');
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim() || !currentUser || sendingBroadcast) return;

    setSendingBroadcast(true);
    try {
      await sendBroadcastMessage(
        currentUser.id,
        currentUser.name,
        broadcastMessage.trim(),
        broadcastType,
        selectedSpecialty || undefined
      );
      
      setBroadcastMessage('');
      setBroadcastType('all');
      setSelectedSpecialty('');
      setShowBroadcastModal(false);
      alert('Message de diffusion envoyé avec succès !');
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert('Erreur lors de l\'envoi du message de diffusion');
    } finally {
      setSendingBroadcast(false);
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

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg text-gray-600">Chargement des conversations...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Messagerie administrative</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
            >
              <Users className="h-4 w-4 mr-2" />
              Message de diffusion
            </button>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau message
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des conversations */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Conversations</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Aucune conversation
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation);
                    if (!otherParticipant) return null;

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 ${
                          selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{otherParticipant.name}</h3>
                            <p className="text-sm text-gray-500 capitalize">
                              {otherParticipant.type === 'professional' ? 'Professionnel' : 'Patient'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Zone de chat */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden h-[600px] flex flex-col">
              {selectedConversation ? (
                <>
                  {/* En-tête */}
                  <div className="p-4 border-b border-gray-200">
                    {(() => {
                      const otherParticipant = getOtherParticipant(selectedConversation);
                      return otherParticipant ? (
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <h2 className="font-medium">{otherParticipant.name}</h2>
                            <p className="text-sm text-gray-500 capitalize">
                              {otherParticipant.type === 'professional' ? 'Professionnel' : 'Patient'}
                            </p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                        disabled={sendingMessage}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sendingMessage}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingMessage ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-500">Sélectionnez une conversation pour commencer</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal nouveau message */}
        {showNewMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Nouveau message</h2>
                <button
                  onClick={() => setShowNewMessageModal(false)}
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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tapez un nom..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {userSearchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {userSearchResults.map((user) => (
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
                            {user.type === 'professional' ? 'Professionnel' : 'Patient'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchTerm.length >= 2 && userSearchResults.length === 0 && (
                  <p className="text-gray-500 text-sm">Aucun utilisateur trouvé</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal message de diffusion */}
        {showBroadcastModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Message de diffusion</h2>
                <button
                  onClick={() => setShowBroadcastModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destinataires
                  </label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value as any)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="all">Tous les utilisateurs</option>
                    <option value="professional">Tous les professionnels</option>
                    <option value="patient">Tous les patients</option>
                  </select>
                </div>

                {broadcastType === 'professional' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Spécialité (optionnel)
                    </label>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Toutes les spécialités</option>
                      {specialties.map((specialty) => (
                        <option key={specialty} value={specialty}>
                          {specialty}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Votre message de diffusion..."
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSendBroadcast}
                    disabled={!broadcastMessage.trim() || sendingBroadcast}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingBroadcast ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      'Envoyer à tous'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;