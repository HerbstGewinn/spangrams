export interface GameCell {
  ch: string;
  isSpangram?: boolean;
  row: number;
  col: number;
}

export interface GameState {
  grid: GameCell[][];
  words: string[];
  spangram: string;
  foundWords: Set<string>;
  foundSpangram: boolean;
  foundWordPaths: Map<string, GameCell[]>; // Store paths for each found word
  currentPath: GameCell[];
  isTracing: boolean;
  score: number;
  completed: boolean;
}

export interface Position {
  row: number;
  col: number;
}

// 8 directions: horizontal, vertical, diagonal (forward and backward)
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],  // up-left, up, up-right
  [0, -1],           [0, 1],   // left, right
  [1, -1],  [1, 0],  [1, 1]    // down-left, down, down-right
];

export function createGameState(board: { grid: any[][], words: string[] }): GameState {
  const grid = board.grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      ch: cell.ch,
      isSpangram: cell.isSpangram,
      row: rowIndex,
      col: colIndex,
    }))
  );

  const spangram = board.words[0]; // First word is spangram
  const words = board.words.slice(1); // Rest are regular words

  return {
    grid,
    words: [...words, spangram],
    spangram,
    foundWords: new Set(),
    foundSpangram: false,
    foundWordPaths: new Map(),
    currentPath: [],
    isTracing: false,
    score: 0,
    completed: false,
  };
}

export function isAdjacent(cell1: GameCell, cell2: GameCell): boolean {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  
  // Adjacent includes horizontal, vertical, and diagonal
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
}

export function pathToWord(path: GameCell[]): string {
  return path.map(cell => cell.ch).join('').toLowerCase();
}

export function validateWord(path: GameCell[], validWords: string[]): {
  isValid: boolean;
  word: string;
  isSpangram: boolean;
} {
  const word = pathToWord(path).trim();
  const reversedWord = word.split('').reverse().join('');
  // Case-insensitive validation with trim, but return the original-cased dictionary word
  const normalizedWords = validWords.map(w => w.trim().toLowerCase());
  const wordLower = word.toLowerCase();
  const reversedLower = reversedWord.toLowerCase();
  
  const forwardValid = normalizedWords.includes(wordLower);
  const backwardValid = normalizedWords.includes(reversedLower);
  
  if (forwardValid) {
    const idx = normalizedWords.findIndex(w => w === wordLower);
    const dictWord = idx >= 0 ? validWords[idx] : word;
    return {
      isValid: true,
      word: dictWord,
      isSpangram: path.every(cell => cell.isSpangram) || idx === 0,
    };
  }
  
  if (backwardValid) {
    const idx = normalizedWords.findIndex(w => w === reversedLower);
    const dictWord = idx >= 0 ? validWords[idx] : reversedWord;
    return {
      isValid: true,
      word: dictWord,
      isSpangram: path.every(cell => cell.isSpangram) || idx === 0,
    };
  }
  
  return { isValid: false, word, isSpangram: false };
}

export function isValidPath(path: GameCell[]): boolean {
  if (path.length < 2) return false;
  
  for (let i = 1; i < path.length; i++) {
    if (!isAdjacent(path[i - 1], path[i])) {
      return false;
    }
  }
  
  // Check for duplicates
  const positions = new Set();
  for (const cell of path) {
    const key = `${cell.row}-${cell.col}`;
    if (positions.has(key)) {
      return false;
    }
    positions.add(key);
  }
  
  return true;
}

export function calculateScore(word: string, isSpangram: boolean): number {
  let baseScore = word.length;
  if (isSpangram) baseScore *= 3;
  if (word.length >= 6) baseScore *= 2;
  return baseScore;
}

export function updateGameState(
  state: GameState,
  action: 
    | { type: 'START_TRACE'; cell: GameCell }
    | { type: 'ADD_TO_PATH'; cell: GameCell }
    | { type: 'END_TRACE' }
    | { type: 'CLEAR_PATH' }
): GameState {
  switch (action.type) {
    case 'START_TRACE':
      console.log(`[logic] START_TRACE at (${action.cell.row},${action.cell.col})`);
      return {
        ...state,
        currentPath: [action.cell],
        isTracing: true,
      };
      
    case 'ADD_TO_PATH':
      console.log(`[logic] ADD_TO_PATH try (${action.cell.row},${action.cell.col}) from len=${state.currentPath.length})`);
      // Check if cell is already in path (prevent duplicates)
      const isDuplicate = state.currentPath.some(
        pathCell => pathCell.row === action.cell.row && pathCell.col === action.cell.col
      );
      
      if (isDuplicate) {
        console.log('[logic] duplicate, ignored');
        return state;
      }
      
      // Check adjacency to last cell only (not full path validation)
      const lastCell = state.currentPath[state.currentPath.length - 1];
      if (lastCell && !isAdjacent(lastCell, action.cell)) {
        console.log(`[logic] not adjacent to last (${lastCell.row},${lastCell.col}), ignored`);
        return state;
      }
      
      const newPath = [...state.currentPath, action.cell];
      console.log(`[logic] ADD_TO_PATH ok -> len=${newPath.length}`);
      return {
        ...state,
        currentPath: newPath,
      };
      
    case 'END_TRACE':
      if (state.currentPath.length < 2) {
        console.log('[logic] END_TRACE too short -> clear');
        return {
          ...state,
          currentPath: [],
          isTracing: false,
        };
      }
      
      const validation = validateWord(state.currentPath, state.words);
      console.log(`[logic] END_TRACE validate word=${validation.word} valid=${validation.isValid}`);
      
      if (validation.isValid && !state.foundWords.has(validation.word)) {
        const newFoundWords = new Set([...state.foundWords, validation.word]);
        const newFoundWordPaths = new Map(state.foundWordPaths);
        newFoundWordPaths.set(validation.word, [...state.currentPath]);
        
        const score = state.score + calculateScore(validation.word, validation.isSpangram);
        const completed = newFoundWords.size === state.words.length;
        const foundSpangram = state.foundSpangram || validation.word === state.spangram;
        
        return {
          ...state,
          foundWords: newFoundWords,
          foundWordPaths: newFoundWordPaths,
          foundSpangram,
          currentPath: [],
          isTracing: false,
          score,
          completed,
        };
      }
      
      return {
        ...state,
        currentPath: [],
        isTracing: false,
      };
      
    case 'CLEAR_PATH':
      return {
        ...state,
        currentPath: [],
        isTracing: false,
      };
      
    default:
      return state;
  }
}
