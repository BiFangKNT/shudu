import { cloneBoard, getBoxStart, getCandidates, isBoardComplete } from "@/lib/sudoku/board"
import { solveSudoku } from "@/lib/sudoku/solver"
import {
  BOX_SIZE,
  DIFFICULTY_CONFIG,
  DIFFICULTY_ORDER,
  DIGITS,
  GRID_SIZE,
  TECHNIQUE_ORDER,
  type Board,
  type Difficulty,
  type SolveTechnique,
} from "@/lib/sudoku/types"
import { isValidBoard } from "@/lib/sudoku/validator"

type LogicalTechnique = Exclude<SolveTechnique, "guess">
type CandidateGrid = number[][][]

export interface SolvePlacement {
  row: number
  col: number
  digit: number
}

export interface CandidateElimination {
  row: number
  col: number
  digit: number
}

export interface LogicalStep {
  technique: LogicalTechnique
  placements: SolvePlacement[]
  eliminations: CandidateElimination[]
}

export interface PuzzleAnalysis {
  solvable: boolean
  logicallySolved: boolean
  difficulty: Difficulty | null
  maxTechnique: SolveTechnique | null
  score: number
  steps: LogicalStep[]
}

const TECHNIQUE_SCORE: Record<SolveTechnique, number> = {
  "naked-single": 1,
  "hidden-single": 2,
  "locked-candidate": 4,
  "naked-pair": 6,
  guess: 10,
}

function createCandidateGrid(board: Board): CandidateGrid {
  return board.map((row, rowIndex) =>
    row.map((value, colIndex) => (value === 0 ? getCandidates(board, rowIndex, colIndex) : []))
  )
}

function hasCandidateIssue(board: Board, candidates: CandidateGrid): boolean {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] === 0 && candidates[row][col].length === 0) {
        return true
      }
    }
  }

  return false
}

function hasCandidate(candidates: CandidateGrid, row: number, col: number, digit: number): boolean {
  return candidates[row][col].includes(digit)
}

function removeCandidate(candidates: CandidateGrid, row: number, col: number, digit: number): boolean {
  const current = candidates[row][col]
  if (!current.includes(digit)) {
    return false
  }

  candidates[row][col] = current.filter((candidate) => candidate !== digit)
  return true
}

function placeDigit(board: Board, candidates: CandidateGrid, row: number, col: number, digit: number) {
  board[row][col] = digit
  candidates[row][col] = []

  for (let index = 0; index < GRID_SIZE; index += 1) {
    if (board[row][index] === 0) {
      removeCandidate(candidates, row, index, digit)
    }
    if (board[index][col] === 0) {
      removeCandidate(candidates, index, col, digit)
    }
  }

  const boxRowStart = getBoxStart(row)
  const boxColStart = getBoxStart(col)
  for (let r = boxRowStart; r < boxRowStart + BOX_SIZE; r += 1) {
    for (let c = boxColStart; c < boxColStart + BOX_SIZE; c += 1) {
      if (board[r][c] === 0) {
        removeCandidate(candidates, r, c, digit)
      }
    }
  }
}

function getCellsForRow(row: number) {
  return Array.from({ length: GRID_SIZE }, (_, col) => ({ row, col }))
}

function getCellsForCol(col: number) {
  return Array.from({ length: GRID_SIZE }, (_, row) => ({ row, col }))
}

function getCellsForBox(boxRowStart: number, boxColStart: number) {
  const cells: Array<{ row: number; col: number }> = []
  for (let row = boxRowStart; row < boxRowStart + BOX_SIZE; row += 1) {
    for (let col = boxColStart; col < boxColStart + BOX_SIZE; col += 1) {
      cells.push({ row, col })
    }
  }
  return cells
}

function findHiddenSingleInCells(
  board: Board,
  candidates: CandidateGrid,
  cells: Array<{ row: number; col: number }>
): LogicalStep | null {
  for (const digit of DIGITS) {
    const positions = cells.filter(({ row, col }) => board[row][col] === 0 && hasCandidate(candidates, row, col, digit))
    if (positions.length !== 1) {
      continue
    }

    const [target] = positions
    return {
      technique: "hidden-single",
      placements: [{ ...target, digit }],
      eliminations: [],
    }
  }

  return null
}

