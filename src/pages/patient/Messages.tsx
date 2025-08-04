import React from 'react';
import MessagingCenter from '../../components/messaging/MessagingCenter';

const Messages: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <MessagingCenter />
    </div>
  );
};

export default Messages;