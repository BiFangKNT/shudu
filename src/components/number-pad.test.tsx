import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { createEmptyBoard, createNotesGrid } from "@/lib/sudoku/board"
import { NumberPad } from "@/components/number-pad"
import { useGameStore } from "@/store/game-store"

function createEmptyFixedGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false))
}

describe("NumberPad", () => {
  beforeEach(() => {
    window.localStorage.clear()

    useGameStore.setState({
      difficulty: "easy",
      puzzle: createEmptyBoard(),
      solution: createEmptyBoard(),
      board: createEmptyBoard(),
      fixed: createEmptyFixedGrid(),
      notes: createNotesGrid(),
      selectedCell: null,
      noteMode: false,
      conflictHighlight: false,
      autoCheck: false,
      mistakes: 0,
      elapsedSec: 0,
      boardScalePercent: 100,
      seed: "test-seed",
      status: "playing",
      hint: null,
      history: [],
      future: [],
      maxMistakes: 3,
    })
  })

  it("右侧面板的提示会显示术语解释", () => {
    useGameStore.setState({
      hint: {
        title: "提示 1/3 · 锁定候选",
        message: "这一步可以用锁定候选。先观察哪些候选其实已经可以排除了。",
        helperText: "锁定候选：某宫里的候选被锁在同一行或列，因此能排除这条线上的同候选。",
        level: 1,
        maxLevel: 3,
        focusCells: [],
        signature: "locked-candidate::",
      },
    })

    render(<NumberPad showDigits={false} />)

    expect(screen.getByText("提示 1/3 · 锁定候选")).toBeInTheDocument()
    expect(
      screen.getByText("术语解释：锁定候选：某宫里的候选被锁在同一行或列，因此能排除这条线上的同候选。")
    ).toBeInTheDocument()
  })
})
