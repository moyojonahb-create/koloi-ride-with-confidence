import { useState } from 'react';
import { X, Mail, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KoloiLogo from '@/components/KoloiLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSwitchMode: () => void;
}

type AuthMethod = 'email' | 'phone';

const AuthModal = ({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) => {
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'select' | 'credentials' | 'otp'>('select');

  const handleBack = () => {
    if (step === 'otp') {
      setStep('credentials');
      setOtp('');
    } else if (step === 'credentials') {
      setStep('select');
      setAuthMethod(null);
    }
  };

  const handleMethodSelect = (method: AuthMethod) => {
    setAuthMethod(method);
    setStep('credentials');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMethod === 'phone' && step === 'credentials') {
      setStep('otp');
    } else {
      // Simulate successful auth
      alert(`${mode === 'login' ? 'Login' : 'Sign up'} successful! (Prototype)`);
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setAuthMethod(null);
    setEmail('');
    setPhone('');
    setPassword('');
    setOtp('');
    setStep('select');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-fade-in"
        onClick={() => {
          onClose();
          resetForm();
        }}
      />

      {/* Modal */}
      <div className="relative bg-card w-full max-w-md mx-4 rounded-2xl shadow-koloi-xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {step !== 'select' ? (
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <KoloiLogo />
          <button 
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {mode === 'login' ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {mode === 'login' 
                  ? 'Log in to continue to Koloi' 
                  : 'Sign up to get started with Koloi'}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleMethodSelect('email')}
                  className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <Mail className="w-6 h-6 text-muted-foreground" />
                  <span className="font-medium">Continue with email</span>
                </button>
                <button
                  onClick={() => handleMethodSelect('phone')}
                  className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <Phone className="w-6 h-6 text-muted-foreground" />
                  <span className="font-medium">Continue with phone</span>
                </button>
              </div>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button 
                      onClick={onSwitchMode}
                      className="text-foreground font-medium underline underline-offset-2 hover:no-underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button 
                      onClick={onSwitchMode}
                      className="text-foreground font-medium underline underline-offset-2 hover:no-underline"
                    >
                      Log in
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {authMethod === 'email' ? 'Enter your email' : 'Enter your phone number'}
              </h2>

              {authMethod === 'email' ? (
                <>
                  <div className="mb-4">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="koloi-input"
                      required
                    />
                  </div>
                  <div className="mb-6 relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="koloi-input pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </>
              ) : (
                <div className="mb-6">
                  <div className="flex gap-2">
                    <select className="koloi-input w-24">
                      <option>+263</option>
                      <option>+27</option>
                      <option>+254</option>
                      <option>+234</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="koloi-input flex-1"
                      required
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="koloi-btn-primary w-full">
                {authMethod === 'email' 
                  ? (mode === 'login' ? 'Log in' : 'Sign up')
                  : 'Continue'}
              </Button>

              {authMethod === 'email' && mode === 'login' && (
                <p className="text-center mt-4">
                  <button type="button" className="text-muted-foreground text-sm hover:text-foreground transition-colors underline underline-offset-2">
                    Forgot password?
                  </button>
                </p>
              )}
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Verify your number
              </h2>
              <p className="text-muted-foreground mb-6">
                We sent a code to +263 {phone}
              </p>

              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="koloi-input text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
              </div>

              <Button type="submit" className="koloi-btn-primary w-full">
                Verify
              </Button>

              <p className="text-center mt-4">
                <button type="button" className="text-muted-foreground text-sm hover:text-foreground transition-colors underline underline-offset-2">
                  Resend code
                </button>
              </p>
            </form>
          )}

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
};

export default AuthModal;
