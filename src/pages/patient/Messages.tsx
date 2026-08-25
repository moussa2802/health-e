import React from 'react';
import MessagingCenter from '../../components/messaging/MessagingCenter';

const Messages: React.FC = () => {
  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-ink mb-6">Messages</h1>
        <MessagingCenter />
      </div>
    </div>
  );
};

export default Messages;