import { cloneBoard, findEmptyCell, getCandidates } from "@/lib/sudoku/board"
import { type Board } from "@/lib/sudoku/types"
import { isValidBoard } from "@/lib/sudoku/validator"

export interface SolveResult {
  solved: boolean
  solution?: Board
  count: number
}

function solveInternal(board: Board, limit: number, randomizeCandidates?: (candidates: number[]) => number[]): number {
  const target = findEmptyCell(board)
  if (!target) {
    return isValidBoard(board) ? 1 : 0
  }

  const candidates = getCandidates(board, target.row, target.col)
  if (candidates.length === 0) {
    return 0
  }

  const orderedCandidates = randomizeCandidates ? randomizeCandidates(candidates) : candidates
  let total = 0

  for (const candidate of orderedCandidates) {
    board[target.row][target.col] = candidate
    total += solveInternal(board, limit, randomizeCandidates)
    if (total >= limit) {
      board[target.row][target.col] = 0
      return total
    }
    board[target.row][target.col] = 0
  }

  return total
}

export function solveSudoku(board: Board, randomizeCandidates?: (candidates: number[]) => number[]): SolveResult {
  const working = cloneBoard(board)
  if (!isValidBoard(working)) {
    return { solved: false, count: 0 }
  }

  function backtrack(): boolean {
    const target = findEmptyCell(working)
    if (!target) {
      return isValidBoard(working)
    }

    const candidates = getCandidates(working, target.row, target.col)
    if (candidates.length === 0) {
      return false
    }

    const orderedCandidates = randomizeCandidates ? randomizeCandidates(candidates) : candidates

    for (const candidate of orderedCandidates) {
      working[target.row][target.col] = candidate
      if (backtrack()) {
        return true
      }
    }

    working[target.row][target.col] = 0
    return false
  }

  const solved = backtrack()

  if (!solved) {
    return { solved: false, count: 0 }
  }

  const countBoard = cloneBoard(board)
  const count = solveInternal(countBoard, 2)
  return { solved: true, solution: working, count }
}

export function countSolutions(board: Board, limit = 2): number {
  const working = cloneBoard(board)
  return solveInternal(working, limit)
}
