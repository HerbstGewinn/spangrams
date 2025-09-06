import React from 'react';
import { View, ScrollView } from 'react-native';
import { GameState } from '@/lib/gameLogic';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { H2, H3, Body, Caption } from '@/components/ui/Typography';
import { colors, spacing, borderRadius } from '@/constants/Theme';

interface GameHUDProps {
  gameState: GameState;
  onHint?: () => void;
  onRestart?: () => void;
}

export default function GameHUD({ gameState, onHint, onRestart }: GameHUDProps) {
  const progress = (gameState.foundWords.size / gameState.words.length) * 100;
  const spangramFound = gameState.foundSpangram;

  return (
    <View style={{ marginVertical: spacing[4] }}>
      {/* Score and Progress */}
      <Card padding={4} style={{ marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Caption color={colors.text.secondary}>Score</Caption>
            <H2 color={colors.primary[600]}>{gameState.score}</H2>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Caption color={colors.text.secondary}>Progress</Caption>
            <H3>{gameState.foundWords.size}/{gameState.words.length}</H3>
            <View style={{
              width: 100,
              height: 6,
              backgroundColor: colors.gray[200],
              borderRadius: 3,
              marginTop: spacing[1],
            }}>
              <View style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: colors.primary[600],
                borderRadius: 3,
              }} />
            </View>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Caption color={colors.text.secondary}>Spangram</Caption>
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: spangramFound ? colors.primary[600] : colors.gray[200],
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Body color={spangramFound ? colors.text.inverse : colors.text.secondary} weight="bold">
                ⭐
              </Body>
            </View>
          </View>
        </View>
      </Card>

      {/* Current Word */}
      {gameState.currentPath.length > 0 && (
        <Card padding={3} style={{ marginBottom: spacing[3] }}>
          <Body style={{ textAlign: 'center', letterSpacing: 2 }}>
            {gameState.currentPath.map(cell => cell.ch).join('').toUpperCase()}
          </Body>
        </Card>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] }}>
        <Button
          title="Hint"
          onPress={onHint}
          variant="outline"
          size="sm"
          style={{ flex: 1 }}
        />
        <Button
          title="Restart"
          onPress={onRestart}
          variant="secondary"
          size="sm"
          style={{ flex: 1 }}
        />
      </View>

      {/* Found Words */}
      <Card padding={4}>
        <H3 style={{ marginBottom: spacing[3] }}>Found Words</H3>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {Array.from(gameState.foundWords).map((word) => (
            <View
              key={word}
              style={{
                backgroundColor: word === gameState.spangram ? colors.primary[600] : colors.primary[100],
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                borderRadius: borderRadius.lg,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {word === gameState.spangram && (
                <Body color={colors.text.inverse} style={{ marginRight: spacing[1] }}>⭐</Body>
              )}
              <Body 
                color={word === gameState.spangram ? colors.text.inverse : colors.primary[800]}
                weight="semibold"
              >
                {word.toUpperCase()}
              </Body>
            </View>
          ))}
        </ScrollView>
        
        {gameState.foundWords.size === 0 && (
          <Body color={colors.text.tertiary} style={{ textAlign: 'center', fontStyle: 'italic' }}>
            Trace letters to find words...
          </Body>
        )}
      </Card>

      {/* Completion */}
      {gameState.completed && (
        <Card gradient padding={5} style={{ marginTop: spacing[3] }}>
          <H2 style={{ textAlign: 'center', marginBottom: spacing[2] }}>
            🎉 Puzzle Complete!
          </H2>
          <Body color={colors.text.secondary} style={{ textAlign: 'center' }}>
            Final Score: {gameState.score}
          </Body>
        </Card>
      )}
    </View>
  );
}