function collectUnique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function findNakedSingle(board: Board, candidates: CandidateGrid): LogicalStep | null {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] !== 0 || candidates[row][col].length !== 1) {
        continue
      }

      return {
        technique: "naked-single",
        placements: [{ row, col, digit: candidates[row][col][0] }],
        eliminations: [],
      }
    }
  }

  return null
}

function findHiddenSingle(board: Board, candidates: CandidateGrid): LogicalStep | null {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const step = findHiddenSingleInCells(board, candidates, getCellsForRow(row))
    if (step) {
      return step
    }
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const step = findHiddenSingleInCells(board, candidates, getCellsForCol(col))
    if (step) {
      return step
    }
  }

  for (let boxRowStart = 0; boxRowStart < GRID_SIZE; boxRowStart += BOX_SIZE) {
    for (let boxColStart = 0; boxColStart < GRID_SIZE; boxColStart += BOX_SIZE) {
      const step = findHiddenSingleInCells(board, candidates, getCellsForBox(boxRowStart, boxColStart))
      if (step) {
        return step
      }
    }
  }

  return null
}

function buildLockedCandidateStep(
  technique: LogicalTechnique,
  eliminations: CandidateElimination[]
): LogicalStep | null {
  if (eliminations.length === 0) {
    return null
  }

  return {
    technique,
    placements: [],
    eliminations,
  }
}

function findLockedCandidates(board: Board, candidates: CandidateGrid): LogicalStep | null {
  for (let boxRowStart = 0; boxRowStart < GRID_SIZE; boxRowStart += BOX_SIZE) {
    for (let boxColStart = 0; boxColStart < GRID_SIZE; boxColStart += BOX_SIZE) {
      const cells = getCellsForBox(boxRowStart, boxColStart)

      for (const digit of DIGITS) {
        const positions = cells.filter(({ row, col }) => board[row][col] === 0 && hasCandidate(candidates, row, col, digit))
        if (positions.length < 2) {
          continue
        }

        const rows = collectUnique(positions.map(({ row }) => row))
        if (rows.length === 1) {
          const [row] = rows
          const eliminations: CandidateElimination[] = []
          for (let col = 0; col < GRID_SIZE; col += 1) {
            if (col >= boxColStart && col < boxColStart + BOX_SIZE) {
              continue
            }
            if (board[row][col] === 0 && hasCandidate(candidates, row, col, digit)) {
              eliminations.push({ row, col, digit })
            }
          }

          const step = buildLockedCandidateStep("locked-candidate", eliminations)
          if (step) {
            return step
          }
        }

        const cols = collectUnique(positions.map(({ col }) => col))
        if (cols.length === 1) {
          const [col] = cols
          const eliminations: CandidateElimination[] = []
          for (let row = 0; row < GRID_SIZE; row += 1) {
            if (row >= boxRowStart && row < boxRowStart + BOX_SIZE) {
              continue
            }
            if (board[row][col] === 0 && hasCandidate(candidates, row, col, digit)) {
              eliminations.push({ row, col, digit })
            }
          }

          const step = buildLockedCandidateStep("locked-candidate", eliminations)
          if (step) {
            return step
          }
        }
      }
    }
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (const digit of DIGITS) {
      const positions = getCellsForRow(row).filter(({ col }) => board[row][col] === 0 && hasCandidate(candidates, row, col, digit))
      if (positions.length < 2) {
        continue
      }

      const boxColStarts = collectUnique(positions.map(({ col }) => getBoxStart(col)))
      if (boxColStarts.length !== 1) {
        continue
      }

      const boxRowStart = getBoxStart(row)
      const [boxColStart] = boxColStarts
      const eliminations: CandidateElimination[] = []

      for (const cell of getCellsForBox(boxRowStart, boxColStart)) {
        if (cell.row === row || board[cell.row][cell.col] !== 0) {
          continue
        }
        if (hasCandidate(candidates, cell.row, cell.col, digit)) {
          eliminations.push({ row: cell.row, col: cell.col, digit })
        }
      }

      const step = buildLockedCandidateStep("locked-candidate", eliminations)
      if (step) {
        return step
      }
    }
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    for (const digit of DIGITS) {
      const positions = getCellsForCol(col).filter(({ row }) => board[row][col] === 0 && hasCandidate(candidates, row, col, digit))
      if (positions.length < 2) {
        continue
      }

      const boxRowStarts = collectUnique(positions.map(({ row }) => getBoxStart(row)))
      if (boxRowStarts.length !== 1) {
        continue
      }

      const [boxRowStart] = boxRowStarts
      const boxColStart = getBoxStart(col)
      const eliminations: CandidateElimination[] = []

      for (const cell of getCellsForBox(boxRowStart, boxColStart)) {
        if (cell.col === col || board[cell.row][cell.col] !== 0) {
          continue
        }
        if (hasCandidate(candidates, cell.row, cell.col, digit)) {
          eliminations.push({ row: cell.row, col: cell.col, digit })
        }
      }

      const step = buildLockedCandidateStep("locked-candidate", eliminations)
      if (step) {
        return step
      }
    }
  }

  return null
}

