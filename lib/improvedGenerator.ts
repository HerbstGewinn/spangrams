// Improved grid generator with truly varied word placement
export type Cell = { ch: string; isSpangram?: boolean };
export type Grid = Cell[][];

const WIDTH = 6;
const HEIGHT = 8;
const CAPACITY = WIDTH * HEIGHT;

// 8-directional adjacency
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

export function generateImprovedGrid(input: { title: string; theme: string; author: string; words: string[] }) {
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
  
  // Try multiple times with different strategies
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = tryGenerateVariedGrid([spangram, ...otherWords]);
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
    errors: ['Unable to place all words with varied layout. Try different words.'],
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

function tryGenerateVariedGrid(words: string[]): { success: boolean; grid: Grid } {
  const grid = createEmptyGrid();
  const used: boolean[][] = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  
  // Sort words by length (longest first for better placement)
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  
  for (let i = 0; i < sortedWords.length; i++) {
    const word = sortedWords[i];
    const isSpangram = word === words[0]; // Original first word is spangram
    
    if (!placeWordWithVariedPath(grid, used, word, isSpangram)) {
      return { success: false, grid };
    }
  }
  
  // Verify all positions are filled
  const totalUsed = used.flat().filter(Boolean).length;
  if (totalUsed !== CAPACITY) {
    return { success: false, grid };
  }
  
  return { success: true, grid };
}

function placeWordWithVariedPath(grid: Grid, used: boolean[][], word: string, isSpangram: boolean): boolean {
  const maxAttempts = 200; // More attempts for better placement
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Try different placement strategies
    const strategy = attempt % 4;
    let path: Array<{row: number, col: number}> = [];
    
    switch (strategy) {
      case 0: // Curved/snake pattern
        path = findCurvedPath(used, word);
        break;
      case 1: // Diagonal emphasis
        path = findDiagonalPath(used, word);
        break;
      case 2: // Zigzag pattern
        path = findZigzagPath(used, word);
        break;
      case 3: // Random walk
        path = findRandomWalkPath(used, word);
        break;
    }
    
    if (path.length === word.length) {
      // Place the word
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

function findCurvedPath(used: boolean[][], word: string): Array<{row: number, col: number}> {
  for (let attempts = 0; attempts < 50; attempts++) {
    const startRow = Math.floor(Math.random() * HEIGHT);
    const startCol = Math.floor(Math.random() * WIDTH);
    
    if (used[startRow][startCol]) continue;
    
    const path = [{row: startRow, col: startCol}];
    const visited = new Set([`${startRow}-${startCol}`]);
    
    for (let i = 1; i < word.length; i++) {
      const lastPos = path[path.length - 1];
      const possibleMoves = DIRECTIONS
        .map(([dr, dc]) => ({
          row: lastPos.row + dr,
          col: lastPos.col + dc,
          direction: [dr, dc]
        }))
        .filter(pos => 
          pos.row >= 0 && pos.row < HEIGHT &&
          pos.col >= 0 && pos.col < WIDTH &&
          !used[pos.row][pos.col] &&
          !visited.has(`${pos.row}-${pos.col}`)
        );
      
      if (possibleMoves.length === 0) break;
      
      // Prefer curved movements (change direction frequently)
      const preferredMoves = possibleMoves.filter(move => {
        if (path.length < 2) return true;
        const prevMove = path[path.length - 1];
        const beforeMove = path[path.length - 2];
        const prevDir = [prevMove.row - beforeMove.row, prevMove.col - beforeMove.col];
        return move.direction[0] !== prevDir[0] || move.direction[1] !== prevDir[1];
      });
      
      const candidates = preferredMoves.length > 0 ? preferredMoves : possibleMoves;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      
      path.push({row: chosen.row, col: chosen.col});
      visited.add(`${chosen.row}-${chosen.col}`);
    }
    
    if (path.length === word.length) return path;
  }
  
  return [];
}

function findDiagonalPath(used: boolean[][], word: string): Array<{row: number, col: number}> {
  const diagonalDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  
  for (let attempts = 0; attempts < 30; attempts++) {
    const startRow = Math.floor(Math.random() * HEIGHT);
    const startCol = Math.floor(Math.random() * WIDTH);
    
    if (used[startRow][startCol]) continue;
    
    const direction = diagonalDirs[Math.floor(Math.random() * diagonalDirs.length)];
    const path = [{row: startRow, col: startCol}];
    
    for (let i = 1; i < word.length; i++) {
      const lastPos = path[path.length - 1];
      
      // 70% chance to continue diagonal, 30% chance to change direction
      let nextRow, nextCol;
      if (Math.random() < 0.7) {
        nextRow = lastPos.row + direction[0];
        nextCol = lastPos.col + direction[1];
      } else {
        const allDirs = [...DIRECTIONS];
        const randomDir = allDirs[Math.floor(Math.random() * allDirs.length)];
        nextRow = lastPos.row + randomDir[0];
        nextCol = lastPos.col + randomDir[1];
      }
      
      if (nextRow < 0 || nextRow >= HEIGHT || nextCol < 0 || nextCol >= WIDTH || used[nextRow][nextCol]) {
        break;
      }
      
      path.push({row: nextRow, col: nextCol});
    }
    
    if (path.length === word.length) return path;
  }
  
  return [];
}

function findZigzagPath(used: boolean[][], word: string): Array<{row: number, col: number}> {
  for (let attempts = 0; attempts < 30; attempts++) {
    const startRow = Math.floor(Math.random() * HEIGHT);
    const startCol = Math.floor(Math.random() * WIDTH);
    
    if (used[startRow][startCol]) continue;
    
    const path = [{row: startRow, col: startCol}];
    let currentDirection = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    
    for (let i = 1; i < word.length; i++) {
      const lastPos = path[path.length - 1];
      
      // Change direction every 2-3 steps for zigzag effect
      if (i % (2 + Math.floor(Math.random() * 2)) === 0) {
        const availableDirs = DIRECTIONS.filter(dir => 
          dir[0] !== currentDirection[0] || dir[1] !== currentDirection[1]
        );
        currentDirection = availableDirs[Math.floor(Math.random() * availableDirs.length)];
      }
      
      const nextRow = lastPos.row + currentDirection[0];
      const nextCol = lastPos.col + currentDirection[1];
      
      if (nextRow < 0 || nextRow >= HEIGHT || nextCol < 0 || nextCol >= WIDTH || used[nextRow][nextCol]) {
        // Try a different direction
        const emergencyDirs = DIRECTIONS.filter(([dr, dc]) => {
          const r = lastPos.row + dr;
          const c = lastPos.col + dc;
          return r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH && !used[r][c];
        });
        
        if (emergencyDirs.length === 0) break;
        
        currentDirection = emergencyDirs[Math.floor(Math.random() * emergencyDirs.length)];
        const nextRow2 = lastPos.row + currentDirection[0];
        const nextCol2 = lastPos.col + currentDirection[1];
        
        if (nextRow2 < 0 || nextRow2 >= HEIGHT || nextCol2 < 0 || nextCol2 >= WIDTH || used[nextRow2][nextCol2]) {
          break;
        }
        
        path.push({row: nextRow2, col: nextCol2});
      } else {
        path.push({row: nextRow, col: nextCol});
      }
    }
    
    if (path.length === word.length) return path;
  }
  
  return [];
}

function findRandomWalkPath(used: boolean[][], word: string): Array<{row: number, col: number}> {
  for (let attempts = 0; attempts < 30; attempts++) {
    const startRow = Math.floor(Math.random() * HEIGHT);
    const startCol = Math.floor(Math.random() * WIDTH);
    
    if (used[startRow][startCol]) continue;
    
    const path = [{row: startRow, col: startCol}];
    const visited = new Set([`${startRow}-${startCol}`]);
    
    for (let i = 1; i < word.length; i++) {
      const lastPos = path[path.length - 1];
      const availableMoves = DIRECTIONS
        .map(([dr, dc]) => ({row: lastPos.row + dr, col: lastPos.col + dc}))
        .filter(pos => 
          pos.row >= 0 && pos.row < HEIGHT &&
          pos.col >= 0 && pos.col < WIDTH &&
          !used[pos.row][pos.col] &&
          !visited.has(`${pos.row}-${pos.col}`)
        );
      
      if (availableMoves.length === 0) break;
      
      const chosen = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      path.push(chosen);
      visited.add(`${chosen.row}-${chosen.col}`);
    }
    
    if (path.length === word.length) return path;
  }
  
  return [];
}
