import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder, Dimensions, Animated, Pressable, Text } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { GameCell, GameState, updateGameState } from '@/lib/gameLogic';
import GameCellComponent from './GameCell';
import { colors, spacing, borderRadius } from '@/constants/Theme';

interface PlayableGridProps {
  gameState: GameState;
  onGameStateChange: (newState: GameState) => void;
}

const CELL_SIZE = 48;
const CELL_MARGIN = 3;
const TOTAL_CELL_SIZE = CELL_SIZE + CELL_MARGIN * 2; // Cell + margins
const WIDTH = 6; // Grid width (6 columns)
const HEIGHT = 8; // Grid height (8 rows)

export default function PlayableGrid({ gameState, onGameStateChange }: PlayableGridProps) {
  const [touching, setTouching] = useState(false);
  const [tapMode, setTapMode] = useState(true); // New: tap mode vs drag mode
  const gridRef = useRef<View>(null);
  const [gridLayout, setGridLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });


  const getCellFromPosition = (x: number, y: number): GameCell | null => {
    // Adjust coordinates relative to grid container
    const relativeX = x - gridLayout.x;
    const relativeY = y - gridLayout.y;
    
    const col = Math.floor(relativeX / TOTAL_CELL_SIZE);
    const row = Math.floor(relativeY / TOTAL_CELL_SIZE);
    
    if (row >= 0 && row < gameState.grid.length && col >= 0 && col < gameState.grid[0].length) {
      return gameState.grid[row][col];
    }
    return null;
  };

  // Convert grid position to screen coordinates for animation
  const getCellScreenPosition = (row: number, col: number) => {
    return {
      x: col * TOTAL_CELL_SIZE + TOTAL_CELL_SIZE / 2,
      y: row * TOTAL_CELL_SIZE + TOTAL_CELL_SIZE / 2
    };
  };

  // Simple: Build connection lines from the current path
  const buildConnectionLines = () => {
    const path = gameState.currentPath;
    if (path.length < 2) {
      return [];
    }

    const lines = [];
    for (let i = 0; i < path.length - 1; i++) {
      const fromPos = getCellScreenPosition(path[i].row, path[i].col);
      const toPos = getCellScreenPosition(path[i + 1].row, path[i + 1].col);
      
      lines.push({
        from: fromPos,
        to: toPos
      });
    }
    
    return lines;
  };


  // Handle tap on cell - SIMPLE AND CONFIDENT
  const handleCellTap = (cell: GameCell) => {
    if (gameState.currentPath.length === 0) {
      // Step 1: Start new path
      const newState = updateGameState(gameState, { type: 'START_TRACE', cell });
      onGameStateChange(newState);
    } else {
      const lastCell = gameState.currentPath[gameState.currentPath.length - 1];
      
      // Check if tapped cell is already in the path (backtrack)
      const isAlreadyInPath = gameState.currentPath.some(
        pathCell => pathCell.row === cell.row && pathCell.col === cell.col
      );
      
      if (isAlreadyInPath) {
        // Step 2: Backtrack to tapped cell
        const cellIndex = gameState.currentPath.findIndex(
          pathCell => pathCell.row === cell.row && pathCell.col === cell.col
        );
        const newPath = gameState.currentPath.slice(0, cellIndex + 1);
        const newState = { ...gameState, currentPath: newPath };
        onGameStateChange(newState);
        return;
      }
      
      // Check if tapped cell is adjacent to last cell
      const rowDiff = Math.abs(cell.row - lastCell.row);
      const colDiff = Math.abs(cell.col - lastCell.col);
      const isAdjacent = rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
      
      if (isAdjacent) {
        // Step 3: Add to path
        const newState = updateGameState(gameState, { type: 'ADD_TO_PATH', cell });
        onGameStateChange(newState);
      } else {
        // Step 4: Start new path from this cell
        const clearedState = updateGameState(gameState, { type: 'CLEAR_PATH' });
        const newState = updateGameState(clearedState, { type: 'START_TRACE', cell });
        onGameStateChange(newState);
      }
    }
  };

  // Handle end of word (double tap or special action)
  const handleEndTrace = () => {
    onGameStateChange(updateGameState(gameState, { type: 'END_TRACE' }));
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !tapMode, // Only intercept if not in tap mode
    onMoveShouldSetPanResponder: () => !tapMode,
    onStartShouldSetPanResponderCapture: () => !tapMode,
    onMoveShouldSetPanResponderCapture: () => !tapMode,
    onShouldBlockNativeResponder: () => !tapMode,

    onPanResponderGrant: (evt) => {
      if (tapMode) return;
      setTouching(true);
      const { pageX, pageY } = evt.nativeEvent;
      const cell = getCellFromPosition(pageX, pageY);
      
      if (cell) {
        onGameStateChange(updateGameState(gameState, { type: 'START_TRACE', cell }));
      }
    },

    onPanResponderMove: (evt) => {
      if (tapMode || !touching) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      const cell = getCellFromPosition(pageX, pageY);
      
      if (cell) {
        const lastCell = gameState.currentPath[gameState.currentPath.length - 1];
        if (!lastCell || (cell.row !== lastCell.row || cell.col !== lastCell.col)) {
          onGameStateChange(updateGameState(gameState, { type: 'ADD_TO_PATH', cell }));
        }
      }
    },

    onPanResponderRelease: () => {
      if (tapMode) return;
      setTouching(false);
      handleEndTrace();
    },

    onPanResponderTerminate: () => {
      if (tapMode) return;
      setTouching(false);
      onGameStateChange(updateGameState(gameState, { type: 'CLEAR_PATH' }));
    },
  });

  const getCellState = (cell: GameCell) => {
    const isInCurrentPath = gameState.currentPath.some(
      pathCell => pathCell.row === cell.row && pathCell.col === cell.col
    );
    
    // Check if this cell is part of any found word
    let foundWordType: 'none' | 'regular' | 'spangram' = 'none';
    
    for (const [word, path] of gameState.foundWordPaths.entries()) {
      const isInThisFoundWord = path.some(
        pathCell => pathCell.row === cell.row && pathCell.col === cell.col
      );
      
      if (isInThisFoundWord) {
        foundWordType = word === gameState.spangram ? 'spangram' : 'regular';
        break;
      }
    }

    return {
      isSelected: isInCurrentPath,
      foundWordType,
      isCurrentlySpangram: isInCurrentPath && cell.isSpangram, // For current path highlighting
    };
  };

  return (
    <View style={{ position: 'relative' }}>
      {/* Connection Lines Overlay - REACTIVE TO GAME STATE */}
      {gameState.currentPath.length > 1 && (
        <Svg
          style={{
            position: 'absolute',
            top: spacing[3],
            left: spacing[3],
            width: WIDTH * TOTAL_CELL_SIZE,
            height: HEIGHT * TOTAL_CELL_SIZE,
            zIndex: 10,
          }}
        >
          {buildConnectionLines().map((line, index) => (
            <Line
              key={index}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke={colors.primary[500]}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}
        </Svg>
      )}

      {/* Game Grid */}
      <View
        ref={gridRef}
        style={{
          backgroundColor: colors.surface,
          borderRadius: borderRadius.xl,
          padding: spacing[3],
          alignSelf: 'center',
        }}
        onLayout={(event) => {
          event.target.measure((x, y, width, height, pageX, pageY) => {
            setGridLayout({ x: pageX, y: pageY, width, height });
          });
        }}
        {...panResponder.panHandlers}
      >
        {gameState.grid.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row' }}>
            {row.map((cell, colIndex) => (
              <GameCellComponent
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                size={CELL_SIZE}
                margin={CELL_MARGIN}
                onTap={tapMode ? () => handleCellTap(cell) : undefined}
                {...getCellState(cell)}
              />
            ))}
          </View>
        ))}
        
        {/* Mode Toggle Button */}
        <View style={{
          position: 'absolute',
          top: -spacing[2],
          right: -spacing[2],
          backgroundColor: colors.primary[100],
          borderRadius: borderRadius.full,
          padding: spacing[2],
        }}>
          <Pressable
            onPress={() => {
              setTapMode(!tapMode);
              onGameStateChange(updateGameState(gameState, { type: 'CLEAR_PATH' }));
            }}
            style={{
              paddingHorizontal: spacing[2],
              paddingVertical: spacing[1],
            }}
          >
            <Text style={{
              fontSize: 12,
              color: colors.primary[700],
              fontWeight: '600',
            }}>
              {tapMode ? 'TAP' : 'DRAG'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Tap Mode Instructions */}
      {tapMode && gameState.currentPath.length > 0 && (
        <View style={{
          position: 'absolute',
          bottom: -spacing[10],
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <Pressable
            onPress={handleEndTrace}
            style={{
              backgroundColor: colors.primary[600],
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[2],
              borderRadius: borderRadius.lg,
            }}
          >
            <Text style={{
              color: colors.text.inverse,
              fontWeight: '600',
            }}>
              Submit Word
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
