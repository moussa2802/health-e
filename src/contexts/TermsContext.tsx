import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import TermsAgreementModal from '../components/modals/TermsAgreementModal';

interface TermsContextType {
  hasAgreedToTerms: boolean;
  setHasAgreedToTerms: (agreed: boolean) => void;
  showTermsModal: boolean;
  setShowTermsModal: (show: boolean) => void;
}

const TermsContext = createContext<TermsContextType | undefined>(undefined);

interface TermsProviderProps {
  children: ReactNode;
}

export const TermsProvider: React.FC<TermsProviderProps> = ({ children }) => {
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  
  // Check if user has already agreed to terms
  useEffect(() => {
    const termsAgreement = localStorage.getItem('health-e-terms-agreement');
    if (termsAgreement) {
      try {
        const { agreed } = JSON.parse(termsAgreement);
        setHasAgreedToTerms(agreed);
      } catch (error) {
        console.error('Error parsing terms agreement:', error);
        setHasAgreedToTerms(false);
      }
    } else {
      setHasAgreedToTerms(false);
    }
  }, []);
  
  const handleAcceptTerms = () => {
    // Save agreement to localStorage without expiration
    localStorage.setItem('health-e-terms-agreement', JSON.stringify({
      agreed: true,
      timestamp: Date.now()
    }));
    
    setHasAgreedToTerms(true);
    setShowTermsModal(false);
  };
  
  return (
    <TermsContext.Provider
      value={{
        hasAgreedToTerms,
        setHasAgreedToTerms,
        showTermsModal,
        setShowTermsModal
      }}
    >
      {children}
      <TermsAgreementModal 
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleAcceptTerms}
      />
    </TermsContext.Provider>
  );
};

export const useTerms = (): TermsContextType => {
  const context = useContext(TermsContext);
  if (context === undefined) {
    throw new Error('useTerms must be used within a TermsProvider');
  }
  return context;
};