import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { createEmptyBoard, createNotesGrid } from "@/lib/sudoku/board"
import { SudokuBoard } from "@/components/sudoku-board"
import { useGameStore } from "@/store/game-store"

function createEmptyFixedGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false))
}

describe("SudokuBoard 笔记显示", () => {
  beforeEach(() => {
    window.localStorage.clear()

    useGameStore.setState({
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
      seed: "test-seed",
      status: "playing",
      hint: null,
      history: [],
      future: [],
    })
  })

  it("单个笔记使用大号数字显示", () => {
    const notes = createNotesGrid()
    notes[0][0][2] = true
    useGameStore.setState({ notes })

    render(<SudokuBoard />)

    const firstCell = screen.getAllByRole("button")[0]
    const note = within(firstCell).getByText("3")

    expect(note).toHaveClass("font-semibold", "tabular-nums", "text-sky-500", "text-[clamp(1rem,44cqw,2rem)]")
    expect(firstCell.querySelector("div")).toBeNull()
  })

  it("多个笔记使用自适应换行显示", () => {
    const notes = createNotesGrid()
    notes[0][0][0] = true
    notes[0][0][2] = true
    notes[0][0][8] = true
    useGameStore.setState({ notes })

    render(<SudokuBoard />)

    const firstCell = screen.getAllByRole("button")[0]
    const noteGrid = firstCell.querySelector("div")

    expect(noteGrid).not.toBeNull()
    expect(noteGrid).toHaveClass("grid", "grid-cols-3", "text-sky-600")
    expect(within(firstCell).getByText("1")).toBeInTheDocument()
    expect(within(firstCell).getByText("3")).toBeInTheDocument()
    expect(within(firstCell).getByText("9")).toBeInTheDocument()
    expect(noteGrid?.querySelectorAll("span")).toHaveLength(3)
  })

  it("合法但不是最终答案的数字不会立即标红", () => {
    const board = createEmptyBoard()
    const solution = createEmptyBoard()

    board[0][0] = 1
    solution[0][0] = 9

    useGameStore.setState({
      board,
      solution,
      autoCheck: true,
      conflictHighlight: false,
    })

    render(<SudokuBoard />)

    const firstCell = screen.getAllByRole("button")[0]
    const digit = within(firstCell).getByText("1")

    expect(digit).toHaveClass("text-emerald-700")
    expect(digit).not.toHaveClass("text-rose-700")
    expect(firstCell).not.toHaveClass("text-rose-700")
  })

  it("提示层级会高亮目标格", () => {
    useGameStore.setState({
      hint: {
        title: "提示 2/3 · 裸单元",
        message: "重点看第 1 行第 1 列。",
        helperText: "裸单元：这个空格现在只剩一个合法数字可填。",
        level: 2,
        maxLevel: 3,
        focusCells: [{ row: 0, col: 0 }],
        signature: "test-signature",
      },
    })

    render(<SudokuBoard />)

    const firstCell = screen.getAllByRole("button")[0]

    expect(firstCell).toHaveClass("bg-amber-100/80", "ring-1", "ring-amber-300")
  })
})
