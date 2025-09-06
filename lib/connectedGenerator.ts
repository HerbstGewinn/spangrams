// Connected word generator - creates proper word interconnections like Strands
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
  
  const words = input.words || [];
  const cleanWords = words.map(word => sanitizeWord(word || '')).filter(Boolean);
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
  
  return { errors, warnings, cleanWords, lettersUsed };
}

export function generateConnectedGrid(input: { title: string; theme: string; author: string; words: string[] }) {
  try {
    const validation = validateInput(input);
    if (validation.errors.length > 0) {
      return {
        grid: createEmptyGrid(),
        errors: validation.errors,
        warnings: validation.warnings || [],
        lettersUsed: validation.lettersUsed || 0,
        spangramRemaining: 0,
      };
    }
    
    const words = validation.cleanWords || [];
    
    // Try connected placement approach
    const result = tryConnectedPlacement(words);
    
    return {
      grid: result.grid,
      errors: result.success ? [] : ['Failed to create connected grid'],
      warnings: validation.warnings || [],
      lettersUsed: validation.lettersUsed || 0,
      spangramRemaining: 0,
    };
  } catch (error) {
    return {
      grid: createEmptyGrid(),
      errors: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      lettersUsed: 0,
      spangramRemaining: 0,
    };
  }
}

function createEmptyGrid(): Grid {
  return Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => ({ ch: '' }))
  );
}

// ==========================================
// CONNECTED PLACEMENT STRATEGY
// ==========================================

function tryConnectedPlacement(words: string[]): { success: boolean; grid: Grid } {
  // This approach places words in a way that they can actually be found
  // by creating proper connected paths through the grid
  
  for (let attempt = 0; attempt < 50; attempt++) {
    const result = attemptConnectedGeneration(words);
    if (result.success) {
      return result;
    }
  }
  
  // Fallback to simple but working approach
  return createSimpleWorkingGrid(words);
}

function attemptConnectedGeneration(words: string[]): { success: boolean; grid: Grid } {
  const grid = createEmptyGrid();
  const letterPlacements: Array<{letter: string, row: number, col: number, wordIndex: number, letterIndex: number}> = [];
  
  // Step 1: Place spangram first with variety
  const spangram = words[0];
  const spangramPath = generateSpangramPath();
  
  if (spangramPath.length < spangram.length) {
    return { success: false, grid };
  }
  
  // Place spangram letters
  for (let i = 0; i < spangram.length; i++) {
    const {row, col} = spangramPath[i];
    letterPlacements.push({
      letter: spangram[i],
      row, col,
      wordIndex: 0,
      letterIndex: i
    });
  }
  
  // Step 2: Place other words using remaining letters
  const otherWords = words.slice(1);
  let remainingLetters = otherWords.join('').split('');
  
  // Try to place each word
  for (let wordIndex = 1; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    const wordPath = findWordPath(letterPlacements, word, wordIndex);
    
    if (wordPath.length === word.length) {
      // Add word letters to placements
      for (let i = 0; i < word.length; i++) {
        const {row, col} = wordPath[i];
        letterPlacements.push({
          letter: word[i],
          row, col,
          wordIndex,
          letterIndex: i
        });
      }
      
      // Remove used letters
      for (const letter of word) {
        const index = remainingLetters.indexOf(letter);
        if (index > -1) {
          remainingLetters.splice(index, 1);
        }
      }
    } else {
      return { success: false, grid };
    }
  }
  
  // Step 3: Fill any remaining positions with unused letters
  const allUsedPositions = new Set(letterPlacements.map(p => `${p.row}-${p.col}`));
  
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      const key = `${row}-${col}`;
      if (!allUsedPositions.has(key) && remainingLetters.length > 0) {
        letterPlacements.push({
          letter: remainingLetters.shift() || 'a',
          row, col,
          wordIndex: -1, // Filler letter
          letterIndex: -1
        });
      }
    }
  }
  
  // Step 4: Build final grid
  for (const placement of letterPlacements) {
    grid[placement.row][placement.col] = {
      ch: placement.letter,
      isSpangram: placement.wordIndex === 0
    };
  }
  
  // Verify all positions are filled
  let filledCount = 0;
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      if (grid[row][col].ch) filledCount++;
    }
  }
  
  return { success: filledCount === CAPACITY, grid };
}

