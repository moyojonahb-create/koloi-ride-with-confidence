import { forwardRef } from 'react';
import { X } from 'lucide-react';
import KoloiLogo from '@/components/KoloiLogo';
import AuthForm from './AuthForm';

interface AuthModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSwitchMode: () => void;
}

const AuthModalWrapper = forwardRef<HTMLDivElement, AuthModalWrapperProps>(
  ({ isOpen, onClose, mode, onSwitchMode }, ref) => {
    if (!isOpen) return null;

    return (
      <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-card w-full max-w-md mx-4 rounded-2xl shadow-koloi-xl animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="w-9" />
            <KoloiLogo />
            <button 
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <AuthForm 
              mode={mode} 
              onSwitchMode={onSwitchMode}
              onSuccess={onClose}
            />

            {/* Terms */}
            <p className="text-xs text-muted-foreground mt-6 text-center">
              By proceeding, you agree to Koloi's{' '}
              <a href="#" className="underline hover:text-foreground">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    );
  }
);

AuthModalWrapper.displayName = 'AuthModalWrapper';

export default AuthModalWrapper;
