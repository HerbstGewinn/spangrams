import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { Board, getSession, listBoardsByUser, sendMagicLink, signOut } from '@/lib/supabase';
import Screen from '@/components/ui/Screen';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { H1, H2, H3, Body, Caption } from '@/components/ui/Typography';
import { colors, spacing, borderRadius } from '@/constants/Theme';

export default function ProfileScreen() {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const session = await getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        await loadUserBoards(session.user.id);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  async function loadUserBoards(id: string) {
    setLoading(true);
    try {
      const data = await listBoardsByUser(id);
      setBoards(data);
    } catch (error) {
      console.error('Failed to load user boards:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMagicLink() {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setSendingLink(true);
    try {
      await sendMagicLink(email.trim());
      Alert.alert(
        'Magic Link Sent! 📧',
        'Check your email and click the link to sign in. You may need to check your spam folder.',
        [{ text: 'OK' }]
      );
      setEmail('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send magic link');
    } finally {
      setSendingLink(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setUserId(null);
      setUserEmail(null);
      setBoards([]);
      Alert.alert('Signed Out', 'You have been successfully signed out.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  }

  if (!userId) {
    return (
      <Screen gradient>
        <View style={{ 
          marginBottom: spacing[6], 
          paddingTop: spacing[6],
          alignItems: 'center' 
        }}>
          <H1 style={{ textAlign: 'center', marginBottom: spacing[2] }}>
            Welcome! 👋
          </H1>
          <Body color={colors.text.secondary} style={{ textAlign: 'center' }}>
            Sign in to save your puzzles and track your progress
          </Body>
        </View>

        <Card padding={5}>
          <H2 style={{ marginBottom: spacing[4] }}>Sign In</H2>
          
          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <Button
            title={sendingLink ? "Sending..." : "Send Magic Link"}
            onPress={handleSendMagicLink}
            loading={sendingLink}
            disabled={!email.trim()}
            size="lg"
            style={{ marginTop: spacing[4] }}
          />
          
          <Body color={colors.text.tertiary} style={{ 
            textAlign: 'center', 
            marginTop: spacing[4],
            lineHeight: 20,
          }}>
            We'll send you a secure link to sign in without a password. 
            No account needed - we'll create one for you!
          </Body>
        </Card>
      </Screen>
    );
  }

  const renderBoardItem = ({ item }: { item: Board }) => (
    <UserBoardCard board={item} />
  );

  return (
    <Screen scroll={false} gradient>
      {/* Header */}
      <View style={{ padding: spacing[4], paddingTop: spacing[6] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <H1 style={{ marginBottom: spacing[1] }}>Profile</H1>
            <Body color={colors.text.secondary}>
              {userEmail || 'Signed in'}
            </Body>
          </View>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            size="sm"
          />
        </View>
      </View>

      {/* Stats */}
      <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[4] }}>
        <Card padding={4}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <H2 color={colors.primary[600]}>{boards.length}</H2>
              <Caption color={colors.text.secondary}>Puzzles Created</Caption>
            </View>
            <View style={{ alignItems: 'center' }}>
              <H2 color={colors.primary[600]}>
                {boards.reduce((sum, board) => sum + board.completions_count, 0)}
              </H2>
              <Caption color={colors.text.secondary}>Total Plays</Caption>
            </View>
          </View>
        </Card>
      </View>

      {/* Boards List */}
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[3] }}>
          <H2>Your Puzzles</H2>
        </View>
        
        <FlatList
          data={boards}
          keyExtractor={(item) => item.id}
          renderItem={renderBoardItem}
          contentContainerStyle={{ padding: spacing[4], paddingTop: 0 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          ListEmptyComponent={() => (
            <Card padding={6} style={{ alignItems: 'center' }}>
              <Body color={colors.text.secondary} style={{ textAlign: 'center', marginBottom: spacing[3] }}>
                You haven't created any puzzles yet.
              </Body>
              <Body color={colors.text.tertiary} style={{ textAlign: 'center' }}>
                Go to the Create tab to make your first one!
              </Body>
            </Card>
          )}
        />
      </View>
    </Screen>
  );
}

function UserBoardCard({ board }: { board: Board }) {
  const createdDate = new Date(board.created_at).toLocaleDateString();
  
  return (
    <Card>
      <View style={{ marginBottom: spacing[2] }}>
        <View style={{
          backgroundColor: colors.primary[100],
          paddingHorizontal: spacing[2],
          paddingVertical: spacing[1],
          borderRadius: borderRadius.md,
          alignSelf: 'flex-start',
          marginBottom: spacing[2],
        }}>
          <Caption color={colors.primary[700]} weight="semibold">
            {board.theme}
          </Caption>
        </View>
        
        <H3 style={{ marginBottom: spacing[1] }}>
          {board.title}
        </H3>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Body color={colors.text.secondary}>
            {board.completions_count} plays • {createdDate}
          </Body>
          
          <View style={{
            backgroundColor: colors.gray[100],
            paddingHorizontal: spacing[2],
            paddingVertical: spacing[1],
            borderRadius: borderRadius.md,
          }}>
            <Caption color={colors.text.secondary} weight="medium">
              {board.slug}
            </Caption>
          </View>
        </View>
      </View>
    </Card>
  );
}