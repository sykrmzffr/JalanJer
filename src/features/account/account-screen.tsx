import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { InfoRow, NavRow, Section, SettingsScreen } from '@/features/settings/components';
import { supabase } from '@/lib/supabase';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

import { useAccountStore } from './account-store';
import { syncPlaces } from './places-sync-service';

type Step = { kind: 'email' } | { kind: 'code'; email: string };

/** Sign in with a one-time code sent by email (no password), or manage the signed-in account. */
export function AccountScreen() {
  const session = useAccountStore((s) => s.session);
  return <SettingsScreen title="Account">{session ? <SignedIn /> : <SignIn />}</SettingsScreen>;
}

function SignIn() {
  const colors = useColors();
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    setBusy(false);
    if (e) {
      setError(friendlyAuthError(e.message, e.status));
      return;
    }
    setCode('');
    setStep({ kind: 'code', email: address });
  };

  const verify = async () => {
    if (step.kind !== 'code') return;
    const token = code.replace(/\D/g, '');
    if (token.length < 6) {
      setError('Enter the code from the email.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email: step.email, token, type: 'email' });
    setBusy(false);
    if (e) {
      setError(friendlyAuthError(e.message, e.status));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // The auth listener (useAccountSync) stores the session and starts the first sync.
  };

  return (
    <>
      <Section
        title={step.kind === 'email' ? 'Sign in or create an account' : 'Check your email'}
        footer={
          step.kind === 'email'
            ? "We'll email you a code. No password needed. Signing in keeps your Home, Work, saved and recent places on all your phones."
            : `We sent a code to ${step.email}. It can take a minute. Check spam too.`
        }
      >
        <View style={styles.field}>
          {step.kind === 'email' ? (
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode}
              editable={!busy}
              accessibilityLabel="Email address"
              style={[styles.input, { color: colors.onSurface }]}
            />
          ) : (
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Code"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={verify}
              editable={!busy}
              autoFocus
              accessibilityLabel="Code from the email"
              style={[styles.input, styles.code, { color: colors.onSurface }]}
            />
          )}
        </View>
      </Section>

      {error ? (
        <Text accessibilityRole="alert" style={[typography.bodyMedium, styles.error, { color: colors.error }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={step.kind === 'email' ? sendCode : verify}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: colors.primary, opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[typography.titleMedium, { color: colors.onPrimary }]}>
              {step.kind === 'email' ? 'Send code' : 'Sign in'}
            </Text>
          )}
        </Pressable>
        {step.kind === 'code' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStep({ kind: 'email' });
              setError(null);
            }}
            style={styles.secondary}
          >
            <Text style={[typography.labelLarge, { color: colors.primary }]}>Use a different email</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

function SignedIn() {
  const session = useAccountStore((s) => s.session);
  const sync = useAccountStore((s) => s.sync);
  const syncError = useAccountStore((s) => s.syncError);
  const lastSyncedAt = useAccountStore((s) => s.lastSyncedAt);

  const status =
    sync === 'syncing'
      ? 'Syncing…'
      : sync === 'error'
        ? (syncError ?? 'Sync failed')
        : lastSyncedAt
          ? `Synced ${formatTime(lastSyncedAt)}`
          : 'Not synced yet';

  return (
    <>
      <Section footer="Your Home, Work, saved and recent places are kept in your account and on this phone.">
        <InfoRow label="Signed in as" value={session?.user.email ?? ''} />
        <NavRow label="Sync now" detail={status} onPress={() => syncPlaces()} />
      </Section>
      <Section footer="Signing out keeps your places on this phone. They stop syncing until you sign in again.">
        <NavRow
          label="Sign out"
          onPress={() =>
            Alert.alert('Sign out?', 'Your places stay on this phone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
            ])
          }
        />
      </Section>
    </>
  );
}

/** "14:05" today, otherwise "23 Oct 14:05". */
function formatTime(ms: number): string {
  const d = new Date(ms);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === new Date().toDateString()) return time;
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${d.getDate()} ${month} ${time}`;
}

/** Plain-language versions of Supabase auth errors. */
function friendlyAuthError(message: string, status?: number): string {
  if (status === 429 || /rate limit|too many/i.test(message))
    return 'Too many codes asked for. Wait a while and try again.';
  if (/expired|invalid|otp/i.test(message)) return 'That code is wrong or has expired. Ask for a new one.';
  if (/network|fetch/i.test(message)) return "Can't reach the server. Check your internet.";
  return 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  field: { paddingHorizontal: spacing.lg, minHeight: Math.max(minTouchTarget, 56), justifyContent: 'center' },
  input: { ...typography.bodyLarge, paddingVertical: spacing.md },
  code: { ...typography.titleLarge, letterSpacing: 4 },
  error: { paddingHorizontal: spacing.xl, marginTop: -spacing.md, marginBottom: spacing.lg },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  primary: {
    minHeight: Math.max(minTouchTarget, 52),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { minHeight: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
});
