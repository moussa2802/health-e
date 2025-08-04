import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Contactez-nous</h1>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Nos coordonnées</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-blue-500 mr-3" />
                  <span>contact@health-e.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-blue-500 mr-3" />
                  <span>+221 XX XXX XX XX</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-blue-500 mr-3" />
                  <span>Dakar, Sénégal</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Formulaire de contact</h2>
              <p className="text-gray-600 mb-4">
                Cette fonctionnalité sera bientôt disponible. En attendant, vous pouvez nous contacter par email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;