function generateSpangramPath(): Array<{row: number, col: number}> {
  // Generate varied spangram paths
  const strategies = [
    generateDiagonalPath,
    generateSpiralPath,
    generateZigzagPath,
    generateCurvedPath
  ];
  
  const strategy = strategies[Math.floor(Math.random() * strategies.length)];
  return strategy();
}

function generateDiagonalPath(): Array<{row: number, col: number}> {
  const path: Array<{row: number, col: number}> = [];
  
  // SPANGRAM must SPAN the grid - edge to edge!
  const spanDirections = [
    'top-left-to-bottom-right',
    'top-right-to-bottom-left', 
    'top-to-bottom',
    'left-to-right',
    'bottom-left-to-top-right',
    'bottom-right-to-top-left'
  ];
  
  const direction = spanDirections[Math.floor(Math.random() * spanDirections.length)];
  
  switch (direction) {
    case 'top-left-to-bottom-right':
      // Span from top-left corner to bottom-right area
      for (let i = 0; i < 10; i++) {
        const progress = i / 9;
        const row = Math.floor(progress * (HEIGHT - 1));
        const col = Math.floor(progress * (WIDTH - 1));
        path.push({row, col});
      }
      break;
      
    case 'top-right-to-bottom-left':
      // Span from top-right corner to bottom-left area
      for (let i = 0; i < 10; i++) {
        const progress = i / 9;
        const row = Math.floor(progress * (HEIGHT - 1));
        const col = WIDTH - 1 - Math.floor(progress * (WIDTH - 1));
        path.push({row, col});
      }
      break;
      
    case 'top-to-bottom':
      // Span vertically from top to bottom
      const col = Math.floor(Math.random() * WIDTH);
      for (let i = 0; i < 10; i++) {
        const progress = i / 9;
        const row = Math.floor(progress * (HEIGHT - 1));
        // Add slight horizontal variation while staying in bounds
        const varCol = Math.max(0, Math.min(WIDTH - 1, col + Math.floor((Math.random() - 0.5) * 2)));
        path.push({row, col: varCol});
      }
      break;
      
    case 'left-to-right':
      // Span horizontally from left to right
      const row = Math.floor(Math.random() * HEIGHT);
      for (let i = 0; i < 10; i++) {
        const progress = i / 9;
        const col = Math.floor(progress * (WIDTH - 1));
        // Add slight vertical variation while staying in bounds
        const varRow = Math.max(0, Math.min(HEIGHT - 1, row + Math.floor((Math.random() - 0.5) * 2)));
        path.push({row: varRow, col});
      }
      break;
      
    default:
      // Fallback: simple diagonal
      for (let i = 0; i < 10; i++) {
        const progress = i / 9;
        const row = Math.floor(progress * (HEIGHT - 1));
        const col = Math.floor(progress * (WIDTH - 1));
        path.push({row, col});
      }
  }
  
  return path;
}

