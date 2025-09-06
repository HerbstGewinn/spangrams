import React, { useState } from 'react';
import { TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, shadows, typography } from '@/constants/Theme';
import { Typography } from './Typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

export default function Input({ 
  label, 
  error, 
  containerStyle, 
  size = 'md',
  style,
  ...props 
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing[2], paddingHorizontal: spacing[3], fontSize: typography.sm };
      case 'lg':
        return { paddingVertical: spacing[5], paddingHorizontal: spacing[4], fontSize: typography.lg };
      default:
        return { paddingVertical: spacing[4], paddingHorizontal: spacing[4], fontSize: typography.base };
    }
  };

  return (
    <View style={[{ marginVertical: spacing[2] }, containerStyle]}>
      {label && (
        <Typography variant="label" color="secondary" style={{ marginBottom: spacing[1] }}>
          {label}
        </Typography>
      )}
      <TextInput
        {...props}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            borderWidth: 1,
            borderColor: error 
              ? colors.error 
              : isFocused 
                ? colors.primary[600] 
                : colors.gray[200],
            borderRadius: borderRadius.lg,
            backgroundColor: colors.surface,
            color: colors.text.primary,
            ...getSizeStyle(),
            ...shadows.sm,
          },
          style
        ]}
        placeholderTextColor={colors.text.tertiary}
      />
      {error && (
        <Typography variant="caption" color={colors.error} style={{ marginTop: spacing[1] }}>
          {error}
        </Typography>
      )}
    </View>
  );
}


