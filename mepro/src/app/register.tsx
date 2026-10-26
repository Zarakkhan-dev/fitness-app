/**
 * Create an account.
 *
 * Mirrors the sign-in form so the two feel like the same flow, with the extra
 * name field and a client-side hint on the password policy the server enforces.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Field } from '@/components/field';
import { ErrorState } from '@/components/states';
import { Button, Caption, Card, Spacer, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const { register } = useAuth();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldErrors = error?.fieldErrors ?? {};
  const generalError = error && Object.keys(fieldErrors).length === 0 ? error : null;

  // Only the length is checked here; the server remains the authority on the
  // full policy, and its message is shown if the guess below is wrong.
  const passwordHint =
    password.length > 0 && password.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters`
      : undefined;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError('Could not create the account.', 0, 'UNKNOWN'));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH && !submitting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.three }}>
        <View style={{ gap: Spacing.one }}>
          <Title>Create your account</Title>
          <Caption>Start tracking workouts, meals and progress.</Caption>
        </View>

        {generalError ? <ErrorState error={generalError} /> : null}

        <Card style={{ gap: Spacing.three }}>
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            error={fieldErrors.name}
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={fieldErrors.email}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={fieldErrors.password}
            hint={passwordHint}
            onSubmitEditing={canSubmit ? onSubmit : undefined}
          />
          <Button label="Create account" onPress={onSubmit} disabled={!canSubmit} loading={submitting} />
        </Card>

        <Spacer size={Spacing.one} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.one }}>
          <Caption>Already have an account?</Caption>
          <Pressable onPress={() => router.back()} accessibilityRole="link" hitSlop={8}>
            <Caption style={{ color: theme.brand, fontWeight: '600' }}>Sign in</Caption>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
