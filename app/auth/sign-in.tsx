import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/components/ui/Screen';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { H1, Body, Caption } from '@/components/ui/Typography';
import { colors, spacing } from '@/constants/Theme';
import { signInWithEmail } from '@/lib/supabase';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail({ email: email.trim(), password });
      router.replace('/(tabs)/profile');
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen gradient>
      <View style={{ padding: spacing[5], paddingTop: spacing[8] }}>
        <H1 style={{ textAlign: 'center', marginBottom: spacing[3] }}>Welcome back</H1>
        <Body color={colors.text.secondary} style={{ textAlign: 'center', marginBottom: spacing[5] }}>
          Sign in to continue playing and creating Strands
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
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={{ marginTop: spacing[3] }}
          />
          <Button
            title={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleSignIn}
            loading={loading}
            disabled={!email || !password}
            size="lg"
            style={{ marginTop: spacing[4] }}
          />

          <Caption color={colors.text.secondary} style={{ textAlign: 'center', marginTop: spacing[4] }}>
            Don’t have an account?
            {' '}
            <Button title="Sign up" variant="link" size="sm" onPress={() => router.push('/auth/sign-up')} />
          </Caption>
        </Card>
      </View>
    </Screen>
  );
}


