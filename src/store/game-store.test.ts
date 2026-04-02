import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const findNextLogicalStepMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/sudoku/analyzer", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sudoku/analyzer")>("@/lib/sudoku/analyzer")
  return {
    ...actual,
    findNextLogicalStep: findNextLogicalStepMock,
  }
})

import { cloneBoard, createEmptyBoard, createNotesGrid } from "@/lib/sudoku/board"
import type { Board } from "@/lib/sudoku/types"
import { useGameStore, formatTime } from "@/store/game-store"

function createEmptyFixedGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false))
}

const SOLVED_BOARD: Board = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

describe("game-store", () => {
  beforeEach(() => {
    useGameStore.getState().newGame("easy")
  })

  afterEach(() => {
    findNextLogicalStepMock.mockReset()
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

  it("提示会逐层揭示逻辑放置", () => {
    const board = cloneBoard(SOLVED_BOARD)
    board[0][8] = 0
    findNextLogicalStepMock.mockReturnValue({
      technique: "naked-single",
      placements: [{ row: 0, col: 8, digit: 2 }],
      eliminations: [],
    })

    useGameStore.setState({
      difficulty: "easy",
      puzzle: cloneBoard(board),
      solution: cloneBoard(SOLVED_BOARD),
      board,
      fixed: createEmptyFixedGrid(),
      notes: createNotesGrid(),
      selectedCell: { row: 0, col: 8 },
      noteMode: false,
      conflictHighlight: true,
      autoCheck: true,
      mistakes: 0,
      elapsedSec: 0,
      seed: "hint-placement",
      status: "playing",
      history: [],
      future: [],
      maxMistakes: 3,
    })

    useGameStore.getState().giveHint()

    expect(useGameStore.getState().board[0][8]).toBe(0)
    expect(useGameStore.getState().hint).toMatchObject({
      title: "提示 1/3 · 裸单元",
      level: 1,
      maxLevel: 3,
      focusCells: [],
    })
    expect(useGameStore.getState().history).toHaveLength(0)

    useGameStore.getState().giveHint()

    expect(useGameStore.getState().hint).toMatchObject({
      title: "提示 2/3 · 裸单元",
      level: 2,
      focusCells: [{ row: 0, col: 8 }],
    })
    expect(useGameStore.getState().board[0][8]).toBe(0)

    useGameStore.getState().giveHint()

    expect(useGameStore.getState().hint).toMatchObject({
      title: "提示 3/3 · 裸单元",
      level: 3,
      message: "第 1 行第 9 列可以填 2。",
      focusCells: [{ row: 0, col: 8 }],
    })
    expect(useGameStore.getState().board[0][8]).toBe(0)

    useGameStore.getState().inputDigit(2)
    expect(useGameStore.getState().hint).toBeNull()
  })

  it("提示会逐层揭示候选消除", () => {
    const eliminations = [
      { row: 0, col: 0, digit: 8 },
      { row: 0, col: 0, digit: 9 },
      { row: 1, col: 1, digit: 1 },
    ]
    findNextLogicalStepMock.mockReturnValue({
      technique: "locked-candidate",
      placements: [],
      eliminations,
    })
    const board = createEmptyBoard()

    useGameStore.setState({
      difficulty: "hard",
      puzzle: createEmptyBoard(),
      solution: cloneBoard(SOLVED_BOARD),
      board,
      fixed: createEmptyFixedGrid(),
      notes: createNotesGrid(),
      selectedCell: null,
      noteMode: false,
      conflictHighlight: true,
      autoCheck: true,
      mistakes: 0,
      elapsedSec: 0,
      seed: "hint-elimination",
      status: "playing",
      history: [],
      future: [],
      maxMistakes: 3,
    })

    useGameStore.getState().giveHint()
    expect(useGameStore.getState().hint).toMatchObject({
      title: "提示 1/3 · 锁定候选",
      level: 1,
      focusCells: [],
    })

    useGameStore.getState().giveHint()
    expect(useGameStore.getState().hint).toMatchObject({
      title: "提示 2/3 · 锁定候选",
      level: 2,
      focusCells: [
        { row: 0, col: 0 },
        { row: 1, col: 1 },
      ],
    })

    useGameStore.getState().giveHint()
    const nextState = useGameStore.getState()

    expect(nextState.board).toEqual(board)
    expect(nextState.notes).toEqual(createNotesGrid())
    expect(nextState.hint).toMatchObject({
      title: "提示 3/3 · 锁定候选",
      level: 3,
      message: "第 1 行第 1 列去掉候选 8、9；第 2 行第 2 列去掉候选 1。",
      focusCells: [
        { row: 0, col: 0 },
        { row: 1, col: 1 },
      ],
    })
    expect(nextState.history).toHaveLength(0)
  })

  it("分析器给不出逻辑步且存在冲突时会提示先处理冲突", () => {
    const board = createEmptyBoard()
    board[0][1] = 1
    board[1][0] = 1
    findNextLogicalStepMock.mockReturnValue(null)

    useGameStore.setState({
      difficulty: "expert",
      puzzle: createEmptyBoard(),
      solution: cloneBoard(SOLVED_BOARD),
      board,
      fixed: createEmptyFixedGrid(),
      notes: createNotesGrid(),
      selectedCell: { row: 0, col: 0 },
      noteMode: false,
      conflictHighlight: true,
      autoCheck: true,
      mistakes: 0,
      elapsedSec: 0,
      seed: "hint-fallback",
      status: "playing",
      history: [],
      future: [],
      maxMistakes: 3,
    })

    useGameStore.getState().giveHint()

    expect(useGameStore.getState().board).toEqual(board)
    expect(useGameStore.getState().hint).toMatchObject({
      title: "提示 · 先处理冲突",
      message: "当前棋盘存在冲突，先把冲突处理掉，再请求提示。",
      level: 1,
      maxLevel: 1,
    })
    expect(useGameStore.getState().hint?.focusCells.length).toBeGreaterThan(0)
    expect(useGameStore.getState().history).toHaveLength(0)
  })

  it("满盘但无效时仍会给出冲突提示", () => {
    const board = cloneBoard(SOLVED_BOARD)
    board[0][1] = 5
    findNextLogicalStepMock.mockReturnValue(null)

    useGameStore.setState({
      difficulty: "expert",
      puzzle: createEmptyBoard(),
      solution: cloneBoard(SOLVED_BOARD),
      board,
      fixed: createEmptyFixedGrid(),
      notes: createNotesGrid(),
      selectedCell: { row: 0, col: 1 },
      noteMode: false,
      conflictHighlight: false,
      autoCheck: false,
      mistakes: 0,
      elapsedSec: 0,
      seed: "hint-full-invalid",
      status: "playing",
      history: [],
      future: [],
      maxMistakes: 3,
    })

    useGameStore.getState().giveHint()

    expect(useGameStore.getState().hint).toMatchObject({
      title: "提示 · 先处理冲突",
      message: "当前棋盘存在冲突，先把冲突处理掉，再请求提示。",
      level: 1,
      maxLevel: 1,
    })
    expect(useGameStore.getState().hint?.focusCells.length).toBeGreaterThan(0)
    expect(useGameStore.getState().history).toHaveLength(0)
  })

  it("分析器给不出逻辑步且出现零候选时会提示先回退错误", () => {
    const board = createEmptyBoard()
    board[0] = [1, 2, 3, 4, 5, 6, 7, 8, 0]
    board[1][8] = 9
    findNextLogicalStepMock.mockReturnValue(null)

    useGameStore.setState({
      difficulty: "hard",
      puzzle: createEmptyBoard(),
      solution: cloneBoard(SOLVED_BOARD),
      board,
      fixed: createEmptyFixedGrid(),
      notes: createNotesGrid(),
      selectedCell: { row: 0, col: 8 },
      noteMode: false,
      conflictHighlight: false,
      autoCheck: false,
      mistakes: 0,
      elapsedSec: 0,
      seed: "hint-contradiction",
      status: "playing",
      history: [],
      future: [],
      maxMistakes: 3,
    })

    useGameStore.getState().giveHint()

    expect(useGameStore.getState().hint).toMatchObject({
      title: "提示 · 先回退错误",
      message: "第 1 行第 9 列已经没有任何合法候选，这通常说明前面某一步填错了。先回退或清空再继续。",
      level: 1,
      maxLevel: 1,
      focusCells: [{ row: 0, col: 8 }],
    })
    expect(useGameStore.getState().history).toHaveLength(0)
  })

  it("分析器给不出逻辑步但盘面合法时会提示暂无逻辑步", () => {
    const board = createEmptyBoard()
    findNextLogicalStepMock.mockReturnValue(null)

    useGameStore.setState({
      difficulty: "expert",
      puzzle: createEmptyBoard(),
      solution: cloneBoard(SOLVED_BOARD),
      board,
      fixed: createEmptyFixedGrid(),
      notes: createNotesGrid(),
      selectedCell: { row: 0, col: 0 },
      noteMode: false,
      conflictHighlight: false,
      autoCheck: false,
      mistakes: 0,
      elapsedSec: 0,
      seed: "hint-stuck",
      status: "playing",
      history: [],
      future: [],
      maxMistakes: 3,
    })

    useGameStore.getState().giveHint()

    expect(useGameStore.getState().hint).toMatchObject({
      title: "提示 · 暂无逻辑步",
      message: "当前盘面暂时没有可用的基础逻辑提示。先自行推演，或补充笔记后再看。",
      level: 1,
      maxLevel: 1,
      focusCells: [],
    })
    expect(useGameStore.getState().history).toHaveLength(0)
  })
})
