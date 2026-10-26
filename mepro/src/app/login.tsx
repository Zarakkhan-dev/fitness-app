/**
 * Sign in.
 *
 * Field-level errors from the API are shown under the field they belong to, and
 * a general failure shows once at the top: the message is what the server said,
 * not something invented here.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Button, Caption, Card, Spacer, Title } from '@/components/ui';
import { ErrorState } from '@/components/states';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { Field } from '@/components/field';

export default function LoginScreen() {
  const { login } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldErrors = error?.fieldErrors ?? {};
  const generalError =
    error && Object.keys(fieldErrors).length === 0 ? error : null;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // The root layout redirects on the auth state change; navigating here too
      // would race it.
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError('Could not sign in.', 0, 'UNKNOWN'));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.three }}>
        <View style={{ gap: Spacing.one }}>
          <Title>Welcome back</Title>
          <Caption>Sign in to pick up where you left off.</Caption>
        </View>

        {generalError ? <ErrorState error={generalError} /> : null}

        <Card style={{ gap: Spacing.three }}>
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
            placeholder="Your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            error={fieldErrors.password}
            onSubmitEditing={canSubmit ? onSubmit : undefined}
          />
          <Button label="Sign in" onPress={onSubmit} disabled={!canSubmit} loading={submitting} />
        </Card>

        <Spacer size={Spacing.one} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.one }}>
          <Caption>New here?</Caption>
          <Pressable
            onPress={() => router.push('/register')}
            accessibilityRole="link"
            hitSlop={8}>
            <Caption style={{ color: theme.brand, fontWeight: '600' }}>Create an account</Caption>
          </Pressable>
        </View>

        <Card style={{ backgroundColor: 'transparent', borderStyle: 'dashed' }}>
          <Caption style={{ textAlign: 'center' }}>
            Demo account: aarav@mepro.app / Demo@12345
          </Caption>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}
