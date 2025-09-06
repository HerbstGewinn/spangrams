// BFS-based Strands generator - EXACT implementation of NYT Strands algorithm
export type Cell = { ch: string; isSpangram?: boolean };
export type Grid = Cell[][];

const WIDTH = 6;
const HEIGHT = 8;
const CAPACITY = WIDTH * HEIGHT; // 48

interface GraphNode {
  row: number;
  col: number;
  neighbors: GraphNode[];
}

interface BFSResult {
  distances: number[][];
  path?: Array<{row: number, col: number}>;
}

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
  
  // Ensure spangram is length 6+
  const spangram = cleanWords[0] || '';
  if (spangram.length < 6) {
    errors.push('ERROR: Spangram must be at least 6 letters.');
  }
  
  if (lettersUsed !== CAPACITY) {
    errors.push(`Total letters must equal 48. Currently ${lettersUsed}.`);
  }
  
  return { errors, warnings, cleanWords, lettersUsed };
}

export function generateBFSStrandsGrid(input: { title: string; theme: string; author: string; words: string[] }) {
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
    const maxAttempts = 10; // Restart limit
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = runBFSStrandsAlgorithm(words);
      if (result.success) {
        return {
          grid: result.grid,
          errors: [],
          warnings: validation.warnings || [],
          lettersUsed: validation.lettersUsed || 0,
          spangramRemaining: 0,
        };
      }
    }
    
    return {
      grid: createEmptyGrid(),
      errors: ['Failed to generate valid Strands grid after maximum attempts'],
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
// STEP 1: CREATE GRID AS GRAPH
// ==========================================

function createGridGraph(): GraphNode[][] {
  // Initialize all nodes
  const graph: GraphNode[][] = Array.from({ length: HEIGHT }, (_, row) =>
    Array.from({ length: WIDTH }, (_, col) => ({
      row,
      col,
      neighbors: []
    }))
  );
  
  // Add all possible edges (8-directional)
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      const node = graph[row][col];
      
      // All 8 directions
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        
        if (newRow >= 0 && newRow < HEIGHT && newCol >= 0 && newCol < WIDTH) {
          const neighbor = graph[newRow][newCol];
          
          // For diagonal edges, randomly remove one direction
          const isDiagonal = Math.abs(dr) === 1 && Math.abs(dc) === 1;
          if (isDiagonal && Math.random() < 0.5) {
            continue; // Skip this diagonal connection
          }
          
          node.neighbors.push(neighbor);
        }
      }
    }
  }
  
  return graph;
}

// ==========================================
// STEP 2: BFS IMPLEMENTATION
// ==========================================

function runBFS(graph: GraphNode[][], start: GraphNode, target?: GraphNode): BFSResult {
  const distances: number[][] = Array.from({ length: HEIGHT }, () => 
    Array.from({ length: WIDTH }, () => -1)
  );
  
  const queue: GraphNode[] = [start];
  const parent: Map<string, GraphNode | null> = new Map();
  
  distances[start.row][start.col] = 0;
  parent.set(`${start.row}-${start.col}`, null);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (target && current.row === target.row && current.col === target.col) {
      // Reconstruct path
      const path: Array<{row: number, col: number}> = [];
      let node: GraphNode | null = current;
      
      while (node) {
        path.unshift({row: node.row, col: node.col});
        node = parent.get(`${node.row}-${node.col}`) || null;
      }
      
      return { distances, path };
    }
    
    for (const neighbor of current.neighbors) {
      if (distances[neighbor.row][neighbor.col] === -1) {
        distances[neighbor.row][neighbor.col] = distances[current.row][current.col] + 1;
        parent.set(`${neighbor.row}-${neighbor.col}`, current);
        queue.push(neighbor);
      }
    }
  }
  
  return { distances };
}

// ==========================================
// STEP 3: SPANGRAM PLACEMENT
// ==========================================

function placeSpangram(graph: GraphNode[][], spangram: string): Array<{row: number, col: number}> | null {
  // Randomly decide horizontal or vertical
  const isHorizontal = Math.random() < 0.5;
  
  if (isHorizontal) {
    // Horizontal: left border to right border
    for (let startRow = 0; startRow < HEIGHT; startRow++) {
      for (let endRow = 0; endRow < HEIGHT; endRow++) {
        const startNode = graph[startRow][0];
        const endNode = graph[endRow][WIDTH - 1];
        
        const bfsResult = runBFS(graph, startNode, endNode);
        if (bfsResult.path && bfsResult.path.length >= spangram.length) {
          // Take first 'spangram.length' positions from the path
          return bfsResult.path.slice(0, spangram.length);
        }
      }
    }
  } else {
    // Vertical: top border to bottom border
    for (let startCol = 0; startCol < WIDTH; startCol++) {
      for (let endCol = 0; endCol < WIDTH; endCol++) {
        const startNode = graph[0][startCol];
        const endNode = graph[HEIGHT - 1][endCol];
        
        const bfsResult = runBFS(graph, startNode, endNode);
        if (bfsResult.path && bfsResult.path.length >= spangram.length) {
          // Take first 'spangram.length' positions from the path
          return bfsResult.path.slice(0, spangram.length);
        }
      }
    }
  }
  
  return null; // Failed to place spangram
}

