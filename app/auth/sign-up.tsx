import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/components/ui/Screen';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { H1, Body, Caption } from '@/components/ui/Typography';
import { colors, spacing } from '@/constants/Theme';
import { signUpWithEmail, signInWithEmail, getSession } from '@/lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email.trim() || !username.trim() || !password || !confirm) {
      Alert.alert('Error', 'Fill in all fields');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail({ email: email.trim(), password, username: username.trim() });
      // If email confirmation is enabled, there may be no session yet. Try to sign in immediately.
      const session = await getSession();
      if (!session?.user) {
        await signInWithEmail({ email: email.trim(), password });
      }
      router.replace('/(tabs)/profile');
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen gradient>
      <View style={{ padding: spacing[5], paddingTop: spacing[8] }}>
        <H1 style={{ textAlign: 'center', marginBottom: spacing[3] }}>Create your account</H1>
        <Body color={colors.text.secondary} style={{ textAlign: 'center', marginBottom: spacing[5] }}>
          Join Spangrams to play and share puzzles
        </Body>

        <Card padding={5}>
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Username"
            placeholder="yourusername"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            style={{ marginTop: spacing[3] }}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={{ marginTop: spacing[3] }}
          />
          <Input
            label="Confirm Password"
            placeholder="••••••••"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            style={{ marginTop: spacing[3] }}
          />

          <Button
            title={loading ? 'Creating account...' : 'Sign Up'}
            onPress={handleSignUp}
            loading={loading}
            disabled={!email || !username || !password || !confirm}
            size="lg"
            style={{ marginTop: spacing[4] }}
          />

          <Caption color={colors.text.secondary} style={{ textAlign: 'center', marginTop: spacing[4] }}>
            Already have an account?
            {' '}
            <Button title="Sign in" variant="link" size="sm" onPress={() => router.replace('/auth/sign-in')} />
          </Caption>
        </Card>
      </View>
    </Screen>
  );
}