function findNakedPairInCells(
  board: Board,
  candidates: CandidateGrid,
  cells: Array<{ row: number; col: number }>
): LogicalStep | null {
  const pairs = new Map<string, Array<{ row: number; col: number }>>()

  for (const cell of cells) {
    if (board[cell.row][cell.col] !== 0 || candidates[cell.row][cell.col].length !== 2) {
      continue
    }

    const key = candidates[cell.row][cell.col].join(",")
    pairs.set(key, [...(pairs.get(key) ?? []), cell])
  }

  for (const [key, pairCells] of pairs) {
    if (pairCells.length !== 2) {
      continue
    }

    const digits = key.split(",").map((value) => Number(value))
    const eliminations: CandidateElimination[] = []

    for (const cell of cells) {
      const isPairCell = pairCells.some((pairCell) => pairCell.row === cell.row && pairCell.col === cell.col)
      if (isPairCell || board[cell.row][cell.col] !== 0) {
        continue
      }

      for (const digit of digits) {
        if (hasCandidate(candidates, cell.row, cell.col, digit)) {
          eliminations.push({ row: cell.row, col: cell.col, digit })
        }
      }
    }

    if (eliminations.length > 0) {
      return {
        technique: "naked-pair",
        placements: [],
        eliminations,
      }
    }
  }

  return null
}

function findNakedPair(board: Board, candidates: CandidateGrid): LogicalStep | null {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const step = findNakedPairInCells(board, candidates, getCellsForRow(row))
    if (step) {
      return step
    }
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const step = findNakedPairInCells(board, candidates, getCellsForCol(col))
    if (step) {
      return step
    }
  }

  for (let boxRowStart = 0; boxRowStart < GRID_SIZE; boxRowStart += BOX_SIZE) {
    for (let boxColStart = 0; boxColStart < GRID_SIZE; boxColStart += BOX_SIZE) {
      const step = findNakedPairInCells(board, candidates, getCellsForBox(boxRowStart, boxColStart))
      if (step) {
        return step
      }
    }
  }

  return null
}

function findNextLogicalStepFromState(board: Board, candidates: CandidateGrid): LogicalStep | null {
  return (
    findNakedSingle(board, candidates) ??
    findHiddenSingle(board, candidates) ??
    findLockedCandidates(board, candidates) ??
    findNakedPair(board, candidates)
  )
}

function applyStep(board: Board, candidates: CandidateGrid, step: LogicalStep) {
  for (const placement of step.placements) {
    placeDigit(board, candidates, placement.row, placement.col, placement.digit)
  }

  for (const elimination of step.eliminations) {
    removeCandidate(candidates, elimination.row, elimination.col, elimination.digit)
  }
}

