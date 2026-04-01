import { beforeEach, describe, expect, it } from "vitest"

import { createEmptyBoard, createNotesGrid } from "@/lib/sudoku/board"
import { useGameStore, formatTime } from "@/store/game-store"

function createEmptyFixedGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false))
}

describe("game-store", () => {
  beforeEach(() => {
    useGameStore.getState().newGame("easy")
  })

  it("支持撤销和重做", () => {
    const state = useGameStore.getState()
    const target = state.fixed
      .flatMap((row, rowIndex) => row.map((locked, colIndex) => ({ locked, row: rowIndex, col: colIndex })))
      .find((cell) => !cell.locked)

    expect(target).toBeDefined()

    useGameStore.getState().setSelectedCell(target!.row, target!.col)
    useGameStore.getState().inputDigit(1)

    const afterInput = useGameStore.getState().board[target!.row][target!.col]
    expect(afterInput).toBe(1)

    useGameStore.getState().undo()
    const afterUndo = useGameStore.getState().board[target!.row][target!.col]
    expect(afterUndo).toBe(0)

    useGameStore.getState().redo()
    const afterRedo = useGameStore.getState().board[target!.row][target!.col]
    expect(afterRedo).toBe(1)
  })

  it("时间格式化正确", () => {
    expect(formatTime(0)).toBe("00:00")
    expect(formatTime(75)).toBe("01:15")
  })

  it("错误计数会随当前冲突实时变化", () => {
    useGameStore.setState({
      difficulty: "easy",
      puzzle: createEmptyBoard(),
      solution: createEmptyBoard(),
      board: createEmptyBoard(),
      fixed: createEmptyFixedGrid(),
      notes: createNotesGrid(),
      selectedCell: { row: 0, col: 0 },
      noteMode: false,
      conflictHighlight: true,
      autoCheck: true,
      mistakes: 0,
      elapsedSec: 0,
      seed: "test-seed",
      status: "playing",
      history: [],
      future: [],
      maxMistakes: 3,
    })

    useGameStore.getState().inputDigit(1)
    expect(useGameStore.getState().mistakes).toBe(0)

    useGameStore.getState().setSelectedCell(0, 1)
    useGameStore.getState().inputDigit(1)
    expect(useGameStore.getState().mistakes).toBe(2)

    useGameStore.getState().setSelectedCell(0, 2)
    useGameStore.getState().inputDigit(1)
    expect(useGameStore.getState().mistakes).toBe(3)
    expect(useGameStore.getState().status).toBe("lost")

    useGameStore.getState().clearCell()
    expect(useGameStore.getState().mistakes).toBe(2)
    expect(useGameStore.getState().status).toBe("playing")

    useGameStore.getState().setSelectedCell(0, 1)
    useGameStore.getState().clearCell()
    expect(useGameStore.getState().mistakes).toBe(0)
  })

  it("错误计数会排除固定格", () => {
    const board = createEmptyBoard()
    const fixed = createEmptyFixedGrid()

    board[0][0] = 1
    fixed[0][0] = true

    useGameStore.setState({
      difficulty: "easy",
      puzzle: createEmptyBoard(),
      solution: createEmptyBoard(),
      board,
      fixed,
      notes: createNotesGrid(),
      selectedCell: { row: 0, col: 1 },
      noteMode: false,
      conflictHighlight: true,
      autoCheck: true,
      mistakes: 0,
      elapsedSec: 0,
      seed: "test-seed",
      status: "playing",
      history: [],
      future: [],
      maxMistakes: 3,
    })

    useGameStore.getState().inputDigit(1)
    expect(useGameStore.getState().mistakes).toBe(1)
  })

  it("棋盘大小会持久化并在新局后保留", () => {
    useGameStore.getState().setBoardScalePercent(108)

    expect(useGameStore.getState().boardScalePercent).toBe(108)
    expect(JSON.parse(window.localStorage.getItem("sudoku.v1") ?? "{}")).toMatchObject({
      boardScalePercent: 108,
    })

    useGameStore.getState().newGame("medium")

    expect(useGameStore.getState().boardScalePercent).toBe(108)
    expect(JSON.parse(window.localStorage.getItem("sudoku.v1") ?? "{}")).toMatchObject({
      boardScalePercent: 108,
      difficulty: "medium",
    })
  })
})
