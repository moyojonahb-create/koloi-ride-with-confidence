import { useState } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import SuggestionsSection from '@/components/SuggestionsSection';
import DriveSection from '@/components/DriveSection';
import BusinessSection from '@/components/BusinessSection';
import SafetySection from '@/components/SafetySection';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

const Index = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleLoginClick = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const handleSignupClick = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  const handleSwitchMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onLoginClick={handleLoginClick} 
        onSignupClick={handleSignupClick} 
      />
      
      <main>
        <HeroSection />
        <SuggestionsSection />
        <DriveSection />
        <BusinessSection />
        <SafetySection />
      </main>

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={handleSwitchMode}
      />
    </div>
  );
};

export default Index;
