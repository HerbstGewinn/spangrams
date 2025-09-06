// Pro-level generator with guaranteed complete coverage and maximum variety
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

export function generateProGrid(input: { title: string; theme: string; author: string; words: string[] }) {
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
  
  // Try multiple intelligent generation attempts
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = tryProGeneration(words);
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
    errors: ['Unable to create varied grid with complete coverage. Try different words.'],
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

// ====================
// PHASE 1: STRATEGIC WORD PLACEMENT
// ====================

function tryProGeneration(words: string[]): { success: boolean; grid: Grid } {
  const grid = createEmptyGrid();
  const used: boolean[][] = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  const spangram = words[0];
  
  // Phase 1: Place spangram with maximum variety
  const spangramStrategy = chooseSpangramStrategy();
  if (!placeSpangramVaried(grid, used, spangram, spangramStrategy)) {
    return { success: false, grid };
  }
  
  // Phase 2: Place other words with intelligent positioning
  const otherWords = words.slice(1);
  const wordStrategies = generateWordStrategies(otherWords.length);
  
  for (let i = 0; i < otherWords.length; i++) {
    const word = otherWords[i];
    const strategy = wordStrategies[i];
    
    if (!placeWordIntelligent(grid, used, word, strategy)) {
      return { success: false, grid };
    }
  }
  
  // Phase 3: Intelligent gap filling
  const remainingLetters = getRemainingLetters(words, used);
  if (remainingLetters.length > 0) {
    if (!fillGapsIntelligently(grid, used, remainingLetters)) {
      return { success: false, grid };
    }
  }
  
  // Verify complete coverage
  const totalUsed = used.flat().filter(Boolean).length;
  return { success: totalUsed === CAPACITY, grid };
}

// ====================
// SPANGRAM PLACEMENT STRATEGIES
// ====================

function chooseSpangramStrategy(): string {
  const strategies = [
    'diagonal_sweep',    // Long diagonal across grid
    'spiral_path',       // Spiral pattern
    'zigzag_major',      // Major zigzag pattern
    'border_snake',      // Snake around border
    'center_explosion',  // Start center, radiate out
    'corner_curve',      // Start corner, curve through
    'random_walk_long'   // Extended random walk
  ];
  
  return strategies[Math.floor(Math.random() * strategies.length)];
}

function placeSpangramVaried(grid: Grid, used: boolean[][], spangram: string, strategy: string): boolean {
  const maxAttempts = 200;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startPos = getStrategicStartPosition(strategy, spangram.length);
    const path = buildSpangramPath(used, spangram, startPos, strategy);
    
    if (path.length === spangram.length) {
      // Place the spangram
      for (let i = 0; i < path.length; i++) {
        const {row, col} = path[i];
        grid[row][col] = { ch: spangram[i], isSpangram: true };
        used[row][col] = true;
      }
      return true;
    }
  }
  
  return false;
}

function getStrategicStartPosition(strategy: string, wordLength: number): {row: number, col: number} {
  switch (strategy) {
    case 'diagonal_sweep':
      // Start from corners for long diagonals
      const corners = [{row: 0, col: 0}, {row: 0, col: WIDTH-1}, {row: HEIGHT-1, col: 0}, {row: HEIGHT-1, col: WIDTH-1}];
      return corners[Math.floor(Math.random() * corners.length)];
      
    case 'spiral_path':
      // Start from random edge
      const edges = [
        ...Array.from({length: WIDTH}, (_, i) => ({row: 0, col: i})),
        ...Array.from({length: WIDTH}, (_, i) => ({row: HEIGHT-1, col: i})),
        ...Array.from({length: HEIGHT}, (_, i) => ({row: i, col: 0})),
        ...Array.from({length: HEIGHT}, (_, i) => ({row: i, col: WIDTH-1}))
      ];
      return edges[Math.floor(Math.random() * edges.length)];
      
    case 'center_explosion':
      // Start from center area
      return {
        row: Math.floor(HEIGHT/2) + (Math.random() > 0.5 ? -1 : 1),
        col: Math.floor(WIDTH/2) + (Math.random() > 0.5 ? -1 : 1)
      };
      
    case 'border_snake':
      // Start from any border position
      const border = [
        ...Array.from({length: WIDTH}, (_, i) => ({row: 0, col: i})),
        ...Array.from({length: WIDTH}, (_, i) => ({row: HEIGHT-1, col: i})),
        ...Array.from({length: HEIGHT-2}, (_, i) => ({row: i+1, col: 0})),
        ...Array.from({length: HEIGHT-2}, (_, i) => ({row: i+1, col: WIDTH-1}))
      ];
      return border[Math.floor(Math.random() * border.length)];
      
    default:
      // Random position
      return {
        row: Math.floor(Math.random() * HEIGHT),
        col: Math.floor(Math.random() * WIDTH)
      };
  }
}

