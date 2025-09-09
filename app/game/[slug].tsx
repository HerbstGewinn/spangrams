import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createGameState, GameState, updateGameState } from '@/lib/gameLogic';
import { supabase } from '@/lib/supabase';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PlayableGrid from '@/components/game/PlayableGrid';
import GameHUD from '@/components/game/GameHUD';
import { H1, Body } from '@/components/ui/Typography';
import { colors, spacing } from '@/constants/Theme';

export default function GameScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardData, setBoardData] = useState<any>(null);

  useEffect(() => {
    loadBoard();
  }, [slug]);

  async function loadBoard() {
    if (!slug) {
      Alert.alert('Error', 'No board specified');
      router.back();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      
      setBoardData(data);
      const initialGameState = createGameState({
        grid: data.grid,
        words: data.words,
      });
      setGameState(initialGameState);
      
      // Record that someone started playing (after boardData is set)
      console.log('About to record play for board:', data.id);
      await recordPlay(data.id);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load board: ' + error.message);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function handleGameStateChange(newState: GameState) {
    setGameState(newState);
    
    // Check for word completion
    if (newState.foundWords.size > (gameState?.foundWords.size || 0)) {
      // TODO: Add haptic feedback and sound
      console.log('Word found!');
    }
    
    // Check for game completion
    if (newState.completed && !gameState?.completed) {
      setTimeout(() => {
        Alert.alert(
          '🎉 Congratulations!',
          `You completed the puzzle!\nFinal Score: ${newState.score}`,
          [
            { text: 'Play Again', onPress: handleRestart },
            { text: 'Back to Explore', onPress: () => router.back() },
          ]
        );
      }, 1000);
      
      // Record completion
      recordCompletion(newState.score);
    }
  }

  async function recordCompletion(score: number) {
    if (!boardData || !supabase) return;
    
    try {
      // Insert completion record
      await supabase.from('completions').insert({
        board_id: boardData.id,
        took_ms: 0,
        word_count: gameState?.foundWords.size || 0,
      });
      
      // Increment board completion count (separate from plays)
      const { error } = await supabase.rpc('increment_board_completions', {
        board_id: boardData.id
      });
      
      if (error) {
        console.error('RPC failed, using fallback:', error);
        // Fallback to manual increment
        await supabase
          .from('boards')
          .update({ completions_count: boardData.completions_count + 1 })
          .eq('id', boardData.id);
      }
    } catch (error) {
      console.error('Failed to record completion:', error);
    }
  }

  async function recordPlay(boardId?: string) {
    const id = boardId || boardData?.id;
    if (!id || !supabase) {
      console.log('recordPlay skipped - no boardId or supabase:', { id, supabase: !!supabase });
      return;
    }
    
    try {
      console.log('Recording play for board:', id);
      // Insert a play row (user_id filled by trigger if signed in)
      const { data: playData, error: playError } = await supabase
        .from('plays')
        .insert({ board_id: id })
        .select();
      
      if (playError) {
        console.error('Failed to insert play:', playError);
      } else {
        console.log('Play inserted successfully:', playData);
      }
      
      // Increment aggregated counter as well
      const { error: rpcError } = await supabase.rpc('increment_board_plays', { board_id: id });
      if (rpcError) {
        console.error('RPC plays increment failed:', rpcError);
      } else {
        console.log('RPC plays increment successful');
      }
    } catch (error) {
      console.error('Failed to record play:', error);
    }
  }

  function handleHint() {
    if (!gameState) return;
    
    const unFoundWords = gameState.words.filter(word => !gameState.foundWords.has(word));
    if (unFoundWords.length === 0) return;
    
    const randomWord = unFoundWords[Math.floor(Math.random() * unFoundWords.length)];
    Alert.alert('Hint', `Look for a word starting with "${randomWord[0].toUpperCase()}"`);
  }

  function handleRestart() {
    if (boardData) {
      const newGameState = createGameState({
        grid: boardData.grid,
        words: boardData.words,
      });
      setGameState(newGameState);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Card padding={6} style={{ alignItems: 'center' }}>
          <Body>Loading puzzle...</Body>
        </Card>
      </Screen>
    );
  }

  if (!gameState || !boardData) {
    return (
      <Screen>
        <Card padding={6} style={{ alignItems: 'center' }}>
          <Body color={colors.error}>Failed to load puzzle</Body>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: spacing[3] }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen gradient scroll={true}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <H1 style={{ fontSize: 24 }}>{boardData.title}</H1>
            <Body color={colors.text.secondary}>{boardData.theme}</Body>
          </View>
          <Button
            title="← Back"
            onPress={() => router.back()}
            variant="outline"
            size="sm"
          />
        </View>
      </View>

      {/* Grid - Same position as before */}
      <View style={{ alignItems: 'center', marginBottom: spacing[4] }}>
        <PlayableGrid
          gameState={gameState}
          onGameStateChange={handleGameStateChange}
        />
      </View>

      {/* HUD */}
      <GameHUD
        gameState={gameState}
        onHint={handleHint}
        onRestart={handleRestart}
      />
    </Screen>
  );
}