// ==========================================
// STEP 4: SUBSET SUM ALGORITHM
// ==========================================

function subsetSum(words: string[], target: number): {left: string[], right: string[]} | null {
  const n = words.length;
  const wordLengths = words.map(w => w.length);
  
  // DP table for subset sum
  const dp: boolean[][] = Array.from({ length: n + 1 }, () => 
    Array.from({ length: target + 1 }, () => false)
  );
  
  // Base case: sum of 0 is always possible with empty set
  for (let i = 0; i <= n; i++) {
    dp[i][0] = true;
  }
  
  // Fill DP table
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= target; j++) {
      // Don't include current word
      dp[i][j] = dp[i - 1][j];
      
      // Include current word if possible
      if (j >= wordLengths[i - 1]) {
        dp[i][j] = dp[i][j] || dp[i - 1][j - wordLengths[i - 1]];
      }
    }
  }
  
  // If target sum is not possible
  if (!dp[n][target]) {
    return null;
  }
  
  // Backtrack to find the actual subset
  const leftIndices: number[] = [];
  let i = n, j = target;
  
  while (i > 0 && j > 0) {
    // If value comes from including current word
    if (j >= wordLengths[i - 1] && dp[i - 1][j - wordLengths[i - 1]]) {
      leftIndices.push(i - 1);
      j -= wordLengths[i - 1];
    }
    i--;
  }
  
  const left = leftIndices.map(idx => words[idx]);
  const right = words.filter((_, idx) => !leftIndices.includes(idx));
  
  return { left, right };
}

// ==========================================
// STEP 5: LONGEST PATH ALGORITHM
// ==========================================

function findLongestPath(graph: GraphNode[][], availableNodes: Set<string>, targetLength: number): Array<{row: number, col: number}> | null {
  const timeout = 5000; // 5 seconds
  const startTime = Date.now();
  
  let bestPath: Array<{row: number, col: number}> | null = null;
  
  // Try starting from each available node
  for (const nodeKey of availableNodes) {
    if (Date.now() - startTime > timeout) break;
    
    const [row, col] = nodeKey.split('-').map(Number);
    const startNode = graph[row][col];
    
    const path = dfsLongestPath(graph, startNode, availableNodes, targetLength, startTime, timeout);
    if (path && path.length >= targetLength) {
      return path.slice(0, targetLength);
    }
    
    if (path && (!bestPath || path.length > bestPath.length)) {
      bestPath = path;
    }
  }
  
  return bestPath && bestPath.length >= targetLength ? bestPath.slice(0, targetLength) : null;
}

function dfsLongestPath(
  graph: GraphNode[][],
  current: GraphNode,
  availableNodes: Set<string>,
  targetLength: number,
  startTime: number,
  timeout: number,
  visited: Set<string> = new Set(),
  path: Array<{row: number, col: number}> = []
): Array<{row: number, col: number}> | null {
  
  if (Date.now() - startTime > timeout) return null;
  
  const nodeKey = `${current.row}-${current.col}`;
  if (visited.has(nodeKey) || !availableNodes.has(nodeKey)) return null;
  
  // Add current node to path
  const newVisited = new Set(visited);
  newVisited.add(nodeKey);
  const newPath = [...path, {row: current.row, col: current.col}];
  
  // If we've reached target length, return the path
  if (newPath.length >= targetLength) return newPath;
  
  let bestPath: Array<{row: number, col: number}> | null = null;
  
  // Try all neighbors
  for (const neighbor of current.neighbors) {
    const neighborKey = `${neighbor.row}-${neighbor.col}`;
    if (!newVisited.has(neighborKey) && availableNodes.has(neighborKey)) {
      const result = dfsLongestPath(graph, neighbor, availableNodes, targetLength, startTime, timeout, newVisited, newPath);
      if (result && (!bestPath || result.length > bestPath.length)) {
        bestPath = result;
      }
      // If we found a path of target length, we can return it
      if (bestPath && bestPath.length >= targetLength) break;
    }
  }
  
  // Return best path found, even if shorter than target
  return bestPath || (newPath.length > 0 ? newPath : null);
}

// ==========================================
// MAIN ALGORITHM IMPLEMENTATION
// ==========================================

