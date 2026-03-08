import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PhoneOtpVerification from '@/components/auth/PhoneOtpVerification';
import { lovable } from '@/integrations/lovable/index';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required').max(100, 'Name too long'),
  idNumber: z.string().min(1, 'ID Number is required').max(50, 'ID too long'),
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number too long')
    .regex(/^\+?[0-9\s-]+$/, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email address').max(255, 'Email too long').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password too long'),
});

type SignupFormData = z.infer<typeof signupSchema>;

type SignupStep = 'details' | 'verify-phone' | 'complete';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const next = useMemo(() => searchParams.get('next') || '/ride', [searchParams]);
  const [step, setStep] = useState<SignupStep>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SignupFormData | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      idNumber: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  // Format phone number to E.164 format
  const formatPhoneNumber = (phone: string): string => {
    // Remove spaces and dashes
    let cleaned = phone.replace(/[\s-]/g, '');
    
    // If it starts with 0, assume Zimbabwe (+263)
    if (cleaned.startsWith('0')) {
      cleaned = '+263' + cleaned.substring(1);
    }
    
    // If it doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  };

  const onSubmitDetails = (data: SignupFormData) => {
    // Format phone number before storing
    const formattedData = {
      ...data,
      phone: formatPhoneNumber(data.phone),
    };
    setFormData(formattedData);
    setStep('verify-phone');
  };

  const onPhoneVerified = async () => {
    if (!formData) return;
    
    setIsSubmitting(true);
    try {
      // Use email if provided, otherwise generate one from phone
      const email = formData.email || `${formData.phone.replace(/\+/g, '')}@voyex.phone`;
      
      const { error } = await signUp(email, formData.password, formData.fullName);
      
      if (error) {
        let message = error.message;
        if (message.includes('already registered')) {
          message = 'An account with this email/phone already exists. Please sign in.';
        }
        toast({
          title: 'Signup failed',
          description: message,
          variant: 'destructive',
        });
        setStep('details');
        return;
      }

      // Update profile with phone number and ID after signup
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await supabase
          .from('profiles')
          .update({ 
            phone: formData.phone,
          })
          .eq('user_id', authData.user.id);
      }

      toast({
        title: 'Account created!',
        description: 'Welcome to Voyex.',
      });
      navigate(next);
    } catch (err) {
      toast({
        title: 'Sign up failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
      setStep('details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'verify-phone':
        return (
          <PhoneOtpVerification
            phone={formData?.phone || ''}
            onVerified={onPhoneVerified}
            onBack={() => setStep('details')}
          />
        );

      default:
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </Link>
              <div>
                <h1 className="text-xl font-black text-foreground">Create your Voyex account</h1>
                <p className="text-sm text-muted-foreground">Sign up to request a ride.</p>
              </div>
            </div>

            {/* Google Sign-In */}
            <button
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result?.error) {
                  toast({ title: 'Google sign-in failed', variant: 'destructive' });
                }
              }}
              className="w-full flex items-center justify-center gap-3 p-3.5 border border-border/60 rounded-2xl hover:bg-muted/50 active:scale-[0.98] transition-all mb-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-semibold text-[15px]">Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitDetails)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-semibold">Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
                          className="h-12 rounded-2xl border-border/10 bg-white"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="idNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-semibold">ID Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="National ID or Passport" 
                          className="h-12 rounded-2xl border-border/10 bg-white"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-semibold">Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          inputMode="tel"
                          placeholder="+263 77 123 4567" 
                          className="h-12 rounded-2xl border-border/10 bg-white"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-semibold">
                        Email <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          inputMode="email"
                          placeholder="you@email.com" 
                          className="h-12 rounded-2xl border-border/10 bg-white"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-semibold">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="••••••••" 
                          className="h-12 rounded-2xl border-border/10 bg-white"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-[52px] rounded-2xl bg-foreground hover:bg-foreground/90 text-white font-black text-base mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </form>
            </Form>

            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              By continuing you agree to Voyex's basic terms of use.
            </p>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-accent font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </>
        );
    }
  };

  return (
    <div className="min-h-[100dvh] bg-primary flex items-center justify-center p-4 pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(16px+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[520px] bg-white/95 backdrop-blur-[10px] rounded-[26px] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        {renderStep()}
      </div>
    </div>
  );
};

export default Signup;
