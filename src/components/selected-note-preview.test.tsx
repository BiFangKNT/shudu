import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { SelectedNotePreview } from "@/components/selected-note-preview"
import { createEmptyBoard, createNotesGrid } from "@/lib/sudoku/board"
import { useGameStore } from "@/store/game-store"

function createEmptyFixedGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false))
}

describe("SelectedNotePreview", () => {
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

  it("未选中空白格时显示引导文案", () => {
    render(<SelectedNotePreview />)

    expect(screen.getByText("放大候选")).toBeInTheDocument()
    expect(screen.getByText("选中空白格后显示候选")).toBeInTheDocument()
    expect(screen.getByText("点击棋盘中的空白格后，这里会显示对应候选并支持直接输入。")).toBeInTheDocument()
  })

  it("选中空白格时以放大九宫格显示候选", () => {
    const notes = createNotesGrid()
    notes[0][0][0] = true
    notes[0][0][4] = true
    notes[0][0][8] = true
    useGameStore.setState({ notes, selectedCell: { row: 0, col: 0 }, noteMode: true })

    render(<SelectedNotePreview />)

    expect(screen.getByText("第 1 行，第 1 列")).toBeInTheDocument()
    expect(screen.getByText("3 个")).toBeInTheDocument()
    expect(screen.getByText("点击数字按钮可直接切换候选。")).toBeInTheDocument()
    expect(screen.getByText("笔记中")).toBeInTheDocument()
  })

  it("点击放大候选按钮时可切换笔记", async () => {
    const user = userEvent.setup()
    useGameStore.setState({ selectedCell: { row: 0, col: 0 }, noteMode: true })

    render(<SelectedNotePreview />)

    await user.click(screen.getByRole("button", { name: "切换候选 5" }))

    expect(useGameStore.getState().notes[0][0][4]).toBe(true)
    expect(screen.getByText("1 个")).toBeInTheDocument()
    expect(screen.getByText("点击数字按钮可直接切换候选。")).toBeInTheDocument()
  })
})
