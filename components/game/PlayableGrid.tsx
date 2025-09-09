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
  // Keep the latest game state in a ref to prevent stale closures between rapid taps
  const latestStateRef = useRef<GameState>(gameState);
  useEffect(() => {
    latestStateRef.current = gameState;
  }, [gameState]);


  const getCellFromPosition = (x: number, y: number): GameCell | null => {
    console.log(`[grid] getCellFromPosition page=(${x},${y}) layout=(${gridLayout.x},${gridLayout.y},${gridLayout.width},${gridLayout.height})`);
    // Adjust coordinates relative to grid container
    const relativeX = x - gridLayout.x;
    const relativeY = y - gridLayout.y;
    
    const col = Math.floor(relativeX / TOTAL_CELL_SIZE);
    const row = Math.floor(relativeY / TOTAL_CELL_SIZE);
    
    if (row >= 0 && row < gameState.grid.length && col >= 0 && col < gameState.grid[0].length) {
      console.log(`[grid] mapped to row=${row} col=${col}`);
      return gameState.grid[row][col];
    }
    console.log(`[grid] position out of bounds row=${row} col=${col}`);
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
    const t0 = Date.now();
    console.log(`[tap] cell=(${cell.row},${cell.col}) letter=${cell.letter} pathLen=${latestStateRef.current.currentPath.length}`);
    const state = latestStateRef.current;
    if (state.currentPath.length === 0) {
      // Step 1: Start new path
      const newState = updateGameState(state, { type: 'START_TRACE', cell });
      onGameStateChange(newState);
      latestStateRef.current = newState;
      console.log(`[tap] START_TRACE -> len=${newState.currentPath.length} dt=${Date.now()-t0}ms`);
    } else {
      const lastCell = state.currentPath[state.currentPath.length - 1];
      
      // Check if tapped cell is already in the path (backtrack)
      const isAlreadyInPath = state.currentPath.some(
        pathCell => pathCell.row === cell.row && pathCell.col === cell.col
      );
      
      if (isAlreadyInPath) {
        // Step 2: Backtrack to tapped cell
        const cellIndex = state.currentPath.findIndex(
          pathCell => pathCell.row === cell.row && pathCell.col === cell.col
        );
        const newPath = state.currentPath.slice(0, cellIndex + 1);
        const newState = { ...state, currentPath: newPath };
        onGameStateChange(newState);
        latestStateRef.current = newState;
        console.log(`[tap] BACKTRACK -> len=${newState.currentPath.length} idx=${cellIndex} dt=${Date.now()-t0}ms`);
        return;
      }
      
      // Check if tapped cell is adjacent to last cell
      const rowDiff = Math.abs(cell.row - lastCell.row);
      const colDiff = Math.abs(cell.col - lastCell.col);
      const isAdjacent = rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
      console.log(`[tap] last=(${lastCell.row},${lastCell.col}) d=(${rowDiff},${colDiff}) adjacent=${isAdjacent}`);
      
      if (isAdjacent) {
        // Step 3: Add to path
        const newState = updateGameState(state, { type: 'ADD_TO_PATH', cell });
        onGameStateChange(newState);
        latestStateRef.current = newState;
        console.log(`[tap] ADD_TO_PATH -> len=${newState.currentPath.length} dt=${Date.now()-t0}ms`);
      } else {
        // Step 4: Start new path from this cell
        const clearedState = updateGameState(state, { type: 'CLEAR_PATH' });
        const newState = updateGameState(clearedState, { type: 'START_TRACE', cell });
        onGameStateChange(newState);
        latestStateRef.current = newState;
        console.log(`[tap] CLEAR+START from non-adjacent -> len=${newState.currentPath.length} dt=${Date.now()-t0}ms`);
      }
    }
  };

  // Handle end of word (double tap or special action)
  const handleEndTrace = () => {
    const state = latestStateRef.current;
    const newState = updateGameState(state, { type: 'END_TRACE' });
    latestStateRef.current = newState;
    onGameStateChange(newState);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      const val = !tapMode;
      console.log(`[pan] onStartShouldSetPanResponder -> ${val}`);
      return val;
    }, // Only intercept if not in tap mode
    onMoveShouldSetPanResponder: () => {
      const val = !tapMode;
      console.log(`[pan] onMoveShouldSetPanResponder -> ${val}`);
      return val;
    },
    onStartShouldSetPanResponderCapture: () => {
      const val = !tapMode;
      console.log(`[pan] onStartShouldSetPanResponderCapture -> ${val}`);
      return val;
    },
    onMoveShouldSetPanResponderCapture: () => {
      const val = !tapMode;
      console.log(`[pan] onMoveShouldSetPanResponderCapture -> ${val}`);
      return val;
    },
    onShouldBlockNativeResponder: () => {
      const val = !tapMode;
      console.log(`[pan] onShouldBlockNativeResponder -> ${val}`);
      return val;
    },

    onPanResponderGrant: (evt) => {
      if (tapMode) { console.log('[pan] grant ignored (tapMode)'); return; }
      setTouching(true);
      const { pageX, pageY } = evt.nativeEvent;
      console.log(`[pan] grant at ${pageX},${pageY}`);
      const cell = getCellFromPosition(pageX, pageY);
      
      if (cell) {
        const state = latestStateRef.current;
        const newState = updateGameState(state, { type: 'START_TRACE', cell });
        latestStateRef.current = newState;
        onGameStateChange(newState);
        console.log(`[pan] START_TRACE at (${cell.row},${cell.col})`);
      }
    },

    onPanResponderMove: (evt) => {
      if (tapMode || !touching) { if (tapMode) console.log('[pan] move ignored (tapMode)'); return; }
      
      const { pageX, pageY } = evt.nativeEvent;
      console.log(`[pan] move at ${pageX},${pageY}`);
      const cell = getCellFromPosition(pageX, pageY);
      
      if (cell) {
        const state = latestStateRef.current;
        const lastCell = state.currentPath[state.currentPath.length - 1];
        if (!lastCell || (cell.row !== lastCell.row || cell.col !== lastCell.col)) {
          const newState = updateGameState(state, { type: 'ADD_TO_PATH', cell });
          latestStateRef.current = newState;
          onGameStateChange(newState);
          console.log(`[pan] ADD_TO_PATH at (${cell.row},${cell.col}) -> len=${newState.currentPath.length}`);
        }
      }
    },

    onPanResponderRelease: () => {
      if (tapMode) { console.log('[pan] release ignored (tapMode)'); return; }
      setTouching(false);
      handleEndTrace();
    },

    onPanResponderTerminate: () => {
      if (tapMode) { console.log('[pan] terminate ignored (tapMode)'); return; }
      setTouching(false);
      const state = latestStateRef.current;
      const newState = updateGameState(state, { type: 'CLEAR_PATH' });
      latestStateRef.current = newState;
      onGameStateChange(newState);
    },
  });

  // Reset transient flags when a new game state arrives (e.g., after Restart)
  useEffect(() => {
    setTouching(false);
  }, [gameState.grid, gameState.words]);

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
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: spacing[3],
            left: spacing[3],
            width: WIDTH * TOTAL_CELL_SIZE,
            height: HEIGHT * TOTAL_CELL_SIZE,
            zIndex: 0,
          }}
        >
          <Svg
            style={{ width: '100%', height: '100%' }}
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
        </View>
      )}

      {/* Game Grid */}
      <View
        ref={gridRef}
        style={{
          backgroundColor: colors.surface,
          borderRadius: borderRadius.xl,
          padding: spacing[3],
          alignSelf: 'center',
          zIndex: 1,
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
