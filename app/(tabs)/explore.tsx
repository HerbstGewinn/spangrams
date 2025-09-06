import React, { useEffect, useState } from 'react';
import { FlatList, View, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Board, listBoards } from '@/lib/supabase';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { H1, H2, Body, Caption } from '@/components/ui/Typography';
import { colors, spacing, borderRadius } from '@/constants/Theme';

export default function ExploreScreen() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadBoards() {
    setLoading(true);
    try {
      const data = await listBoards();
      setBoards(data);
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoards();
  }, []);

  const renderBoard = ({ item }: { item: Board }) => (
    <BoardCard board={item} onPlay={() => {
      router.push(`/game/${item.slug}` as any);
    }} />
  );

  return (
    <Screen scroll={false} gradient>
      <View style={{ padding: spacing[4], paddingTop: spacing[6] }}>
        <H1 style={{ marginBottom: spacing[2] }}>Explore</H1>
        <Body color={colors.text.secondary} style={{ marginBottom: spacing[6] }}>
          Discover amazing puzzles created by the community
        </Body>
      </View>

      <FlatList
        data={boards}
        keyExtractor={(item) => item.id}
        renderItem={renderBoard}
        contentContainerStyle={{ padding: spacing[4], paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBoards} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
        ListEmptyComponent={() => (
          <Card padding={6} style={{ alignItems: 'center' }}>
            <Body color={colors.text.secondary} style={{ textAlign: 'center' }}>
              No puzzles yet. Be the first to create one!
            </Body>
          </Card>
        )}
      />
    </Screen>
  );
}

interface BoardCardProps {
  board: Board;
  onPlay: () => void;
}

function BoardCard({ board, onPlay }: BoardCardProps) {
  const createdDate = new Date(board.created_at).toLocaleDateString();
  
  return (
    <Card gradient onPress={onPlay}>
      <View style={{ marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
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
            
            <H2 style={{ marginBottom: spacing[1] }}>
              {board.title}
            </H2>
            
            <Body color={colors.text.secondary} style={{ marginBottom: spacing[2] }}>
              by {board.author}
            </Body>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Caption color={colors.text.tertiary}>
                {board.plays_count || 0} plays • {board.completions_count || 0} completed • {createdDate}
              </Caption>
            </View>
          </View>
          
          <View style={{
            backgroundColor: colors.primary[600],
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            borderRadius: borderRadius.lg,
            marginLeft: spacing[3],
          }}>
            <Body color={colors.text.inverse} weight="semibold">
              Play
            </Body>
          </View>
        </View>
      </View>
      
      {/* Mini grid preview */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center',
        paddingTop: spacing[3],
        borderTopWidth: 1,
        borderTopColor: colors.gray[100],
      }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxWidth: 120 }}>
          {board.grid.slice(0, 2).map((row: any[], rowIndex: number) =>
            row.slice(0, 6).map((cell: any, colIndex: number) => (
              <View
                key={`${rowIndex}-${colIndex}`}
                style={{
                  width: 16,
                  height: 16,
                  margin: 1,
                  borderRadius: 8,
                  backgroundColor: cell.isSpangram 
                    ? colors.primary[400] 
                    : colors.primary[200],
                }}
              />
            ))
          )}
        </View>
      </View>
    </Card>
  );
}