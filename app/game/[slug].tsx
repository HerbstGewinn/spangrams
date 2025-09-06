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
      
      // Record that someone started playing
      recordPlay();
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
        took_ms: Date.now(), // TODO: Track actual time
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

  async function recordPlay() {
    if (!boardData || !supabase) return;
    
    try {
      console.log('Recording play for board:', boardData.id);
      
      // Increment play count when game starts
      const { error } = await supabase.rpc('increment_board_plays', {
        board_id: boardData.id
      });
      
      if (error) {
        console.error('RPC failed, using fallback:', error);
        // Fallback to manual increment
        await supabase
          .from('boards')
          .update({ plays_count: (boardData.plays_count || 0) + 1 })
          .eq('id', boardData.id);
      } else {
        console.log('Play count incremented successfully');
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
