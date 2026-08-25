import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display mb-8 text-3xl font-bold text-ink">Contactez-nous</h1>
        <div className="rounded-block border border-line bg-card p-6 shadow-soft sm:p-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display mb-4 text-xl font-semibold text-ink">Nos coordonnées</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="mr-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft">
                    <Mail className="h-4 w-4 text-accent" />
                  </span>
                  <span className="text-ink-soft">contact@health-e.com</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft">
                    <Phone className="h-4 w-4 text-accent" />
                  </span>
                  <span className="text-ink-soft">+221 XX XXX XX XX</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft">
                    <MapPin className="h-4 w-4 text-accent" />
                  </span>
                  <span className="text-ink-soft">Dakar, Sénégal</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-display mb-4 text-xl font-semibold text-ink">Formulaire de contact</h2>
              <p className="text-ink-soft">
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
