import { BOX_SIZE, DIGITS, GRID_SIZE, type Board } from "@/lib/sudoku/types"

export function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 0))
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice())
}

export function createNotesGrid(): boolean[][][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => false))
  )
}

export function cloneNotesGrid(notes: boolean[][][]): boolean[][][] {
  return notes.map((row) => row.map((cell) => cell.slice()))
}

export function isBoardComplete(board: Board): boolean {
  return board.every((row) => row.every((value) => value > 0))
}

export function boardEquals(a: Board, b: Board): boolean {
  return a.every((row, rowIndex) => row.every((value, colIndex) => value === b[rowIndex][colIndex]))
}

export function getBoxStart(index: number): number {
  return Math.floor(index / BOX_SIZE) * BOX_SIZE
}

export function getCandidates(board: Board, row: number, col: number): number[] {
  if (board[row][col] !== 0) {
    return []
  }

  const used = new Set<number>()

  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (board[row][i] > 0) {
      used.add(board[row][i])
    }
    if (board[i][col] > 0) {
      used.add(board[i][col])
    }
  }

  const boxRow = getBoxStart(row)
  const boxCol = getBoxStart(col)

  for (let r = boxRow; r < boxRow + BOX_SIZE; r += 1) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c += 1) {
      if (board[r][c] > 0) {
        used.add(board[r][c])
      }
    }
  }

  return DIGITS.filter((digit) => !used.has(digit))
}

export function isValidPlacement(board: Board, row: number, col: number, digit: number): boolean {
  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (i !== col && board[row][i] === digit) {
      return false
    }
    if (i !== row && board[i][col] === digit) {
      return false
    }
  }

  const boxRow = getBoxStart(row)
  const boxCol = getBoxStart(col)

  for (let r = boxRow; r < boxRow + BOX_SIZE; r += 1) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c += 1) {
      if ((r !== row || c !== col) && board[r][c] === digit) {
        return false
      }
    }
  }

  return true
}

export function findEmptyCell(board: Board): { row: number; col: number } | null {
  let best: { row: number; col: number; candidates: number } | null = null

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] !== 0) {
        continue
      }

      const candidates = getCandidates(board, row, col).length
      if (candidates === 0) {
        return { row, col }
      }

      if (best === null || candidates < best.candidates) {
        best = { row, col, candidates }
      }
    }
  }

  if (best === null) {
    return null
  }

  return { row: best.row, col: best.col }
}
