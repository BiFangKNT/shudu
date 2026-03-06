import { describe, expect, it } from "vitest"

import { countSolutions, solveSudoku } from "@/lib/sudoku/solver"
import { isValidBoard } from "@/lib/sudoku/validator"

describe("solver", () => {
  it("能解出标准数独", () => {
    const puzzle = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ]

    const result = solveSudoku(puzzle)

    expect(result.solved).toBe(true)
    expect(result.solution).toBeDefined()
    expect(result.count).toBe(1)
    expect(isValidBoard(result.solution!)).toBe(true)
  })

  it("countSolutions 能识别多解盘面", () => {
    const multi = [
      [0, 0, 0, 0, 0, 0, 0, 1, 2],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]

    const count = countSolutions(multi, 2)
    expect(count).toBeGreaterThanOrEqual(2)
  })

  it("满盘但冲突时应判定为无解", () => {
    const invalidFullBoard = [
      [5, 5, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ]

    const solved = solveSudoku(invalidFullBoard)
    const count = countSolutions(invalidFullBoard, 2)

    expect(solved.solved).toBe(false)
    expect(solved.count).toBe(0)
    expect(count).toBe(0)
  })
})
