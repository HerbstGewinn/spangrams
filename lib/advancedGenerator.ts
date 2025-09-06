// Advanced grid generator with varied word placement
export type Cell = { ch: string; isSpangram?: boolean };
export type Grid = Cell[][];

const WIDTH = 6;
const HEIGHT = 8;
const CAPACITY = WIDTH * HEIGHT;

// 8-directional adjacency (including diagonals)
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],  // up-left, up, up-right
  [0, -1],           [0, 1],   // left, right
  [1, -1],  [1, 0],  [1, 1]    // down-left, down, down-right
];

function sanitizeWord(word: string): string {
  return word.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

export function validateInput(input: { title: string; theme: string; author: string; words: string[] }) {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const cleanWords = input.words.map(sanitizeWord).filter(Boolean);
  const lettersUsed = cleanWords.join('').length;
  
  if (cleanWords.length === 0) {
    errors.push('ERROR: Can not have empty words.');
  }
  
  if (lettersUsed !== CAPACITY) {
    errors.push(`Total letters must equal 48. Currently ${lettersUsed}.`);
  }
  
  const spangram = cleanWords[0] || '';
  const spRemaining = Math.max(0, 6 - spangram.length);
  if (spRemaining > 0) {
    warnings.push(`Spangram needs ${spRemaining} more letters.`);
  }
  
  if (!input.title?.trim()) warnings.push('WARNING: Consider modifying the title.');
  if (!input.theme?.trim()) warnings.push('WARNING: Consider modifying the theme.');
  if (!input.author?.trim()) warnings.push('WARNING: Consider modifying the author.');
  
  const needMsg = lettersUsed < CAPACITY ? 
    `You need ${CAPACITY - lettersUsed} more.` : 
    lettersUsed > CAPACITY ? 
    `Over by ${lettersUsed - CAPACITY}.` : 
    'Perfect 48 letters!';
  
  return { errors, warnings, cleanWords, lettersUsed, needMsg };
}

// Advanced placement using pathfinding
export function generateAdvancedGrid(input: { title: string; theme: string; author: string; words: string[] }) {
  const validation = validateInput(input);
  if (validation.errors.length > 0) {
    return {
      grid: createEmptyGrid(),
      errors: validation.errors,
      warnings: validation.warnings,
      lettersUsed: validation.lettersUsed,
      spangramRemaining: 0,
    };
  }
  
  const words = validation.cleanWords;
  const spangram = words[0];
  const otherWords = words.slice(1);
  
  // Try multiple times to generate a valid layout
  for (let attempt = 0; attempt < 50; attempt++) {
    const result = tryGenerateGrid([spangram, ...otherWords]);
    if (result.success) {
      return {
        grid: result.grid,
        errors: [],
        warnings: validation.warnings,
        lettersUsed: validation.lettersUsed,
        spangramRemaining: 0,
      };
    }
  }
  
  return {
    grid: createEmptyGrid(),
    errors: ['Unable to place all words. Try different words or lengths.'],
    warnings: validation.warnings,
    lettersUsed: validation.lettersUsed,
    spangramRemaining: 0,
  };
}

function createEmptyGrid(): Grid {
  return Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => ({ ch: '' }))
  );
}

function tryGenerateGrid(words: string[]): { success: boolean; grid: Grid } {
  const grid = createEmptyGrid();
  const used: boolean[][] = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  
  // Shuffle words for varied placement
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffledWords.length; i++) {
    const word = shuffledWords[i];
    const isSpangram = word === words[0]; // First word is always spangram
    
    if (!placeWordWithPath(grid, used, word, isSpangram)) {
      return { success: false, grid };
    }
  }
  
  return { success: true, grid };
}

function placeWordWithPath(grid: Grid, used: boolean[][], word: string, isSpangram: boolean): boolean {
  const attempts = 100; // Try multiple random placements
  
  for (let attempt = 0; attempt < attempts; attempt++) {
    // Random starting position
    const startRow = Math.floor(Math.random() * HEIGHT);
    const startCol = Math.floor(Math.random() * WIDTH);
    
    if (used[startRow][startCol]) continue;
    
    // Try to place word starting from this position
    const path = findWordPath(used, word, startRow, startCol);
    
    if (path.length === word.length) {
      // Successfully found a path, place the word
      for (let i = 0; i < path.length; i++) {
        const { row, col } = path[i];
        grid[row][col] = { ch: word[i], isSpangram };
        used[row][col] = true;
      }
      return true;
    }
  }
  
  return false;
}

function findWordPath(used: boolean[][], word: string, startRow: number, startCol: number): Array<{row: number, col: number}> {
  const path: Array<{row: number, col: number}> = [];
  const visited = new Set<string>();
  
  function dfs(row: number, col: number, letterIndex: number): boolean {
    if (letterIndex === word.length) {
      return true; // Successfully placed all letters
    }
    
    const key = `${row}-${col}`;
    if (visited.has(key) || used[row][col] || row < 0 || row >= HEIGHT || col < 0 || col >= WIDTH) {
      return false;
    }
    
    visited.add(key);
    path.push({ row, col });
    
    if (letterIndex === word.length - 1) {
      return true; // Last letter placed
    }
    
    // Try all 8 directions for next letter
    const directions = [...DIRECTIONS].sort(() => Math.random() - 0.5); // Randomize directions
    
    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      
      if (dfs(newRow, newCol, letterIndex + 1)) {
        return true;
      }
    }
    
    // Backtrack
    visited.delete(key);
    path.pop();
    return false;
  }
  
  if (dfs(startRow, startCol, 0)) {
    return path;
  }
  
  return [];
}

// Fallback to simple placement if advanced fails
function placeWordSimple(grid: Grid, used: boolean[][], word: string, isSpangram: boolean): boolean {
  const directions: [number, number][] = [[0, 1], [1, 0], [1, 1], [-1, 1]]; // horizontal, vertical, diagonal down-right, diagonal up-right
  
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      for (const [dRow, dCol] of directions) {
        if (canPlaceWord(used, word, row, col, dRow, dCol)) {
          // Place the word
          for (let i = 0; i < word.length; i++) {
            const newRow = row + dRow * i;
            const newCol = col + dCol * i;
            grid[newRow][newCol] = { ch: word[i], isSpangram };
            used[newRow][newCol] = true;
          }
          return true;
        }
      }
    }
  }
  
  return false;
}

function canPlaceWord(used: boolean[][], word: string, startRow: number, startCol: number, dRow: number, dCol: number): boolean {
  for (let i = 0; i < word.length; i++) {
    const row = startRow + dRow * i;
    const col = startCol + dCol * i;
    
    if (row < 0 || row >= HEIGHT || col < 0 || col >= WIDTH || used[row][col]) {
      return false;
    }
  }
  
  return true;
}