function buildSpangramPath(used: boolean[][], word: string, start: {row: number, col: number}, strategy: string): Array<{row: number, col: number}> {
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
    
    // Get strategy-specific direction preferences
    const preferredDirections = getSpangramDirections(strategy, letterIndex, row, col);
    
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
  
  if (dfs(start.row, start.col, 0)) {
    return path;
  }
  
  return [];
}

function getSpangramDirections(strategy: string, letterIndex: number, currentRow: number, currentCol: number): Array<[number, number]> {
  switch (strategy) {
    case 'diagonal_sweep':
      // Prefer diagonal movement
      return [
        [-1, -1], [1, 1], [-1, 1], [1, -1],  // Diagonals
        [0, 1], [0, -1], [1, 0], [-1, 0]     // Straight (backup)
      ];
      
    case 'spiral_path':
      // Create spiral by rotating directions
      const spiralOrder = letterIndex % 4;
      const spiralDirs = [
        [[0, 1], [1, 0], [0, -1], [-1, 0]],   // Right, Down, Left, Up
        [[1, 0], [0, -1], [-1, 0], [0, 1]],   // Down, Left, Up, Right
        [[0, -1], [-1, 0], [0, 1], [1, 0]],   // Left, Up, Right, Down
        [[-1, 0], [0, 1], [1, 0], [0, -1]]    // Up, Right, Down, Left
      ];
      return [...spiralDirs[spiralOrder], ...DIRECTIONS.filter(d => 
        !spiralDirs[spiralOrder].some(sd => sd[0] === d[0] && sd[1] === d[1])
      )];
      
    case 'zigzag_major':
      // Alternate between opposing directions
      const zigzagPattern = letterIndex % 2 === 0 
        ? [[-1, 1], [1, -1], [1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]]
        : [[1, -1], [-1, 1], [-1, -1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]];
      return zigzagPattern;
      
    case 'border_snake':
      // Prefer border-following movement
      const isNearBorder = currentRow === 0 || currentRow === HEIGHT-1 || currentCol === 0 || currentCol === WIDTH-1;
      if (isNearBorder) {
        return [[0, 1], [0, -1], [1, 0], [-1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      }
      return DIRECTIONS;
      
    case 'center_explosion':
      // Radiate outward from center
      const centerRow = HEIGHT / 2;
      const centerCol = WIDTH / 2;
      const awayfromCenter = [
        currentRow < centerRow ? [-1, 0] : [1, 0],
        currentCol < centerCol ? [0, -1] : [0, 1]
      ];
      return [...awayfromCenter, ...DIRECTIONS.filter(d => 
        !awayfromCenter.some(ac => ac[0] === d[0] && ac[1] === d[1])
      )];
      
    default:
      return [...DIRECTIONS].sort(() => Math.random() - 0.5);
  }
}

// ====================
// WORD PLACEMENT STRATEGIES
// ====================

function generateWordStrategies(wordCount: number): string[] {
  const strategies = [
    'complement_spangram',  // Place to complement spangram pattern
    'corner_fill',          // Fill corners and edges
    'scattered_random',     // Scattered throughout
    'cluster_break',        // Break up clustering
    'directional_sweep',    // Sweep in specific direction
    'gap_bridging'          // Bridge existing gaps
  ];
  
  // Ensure variety by not repeating strategies consecutively
  const result: string[] = [];
  let lastStrategy = '';
  
  for (let i = 0; i < wordCount; i++) {
    let strategy;
    do {
      strategy = strategies[Math.floor(Math.random() * strategies.length)];
    } while (strategy === lastStrategy && strategies.length > 1);
    
    result.push(strategy);
    lastStrategy = strategy;
  }
  
  return result;
}

function placeWordIntelligent(grid: Grid, used: boolean[][], word: string, strategy: string): boolean {
  const maxAttempts = 300;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startPos = getWordStartPosition(used, strategy);
    if (!startPos) continue;
    
    const path = buildWordPath(used, word, startPos, strategy);
    
    if (path.length === word.length) {
      // Place the word
      for (let i = 0; i < path.length; i++) {
        const {row, col} = path[i];
        grid[row][col] = { ch: word[i] };
        used[row][col] = true;
      }
      return true;
    }
  }
  
  return false;
}

function getWordStartPosition(used: boolean[][], strategy: string): {row: number, col: number} | null {
  const freePositions = [];
  
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      if (!used[row][col]) {
        freePositions.push({row, col});
      }
    }
  }
  
  if (freePositions.length === 0) return null;
  
  switch (strategy) {
    case 'corner_fill':
      // Prefer corners and edges
      const corners = freePositions.filter(pos => 
        (pos.row === 0 || pos.row === HEIGHT-1) && (pos.col === 0 || pos.col === WIDTH-1)
      );
      if (corners.length > 0) {
        return corners[Math.floor(Math.random() * corners.length)];
      }
      const edges = freePositions.filter(pos => 
        pos.row === 0 || pos.row === HEIGHT-1 || pos.col === 0 || pos.col === WIDTH-1
      );
      return edges.length > 0 ? edges[Math.floor(Math.random() * edges.length)] : freePositions[0];
      
    case 'scattered_random':
      // Prefer positions away from used areas
      const isolated = freePositions.filter(pos => {
        const neighbors = DIRECTIONS.reduce((count, [dr, dc]) => {
          const nr = pos.row + dr, nc = pos.col + dc;
          return count + (nr >= 0 && nr < HEIGHT && nc >= 0 && nc < WIDTH && used[nr][nc] ? 1 : 0);
        }, 0);
        return neighbors <= 2; // Prefer less connected areas
      });
      return isolated.length > 0 ? 
        isolated[Math.floor(Math.random() * isolated.length)] : 
        freePositions[Math.floor(Math.random() * freePositions.length)];
      
    default:
      return freePositions[Math.floor(Math.random() * freePositions.length)];
  }
}

