import { useState } from 'react';
import Header from '@/components/Header';
import LandingHero from '@/components/LandingHero';
import SuggestionsSection from '@/components/SuggestionsSection';
import DriveSection from '@/components/DriveSection';
import BusinessSection from '@/components/BusinessSection';
import SafetySection from '@/components/SafetySection';
import Footer from '@/components/Footer';
import AuthModalWrapper from '@/components/auth/AuthModalWrapper';
import FavoritesSheet from '@/components/FavoritesSheet';
import RideHistorySheet from '@/components/RideHistorySheet';

const Index = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const handleGetStarted = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onLoginClick={handleLoginClick} 
        onSignupClick={handleSignupClick}
        onFavoritesClick={() => setFavoritesOpen(true)}
        onHistoryClick={() => setHistoryOpen(true)}
      />
      
      <main>
        <LandingHero onGetStarted={handleGetStarted} />
        <SuggestionsSection />
        <DriveSection />
        <BusinessSection />
        <SafetySection />
      </main>

      <Footer />

      <AuthModalWrapper
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={handleSwitchMode}
      />

      <FavoritesSheet
        isOpen={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
      />

      <RideHistorySheet
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
};

export default Index;
