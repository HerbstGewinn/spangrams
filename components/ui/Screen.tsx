import React, { ReactNode } from 'react';
import { View, ScrollView, ViewStyle, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@/constants/Theme';

interface ScreenProps { 
  children: ReactNode; 
  scroll?: boolean; 
  style?: ViewStyle;
  padding?: keyof typeof spacing;
  background?: string;
  gradient?: boolean;
}

export default function Screen({ 
  children, 
  scroll = true, 
  style,
  padding = 4,
  background = colors.background,
  gradient = false
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  
  const containerStyle = {
    flex: 1,
    paddingTop: insets.top,
    backgroundColor: background,
  };

  const contentStyle = scroll ? [{ padding: spacing[padding] }, style] : style;

  const content = scroll ? (
    <ScrollView 
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
      bounces={true}
      style={{ flex: 1 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, style]}>
      {children}
    </View>
  );

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent 
        hidden={false}
      />
      {gradient ? (
        <LinearGradient
          colors={[colors.primary[50], colors.background]}
          style={containerStyle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={containerStyle}>
          {content}
        </View>
      )}
    </>
  );
}