function getTechniqueRank(technique: SolveTechnique) {
  return TECHNIQUE_ORDER.indexOf(technique)
}

function getHardestTechnique(current: SolveTechnique | null, next: SolveTechnique): SolveTechnique {
  if (current === null || getTechniqueRank(next) > getTechniqueRank(current)) {
    return next
  }

  return current
}

function normalizeTechnique(technique: SolveTechnique | null): SolveTechnique {
  return technique ?? "naked-single"
}

export function classifyDifficulty(maxTechnique: SolveTechnique, stepCount = 0): Difficulty {
  if (maxTechnique === "guess") {
    return "expert"
  }

  if (maxTechnique === "naked-pair") {
    return "hard"
  }

  if (maxTechnique === "locked-candidate") {
    return "hard"
  }

  if (maxTechnique === "hidden-single") {
    if (stepCount >= DIFFICULTY_CONFIG.hard.minEmpty) {
      return "hard"
    }

    return stepCount >= DIFFICULTY_CONFIG.medium.minEmpty ? "medium" : "easy"
  }

  if (maxTechnique === "naked-single") {
    return stepCount >= DIFFICULTY_CONFIG.medium.minEmpty ? "medium" : "easy"
  }

  const rank = getTechniqueRank(maxTechnique)

  for (const difficulty of DIFFICULTY_ORDER) {
    if (rank <= getTechniqueRank(DIFFICULTY_CONFIG[difficulty].maxTechnique)) {
      return difficulty
    }
  }

  return "expert"
}

export function findNextLogicalStep(board: Board): LogicalStep | null {
  if (!isValidBoard(board)) {
    return null
  }

  const working = cloneBoard(board)
  const candidates = createCandidateGrid(working)
  if (hasCandidateIssue(working, candidates)) {
    return null
  }

  return findNextLogicalStepFromState(working, candidates)
}

export function analyzePuzzle(board: Board): PuzzleAnalysis {
  if (!isValidBoard(board)) {
    return {
      solvable: false,
      logicallySolved: false,
      difficulty: null,
      maxTechnique: null,
      score: 0,
      steps: [],
    }
  }

  const working = cloneBoard(board)
  const candidates = createCandidateGrid(working)
  if (hasCandidateIssue(working, candidates)) {
    return {
      solvable: false,
      logicallySolved: false,
      difficulty: null,
      maxTechnique: null,
      score: 0,
      steps: [],
    }
  }

  const steps: LogicalStep[] = []
  let maxTechnique: SolveTechnique | null = null
  let score = 0

  while (!isBoardComplete(working)) {
    const step = findNextLogicalStepFromState(working, candidates)
    if (!step) {
      break
    }

    steps.push(step)
    maxTechnique = getHardestTechnique(maxTechnique, step.technique)
    score += TECHNIQUE_SCORE[step.technique]
    applyStep(working, candidates, step)

    if (hasCandidateIssue(working, candidates)) {
      return {
        solvable: false,
        logicallySolved: false,
        difficulty: null,
        maxTechnique: null,
        score: 0,
        steps: [],
      }
    }
  }

  if (isBoardComplete(working)) {
    const effectiveTechnique = normalizeTechnique(maxTechnique)
    return {
      solvable: true,
      logicallySolved: true,
      difficulty: classifyDifficulty(effectiveTechnique, steps.length),
      maxTechnique: effectiveTechnique,
      score,
      steps,
    }
  }

  const fallback = solveSudoku(working)
  if (!fallback.solved) {
    return {
      solvable: false,
      logicallySolved: false,
      difficulty: null,
      maxTechnique: null,
      score,
      steps,
    }
  }

  const effectiveTechnique = getHardestTechnique(maxTechnique, "guess")
  return {
    solvable: true,
    logicallySolved: false,
    difficulty: classifyDifficulty(effectiveTechnique, steps.length),
    maxTechnique: effectiveTechnique,
    score: score + TECHNIQUE_SCORE.guess,
    steps,
  }
}
