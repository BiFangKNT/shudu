import { describe, expect, it } from "vitest"

import { generatePuzzle } from "@/lib/sudoku/generator"
import { countSolutions } from "@/lib/sudoku/solver"
import { DIFFICULTY_ORDER } from "@/lib/sudoku/types"
import { isValidBoard } from "@/lib/sudoku/validator"

describe("generator", () => {
  it("每个难度都能生成唯一解题目", () => {
    for (const difficulty of DIFFICULTY_ORDER) {
      const puzzle = generatePuzzle({ difficulty, unique: true, symmetry: "center", seed: `test-${difficulty}` })
      const solutionCount = countSolutions(puzzle.givens, 2)

      expect(solutionCount).toBe(1)
      expect(isValidBoard(puzzle.solution)).toBe(true)
      expect(puzzle.givens.flat().some((value) => value === 0)).toBe(true)
    }
  })

  it("同一 seed 生成稳定结果", () => {
    const a = generatePuzzle({ difficulty: "medium", seed: "same-seed", unique: true, symmetry: "center" })
    const b = generatePuzzle({ difficulty: "medium", seed: "same-seed", unique: true, symmetry: "center" })

    expect(a.givens).toEqual(b.givens)
    expect(a.solution).toEqual(b.solution)
  })
})
