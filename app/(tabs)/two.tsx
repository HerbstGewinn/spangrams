import React from 'react';
import { View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { H1, H2, Body } from '@/components/ui/Typography';
import { colors, spacing } from '@/constants/Theme';

export default function PlayScreen() {
  return (
    <Screen gradient>
      <View style={{ 
        marginBottom: spacing[6], 
        paddingTop: spacing[6],
        alignItems: 'center' 
      }}>
        <H1 style={{ textAlign: 'center', marginBottom: spacing[2] }}>
          🎮 Play
        </H1>
        <Body color={colors.text.secondary} style={{ textAlign: 'center' }}>
          Interactive puzzle gameplay coming soon!
        </Body>
      </View>

      <Card padding={5} style={{ marginBottom: spacing[4] }}>
        <H2 style={{ marginBottom: spacing[3] }}>Features in Development</H2>
        
        <View style={{ marginBottom: spacing[3] }}>
          <Body weight="semibold" style={{ marginBottom: spacing[1] }}>
            🎯 Interactive Grid
          </Body>
          <Body color={colors.text.secondary}>
            Tap and drag to trace words through the letter grid
          </Body>
        </View>
        
        <View style={{ marginBottom: spacing[3] }}>
          <Body weight="semibold" style={{ marginBottom: spacing[1] }}>
            ⭐ Spangram Discovery
          </Body>
          <Body color={colors.text.secondary}>
            Find the special word that uses every letter
          </Body>
        </View>
        
        <View style={{ marginBottom: spacing[3] }}>
          <Body weight="semibold" style={{ marginBottom: spacing[1] }}>
            🎉 Progress Tracking
          </Body>
          <Body color={colors.text.secondary}>
            See your completion times and word discoveries
          </Body>
        </View>
        
        <View>
          <Body weight="semibold" style={{ marginBottom: spacing[1] }}>
            🔗 Share & Play
          </Body>
          <Body color={colors.text.secondary}>
            Play puzzles shared by friends and the community
          </Body>
        </View>
      </Card>

      <Button
        title="Explore Puzzles"
        onPress={() => {
          // TODO: Navigate to explore tab
          console.log('Navigate to explore');
        }}
        size="lg"
      />
    </Screen>
  );
}
