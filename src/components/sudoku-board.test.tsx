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

    expect(note).toHaveClass("text-lg", "text-sky-500", "sm:text-2xl")
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
})
