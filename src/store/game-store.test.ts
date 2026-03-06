import { beforeEach, describe, expect, it } from "vitest"

import { useGameStore, formatTime } from "@/store/game-store"

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
})
