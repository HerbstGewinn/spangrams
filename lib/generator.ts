export type GenerateInput = {
  title: string;
  theme: string;
  author: string;
  spangram: string; // special word path
  words: string[]; // other words
};

export type Placement = { y: number; x: number; }; // row, col

export type GenerateResult = {
  grid: { ch: string; isSpangram?: boolean }[][]; // 6x8
  warnings: string[];
  errors: string[];
  lettersUsed: number; // total letters across words, including spangram
  spangramRemaining: number; // remaining to reach >= 6
};

const WIDTH = 6;
const HEIGHT = 8;
const CAPACITY = WIDTH * HEIGHT; // 48

function sanitizeWord(word: string): string {
  return word.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

export function validateInput(input: GenerateInput) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const cleanSpangram = sanitizeWord(input.spangram);
  const cleanWords = input.words.map(sanitizeWord).filter(Boolean);

  const lettersUsed = cleanWords.join('').length + cleanSpangram.length;

  if (cleanWords.length === 0) {
    errors.push('ERROR: Can not have empty words.');
  }
  if (lettersUsed === 0) {
    errors.push('You have 0 letters. You need 48 more.');
  }
  const spRemaining = Math.max(0, 6 - cleanSpangram.length);
  if (spRemaining > 0) {
    warnings.push(`Spangram needs ${spRemaining} more letters.`);
  }
  if (!input.title?.trim()) warnings.push('WARNING: Consider modifying the title.');
  if (!input.theme?.trim()) warnings.push('WARNING: Consider modifying the theme.');
  if (!input.author?.trim()) warnings.push('WARNING: Consider modifying the author.');

  const toGo = CAPACITY - lettersUsed;
  const needMsg = toGo > 0 ? `You need ${toGo} more.` : toGo < 0 ? `Over by ${-toGo}.` : 'Perfect 48 letters!';

  return { errors, warnings, lettersUsed, spRemaining, needMsg, cleanSpangram, cleanWords };
}

// Very simple backtracking grid packer that places words in non-overlapping straight lines
// horizontally or vertically, attempting to fill the entire 6x8 grid.
export function generateGrid(input: GenerateInput): GenerateResult {
  const v = validateInput(input);
  const errors = [...v.errors];
  const warnings = [...v.warnings];

  const words = [v.cleanSpangram, ...v.cleanWords];
  const isSpangramIndex = 0;

  const allLetters = words.join('');
  if (allLetters.length !== CAPACITY) {
    errors.push(`Total letters must equal 48. Currently ${allLetters.length}.`);
  }

  // Initialize empty grid
  const grid: { ch: string; isSpangram?: boolean }[][] = Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => ({ ch: '' }))
  );

  if (errors.length) {
    return { grid, warnings, errors, lettersUsed: allLetters.length, spangramRemaining: v.spRemaining };
  }

  // Backtracking placement
  type WordPlacement = { word: string; isSp: boolean };
  const queue: WordPlacement[] = words.map((w, i) => ({ word: w, isSp: i === isSpangramIndex }));
  // sort longest first helps packing
  queue.sort((a, b) => b.word.length - a.word.length);

  const used: boolean[][] = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));

  function canPlace(y: number, x: number, dy: number, dx: number, word: string) {
    for (let i = 0; i < word.length; i++) {
      const ny = y + dy * i;
      const nx = x + dx * i;
      if (ny < 0 || ny >= HEIGHT || nx < 0 || nx >= WIDTH) return false;
      if (used[ny][nx]) return false;
    }
    return true;
  }

  function place(y: number, x: number, dy: number, dx: number, word: string, isSp: boolean) {
    for (let i = 0; i < word.length; i++) {
      const ny = y + dy * i;
      const nx = x + dx * i;
      used[ny][nx] = true;
      grid[ny][nx] = { ch: word[i], isSpangram: isSp };
    }
  }

  function unplace(y: number, x: number, dy: number, dx: number, word: string) {
    for (let i = 0; i < word.length; i++) {
      const ny = y + dy * i;
      const nx = x + dx * i;
      used[ny][nx] = false;
      grid[ny][nx] = { ch: '' };
    }
  }

  const directions: [number, number][] = [
    [0, 1], // right
    [1, 0], // down
  ];

  function dfs(idx: number): boolean {
    if (idx === queue.length) return true;
    const { word, isSp } = queue[idx];

    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        for (const [dy, dx] of directions) {
          if (canPlace(y, x, dy, dx, word)) {
            place(y, x, dy, dx, word, isSp);
            if (dfs(idx + 1)) return true;
            unplace(y, x, dy, dx, word);
          }
        }
      }
    }
    return false;
  }

  const ok = dfs(0);
  if (!ok) {
    errors.push('Unable to place all words without overlap. Consider modifying words.');
  }

  return {
    grid,
    warnings,
    errors,
    lettersUsed: allLetters.length,
    spangramRemaining: v.spRemaining,
  };
}


