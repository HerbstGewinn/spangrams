import React from 'react';
import { Pressable, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, shadows } from '@/constants/Theme';
import { Typography } from './Typography';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
}

export default function Button({ 
  title, 
  onPress, 
  style, 
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false
}: ButtonProps) {
  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing[2], paddingHorizontal: spacing[3] };
      case 'lg':
        return { paddingVertical: spacing[5], paddingHorizontal: spacing[6] };
      default:
        return { paddingVertical: spacing[4], paddingHorizontal: spacing[6] };
    }
  };

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <Pressable 
        onPress={isDisabled ? undefined : onPress} 
        style={[
          { borderRadius: borderRadius.xl, overflow: 'hidden', opacity: isDisabled ? 0.6 : 1 },
          style
        ]}
      > 
        <LinearGradient 
          colors={[colors.primary[600], colors.primary[700]]} 
          style={[getSizeStyle(), { alignItems: 'center' }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <Typography color={colors.text.inverse} weight="semibold">
              {title}
            </Typography>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'outline') {
    return (
      <Pressable 
        onPress={isDisabled ? undefined : onPress}
        style={[
          {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.primary[600],
            backgroundColor: colors.surface,
            opacity: isDisabled ? 0.6 : 1,
            alignItems: 'center',
          },
          getSizeStyle(),
          style
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary[600]} size="small" />
        ) : (
          <Typography color={colors.primary[600]} weight="semibold">
            {title}
          </Typography>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable 
      onPress={isDisabled ? undefined : onPress}
      style={[
        {
          borderRadius: borderRadius.xl,
          backgroundColor: colors.gray[100],
          opacity: isDisabled ? 0.6 : 1,
          alignItems: 'center',
        },
        getSizeStyle(),
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.primary} size="small" />
      ) : (
        <Typography color={colors.text.primary} weight="semibold">
          {title}
        </Typography>
      )}
    </Pressable>
  );
}