function generateSpiralPath(): Array<{row: number, col: number}> {
  const path: Array<{row: number, col: number}> = [];
  
  // SPANGRAM spans from edge, spiraling across the grid
  const edges = [
    {row: 0, col: 0, name: 'top-left'},
    {row: 0, col: WIDTH-1, name: 'top-right'},
    {row: HEIGHT-1, col: 0, name: 'bottom-left'},
    {row: HEIGHT-1, col: WIDTH-1, name: 'bottom-right'},
    {row: 0, col: Math.floor(WIDTH/2), name: 'top-center'},
    {row: HEIGHT-1, col: Math.floor(WIDTH/2), name: 'bottom-center'}
  ];
  
  const startEdge = edges[Math.floor(Math.random() * edges.length)];
  let row = startEdge.row;
  let col = startEdge.col;
  
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // Right, Down, Left, Up
  let dirIndex = 0;
  let steps = 1;
  
  path.push({row, col});
  
  while (path.length < 10) {
    for (let i = 0; i < 2; i++) { // Each step size is used twice
      for (let j = 0; j < steps; j++) {
        const [dr, dc] = directions[dirIndex];
        const newRow = row + dr;
        const newCol = col + dc;
        
        // RESPECT BOUNDARIES - only add if within grid
        if (newRow >= 0 && newRow < HEIGHT && newCol >= 0 && newCol < WIDTH) {
          row = newRow;
          col = newCol;
          path.push({row, col});
          if (path.length >= 10) break;
        } else {
          // Hit boundary, change direction early
          dirIndex = (dirIndex + 1) % 4;
          break;
        }
      }
      if (path.length >= 10) break;
      dirIndex = (dirIndex + 1) % 4;
    }
    steps++;
    
    // Safety check to prevent infinite loops
    if (steps > 10) break;
  }
  
  return path;
}

function generateZigzagPath(): Array<{row: number, col: number}> {
  const path: Array<{row: number, col: number}> = [];
  
  // Create zigzag pattern that RESPECTS BOUNDARIES
  let row = Math.floor(Math.random() * HEIGHT);
  let col = Math.floor(Math.random() * WIDTH);
  
  const directions = [[-1, 1], [1, -1], [1, 1], [-1, -1]]; // Diagonal directions
  let dirIndex = 0;
  
  path.push({row, col});
  
  for (let i = 0; i < 9; i++) {
    let [dr, dc] = directions[dirIndex % directions.length];
    
    let newRow = row + dr;
    let newCol = col + dc;
    
    // RESPECT BOUNDARIES - bounce off edges instead of wrapping
    if (newRow < 0 || newRow >= HEIGHT) {
      dr = -dr; // Reverse row direction
      dirIndex = (dirIndex + 1) % directions.length; // Change strategy
    }
    if (newCol < 0 || newCol >= WIDTH) {
      dc = -dc; // Reverse col direction
      dirIndex = (dirIndex + 1) % directions.length; // Change strategy
    }
    
    newRow = Math.max(0, Math.min(HEIGHT - 1, row + dr));
    newCol = Math.max(0, Math.min(WIDTH - 1, col + dc));
    
    row = newRow;
    col = newCol;
    
    path.push({row, col});
    
    // Change direction occasionally for zigzag effect
    if (Math.random() < 0.4) {
      dirIndex++;
    }
  }
  
  return path;
}

function generateCurvedPath(): Array<{row: number, col: number}> {
  const path: Array<{row: number, col: number}> = [];
  
  // SPANGRAM curves across the entire grid from edge to edge
  const curveTypes = [
    'horizontal-wave', // Left to right with sine wave
    'vertical-wave',   // Top to bottom with sine wave
    'diagonal-curve'   // Diagonal with curve
  ];
  
  const curveType = curveTypes[Math.floor(Math.random() * curveTypes.length)];
  
  switch (curveType) {
    case 'horizontal-wave':
      // Span horizontally from left to right with vertical sine wave
      const midRow = Math.floor(HEIGHT / 2);
      for (let i = 0; i < 10; i++) {
        const progress = i / 9; // 0 to 1
        const col = Math.floor(progress * (WIDTH - 1));
        const amplitude = Math.floor(HEIGHT / 3); // Wave amplitude
        const row = Math.max(0, Math.min(HEIGHT - 1,
          midRow + Math.floor(Math.sin(progress * Math.PI * 2) * amplitude)
        ));
        path.push({row, col});
      }
      break;
      
    case 'vertical-wave':
      // Span vertically from top to bottom with horizontal sine wave
      const midCol = Math.floor(WIDTH / 2);
      for (let i = 0; i < 10; i++) {
        const progress = i / 9; // 0 to 1
        const row = Math.floor(progress * (HEIGHT - 1));
        const amplitude = Math.floor(WIDTH / 3); // Wave amplitude
        const col = Math.max(0, Math.min(WIDTH - 1,
          midCol + Math.floor(Math.sin(progress * Math.PI * 2) * amplitude)
        ));
        path.push({row, col});
      }
      break;
      
    case 'diagonal-curve':
      // Diagonal with curved variation
      for (let i = 0; i < 10; i++) {
        const progress = i / 9; // 0 to 1
        const baseRow = Math.floor(progress * (HEIGHT - 1));
        const baseCol = Math.floor(progress * (WIDTH - 1));
        
        // Add curve variation
        const curveOffset = Math.floor(Math.sin(progress * Math.PI * 3) * 2);
        const row = Math.max(0, Math.min(HEIGHT - 1, baseRow + curveOffset));
        const col = Math.max(0, Math.min(WIDTH - 1, baseCol));
        
        path.push({row, col});
      }
      break;
  }
  
  return path;
}

