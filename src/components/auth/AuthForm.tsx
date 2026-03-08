import { useState } from 'react';
import { Eye, EyeOff, Mail, Phone, ArrowLeft, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { z } from 'zod';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSwitchMode: () => void;
  onSuccess: () => void;
}

type AuthMethod = 'email' | 'phone';
type Step = 'select' | 'credentials' | 'otp';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const phoneSchema = z.string().min(9, 'Please enter a valid phone number');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

const AuthForm = ({ mode, onSwitchMode, onSuccess }: AuthFormProps) => {
  const { signUp, signIn, signInWithPhone, verifyOtp } = useAuth();
  
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+263');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleBack = () => {
    if (step === 'otp') {
      setStep('credentials');
      setOtp('');
    } else if (step === 'credentials') {
      setStep('select');
      setAuthMethod(null);
    }
    setErrors({});
  };

  const handleMethodSelect = (method: AuthMethod) => {
    setAuthMethod(method);
    setStep('credentials');
  };

  const validateEmail = () => {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setErrors(prev => ({ ...prev, email: result.error.errors[0].message }));
      return false;
    }
    setErrors(prev => ({ ...prev, email: '' }));
    return true;
  };

  const validatePassword = () => {
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      setErrors(prev => ({ ...prev, password: result.error.errors[0].message }));
      return false;
    }
    setErrors(prev => ({ ...prev, password: '' }));
    return true;
  };

  const validatePhone = () => {
    const result = phoneSchema.safeParse(phone);
    if (!result.success) {
      setErrors(prev => ({ ...prev, phone: result.error.errors[0].message }));
      return false;
    }
    setErrors(prev => ({ ...prev, phone: '' }));
    return true;
  };

  const validateName = () => {
    const result = nameSchema.safeParse(fullName);
    if (!result.success) {
      setErrors(prev => ({ ...prev, fullName: result.error.errors[0].message }));
      return false;
    }
    setErrors(prev => ({ ...prev, fullName: '' }));
    return true;
  };

  // Update profile with phone after signup
  const updateProfilePhone = async (userId: string, phoneNumber: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ phone: phoneNumber })
        .eq('user_id', userId);
    } catch (e) {
      console.warn('Could not update phone:', e);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValidEmail = validateEmail();
    const isValidPassword = validatePassword();
    const isValidName = mode === 'signup' ? validateName() : true;
    const isValidPhone = mode === 'signup' ? validatePhone() : true;
    
    if (!isValidEmail || !isValidPassword || !isValidName || !isValidPhone) return;
    
    setLoading(true);
    
    try {
      if (mode === 'signup') {
        const fullPhone = `${countryCode}${phone}`;
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('An account with this email already exists. Please log in instead.');
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        // Get the newly created user and update their phone
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await updateProfilePhone(userData.user.id, fullPhone);
        }
        
        toast.success('Account created successfully!');
        onSuccess();
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password. Please try again.');
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success('Welcome back!');
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone()) return;
    
    setLoading(true);
    
    try {
      const fullPhone = `${countryCode}${phone}`;
      const { error } = await signInWithPhone(fullPhone);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Verification code sent!');
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setErrors(prev => ({ ...prev, otp: 'Please enter the 6-digit code' }));
      return;
    }
    
    setLoading(true);
    
    try {
      const fullPhone = `${countryCode}${phone}`;
      const { error } = await verifyOtp(fullPhone, otp);
      if (error) {
        toast.error('Invalid verification code. Please try again.');
        return;
      }
      toast.success('Phone verified successfully!');
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  if (step === 'select') {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-extrabold text-foreground mb-1.5 tracking-tight">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-[15px] text-muted-foreground mb-8">
          {mode === 'login' 
            ? 'Log in to continue to Voyex' 
            : 'Sign up to get started with Voyex'}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleMethodSelect('email')}
            className="w-full flex items-center gap-4 p-4 border border-border/60 rounded-2xl hover:bg-secondary active:scale-[0.98] transition-all text-left"
          >
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-[15px] font-semibold">Continue with email</span>
          </button>
          <button
            onClick={() => handleMethodSelect('phone')}
            className="w-full flex items-center gap-4 p-4 border border-border/60 rounded-2xl hover:bg-secondary active:scale-[0.98] transition-all text-left"
          >
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-[15px] font-semibold">Continue with phone</span>
          </button>
        </div>

        <div className="mt-8 text-center text-[14px] text-muted-foreground">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button 
                onClick={onSwitchMode}
                className="text-foreground font-semibold underline underline-offset-2 hover:no-underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                onClick={onSwitchMode}
                className="text-foreground font-semibold underline underline-offset-2 hover:no-underline"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (step === 'credentials' && authMethod === 'email') {
    return (
      <form onSubmit={handleEmailSubmit} className="animate-fade-in">
        <button 
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[15px] font-medium">Back</span>
        </button>

        <h2 className="text-2xl font-extrabold text-foreground mb-6 tracking-tight">
          {mode === 'login' ? 'Log in with email' : 'Sign up with email'}
        </h2>

        <div className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <Label htmlFor="fullName">Full name *</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={validateName}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.fullName && (
                  <p className="text-destructive text-sm mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="signupPhone">Phone number *</Label>
                <div className="flex gap-2 mt-1.5">
                  <select 
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="voyex-input w-24"
                  >
                    <option value="+263">+263</option>
                    <option value="+27">+27</option>
                    <option value="+254">+254</option>
                    <option value="+234">+234</option>
                  </select>
                  <Input
                    id="signupPhone"
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    onBlur={validatePhone}
                    className="flex-1"
                    required
                  />
                </div>
                {errors.phone && (
                  <p className="text-destructive text-sm mt-1">{errors.phone}</p>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email">Email *</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validateEmail}
                className="pl-10"
                required
              />
            </div>
            {errors.email && (
              <p className="text-destructive text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={validatePassword}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-sm mt-1">{errors.password}</p>
            )}
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full mt-8 voyex-btn-primary"
          disabled={loading}
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
          {mode === 'login' ? 'Log in' : 'Create account'}
        </Button>
      </form>
    );
  }

  if (step === 'credentials' && authMethod === 'phone') {
    return (
      <form onSubmit={handlePhoneSubmit}>
        <button 
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h2 className="text-2xl font-bold text-foreground mb-6">
          Enter your phone number
        </h2>

        <div>
          <Label htmlFor="phone">Phone number</Label>
          <div className="flex gap-2 mt-1.5">
            <select 
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="koloi-input w-24"
            >
              <option value="+263">+263</option>
              <option value="+27">+27</option>
              <option value="+254">+254</option>
              <option value="+234">+234</option>
            </select>
            <Input
              id="phone"
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              onBlur={validatePhone}
              className="flex-1"
              required
            />
          </div>
          {errors.phone && (
            <p className="text-destructive text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full mt-6 koloi-btn-primary"
          disabled={loading}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Continue
        </Button>
      </form>
    );
  }

  if (step === 'otp') {
    return (
      <form onSubmit={handleOtpSubmit}>
        <button 
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          Verify your number
        </h2>
        <p className="text-muted-foreground mb-6">
          We sent a code to {countryCode} {phone}
        </p>

        <div>
          <Input
            type="text"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-2xl tracking-widest"
            maxLength={6}
            required
          />
          {errors.otp && (
            <p className="text-destructive text-sm mt-1">{errors.otp}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full mt-6 koloi-btn-primary"
          disabled={loading}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Verify
        </Button>

        <p className="text-center mt-4">
          <button 
            type="button" 
            className="text-muted-foreground text-sm hover:text-foreground transition-colors underline underline-offset-2"
          >
            Resend code
          </button>
        </p>
      </form>
    );
  }

  return null;
};

export default AuthForm;
