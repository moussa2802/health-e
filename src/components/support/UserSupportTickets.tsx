import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { getUserSupportTickets, getTicketMessages, addMessageToTicket, markMessagesAsRead } from '../../services/supportService';
import { useAuth } from '../../contexts/AuthContext';
import SupportTicketForm from './SupportTicketForm';
import LoadingSpinner from '../ui/LoadingSpinner';

interface UserSupportTicketsProps {
  className?: string;
}

const UserSupportTickets: React.FC<UserSupportTicketsProps> = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Charger les tickets de l'utilisateur
  useEffect(() => {
    if (currentUser?.id) {
      loadTickets();
    }
  }, [currentUser?.id]);

  // Charger les messages quand un ticket est sélectionné
  useEffect(() => {
    if (selectedTicket?.id) {
      loadMessages(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const userTickets = await getUserSupportTickets(currentUser!.id);
      setTickets(userTickets);
    } catch (error) {
      console.error('Erreur lors du chargement des tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const ticketMessages = await getTicketMessages(ticketId);
      setMessages(ticketMessages);
      
      // Marquer les messages comme lus
      if (currentUser?.id) {
        await markMessagesAsRead(ticketId, currentUser.id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !currentUser) return;

    try {
      setSendingMessage(true);
      
      await addMessageToTicket(
        selectedTicket.id,
        currentUser.id,
        'user',
        currentUser.name || 'Utilisateur',
        newMessage.trim()
      );

      setNewMessage('');
      await loadMessages(selectedTicket.id);
      await loadTickets(); // Rafraîchir la liste des tickets
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (showForm) {
    return (
      <div className={className}>
        <SupportTicketForm
          onTicketCreated={() => {
            setShowForm(false);
            loadTickets();
          }}
          onClose={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Support et assistance
              </h2>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouveau ticket
            </button>
          </div>
        </div>

        <div className="flex h-96">
          {/* Liste des tickets */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="md" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Aucun ticket de support</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 text-blue-600 hover:text-blue-700"
                >
                  Créer votre premier ticket
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(ticket.status)}
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status === 'open' ? 'Ouvert' :
                           ticket.status === 'in_progress' ? 'En cours' :
                           ticket.status === 'resolved' ? 'Résolu' : 'Fermé'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority === 'urgent' ? 'Urgent' :
                         ticket.priority === 'high' ? 'Élevée' :
                         ticket.priority === 'medium' ? 'Moyenne' : 'Faible'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {ticket.category === 'technical' ? 'Technique' :
                         ticket.category === 'billing' ? 'Facturation' :
                         ticket.category === 'account' ? 'Compte' :
                         ticket.category === 'consultation' ? 'Consultation' : 'Autre'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages du ticket sélectionné */}
          <div className="flex-1 flex flex-col">
            {selectedTicket ? (
              <>
                {/* Header du ticket */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {selectedTicket.subject}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Créé le {formatDate(selectedTicket.createdAt)}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderType === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-xs opacity-75 mb-1">
                          {message.senderName} • {formatDate(message.timestamp)}
                        </div>
                        <p className="text-sm">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input pour nouveau message */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Tapez votre message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingMessage ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Sélectionnez un ticket pour voir les messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSupportTickets;
