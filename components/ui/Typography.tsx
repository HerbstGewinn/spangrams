import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { colors, typography } from '@/constants/Theme';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  color?: keyof typeof colors.text | string;
  weight?: keyof typeof typography;
}

export function Typography({ 
  variant = 'body', 
  color = 'primary', 
  weight = 'normal',
  style,
  children,
  ...props 
}: TypographyProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'h1':
        return { fontSize: typography['4xl'], fontWeight: typography.bold, lineHeight: typography['4xl'] * typography.lineHeight.tight };
      case 'h2':
        return { fontSize: typography['3xl'], fontWeight: typography.bold, lineHeight: typography['3xl'] * typography.lineHeight.tight };
      case 'h3':
        return { fontSize: typography['2xl'], fontWeight: typography.semibold, lineHeight: typography['2xl'] * typography.lineHeight.tight };
      case 'body':
        return { fontSize: typography.base, fontWeight: typography.normal, lineHeight: typography.base * typography.lineHeight.normal };
      case 'caption':
        return { fontSize: typography.sm, fontWeight: typography.normal, lineHeight: typography.sm * typography.lineHeight.normal };
      case 'label':
        return { fontSize: typography.sm, fontWeight: typography.medium, lineHeight: typography.sm * typography.lineHeight.normal };
      default:
        return { fontSize: typography.base, fontWeight: typography.normal };
    }
  };

  const getColor = () => {
    if (color in colors.text) {
      return colors.text[color as keyof typeof colors.text];
    }
    return color;
  };

  return (
    <RNText
      style={[
        getVariantStyle(),
        { color: getColor(), fontWeight: typography[weight] },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

export const H1 = (props: Omit<TypographyProps, 'variant'>) => <Typography variant="h1" {...props} />;
export const H2 = (props: Omit<TypographyProps, 'variant'>) => <Typography variant="h2" {...props} />;
export const H3 = (props: Omit<TypographyProps, 'variant'>) => <Typography variant="h3" {...props} />;
export const Body = (props: Omit<TypographyProps, 'variant'>) => <Typography variant="body" {...props} />;
export const Caption = (props: Omit<TypographyProps, 'variant'>) => <Typography variant="caption" {...props} />;
export const Label = (props: Omit<TypographyProps, 'variant'>) => <Typography variant="label" {...props} />;
