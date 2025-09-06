  // Complete grid generator that ensures all 48 positions are filled
export type Cell = { ch: string; isSpangram?: boolean };
export type Grid = Cell[][];

const WIDTH = 6;
const HEIGHT = 8;
const CAPACITY = WIDTH * HEIGHT; // 48

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
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

export function generateCompleteGrid(input: { title: string; theme: string; author: string; words: string[] }) {
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
  
  // Try multiple strategies to ensure complete filling
  for (let attempt = 0; attempt < 200; attempt++) {
    const result = tryCompleteGeneration([spangram, ...otherWords]);
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
    errors: ['Unable to place all words to fill complete grid. Try different words.'],
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

function tryCompleteGeneration(words: string[]): { success: boolean; grid: Grid } {
  // Strategy: Place all letters then assign them to words
  const allLetters = words.join('').split('');
  const grid = createEmptyGrid();
  
  // Fill grid with all letters in random positions
  const positions: Array<{row: number, col: number}> = [];
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      positions.push({row, col});
    }
  }
  
  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  // Place all letters
  for (let i = 0; i < allLetters.length && i < positions.length; i++) {
    const {row, col} = positions[i];
    grid[row][col] = { ch: allLetters[i] };
  }
  
  // Now try to create valid word paths
  const used: boolean[][] = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  
  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    const isSpangram = wordIndex === 0;
    
    const path = findWordInGrid(grid, used, word);
    if (path.length === word.length) {
      // Mark path as used and update spangram flag
      for (const {row, col} of path) {
        used[row][col] = true;
        if (isSpangram) {
          grid[row][col].isSpangram = true;
        }
      }
    } else {
      // Can't find this word, try regeneration with better letter placement
      return tryDirectPlacement(words);
    }
  }
  
  // Verify all positions are used
  const totalUsed = used.flat().filter(Boolean).length;
  return { success: totalUsed === CAPACITY, grid };
}

function findWordInGrid(grid: Grid, used: boolean[][], word: string): Array<{row: number, col: number}> {
  // Find starting positions for first letter
  const startPositions: Array<{row: number, col: number}> = [];
  
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      if (grid[row][col].ch === word[0] && !used[row][col]) {
        startPositions.push({row, col});
      }
    }
  }
  
  // Try each starting position
  for (const start of startPositions) {
    const path = findPathFromStart(grid, used, word, start);
    if (path.length === word.length) {
      return path;
    }
  }
  
  return [];
}

function findPathFromStart(grid: Grid, used: boolean[][], word: string, start: {row: number, col: number}): Array<{row: number, col: number}> {
  const path: Array<{row: number, col: number}> = [];
  const visited = new Set<string>();
  
  function dfs(row: number, col: number, letterIndex: number): boolean {
    if (letterIndex === word.length) return true;
    
    const key = `${row}-${col}`;
    if (visited.has(key) || used[row][col] || 
        row < 0 || row >= HEIGHT || col < 0 || col >= WIDTH ||
        grid[row][col].ch !== word[letterIndex]) {
      return false;
    }
    
    visited.add(key);
    path.push({row, col});
    
    if (letterIndex === word.length - 1) return true;
    
    // Try all adjacent positions
    for (const [dr, dc] of DIRECTIONS) {
      if (dfs(row + dr, col + dc, letterIndex + 1)) {
        return true;
      }
    }
    
    // Backtrack
    visited.delete(key);
    path.pop();
    return false;
  }
  
  if (dfs(start.row, start.col, 0)) {
    return path;
  }
  
  return [];
}

function tryDirectPlacement(words: string[]): { success: boolean; grid: Grid } {
  const grid = createEmptyGrid();
  const used: boolean[][] = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  
  // Sort by length for better placement
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  
  for (let i = 0; i < sortedWords.length; i++) {
    const word = sortedWords[i];
    const isSpangram = word === words[0];
    
    if (!placeWordDirect(grid, used, word, isSpangram)) {
      return { success: false, grid };
    }
  }
  
  // Check if all positions filled
  const totalUsed = used.flat().filter(Boolean).length;
  return { success: totalUsed === CAPACITY, grid };
}

