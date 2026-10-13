import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { BRAND } from '../../src/constants/config';
import { authService } from '../../src/services/auth.service';

const RESET_SENT_MESSAGE =
  'Si un compte existe pour cet email, un lien de réinitialisation vient de vous être envoyé.';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const router = useRouter();
  const { login, error, clearError } = useAuthStore();

  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('L\'email est requis.');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Veuillez entrer un email valide.');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('Le mot de passe est requis.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      isValid = false;
    }

    return isValid;
  };

  const handleForgotPassword = async () => {
    clearError();
    setResetMessage('');
    setResetError('');

    const trimmedEmail = email.trim();
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError('Saisissez votre email ci-dessus pour recevoir le lien de réinitialisation.');
      return;
    }

    setIsSendingReset(true);
    try {
      await authService.sendPasswordResetEmail(trimmedEmail);
      setResetMessage(RESET_SENT_MESSAGE);
    } catch (err: unknown) {
      // 404 = email inconnu : même message que le succès pour ne pas révéler quels comptes existent.
      if (isAxiosError(err) && err.response?.status === 404) {
        setResetMessage(RESET_SENT_MESSAGE);
      } else {
        setResetError('Impossible d\'envoyer le lien pour le moment. Réessayez plus tard.');
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLogin = async () => {
    clearError();
    setResetMessage('');
    setResetError('');
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      
      // Redirection basée sur le rôle
      const user = useAuthStore.getState().user;
      if (user) {
        if (user.role === 'teacher') {
          router.replace('/(app)/(teacher)' as any);
        } else if (user.role === 'parent') {
          router.replace('/(app)/(parent)' as any);
        }
      }
    } catch (err: any) {
      // L'erreur est déjà gérée par le store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header avec icône */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Accéder à votre compte</Text>
            <Text style={styles.subtitle}>Bon retour, connectez-vous pour continuer</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <View style={styles.iconWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                </View>
                <TextInput
                  style={[
                    styles.input,
                    isFocusedEmail && styles.inputFocused,
                    emailError && styles.inputError,
                  ]}
                  placeholder="votre_email@exemple.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError('');
                  }}
                  onFocus={() => setIsFocusedEmail(true)}
                  onBlur={() => setIsFocusedEmail(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputContainer}>
                <View style={styles.iconWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                </View>
                <TextInput
                  style={[
                    styles.input,
                    isFocusedPassword && styles.inputFocused,
                    passwordError && styles.inputError,
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  onFocus={() => setIsFocusedPassword(true)}
                  onBlur={() => setIsFocusedPassword(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
            </View>

            {/* Mot de passe oublié */}
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              disabled={isSendingReset}
              activeOpacity={0.7}
            >
              {isSendingReset ? (
                <ActivityIndicator color={BRAND.orange} size="small" />
              ) : (
                <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
              )}
            </TouchableOpacity>

            {resetMessage ? (
              <View style={styles.infoContainer}>
                <Ionicons name="mail-outline" size={20} color="#166534" style={styles.errorIcon} />
                <Text style={styles.infoMessage}>{resetMessage}</Text>
              </View>
            ) : null}

            {resetError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" style={styles.errorIcon} />
                <Text style={styles.errorMessage}>{resetError}</Text>
              </View>
            ) : null}

            {/* Messages d'erreur */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" style={styles.errorIcon} />
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {/* Bouton de connexion */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (isSubmitting || !email.trim() || !password.trim()) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isSubmitting || !email.trim() || !password.trim()}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.loginButtonText}>Connexion en cours...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8efe9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    elevation: 8,
    borderTopWidth: 4,
    borderTopColor: BRAND.orange,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937', // text-gray-800
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280', // text-gray-500
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151', // text-gray-700
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB', // border-gray-300
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  iconWrapper: {
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputFocused: {
    borderColor: BRAND.green,
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  eyeButton: {
    paddingRight: 12,
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2', // bg-red-100
    borderWidth: 1,
    borderColor: '#FCA5A5', // border-red-400
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -12,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.orange,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7', // bg-green-100
    borderWidth: 1,
    borderColor: '#86EFAC', // border-green-300
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoMessage: {
    flex: 1,
    fontSize: 14,
    color: '#166534', // text-green-800
  },
  errorIcon: {
    marginRight: 8,
  },
  errorMessage: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B', // text-red-700
  },
  loginButton: {
    width: '100%',
    backgroundColor: BRAND.green,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF', // disabled bg-gray-400
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
