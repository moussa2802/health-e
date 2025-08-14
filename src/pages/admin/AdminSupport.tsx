import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Filter,
  Search,
  Eye,
  Reply,
  User,
  Mail,
  Calendar,
  Tag
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  getAllSupportTickets, 
  getTicketMessages, 
  addMessageToTicket, 
  updateTicketStatus,
  getSupportStatistics 
} from '../../services/supportService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const AdminSupport: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>(null);
  const [loading, setLoading] = useState(true);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    search: ''
  });
  const [statistics, setStatistics] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Charger les tickets et statistiques
  useEffect(() => {
    loadData();
  }, []);

  // Filtrer les tickets quand les filtres changent
  useEffect(() => {
    filterTickets();
  }, [tickets, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, statsData] = await Promise.all([
        getAllSupportTickets(),
        getSupportStatistics()
      ]);
      setTickets(ticketsData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    if (filters.status !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === filters.category);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.subject.toLowerCase().includes(searchLower) ||
        ticket.userName.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTickets(filtered);
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const ticketMessages = await getTicketMessages(ticketId);
      setMessages(ticketMessages);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const handleTicketSelect = async (ticket: any) => {
    setSelectedTicket(ticket);
    setMessages(null);
    await loadMessages(ticket.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      setSendingMessage(true);
      
      await addMessageToTicket(
        selectedTicket.id,
        'admin', // ID de l'admin
        'admin',
        'Administrateur',
        newMessage.trim()
      );

      setNewMessage('');
      await loadMessages(selectedTicket.id);
      await loadData(); // Rafraîchir la liste des tickets
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusUpdate = async (ticketId: string, newStatus: string, adminNotes?: string) => {
    try {
      setUpdatingStatus(true);
      await updateTicketStatus(ticketId, newStatus as any, adminNotes);
      await loadData();
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    } finally {
      setUpdatingStatus(false);
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Statistiques */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{statistics.open}</div>
              <div className="text-sm text-gray-600">Ouverts</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.inProgress}</div>
              <div className="text-sm text-gray-600">En cours</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.resolved}</div>
              <div className="text-sm text-gray-600">Résolus</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{statistics.closed}</div>
              <div className="text-sm text-gray-600">Fermés</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.urgent}</div>
              <div className="text-sm text-gray-600">Urgents</div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtres:</span>
            </div>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="open">Ouverts</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolus</option>
              <option value="closed">Fermés</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Toutes priorités</option>
              <option value="urgent">Urgente</option>
              <option value="high">Élevée</option>
              <option value="medium">Moyenne</option>
              <option value="low">Faible</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Toutes catégories</option>
              <option value="technical">Technique</option>
              <option value="billing">Facturation</option>
              <option value="account">Compte</option>
              <option value="consultation">Consultation</option>
              <option value="other">Autre</option>
            </select>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-6 h-[600px]">
          {/* Liste des tickets */}
          <div className="w-1/3 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                Tickets ({filteredTickets.length})
              </h3>
            </div>
            
            <div className="overflow-y-auto h-full">
              {filteredTickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucun ticket trouvé</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => handleTicketSelect(ticket)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedTicket?.id === ticket.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                          {ticket.subject}
                        </h4>
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
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <User className="h-3 w-3" />
                        <span>{ticket.userName}</span>
                        <span>•</span>
                        <span>{ticket.userType === 'patient' ? 'Patient' : 'Professionnel'}</span>
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        {formatDate(ticket.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Détails du ticket et messages */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
            {selectedTicket ? (
              <>
                {/* Header du ticket */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {selectedTicket.subject}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {selectedTicket.userName} ({selectedTicket.userType === 'patient' ? 'Patient' : 'Professionnel'})
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {selectedTicket.userEmail}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(selectedTicket.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusUpdate(selectedTicket.id, e.target.value)}
                        disabled={updatingStatus}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="open">Ouvert</option>
                        <option value="in_progress">En cours</option>
                        <option value="resolved">Résolu</option>
                        <option value="closed">Fermé</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-sm rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                      Priorité: {selectedTicket.priority === 'urgent' ? 'Urgente' :
                                selectedTicket.priority === 'high' ? 'Élevée' :
                                selectedTicket.priority === 'medium' ? 'Moyenne' : 'Faible'}
                    </span>
                    <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedTicket.status)}`}>
                      Statut: {selectedTicket.status === 'open' ? 'Ouvert' :
                               selectedTicket.status === 'in_progress' ? 'En cours' :
                               selectedTicket.status === 'resolved' ? 'Résolu' : 'Fermé'}
                    </span>
                    <span className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full">
                      <Tag className="h-3 w-3 inline mr-1" />
                      {selectedTicket.category === 'technical' ? 'Technique' :
                       selectedTicket.category === 'billing' ? 'Facturation' :
                       selectedTicket.category === 'account' ? 'Compte' :
                       selectedTicket.category === 'consultation' ? 'Consultation' : 'Autre'}
                    </span>
                  </div>
                  
                  {selectedTicket.description && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{selectedTicket.description}</p>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: '400px' }}>
                  {messages ? (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderType === 'admin'
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
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <LoadingSpinner size="md" />
                    </div>
                  )}
                </div>

                {/* Input pour nouveau message */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Tapez votre réponse..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Reply className="h-4 w-4" />
                      {sendingMessage ? 'Envoi...' : 'Répondre'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Sélectionnez un ticket pour voir les détails</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;