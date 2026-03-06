import { boardEquals, cloneBoard, createEmptyBoard } from "@/lib/sudoku/board"
import { createRng, generateSeed, randomInt, shuffle } from "@/lib/sudoku/random"
import { countSolutions, solveSudoku } from "@/lib/sudoku/solver"
import { DIFFICULTY_CONFIG, DIGITS, type Difficulty, type GeneratorOptions, type Puzzle } from "@/lib/sudoku/types"

function generateSolvedBoard(rng: () => number) {
  const empty = createEmptyBoard()
  const solved = solveSudoku(empty, (candidates) => shuffle(candidates, rng))
  if (!solved.solved || !solved.solution) {
    throw new Error("无法生成有效终局")
  }
  return solved.solution
}

function listPositions(rng: () => number, symmetry: GeneratorOptions["symmetry"]): number[][] {
  const base = shuffle(
    Array.from({ length: 81 }, (_, index) => [Math.floor(index / 9), index % 9] as [number, number]),
    rng
  )

  if (symmetry !== "center") {
    return base
  }

  const seen = new Set<string>()
  const pairs: number[][] = []
  for (const [row, col] of base) {
    const mirrorRow = 8 - row
    const mirrorCol = 8 - col
    const key = `${row}:${col}`
    const mirrorKey = `${mirrorRow}:${mirrorCol}`

    if (seen.has(key) || seen.has(mirrorKey)) {
      continue
    }

    seen.add(key)
    seen.add(mirrorKey)

    if (row === mirrorRow && col === mirrorCol) {
      pairs.push([row, col])
      continue
    }

    pairs.push([row, col, mirrorRow, mirrorCol])
  }

  return pairs
}

function removeWithUniqueness(
  puzzle: number[][],
  targetEmpty: number,
  rng: () => number,
  unique: boolean,
  symmetry: GeneratorOptions["symmetry"]
) {
  let removed = 0
  const positions = listPositions(rng, symmetry)

  for (const pos of positions) {
    if (removed >= targetEmpty) {
      break
    }

    if (pos.length === 2) {
      const [row, col] = pos
      if (puzzle[row][col] === 0) {
        continue
      }

      const backup = puzzle[row][col]
      puzzle[row][col] = 0
      const valid = !unique || countSolutions(puzzle, 2) === 1
      if (!valid) {
        puzzle[row][col] = backup
        continue
      }
      removed += 1
      continue
    }

    const [rowA, colA, rowB, colB] = pos
    if (removed + 2 > targetEmpty || puzzle[rowA][colA] === 0 || puzzle[rowB][colB] === 0) {
      continue
    }

    const backupA = puzzle[rowA][colA]
    const backupB = puzzle[rowB][colB]
    puzzle[rowA][colA] = 0
    puzzle[rowB][colB] = 0

    const valid = !unique || countSolutions(puzzle, 2) === 1
    if (!valid) {
      puzzle[rowA][colA] = backupA
      puzzle[rowB][colB] = backupB
      continue
    }

    removed += 2
  }
}

function normalizePuzzle(puzzle: number[][], solved: number[][]): number[][] {
  const result = cloneBoard(puzzle)

  // 防止极端情况下挖空不足导致的“看起来不随机”体验。
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (result[row][col] !== 0 && result[row][col] !== solved[row][col]) {
        result[row][col] = solved[row][col]
      }
    }
  }

  return result
}

export function generatePuzzle(options: GeneratorOptions): Puzzle {
  const difficulty = options.difficulty
  const config = DIFFICULTY_CONFIG[difficulty]
  const seed = options.seed ?? generateSeed()
  const unique = options.unique ?? true
  const symmetry = options.symmetry ?? "center"
  const rng = createRng(seed)

  const solved = generateSolvedBoard(rng)
  const puzzle = cloneBoard(solved)

  const targetEmpty = randomInt(config.minEmpty, config.maxEmpty, rng)
  removeWithUniqueness(puzzle, targetEmpty, rng, unique, symmetry)

  const normalized = normalizePuzzle(puzzle, solved)

  if (unique && countSolutions(normalized, 2) !== 1) {
    throw new Error(`生成失败：难度 ${difficulty} 未得到唯一解`) // 理论上极少出现
  }

  if (boardEquals(normalized, solved)) {
    const fallback = cloneBoard(solved)
    const order = shuffle(DIGITS.map((digit) => digit - 1), rng)
    for (const index of order.slice(0, 8)) {
      const row = Math.floor(index)
      const col = index
      fallback[row][col] = 0
    }
    return {
      givens: fallback,
      solution: solved,
      difficulty,
      seed,
    }
  }

  return {
    givens: normalized,
    solution: solved,
    difficulty,
    seed,
  }
}

export function buildFixedGrid(board: number[][]): boolean[][] {
  return board.map((row) => row.map((value) => value > 0))
}

export function listEmptyCells(board: number[][]): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = []
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0) {
        cells.push({ row, col })
      }
    }
  }
  return cells
}

export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_CONFIG[difficulty].label
}