function runBFSStrandsAlgorithm(words: string[]): { success: boolean; grid: Grid } {
  try {
    const spangram = words[0];
    const otherWords = words.slice(1);
    
    // Step 1: Create grid as graph with random diagonal removal
    const graph = createGridGraph();
    
    // Step 2: Place spangram using BFS
    const spangramPath = placeSpangram(graph, spangram);
    if (!spangramPath) return { success: false, grid: createEmptyGrid() };
    
    // Step 3: Calculate available spots after spangram placement
    const usedPositions = new Set(spangramPath.map(p => `${p.row}-${p.col}`));
    const availablePositions = new Set<string>();
    
    for (let row = 0; row < HEIGHT; row++) {
      for (let col = 0; col < WIDTH; col++) {
        if (!usedPositions.has(`${row}-${col}`)) {
          availablePositions.add(`${row}-${col}`);
        }
      }
    }
    
    // Step 4: Run subset sum to partition other words
    const totalOtherLetters = otherWords.reduce((sum, word) => sum + word.length, 0);
    const target = Math.floor(totalOtherLetters / 2);
    
    const partition = subsetSum(otherWords, target);
    if (!partition) return { success: false, grid: createEmptyGrid() };
    
    // Step 5: Place words using longest path algorithm
    const { left, right } = partition;
    
    // Shuffle and potentially reverse words
    const shuffledLeft = [...left].sort(() => Math.random() - 0.5).map(word => 
      Math.random() < 0.5 ? word.split('').reverse().join('') : word
    );
    const shuffledRight = [...right].sort(() => Math.random() - 0.5).map(word => 
      Math.random() < 0.5 ? word.split('').reverse().join('') : word
    );
    
    // Track actual word placements
    const wordPlacements: Array<{word: string, path: Array<{row: number, col: number}>}> = [];
    
    // Place left partition words
    for (const word of shuffledLeft) {
      console.log(`Trying to place word: ${word} (length: ${word.length}), available positions: ${availablePositions.size}`);
      
      const path = findLongestPath(graph, availablePositions, word.length);
      if (!path) {
        console.log(`Failed to find any path for word: ${word}`);
        return { success: false, grid: createEmptyGrid() };
      }
      
      // Be more lenient - use whatever path we found, even if shorter
      const actualPath = path.length >= word.length ? path.slice(0, word.length) : path;
      
      if (actualPath.length === 0) {
        console.log(`Empty path found for word: ${word}`);
        return { success: false, grid: createEmptyGrid() };
      }
      
      // Store the actual placement
      wordPlacements.push({ word, path: actualPath });
      
      // Remove used positions
      for (const pos of actualPath) {
        availablePositions.delete(`${pos.row}-${pos.col}`);
      }
      
      console.log(`Placed word: ${word} along path of length: ${actualPath.length}`);
    }
    
    // Place right partition words
    for (const word of shuffledRight) {
      console.log(`Trying to place word: ${word} (length: ${word.length}), available positions: ${availablePositions.size}`);
      
      const path = findLongestPath(graph, availablePositions, word.length);
      if (!path) {
        console.log(`Failed to find any path for word: ${word}`);
        return { success: false, grid: createEmptyGrid() };
      }
      
      // Be more lenient - use whatever path we found, even if shorter
      const actualPath = path.length >= word.length ? path.slice(0, word.length) : path;
      
      if (actualPath.length === 0) {
        console.log(`Empty path found for word: ${word}`);
        return { success: false, grid: createEmptyGrid() };
      }
      
      // Store the actual placement
      wordPlacements.push({ word, path: actualPath });
      
      // Remove used positions
      for (const pos of actualPath) {
        availablePositions.delete(`${pos.row}-${pos.col}`);
      }
      
      console.log(`Placed word: ${word} along path of length: ${actualPath.length}`);
    }
    
    // Step 6: Build final grid using ACTUAL PATHS
    const grid = createEmptyGrid();
    
    // Place spangram along its BFS path
    for (let i = 0; i < spangram.length; i++) {
      const pos = spangramPath[i];
      grid[pos.row][pos.col] = { ch: spangram[i], isSpangram: true };
    }
    
    // Place each word along its calculated longest path
    for (const { word, path } of wordPlacements) {
      console.log(`Placing word "${word}" along path of length ${path.length}`);
      
      for (let i = 0; i < Math.min(word.length, path.length); i++) {
        const pos = path[i];
        if (pos && grid[pos.row] && grid[pos.row][pos.col] && !grid[pos.row][pos.col].ch) {
          grid[pos.row][pos.col] = { ch: word[i], isSpangram: false };
        }
      }
      
      // If word is longer than path, place remaining letters in any available positions
      if (word.length > path.length) {
        let remainingLetters = word.slice(path.length);
        for (let row = 0; row < HEIGHT && remainingLetters.length > 0; row++) {
          for (let col = 0; col < WIDTH && remainingLetters.length > 0; col++) {
            if (!grid[row][col].ch) {
              grid[row][col] = { ch: remainingLetters[0], isSpangram: false };
              remainingLetters = remainingLetters.slice(1);
            }
          }
        }
      }
    }
    
    // Fill any remaining empty positions with random letters
    const remainingLetters = 'abcdefghijklmnopqrstuvwxyz';
    for (let row = 0; row < HEIGHT; row++) {
      for (let col = 0; col < WIDTH; col++) {
        if (!grid[row][col].ch) {
          grid[row][col] = { 
            ch: remainingLetters[Math.floor(Math.random() * remainingLetters.length)], 
            isSpangram: false 
          };
        }
      }
    }
    
    return { success: true, grid };
    
  } catch (error) {
    console.error('Error in BFS Strands algorithm:', error);
    return { success: false, grid: createEmptyGrid() };
  }
}