function placeWordDirect(grid: Grid, used: boolean[][], word: string, isSpangram: boolean): boolean {
  const maxAttempts = 500;
  
  // For varied placement, prioritize different placement strategies
  const strategies = [
    'curved', 'diagonal', 'zigzag', 'random_walk'
  ];
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startRow = Math.floor(Math.random() * HEIGHT);
    const startCol = Math.floor(Math.random() * WIDTH);
    
    if (used[startRow][startCol]) continue;
    
    // Try different strategies for varied placement
    const strategy = strategies[attempt % strategies.length];
    const path = buildVariedWordPath(used, word, startRow, startCol, strategy);
    
    if (path.length === word.length) {
      // Place the word
      for (let i = 0; i < path.length; i++) {
        const {row, col} = path[i];
        grid[row][col] = { ch: word[i], isSpangram };
        used[row][col] = true;
      }
      return true;
    }
  }
  
  return false;
}

function buildVariedWordPath(used: boolean[][], word: string, startRow: number, startCol: number, strategy: string): Array<{row: number, col: number}> {
  const path: Array<{row: number, col: number}> = [];
  const visited = new Set<string>();
  
  function dfs(row: number, col: number, letterIndex: number): boolean {
    if (letterIndex === word.length) return true;
    
    const key = `${row}-${col}`;
    if (visited.has(key) || used[row][col] || 
        row < 0 || row >= HEIGHT || col < 0 || col >= WIDTH) {
      return false;
    }
    
    visited.add(key);
    path.push({row, col});
    
    if (letterIndex === word.length - 1) return true;
    
    // Apply different strategies for varied word placement
    let preferredDirections = [...DIRECTIONS];
    
    switch (strategy) {
      case 'curved':
        // Prefer curved, non-linear paths
        preferredDirections = [
          [-1, -1], [-1, 1], [1, -1], [1, 1],  // Diagonals first
          [-1, 0], [0, -1], [0, 1], [1, 0]     // Then straight
        ];
        break;
        
      case 'diagonal':
        // Emphasize diagonal movement
        preferredDirections = [
          [-1, -1], [-1, 1], [1, -1], [1, 1],  // Diagonals first
          [-1, 0], [1, 0], [0, -1], [0, 1]     // Then vertical/horizontal
        ];
        break;
        
      case 'zigzag':
        // Alternate between different direction types
        const zigzagPattern = letterIndex % 2 === 0 
          ? [[-1, 1], [1, -1], [-1, -1], [1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]]
          : [[1, -1], [-1, 1], [1, 1], [-1, -1], [0, -1], [0, 1], [-1, 0], [1, 0]];
        preferredDirections = zigzagPattern;
        break;
        
      case 'random_walk':
        // Completely randomize direction preference
        preferredDirections = [...DIRECTIONS].sort(() => Math.random() - 0.5);
        break;
    }
    
    // Try preferred directions first, then fallback to others
    for (const [dr, dc] of preferredDirections) {
      if (dfs(row + dr, col + dc, letterIndex + 1)) {
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

function buildWordPath(used: boolean[][], word: string, startRow: number, startCol: number): Array<{row: number, col: number}> {
  const path: Array<{row: number, col: number}> = [];
  const visited = new Set<string>();
  
  function dfs(row: number, col: number, letterIndex: number): boolean {
    if (letterIndex === word.length) return true;
    
    const key = `${row}-${col}`;
    if (visited.has(key) || used[row][col] || 
        row < 0 || row >= HEIGHT || col < 0 || col >= WIDTH) {
      return false;
    }
    
    visited.add(key);
    path.push({row, col});
    
    if (letterIndex === word.length - 1) return true;
    
    // Randomize directions for varied paths
    const shuffledDirections = [...DIRECTIONS].sort(() => Math.random() - 0.5);
    
    for (const [dr, dc] of shuffledDirections) {
      if (dfs(row + dr, col + dc, letterIndex + 1)) {
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