function buildWordPath(used: boolean[][], word: string, start: {row: number, col: number}, strategy: string): Array<{row: number, col: number}> {
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
    
    // Get strategy-specific directions with more randomization
    const directions = getWordDirections(strategy, letterIndex);
    
    for (const [dr, dc] of directions) {
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

function getWordDirections(strategy: string, letterIndex: number): Array<[number, number]> {
  // Much more aggressive randomization
  const baseDirections = [...DIRECTIONS];
  
  switch (strategy) {
    case 'complement_spangram':
      // Opposite pattern to spangram
      return baseDirections.sort(() => Math.random() - 0.5);
      
    case 'directional_sweep':
      // Strong directional bias with randomization
      const sweepDir = Math.floor(Math.random() * 4);
      const sweepPatterns = [
        [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]], // Right sweep
        [[1, 0], [1, 1], [1, -1], [0, 1], [0, -1], [-1, 0], [-1, 1], [-1, -1]], // Down sweep
        [[0, -1], [-1, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]], // Left sweep
        [[-1, 0], [-1, -1], [-1, 1], [0, -1], [0, 1], [1, 0], [1, -1], [1, 1]]  // Up sweep
      ];
      return sweepPatterns[sweepDir];
      
    default:
      // Complete randomization for maximum variety
      return baseDirections.sort(() => Math.random() - 0.5);
  }
}

// ====================
// PHASE 3: INTELLIGENT GAP FILLING
// ====================

function getRemainingLetters(words: string[], used: boolean[][]): string[] {
  const allLetters = words.join('').split('');
  const usedCount = used.flat().filter(Boolean).length;
  const remainingCount = CAPACITY - usedCount;
  
  // Get unused letters from word pool or generate fillers
  const remaining = [];
  for (let i = allLetters.length - remainingCount; i < allLetters.length; i++) {
    remaining.push(allLetters[i] || 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]);
  }
  
  return remaining;
}

function fillGapsIntelligently(grid: Grid, used: boolean[][], remainingLetters: string[]): boolean {
  const gaps = findAllGaps(used);
  
  if (gaps.length !== remainingLetters.length) {
    return false; // Mismatch - should not happen with correct logic
  }
  
  // Prioritize gap filling by importance (isolated gaps first)
  gaps.sort((a, b) => getGapPriority(used, a) - getGapPriority(used, b));
  
  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i];
    const letter = remainingLetters[i];
    
    grid[gap.row][gap.col] = { ch: letter };
    used[gap.row][gap.col] = true;
  }
  
  return true;
}

function findAllGaps(used: boolean[][]): Array<{row: number, col: number}> {
  const gaps = [];
  
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      if (!used[row][col]) {
        gaps.push({row, col});
      }
    }
  }
  
  return gaps;
}

function getGapPriority(used: boolean[][], gap: {row: number, col: number}): number {
  // Higher priority = fill later (lower number = fill first)
  let connectedNeighbors = 0;
  
  for (const [dr, dc] of DIRECTIONS) {
    const nr = gap.row + dr;
    const nc = gap.col + dc;
    
    if (nr >= 0 && nr < HEIGHT && nc >= 0 && nc < WIDTH && used[nr][nc]) {
      connectedNeighbors++;
    }
  }
  
  // Isolated gaps get highest priority (fill first)
  return -connectedNeighbors;
}
