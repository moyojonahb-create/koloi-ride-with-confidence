/**
 * Auth — sign in, sign up, and phone OTP.
 *
 * Styled directly from `theme/` rather than shared primitives. That is
 * deliberate: `components/ui/` is sequenced *after* the vertical slice in
 * MIGRATION_SCREEN_INVENTORY.md, and building a Button here to "save time"
 * converts a one-off 59-file cost into a recurring per-screen one.
 *
 * Flows match the web app's `src/pages/Auth.tsx`:
 *  - Sign in accepts an email, a nickname, or a phone number. Resolution and
 *    the network-retry rule live in `auth/identity.ts`.
 *  - Sign up requires a name and phone; email is optional and a synthetic
 *    `@pickme.phone` address is generated when it is omitted.
 *  - Phone OTP is the `signInWithOtp` / `verifyOtp` pair the web `useAuth`
 *    exposes.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import {
  formatPhone,
  isPlausiblePhone,
  phoneToSyntheticEmail,
} from '../auth/identity';
import { requireSupabase } from '../core/supabase';
import { defaultTheme as t } from '../theme';

type Mode = 'signin' | 'signup' | 'otp';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithPhone, verifyOtp } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otpPhone, setOtpPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const reset = () => {
    setError(null);
    setNotice(null);
  };

  const switchMode = (next: Mode) => {
    reset();
    setOtpSent(false);
    setOtpCode('');
    setMode(next);
  };

  const handleSignIn = async () => {
    reset();
    if (!identifier.trim() || !password) {
      setError('Enter your email, nickname or phone, and your password.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await signIn(identifier, password);
      if (err) {
        setError(
          err.message?.includes('Invalid login credentials')
            ? 'Incorrect email/phone or password.'
            : err.message || 'Sign in failed. Please try again.',
        );
      }
      // Success needs no navigation call — RootNavigator swaps stacks on session.
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    reset();
    if (fullName.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (!isPlausiblePhone(phone)) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const formattedPhone = formatPhone(phone);

      // Same pre-check the web app runs: a duplicate phone otherwise fails
      // deep inside signUp with a message that does not name the real cause.
      const { data: existing } = await requireSupabase()
        .from('profiles')
        .select('id')
        .eq('phone', formattedPhone)
        .maybeSingle();

      if (existing) {
        setError('This phone number is already linked to an account. Please sign in instead.');
        return;
      }

      const signupEmail = email.trim() || phoneToSyntheticEmail(formattedPhone);
      const { error: err } = await signUp(signupEmail, password, fullName.trim(), {
        phone: formattedPhone,
      });

      if (err) {
        setError(
          err.message?.includes('already registered')
            ? 'An account with this email/phone already exists. Please sign in instead.'
            : err.message || 'Sign up failed. Please try again.',
        );
        return;
      }
      setNotice('Account created. You can sign in now.');
      switchMode('signin');
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async () => {
    reset();
    if (!isPlausiblePhone(otpPhone)) {
      setError('Please enter a valid phone number.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await signInWithPhone(formatPhone(otpPhone));
      if (err) {
        setError(err.message || 'Could not send the code. Please try again.');
        return;
      }
      setOtpSent(true);
      setNotice(`Code sent to ${formatPhone(otpPhone)}.`);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    reset();
    if (otpCode.trim().length < 4) {
      setError('Enter the code from the SMS.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await verifyOtp(formatPhone(otpPhone), otpCode.trim());
      if (err) setError(err.message || 'That code did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // iOS pushes content above the keyboard; Android's adjustResize already
      // handles it and 'padding' there double-counts the inset.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>CruiXe</Text>
        <Text style={styles.tagline}>
          {mode === 'signup' ? 'Create your account' : 'Ride with confidence'}
        </Text>

        <View style={styles.tabs}>
          <ModeTab label="Sign in" active={mode === 'signin'} onPress={() => switchMode('signin')} />
          <ModeTab label="Sign up" active={mode === 'signup'} onPress={() => switchMode('signup')} />
          <ModeTab label="Use SMS" active={mode === 'otp'} onPress={() => switchMode('otp')} />
        </View>

        {error ? <Banner tone="error" text={error} /> : null}
        {notice ? <Banner tone="notice" text={notice} /> : null}

        {mode === 'signin' ? (
          <>
            <Field
              label="Email, nickname or phone"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="you@example.com, nickname or +263..."
              autoCapitalize="none"
              autoComplete="username"
              keyboardType="default"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              accessory={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Text style={styles.accessoryText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />
            <PrimaryButton label="Sign in" busy={busy} onPress={handleSignIn} />
            <Text style={styles.hint}>Sign in with your email, nickname, or phone number.</Text>
          </>
        ) : null}

        {mode === 'signup' ? (
          <>
            <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Tendai Moyo" autoComplete="name" />
            <Field
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+263 77 123 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Field
              label="Email (optional)"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              accessory={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Text style={styles.accessoryText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />
            <Field
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <PrimaryButton label="Create account" busy={busy} onPress={handleSignUp} />
            <Text style={styles.hint}>
              No email? We will create one from your phone number automatically.
            </Text>
          </>
        ) : null}

        {mode === 'otp' ? (
          <>
            <Field
              label="Phone number"
              value={otpPhone}
              onChangeText={setOtpPhone}
              placeholder="+263 77 123 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!otpSent}
            />
            {otpSent ? (
              <>
                <Field
                  label="SMS code"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                />
                <PrimaryButton label="Verify code" busy={busy} onPress={handleVerifyOtp} />
                <Pressable onPress={() => { setOtpSent(false); setOtpCode(''); reset(); }} hitSlop={8}>
                  <Text style={styles.link}>Use a different number</Text>
                </Pressable>
              </>
            ) : (
              <PrimaryButton label="Send code" busy={busy} onPress={handleSendOtp} />
            )}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  accessory,
  ...input
}: React.ComponentProps<typeof TextInput> & { label: string; accessory?: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholderTextColor={t.colors.mutedForeground}
          {...input}
        />
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>
    </View>
  );
}

function PrimaryButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        busy && styles.buttonDisabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={t.colors.primaryForeground} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

function Banner({ tone, text }: { tone: 'error' | 'notice'; text: string }) {
  return (
    <View style={[styles.banner, tone === 'error' ? styles.bannerError : styles.bannerNotice]}>
      <Text style={tone === 'error' ? styles.bannerErrorText : styles.bannerNoticeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.colors.background },
  container: { paddingHorizontal: 20, gap: 14 },

  brand: { fontSize: 34, fontWeight: '800', color: t.colors.brandRed, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: t.colors.mutedForeground, marginTop: -6, marginBottom: 8 },

  tabs: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: t.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.secondary,
  },
  tabActive: { backgroundColor: t.colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: t.colors.secondaryForeground },
  tabTextActive: { color: t.colors.primaryForeground },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: t.colors.foreground },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    paddingHorizontal: 12,
  },
  input: { flex: 1, height: 48, fontSize: 15, color: t.colors.cardForeground },
  accessory: { paddingLeft: 8 },
  accessoryText: { fontSize: 13, fontWeight: '700', color: t.colors.primary },

  button: {
    height: 52,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonPressed: { backgroundColor: t.colors.brandRedHover },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 16, fontWeight: '700', color: t.colors.primaryForeground },

  hint: { fontSize: 12, color: t.colors.mutedForeground, textAlign: 'center' },
  link: { fontSize: 13, fontWeight: '700', color: t.colors.primary, textAlign: 'center', marginTop: 10 },

  banner: { borderRadius: t.radius.sm, padding: 12 },
  bannerError: { backgroundColor: t.colors.destructive },
  bannerErrorText: { color: t.colors.destructiveForeground, fontSize: 13, fontWeight: '600' },
  bannerNotice: { backgroundColor: t.colors.secondary },
  bannerNoticeText: { color: t.colors.secondaryForeground, fontSize: 13, fontWeight: '600' },
});
