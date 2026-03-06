import { getBoxStart } from "@/lib/sudoku/board"
import { BOX_SIZE, GRID_SIZE, type Board } from "@/lib/sudoku/types"

export type ConflictKind = "ok" | "row" | "col" | "box" | "invalid"

export function validateMove(board: Board, row: number, col: number, value: number): ConflictKind {
  if (value < 1 || value > 9) {
    return "invalid"
  }

  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (i !== col && board[row][i] === value) {
      return "row"
    }
  }

  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (i !== row && board[i][col] === value) {
      return "col"
    }
  }

  const boxRow = getBoxStart(row)
  const boxCol = getBoxStart(col)
  for (let r = boxRow; r < boxRow + BOX_SIZE; r += 1) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c += 1) {
      if ((r !== row || c !== col) && board[r][c] === value) {
        return "box"
      }
    }
  }

  return "ok"
}

export function cellHasConflict(board: Board, row: number, col: number): boolean {
  const value = board[row][col]
  if (value === 0) {
    return false
  }
  return validateMove(board, row, col, value) !== "ok"
}

export function isValidBoard(board: Board): boolean {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = board[row][col]
      if (value === 0) {
        continue
      }
      if (validateMove(board, row, col, value) !== "ok") {
        return false
      }
    }
  }
  return true
}
