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
      case 'open': return 'bg-gold-soft text-gold';
      case 'in_progress': return 'bg-sage-soft text-sage';
      case 'resolved': return 'bg-ok/15 text-ok';
      case 'closed': return 'bg-paper text-ink-soft';
      default: return 'bg-paper text-ink-soft';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-danger/10 text-danger';
      case 'high': return 'bg-accent-soft text-accent';
      case 'medium': return 'bg-gold-soft text-gold';
      case 'low': return 'bg-ok/15 text-ok';
      default: return 'bg-paper text-ink-soft';
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
            <div className="bg-card rounded-card shadow-soft p-4 text-center">
              <div className="font-display text-2xl font-bold text-ink">{statistics.total}</div>
              <div className="text-sm text-ink-soft">Total</div>
            </div>
            <div className="bg-card rounded-card shadow-soft p-4 text-center">
              <div className="font-display text-2xl font-bold text-gold">{statistics.open}</div>
              <div className="text-sm text-ink-soft">Ouverts</div>
            </div>
            <div className="bg-card rounded-card shadow-soft p-4 text-center">
              <div className="font-display text-2xl font-bold text-sage">{statistics.inProgress}</div>
              <div className="text-sm text-ink-soft">En cours</div>
            </div>
            <div className="bg-card rounded-card shadow-soft p-4 text-center">
              <div className="font-display text-2xl font-bold text-ok">{statistics.resolved}</div>
              <div className="text-sm text-ink-soft">Résolus</div>
            </div>
            <div className="bg-card rounded-card shadow-soft p-4 text-center">
              <div className="font-display text-2xl font-bold text-muted">{statistics.closed}</div>
              <div className="text-sm text-ink-soft">Fermés</div>
            </div>
            <div className="bg-card rounded-card shadow-soft p-4 text-center">
              <div className="font-display text-2xl font-bold text-danger">{statistics.urgent}</div>
              <div className="text-sm text-ink-soft">Urgents</div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-card rounded-card shadow-soft p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted" />
              <span className="text-sm font-medium text-ink-soft">Filtres:</span>
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-line rounded-card text-sm bg-card text-ink-soft"
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
              className="px-3 py-2 border border-line rounded-card text-sm bg-card text-ink-soft"
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
              className="px-3 py-2 border border-line rounded-card text-sm bg-card text-ink-soft"
            >
              <option value="all">Toutes catégories</option>
              <option value="technical">Technique</option>
              <option value="billing">Facturation</option>
              <option value="account">Compte</option>
              <option value="consultation">Consultation</option>
              <option value="other">Autre</option>
            </select>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="flex-1 px-3 py-2 border border-line rounded-card text-sm bg-card text-ink"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-6 h-[600px]">
          {/* Liste des tickets */}
          <div className="w-1/3 bg-card rounded-block shadow-soft overflow-hidden">
            <div className="p-4 border-b border-line bg-paper">
              <h3 className="font-semibold text-ink">
                Tickets ({filteredTickets.length})
              </h3>
            </div>

            <div className="overflow-y-auto h-full">
              {filteredTickets.length === 0 ? (
                <div className="p-6 text-center text-muted">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-line" />
                  <p>Aucun ticket trouvé</p>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => handleTicketSelect(ticket)}
                      className={`p-4 cursor-pointer hover:bg-paper transition-colors ${
                        selectedTicket?.id === ticket.id ? 'bg-accent-soft border-r-2 border-accent' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-ink text-sm line-clamp-1">
                          {ticket.subject}
                        </h4>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(ticket.status)}
                          <span className={`px-2 py-1 text-xs rounded-pill ${getStatusColor(ticket.status)}`}>
                            {ticket.status === 'open' ? 'Ouvert' :
                             ticket.status === 'in_progress' ? 'En cours' :
                             ticket.status === 'resolved' ? 'Résolu' : 'Fermé'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-pill ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority === 'urgent' ? 'Urgent' :
                           ticket.priority === 'high' ? 'Élevée' :
                           ticket.priority === 'medium' ? 'Moyenne' : 'Faible'}
                        </span>
                        <span className="text-xs text-muted">
                          {ticket.category === 'technical' ? 'Technique' :
                           ticket.category === 'billing' ? 'Facturation' :
                           ticket.category === 'account' ? 'Compte' :
                           ticket.category === 'consultation' ? 'Consultation' : 'Autre'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted mb-2">
                        <User className="h-3 w-3" />
                        <span>{ticket.userName}</span>
                        <span>•</span>
                        <span>{ticket.userType === 'patient' ? 'Patient' : 'Professionnel'}</span>
                      </div>

                      <p className="text-xs text-muted">
                        {formatDate(ticket.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Détails du ticket et messages */}
          <div className="flex-1 bg-card rounded-block shadow-soft overflow-hidden">
            {selectedTicket ? (
              <>
                {/* Header du ticket */}
                <div className="p-4 border-b border-line bg-paper">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-ink mb-1">
                        {selectedTicket.subject}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-ink-soft">
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
                        className="px-3 py-2 border border-line rounded-card text-sm bg-card text-ink-soft"
                      >
                        <option value="open">Ouvert</option>
                        <option value="in_progress">En cours</option>
                        <option value="resolved">Résolu</option>
                        <option value="closed">Fermé</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-sm rounded-pill ${getPriorityColor(selectedTicket.priority)}`}>
                      Priorité: {selectedTicket.priority === 'urgent' ? 'Urgente' :
                                selectedTicket.priority === 'high' ? 'Élevée' :
                                selectedTicket.priority === 'medium' ? 'Moyenne' : 'Faible'}
                    </span>
                    <span className={`px-3 py-1 text-sm rounded-pill ${getStatusColor(selectedTicket.status)}`}>
                      Statut: {selectedTicket.status === 'open' ? 'Ouvert' :
                               selectedTicket.status === 'in_progress' ? 'En cours' :
                               selectedTicket.status === 'resolved' ? 'Résolu' : 'Fermé'}
                    </span>
                    <span className="px-3 py-1 text-sm bg-paper text-ink-soft rounded-pill">
                      <Tag className="h-3 w-3 inline mr-1" />
                      {selectedTicket.category === 'technical' ? 'Technique' :
                       selectedTicket.category === 'billing' ? 'Facturation' :
                       selectedTicket.category === 'account' ? 'Compte' :
                       selectedTicket.category === 'consultation' ? 'Consultation' : 'Autre'}
                    </span>
                  </div>

                  {selectedTicket.description && (
                    <div className="mt-3 p-3 bg-paper rounded-card">
                      <p className="text-sm text-ink-soft">{selectedTicket.description}</p>
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
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-card ${
                            message.senderType === 'admin'
                              ? 'bg-ink text-white'
                              : 'bg-paper text-ink'
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
                <div className="p-4 border-t border-line">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Tapez votre réponse..."
                      className="flex-1 px-3 py-2 border border-line rounded-card focus:outline-none focus:ring-2 focus:ring-accent"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="px-4 py-2 bg-accent text-white rounded-card hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Reply className="h-4 w-4" />
                      {sendingMessage ? 'Envoi...' : 'Répondre'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-line" />
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