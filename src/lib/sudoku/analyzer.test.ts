import { describe, expect, it } from "vitest"

import { analyzePuzzle, classifyDifficulty, findNextLogicalStep } from "@/lib/sudoku/analyzer"

describe("analyzer", () => {
  it("能识别裸单元", () => {
    const board = [
      [5, 3, 4, 6, 7, 8, 9, 1, 0],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ]

    const step = findNextLogicalStep(board)

    expect(step).toEqual({
      technique: "naked-single",
      placements: [{ row: 0, col: 8, digit: 2 }],
      eliminations: [],
    })
  })

  it("无效盘面不会被评级", () => {
    const invalidBoard = [
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

    const analysis = analyzePuzzle(invalidBoard)

    expect(analysis.solvable).toBe(false)
    expect(analysis.logicallySolved).toBe(false)
    expect(analysis.difficulty).toBeNull()
    expect(analysis.maxTechnique).toBeNull()
  })

  it("技巧阈值映射到预期难度", () => {
    expect(classifyDifficulty("naked-single")).toBe("easy")
    expect(classifyDifficulty("naked-single", 26)).toBe("medium")
    expect(classifyDifficulty("hidden-single", 25)).toBe("easy")
    expect(classifyDifficulty("hidden-single", 26)).toBe("medium")
    expect(classifyDifficulty("hidden-single", 34)).toBe("hard")
    expect(classifyDifficulty("locked-candidate")).toBe("hard")
    expect(classifyDifficulty("naked-pair")).toBe("hard")
    expect(classifyDifficulty("guess")).toBe("expert")
  })
})
