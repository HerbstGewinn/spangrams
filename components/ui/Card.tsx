import React, { ReactNode } from 'react';
import { View, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, shadows, spacing } from '@/constants/Theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  gradient?: boolean;
  padding?: keyof typeof spacing;
}

export default function Card({ 
  children, 
  style, 
  onPress, 
  gradient = false,
  padding = 4 
}: CardProps) {
  const cardStyle = {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    padding: spacing[padding],
    ...shadows.md,
    ...style,
  };

  if (gradient) {
    const content = (
      <LinearGradient
        colors={[colors.surface, colors.primary[50]]}
        style={cardStyle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {children}
      </LinearGradient>
    );
    
    return onPress ? (
      <Pressable onPress={onPress} style={{ borderRadius: borderRadius.xl }}>
        {content}
      </Pressable>
    ) : (
      <View style={{ borderRadius: borderRadius.xl }}>{content}</View>
    );
  }

  const content = <View style={cardStyle}>{children}</View>;
  
  return onPress ? (
    <Pressable onPress={onPress} style={{ borderRadius: borderRadius.xl }}>
      {content}
    </Pressable>
  ) : content;
}
