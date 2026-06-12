import React, { useState, useRef, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInputProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  COLORS,
  GRADIENT_AUTH,
  GRADIENT_BTN,
} from '../constants/colors';

const { width } = Dimensions.get('window');

type Mode = 'signin' | 'signup';

interface FieldProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

const Field = forwardRef<TextInput, FieldProps>(function Field(
  { icon, label, error, rightElement, style, ...rest },
  ref,
) {
  return (
    <View style={fieldStyles.wrapper}>
      <View style={[fieldStyles.container, error ? fieldStyles.containerError : null]}>
        <Ionicons name={icon} size={18} color={error ? COLORS.crimsonLight : COLORS.whiteAlpha60} style={fieldStyles.icon} />
        <TextInput
          ref={ref}
          style={[fieldStyles.input, style]}
          placeholderTextColor={COLORS.whiteAlpha40}
          placeholder={label}
          {...rest}
        />
        {rightElement}
      </View>
      {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
    </View>
  );
});

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
  },
  containerError: { borderColor: COLORS.crimson },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '400',
  },
  errorText: { color: COLORS.crimsonLight, fontSize: 12, marginTop: 4, marginLeft: 4 },
});

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetSent, setResetSent] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { signIn, signUp, resetPassword } = useAuth();

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (mode === 'signup' && !name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (mode === 'signup' && password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(name.trim(), email.trim(), password);
      }
    } catch (err: any) {
      const codeMap: Record<string, string> = {
        'auth/user-not-found': 'No account found for this email.',
        'auth/wrong-password': 'Incorrect password. Try again.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
        'auth/network-request-failed': 'Network error. Check your connection.',
      };
      Alert.alert('Authentication Error', codeMap[err.code] ?? err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Reset Password', 'Enter your email address above first.');
      return;
    }
    try {
      await resetPassword(email.trim());
      setResetSent(true);
      Alert.alert('Email Sent', `A password reset link has been sent to ${email.trim()}.`);
    } catch {
      Alert.alert('Error', 'Could not send reset email. Check the address and try again.');
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setName('');
    setPassword('');
    setConfirmPassword('');
    setResetSent(false);
  };

  return (
    <LinearGradient
      colors={GRADIENT_AUTH}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.bg}
    >
      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Header ── */}
            <View style={styles.header}>
              <LinearGradient
                colors={['#DC143C', '#8B5CF6', '#5B21B6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoRing}
              >
                <Text style={styles.logoLetter}>F</Text>
              </LinearGradient>
              <Text style={styles.appName}>FuelR</Text>
              <Text style={styles.tagline}>Fuel Your Journey</Text>
            </View>

            {/* ── Card ── */}
            <View style={styles.card}>
              {/* Tab toggle */}
              <View style={styles.tabs}>
                {(['signin', 'signup'] as Mode[]).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={styles.tabBtn}
                    onPress={() => switchMode(tab)}
                    activeOpacity={0.75}
                  >
                    {mode === tab ? (
                      <LinearGradient
                        colors={GRADIENT_BTN}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.tabActive}
                      >
                        <Text style={styles.tabLabelActive}>
                          {tab === 'signin' ? 'Sign In' : 'Sign Up'}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.tabInactive}>
                        <Text style={styles.tabLabel}>
                          {tab === 'signin' ? 'Sign In' : 'Sign Up'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form */}
              <View style={styles.form}>
                {mode === 'signup' && (
                  <Field
                    icon="person-outline"
                    label="Full Name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    error={errors.name}
                  />
                )}

                <Field
                  ref={emailRef}
                  icon="mail-outline"
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  error={errors.email}
                />

                <Field
                  ref={passwordRef}
                  icon="lock-closed-outline"
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType={mode === 'signup' ? 'next' : 'done'}
                  onSubmitEditing={() =>
                    mode === 'signup' ? confirmRef.current?.focus() : handleSubmit()
                  }
                  error={errors.password}
                  rightElement={
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.whiteAlpha60}
                      />
                    </TouchableOpacity>
                  }
                />

                {mode === 'signup' && (
                  <Field
                    ref={confirmRef}
                    icon="lock-closed-outline"
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    error={errors.confirmPassword}
                  />
                )}

                {mode === 'signin' && (
                  <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>
                      {resetSent ? '✓ Reset email sent' : 'Forgot password?'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
                style={styles.btnWrapper}
              >
                <LinearGradient
                  colors={GRADIENT_BTN}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.btnText}>
                        {mode === 'signin' ? 'Sign In' : 'Create Account'}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>secure auth</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Footer note */}
              <View style={styles.footerRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.green} />
                <Text style={styles.footerText}>
                  {' '}Your data is encrypted & protected
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // Decorative blobs
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.18,
  },
  blobTopLeft: {
    width: 220,
    height: 220,
    backgroundColor: COLORS.purple,
    top: -60,
    left: -60,
  },
  blobBottomRight: {
    width: 260,
    height: 260,
    backgroundColor: COLORS.crimson,
    bottom: -80,
    right: -80,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
  },
  logoLetter: {
    color: COLORS.white,
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -2,
    marginLeft: -4,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.whiteAlpha60,
    letterSpacing: 1,
    marginTop: 4,
    fontWeight: '400',
  },

  // Card
  card: {
    backgroundColor: 'rgba(10, 0, 20, 0.78)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha15,
    padding: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: { flex: 1 },
  tabActive: {
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInactive: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabelActive: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  tabLabel: {
    color: COLORS.whiteAlpha40,
    fontWeight: '600',
    fontSize: 14,
  },

  // Form
  form: { marginBottom: 4 },

  forgotBtn: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 16 },
  forgotText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '500' },

  // Button
  btnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: COLORS.crimson,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  btn: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.whiteAlpha08,
  },
  dividerText: {
    color: COLORS.whiteAlpha40,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: COLORS.whiteAlpha60,
    fontSize: 12,
  },
});
