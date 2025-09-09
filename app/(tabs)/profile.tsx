import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { Board, getSession, listBoardsByUser, signOut, onAuthStateChange, getProfile, getUserPlaysStats, getUserCompletionsStats } from '@/lib/supabase';
import Screen from '@/components/ui/Screen';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { H1, H2, H3, Body, Caption } from '@/components/ui/Typography';
import { colors, spacing, borderRadius } from '@/constants/Theme';

export default function ProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [totalPlays, setTotalPlays] = useState<number>(0);
  const [totalCompletions, setTotalCompletions] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    checkSession();
    const sub = onAuthStateChange((session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        loadUserBoards(session.user.id);
        getProfile(session.user.id).then(p => setUsername(p.username)).catch(() => {});
      } else {
        setUserId(null);
        setUserEmail(null);
        setBoards([]);
        setUsername(null);
      }
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function checkSession() {
    try {
      const session = await getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        await loadUserBoards(session.user.id);
        try { const p = await getProfile(session.user.id); setUsername(p.username); } catch {}
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  async function loadUserBoards(id: string) {
    setLoading(true);
    try {
      const [boardsData, playsStats, completionsStats] = await Promise.all([
        listBoardsByUser(id),
        getUserPlaysStats(id).catch(() => ({ total_plays: 0 })),
        getUserCompletionsStats(id).catch(() => ({ total_completions: 0 }))
      ]);
      setBoards(boardsData);
      setTotalPlays(playsStats.total_plays);
      setTotalCompletions(completionsStats.total_completions);
    } catch (error) {
      console.error('Failed to load user data:', error);
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
        <View style={{ padding: spacing[5], paddingTop: spacing[8], alignItems: 'center' }}>
          <H1 style={{ textAlign: 'center', marginBottom: spacing[3] }}>Account</H1>
          <Body color={colors.text.secondary} style={{ textAlign: 'center', marginBottom: spacing[5] }}>
            Please sign in to view your profile and stats.
          </Body>
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <Button title="Sign In" onPress={() => (require('expo-router').router.push('/auth/sign-in'))} size="lg" />
            <Button title="Sign Up" onPress={() => (require('expo-router').router.push('/auth/sign-up'))} size="lg" variant="outline" />
          </View>
        </View>
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
            <H1 style={{ marginBottom: spacing[1] }}>{username ?? 'Profile'}</H1>
            <Body color={colors.text.secondary}>{userEmail || 'Signed in'}</Body>
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
              <H2 color={colors.primary[600]}>{totalPlays}</H2>
              <Caption color={colors.text.secondary}>Total Plays</Caption>
            </View>
            <View style={{ alignItems: 'center' }}>
              <H2 color={colors.primary[600]}>{totalCompletions}</H2>
              <Caption color={colors.text.secondary}>Completed</Caption>
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