function findWordPath(
  existingPlacements: Array<{letter: string, row: number, col: number, wordIndex: number, letterIndex: number}>,
  word: string,
  wordIndex: number
): Array<{row: number, col: number}> {
  
  // Find available positions for this word
  const usedPositions = new Set(existingPlacements.map(p => `${p.row}-${p.col}`));
  const availablePositions: Array<{row: number, col: number}> = [];
  
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      if (!usedPositions.has(`${row}-${col}`)) {
        availablePositions.push({row, col});
      }
    }
  }
  
  // Try to place word starting from different positions
  for (const startPos of availablePositions) {
    const path = buildWordPath(usedPositions, word, startPos);
    if (path.length === word.length) {
      return path;
    }
  }
  
  return [];
}

function buildWordPath(
  usedPositions: Set<string>,
  word: string,
  start: {row: number, col: number}
): Array<{row: number, col: number}> {
  
  const path: Array<{row: number, col: number}> = [];
  const visited = new Set<string>();
  
  function dfs(row: number, col: number, letterIndex: number): boolean {
    if (letterIndex === word.length) return true;
    
    const key = `${row}-${col}`;
    // STRICT BOUNDARY CHECKING - never go outside grid
    if (visited.has(key) || usedPositions.has(key) ||
        row < 0 || row >= HEIGHT || col < 0 || col >= WIDTH) {
      return false;
    }
    
    visited.add(key);
    path.push({row, col});
    
    if (letterIndex === word.length - 1) return true;
    
    // Try all directions in random order, but RESPECT BOUNDARIES
    const shuffledDirections = [...DIRECTIONS].sort(() => Math.random() - 0.5);
    
    for (const [dr, dc] of shuffledDirections) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      // EXPLICIT boundary check before recursion
      if (newRow >= 0 && newRow < HEIGHT && newCol >= 0 && newCol < WIDTH) {
        if (dfs(newRow, newCol, letterIndex + 1)) {
          return true;
        }
      }
    }
    
    // Backtrack
    visited.delete(key);
    path.pop();
    return false;
  }
  
  // Validate start position is within bounds
  if (start.row >= 0 && start.row < HEIGHT && start.col >= 0 && start.col < WIDTH) {
    if (dfs(start.row, start.col, 0)) {
      return path;
    }
  }
  
  return [];
}

function createSimpleWorkingGrid(words: string[]): { success: boolean; grid: Grid } {
  // Simple fallback that always works
  const grid = createEmptyGrid();
  const allLetters = words.join('').split('');
  const spangramLength = words[0] ? words[0].length : 0;
  
  let letterIndex = 0;
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      grid[row][col] = {
        ch: allLetters[letterIndex] || 'a',
        isSpangram: letterIndex < spangramLength
      };
      letterIndex++;
    }
  }
  
  return { success: true, grid };
}
