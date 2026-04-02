import { describe, expect, it } from "vitest"

import { analyzePuzzle } from "@/lib/sudoku/analyzer"
import { generatePuzzle } from "@/lib/sudoku/generator"
import { countSolutions } from "@/lib/sudoku/solver"
import { DIFFICULTY_ORDER } from "@/lib/sudoku/types"
import { isValidBoard } from "@/lib/sudoku/validator"

function buildDifficultyStats(sampleCount: number) {
  return DIFFICULTY_ORDER.map((requestedDifficulty) => {
    let hitCount = 0
    let uniqueCount = 0
    const actualCounts = new Map<string, number>()

    for (let index = 0; index < sampleCount; index += 1) {
      const puzzle = generatePuzzle({
        difficulty: requestedDifficulty,
        unique: true,
        symmetry: "center",
        seed: `quality-${requestedDifficulty}-${index}`,
      })
      const analysis = analyzePuzzle(puzzle.givens)
      const actualDifficulty = analysis.difficulty ?? "null"

      if (countSolutions(puzzle.givens, 2) === 1) {
        uniqueCount += 1
      }

      if (actualDifficulty === requestedDifficulty) {
        hitCount += 1
      }

      actualCounts.set(actualDifficulty, (actualCounts.get(actualDifficulty) ?? 0) + 1)
    }

    return {
      requestedDifficulty,
      hitCount,
      uniqueCount,
      sampleCount,
      actualCounts: Object.fromEntries(actualCounts),
    }
  })
}

describe("generator", () => {
  it("每个难度都能生成唯一解题目", () => {
    for (const difficulty of DIFFICULTY_ORDER) {
      const puzzle = generatePuzzle({ difficulty, unique: true, symmetry: "center", seed: `test-${difficulty}` })
      const solutionCount = countSolutions(puzzle.givens, 2)
      const analysis = analyzePuzzle(puzzle.givens)

      expect(solutionCount).toBe(1)
      expect(isValidBoard(puzzle.solution)).toBe(true)
      expect(puzzle.givens.flat().some((value) => value === 0)).toBe(true)
      expect(analysis.solvable).toBe(true)
      expect(analysis.difficulty).toBe(difficulty)
      expect(puzzle.difficulty).toBe(difficulty)
    }
  })

  it("同一 seed 生成稳定结果", () => {
    const a = generatePuzzle({ difficulty: "medium", seed: "same-seed", unique: true, symmetry: "center" })
    const b = generatePuzzle({ difficulty: "medium", seed: "same-seed", unique: true, symmetry: "center" })

    expect(a.givens).toEqual(b.givens)
    expect(a.solution).toEqual(b.solution)
  })

  it(
    "easy 题型开局应以裸单元为主",
    () => {
      for (let index = 0; index < 4; index += 1) {
        const puzzle = generatePuzzle({
          difficulty: "easy",
          unique: true,
          symmetry: "center",
          seed: `easy-friendly-${index}`,
        })
        const analysis = analyzePuzzle(puzzle.givens)
        const hiddenSingleCount = analysis.steps.filter((step) => step.technique === "hidden-single").length
        const openingSteps = analysis.steps.slice(0, Math.min(8, analysis.steps.length))

        expect(analysis.difficulty).toBe("easy")
        expect(hiddenSingleCount).toBeLessThanOrEqual(2)
        expect(openingSteps.every((step) => step.technique === "naked-single")).toBe(true)
      }
    },
    20000
  )

  it(
    "批量样本的难度命中率和唯一解率达标",
    () => {
      const stats = buildDifficultyStats(6)
      const report = JSON.stringify(stats, null, 2)

      for (const entry of stats) {
        expect(entry.uniqueCount, `唯一解率不足:\n${report}`).toBe(entry.sampleCount)
        expect(entry.hitCount, `难度命中率不足:\n${report}`).toBe(entry.sampleCount)
      }
    },
    40000
  )
})
