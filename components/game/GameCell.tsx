import React from 'react';
import { View, Animated, Pressable } from 'react-native';
import { GameCell } from '@/lib/gameLogic';
import { Body } from '@/components/ui/Typography';
import { colors, borderRadius } from '@/constants/Theme';

interface GameCellProps {
  cell: GameCell;
  size: number;
  margin: number;
  isSelected: boolean;
  foundWordType: 'none' | 'regular' | 'spangram';
  isCurrentlySpangram?: boolean;
  onTap?: () => void;
}

export default function GameCellComponent({
  cell,
  size,
  margin,
  isSelected,
  foundWordType,
  isCurrentlySpangram = false,
  onTap,
}: GameCellProps) {
  const getBackgroundColor = () => {
    if (foundWordType === 'spangram') return colors.primary[600]; // Spangram found - golden
    if (foundWordType === 'regular') return colors.primary[300]; // Regular word found - lighter purple
    if (isCurrentlySpangram) return colors.primary[500]; // Tracing potential spangram
    if (isSelected) return colors.primary[200]; // Regular letter being traced
    return colors.gray[100]; // Regular letter not selected
  };

  const getTextColor = () => {
    if (foundWordType !== 'none') return colors.text.inverse; // Found words have white text
    if (isSelected) return colors.primary[800];
    return colors.text.primary;
  };

  const CellContainer = onTap ? Pressable : View;

  return (
    <CellContainer
      onPress={() => { console.log(`[cell] press (${cell.row},${cell.col})`); onTap?.(); }}
      onPressIn={() => console.log(`[cell] pressIn (${cell.row},${cell.col})`)}
      onPressOut={() => console.log(`[cell] pressOut (${cell.row},${cell.col})`)}
      onLongPress={() => console.log(`[cell] longPress (${cell.row},${cell.col})`)}
      style={{
        width: size,
        height: size,
        margin,
        borderRadius: borderRadius.lg,
        backgroundColor: getBackgroundColor(),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary[600],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isSelected || foundWordType !== 'none' ? 0.4 : 0.15,
        shadowRadius: isSelected || foundWordType !== 'none' ? 12 : 6,
        elevation: isSelected || foundWordType !== 'none' ? 6 : 3,
        transform: [{ scale: isSelected ? 1.15 : foundWordType !== 'none' ? 1.08 : 1.0 }],
      }}
    >
      <Body
        weight="extrabold"
        color={getTextColor()}
        style={{ fontSize: 18 }}
      >
        {cell.ch.toUpperCase()}
      </Body>
    </CellContainer>
  );
}
