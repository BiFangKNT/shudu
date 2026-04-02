import { analyzePuzzle } from "@/lib/sudoku/analyzer"
import { boardEquals, cloneBoard, createEmptyBoard } from "@/lib/sudoku/board"
import { createRng, generateSeed, randomInt, shuffle } from "@/lib/sudoku/random"
import { countSolutions, solveSudoku } from "@/lib/sudoku/solver"
import {
  DIFFICULTY_CONFIG,
  type Difficulty,
  type DifficultyConfig,
  type GeneratorOptions,
  type Puzzle,
} from "@/lib/sudoku/types"
import type { PuzzleAnalysis } from "@/lib/sudoku/analyzer"

const MAX_GENERATION_ATTEMPTS: Record<Difficulty, number> = {
  easy: 200,
  medium: 220,
  hard: 260,
  expert: 280,
}

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

function pickTargetEmpty(
  difficulty: Difficulty,
  config: DifficultyConfig,
  rng: () => number,
  attempt: number,
  attemptLimit: number
) {
  if (difficulty === "easy" && attempt < Math.floor(attemptLimit * 0.8)) {
    const preferredMax = Math.min(config.maxEmpty, config.minEmpty + 2)
    return randomInt(config.minEmpty, preferredMax, rng)
  }

  if (difficulty === "medium" && attempt < Math.floor(attemptLimit * 0.65)) {
    const preferredMin = Math.max(config.minEmpty, Math.ceil((config.minEmpty + config.maxEmpty) / 2) - 1)
    return randomInt(preferredMin, config.maxEmpty, rng)
  }

  if (difficulty === "hard" && attempt < Math.floor(attemptLimit * 0.65)) {
    const preferredMin = Math.max(config.minEmpty, Math.ceil((config.minEmpty + config.maxEmpty) / 2))
    return randomInt(preferredMin, config.maxEmpty, rng)
  }

  if (difficulty === "expert" && attempt < Math.floor(attemptLimit * 0.6)) {
    const preferredMin = Math.max(config.minEmpty, config.maxEmpty - 2)
    return randomInt(preferredMin, config.maxEmpty, rng)
  }

  return randomInt(config.minEmpty, config.maxEmpty, rng)
}

function getProfilePenalty(difficulty: Difficulty, analysis: PuzzleAnalysis): number {
  const hiddenSingleCount = analysis.steps.filter((step) => step.technique === "hidden-single").length

  if (difficulty === "easy") {
    const openingSteps = analysis.steps.slice(0, Math.min(8, analysis.steps.length))
    const openingPenalty = openingSteps.some((step) => step.technique !== "naked-single") ? 2 : 0
    const hiddenPenalty = Math.max(0, hiddenSingleCount - 2)

    return openingPenalty + hiddenPenalty
  }

  return 0
}

export function generatePuzzle(options: GeneratorOptions): Puzzle {
  const difficulty = options.difficulty
  const config = DIFFICULTY_CONFIG[difficulty]
  const seed = options.seed ?? generateSeed()
  const unique = options.unique ?? true
  const symmetry = options.symmetry ?? "center"
  const attemptLimit = MAX_GENERATION_ATTEMPTS[difficulty]

  for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
    const attemptSeed = attempt === 0 ? seed : `${seed}:${attempt}`
    const rng = createRng(attemptSeed)
    const solved = generateSolvedBoard(rng)
    const puzzle = cloneBoard(solved)
    const targetEmpty = pickTargetEmpty(difficulty, config, rng, attempt, attemptLimit)

    removeWithUniqueness(puzzle, targetEmpty, rng, unique, symmetry)

    const normalized = normalizePuzzle(puzzle, solved)
    if (boardEquals(normalized, solved)) {
      continue
    }

    if (unique && countSolutions(normalized, 2) !== 1) {
      continue
    }

    const analysis = analyzePuzzle(normalized)
    if (!analysis.solvable || analysis.difficulty === null) {
      continue
    }

    const profilePenalty = getProfilePenalty(difficulty, analysis)

    if (analysis.difficulty === difficulty && profilePenalty === 0) {
      return {
        givens: normalized,
        solution: solved,
        difficulty,
        seed: attemptSeed,
      }
    }
  }

  throw new Error(`生成失败：难度 ${difficulty} 未在 ${attemptLimit} 次尝试内命中`)
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
