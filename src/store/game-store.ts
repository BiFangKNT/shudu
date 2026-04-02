import { create } from "zustand"

import { findNextLogicalStep, type LogicalStep } from "@/lib/sudoku/analyzer"
import { cloneBoard, cloneNotesGrid, createNotesGrid, getCandidates, isBoardComplete } from "@/lib/sudoku/board"
import { buildFixedGrid, generatePuzzle, listEmptyCells } from "@/lib/sudoku/generator"
import { cellHasConflict, isValidBoard } from "@/lib/sudoku/validator"
import type { Board, CellPosition, Difficulty, Snapshot } from "@/lib/sudoku/types"

interface PersistedState {
  difficulty: Difficulty
  puzzle: Board
  solution: Board
  board: Board
  fixed: boolean[][]
  notes: boolean[][][]
  selectedCell: CellPosition | null
  noteMode: boolean
  conflictHighlight: boolean
  autoCheck: boolean
  mistakes: number
  elapsedSec: number
  boardScalePercent?: number
  seed: string
  status: GameStatus
}

export type GameStatus = "idle" | "playing" | "won" | "lost"
export interface HintState {
  title: string
  message: string
  helperText: string | null
  level: number
  maxLevel: number
  focusCells: CellPosition[]
  signature: string | null
}

type BlockedHintReason =
  | { kind: "conflict"; focusCells: CellPosition[] }
  | { kind: "contradiction"; focusCell: CellPosition }
  | { kind: "stuck" }

export const BOARD_SCALE_PERCENT_MIN = 90
export const BOARD_SCALE_PERCENT_MAX = 110
export const BOARD_SCALE_PERCENT_DEFAULT = 100
const MAX_HINT_LEVEL = 3
const TECHNIQUE_LABEL: Record<LogicalStep["technique"], string> = {
  "naked-single": "裸单元",
  "hidden-single": "隐藏单元",
  "locked-candidate": "锁定候选",
  "naked-pair": "裸对",
}
const TECHNIQUE_HELPER_TEXT: Record<LogicalStep["technique"], string> = {
  "naked-single": "裸单元：这个空格现在只剩一个合法数字可填。",
  "hidden-single": "隐藏单元：某个数字在一行、一列或一宫里只剩一个位置能放。",
  "locked-candidate": "锁定候选：某宫里的候选被锁在同一行或列，因此能排除这条线上的同候选。",
  "naked-pair": "裸对：两个格子只剩同一对候选，所以同一区域其他格不能再用这两个数字。",
}

interface GameStore {
  difficulty: Difficulty
  puzzle: Board
  solution: Board
  board: Board
  fixed: boolean[][]
  notes: boolean[][][]
  selectedCell: CellPosition | null
  noteMode: boolean
  conflictHighlight: boolean
  autoCheck: boolean
  mistakes: number
  elapsedSec: number
  boardScalePercent: number
  seed: string
  status: GameStatus
  hint: HintState | null
  history: Snapshot[]
  future: Snapshot[]
  maxMistakes: number
  newGame: (difficulty?: Difficulty) => void
  restartGame: () => void
  setDifficulty: (difficulty: Difficulty) => void
  setSelectedCell: (row: number, col: number) => void
  moveSelection: (dx: number, dy: number) => void
  inputDigit: (digit: number) => void
  clearCell: () => void
  toggleNoteMode: () => void
  setNoteMode: (enabled: boolean) => void
  toggleNoteDigit: (digit: number) => void
  undo: () => void
  redo: () => void
  giveHint: () => void
  tick: () => void
  setConflictHighlight: (enabled: boolean) => void
  setAutoCheck: (enabled: boolean) => void
  setBoardScalePercent: (percent: number) => void
}

const STORAGE_KEY = "sudoku.v1"
const MAX_MISTAKES = 3

function createGame(difficulty: Difficulty, seed?: string) {
  const puzzle = generatePuzzle({ difficulty, unique: true, symmetry: "center", seed })
  return {
    difficulty,
    puzzle: puzzle.givens,
    solution: puzzle.solution,
    board: cloneBoard(puzzle.givens),
    fixed: buildFixedGrid(puzzle.givens),
    notes: createNotesGrid(),
    selectedCell: listEmptyCells(puzzle.givens)[0] ?? null,
    noteMode: false,
    conflictHighlight: true,
    autoCheck: true,
    mistakes: 0,
    elapsedSec: 0,
    boardScalePercent: BOARD_SCALE_PERCENT_DEFAULT,
    seed: puzzle.seed,
    status: "playing" as GameStatus,
    hint: null as HintState | null,
    history: [] as Snapshot[],
    future: [] as Snapshot[],
    maxMistakes: MAX_MISTAKES,
  }
}

function makeSnapshot(state: GameStore): Snapshot {
  return {
    board: cloneBoard(state.board),
    notes: cloneNotesGrid(state.notes),
  }
}

function pushHistory(state: GameStore): Pick<GameStore, "history" | "future"> {
  const nextHistory = [...state.history, makeSnapshot(state)]
  return {
    history: nextHistory.slice(-100),
    future: [],
  }
}

function serialize(state: GameStore): PersistedState {
  return {
    difficulty: state.difficulty,
    puzzle: state.puzzle,
    solution: state.solution,
    board: state.board,
    fixed: state.fixed,
    notes: state.notes,
    selectedCell: state.selectedCell,
    noteMode: state.noteMode,
    conflictHighlight: state.conflictHighlight,
    autoCheck: state.autoCheck,
    mistakes: state.mistakes,
    elapsedSec: state.elapsedSec,
    boardScalePercent: state.boardScalePercent,
    seed: state.seed,
    status: state.status,
  }
}

function clampBoardScalePercent(percent: number | undefined): number {
  if (typeof percent !== "number" || Number.isNaN(percent)) {
    return BOARD_SCALE_PERCENT_DEFAULT
  }

  return Math.min(BOARD_SCALE_PERCENT_MAX, Math.max(BOARD_SCALE_PERCENT_MIN, Math.round(percent)))
}

function saveState(state: GameStore) {
  if (typeof window === "undefined") {
    return
  }
  const payload = serialize(state)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function loadState(): PersistedState | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as PersistedState
    return parsed
  } catch {
    return null
  }
}

function countMistakes(board: Board, fixed: boolean[][], autoCheck: boolean): number {
  if (!autoCheck) {
    return 0
  }

  let mistakes = 0

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (fixed[row][col]) {
        continue
      }

      if (cellHasConflict(board, row, col)) {
        mistakes += 1
      }
    }
  }

  return mistakes
}

function evaluateStatus(board: Board, mistakes: number): GameStatus {
  if (mistakes >= MAX_MISTAKES) {
    return "lost"
  }

  if (isBoardComplete(board) && isValidBoard(board)) {
    return "won"
  }

  return "playing"
}

function getGameProgress(board: Board, fixed: boolean[][], autoCheck: boolean): Pick<GameStore, "mistakes" | "status"> {
  const mistakes = countMistakes(board, fixed, autoCheck)
  return {
    mistakes,
    status: evaluateStatus(board, mistakes),
  }
}

function clearHintState(): Pick<GameStore, "hint"> {
  return { hint: null }
}

function createHintSignature(step: LogicalStep): string {
  const placements = step.placements
    .map((placement) => `p:${placement.row}-${placement.col}-${placement.digit}`)
    .join("|")
  const eliminations = step.eliminations
    .map((elimination) => `e:${elimination.row}-${elimination.col}-${elimination.digit}`)
    .join("|")

  return `${step.technique}::${placements}::${eliminations}`
}

function formatCellPosition(cell: CellPosition): string {
  return `第 ${cell.row + 1} 行第 ${cell.col + 1} 列`
}

function formatCellList(cells: CellPosition[]): string {
  const labels = cells.slice(0, 3).map((cell) => formatCellPosition(cell))

  if (cells.length <= 3) {
    return labels.join("、")
  }

  return `${labels.join("、")} 等 ${cells.length} 个位置`
}

function getHintFocusCells(step: LogicalStep): CellPosition[] {
  const cells = step.placements.length > 0 ? step.placements : step.eliminations
  const unique = new Map<string, CellPosition>()

  for (const cell of cells) {
    unique.set(`${cell.row}-${cell.col}`, { row: cell.row, col: cell.col })
  }

  return [...unique.values()]
}

function getConflictCells(board: Board): CellPosition[] {
  const cells: CellPosition[] = []

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (cellHasConflict(board, row, col)) {
        cells.push({ row, col })
      }
    }
  }

  return cells
}

function findContradictionCell(board: Board): CellPosition | null {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== 0) {
        continue
      }

      if (getCandidates(board, row, col).length === 0) {
        return { row, col }
      }
    }
  }

  return null
}

function getBlockedHintReason(board: Board): BlockedHintReason {
  if (!isValidBoard(board)) {
    return {
      kind: "conflict",
      focusCells: getConflictCells(board),
    }
  }

  const contradictionCell = findContradictionCell(board)
  if (contradictionCell) {
    return {
      kind: "contradiction",
      focusCell: contradictionCell,
    }
  }

  return { kind: "stuck" }
}

function formatEliminationHint(step: LogicalStep): string {
  const grouped = new Map<string, { row: number; col: number; digits: number[] }>()

  for (const elimination of step.eliminations) {
    const key = `${elimination.row}-${elimination.col}`
    const current = grouped.get(key)
    if (current) {
      current.digits.push(elimination.digit)
      continue
    }

    grouped.set(key, {
      row: elimination.row,
      col: elimination.col,
      digits: [elimination.digit],
    })
  }

  const message = [...grouped.values()]
    .map(({ row, col, digits }) => `${formatCellPosition({ row, col })}去掉候选 ${digits.sort((a, b) => a - b).join("、")}`)
    .join("；")

  return message ? `${message}。` : ""
}

function buildHintState(step: LogicalStep, level: number): HintState {
  const focusCells = level >= 2 ? getHintFocusCells(step) : []
  const title = `提示 ${level}/${MAX_HINT_LEVEL} · ${TECHNIQUE_LABEL[step.technique]}`

  if (step.placements.length > 0) {
    const [placement] = step.placements

    if (level === 1) {
      return {
        title,
        message: `这一步可以用${TECHNIQUE_LABEL[step.technique]}。先别急着落子，先判断哪个空格最受限制。`,
        helperText: TECHNIQUE_HELPER_TEXT[step.technique],
        level,
        maxLevel: MAX_HINT_LEVEL,
        focusCells,
        signature: createHintSignature(step),
      }
    }

    if (level === 2) {
      return {
        title,
        message: `重点看${formatCellList(focusCells)}。它就是这一步的目标位置。`,
        helperText: TECHNIQUE_HELPER_TEXT[step.technique],
        level,
        maxLevel: MAX_HINT_LEVEL,
        focusCells,
        signature: createHintSignature(step),
      }
    }

    return {
      title,
      message: `${formatCellPosition(placement)}可以填 ${placement.digit}。`,
      helperText: TECHNIQUE_HELPER_TEXT[step.technique],
      level,
      maxLevel: MAX_HINT_LEVEL,
      focusCells,
      signature: createHintSignature(step),
    }
  }

  if (level === 1) {
    return {
      title,
      message: `这一步可以用${TECHNIQUE_LABEL[step.technique]}。先观察哪些候选其实已经可以排除了。`,
      helperText: TECHNIQUE_HELPER_TEXT[step.technique],
      level,
      maxLevel: MAX_HINT_LEVEL,
      focusCells,
      signature: createHintSignature(step),
    }
  }

  if (level === 2) {
    return {
      title,
      message: `重点看${formatCellList(focusCells)}的候选变化。`,
      helperText: TECHNIQUE_HELPER_TEXT[step.technique],
      level,
      maxLevel: MAX_HINT_LEVEL,
      focusCells,
      signature: createHintSignature(step),
    }
  }

  return {
    title,
    message: formatEliminationHint(step),
    helperText: TECHNIQUE_HELPER_TEXT[step.technique],
    level,
    maxLevel: MAX_HINT_LEVEL,
    focusCells,
    signature: createHintSignature(step),
  }
}

function buildBlockedHint(reason: BlockedHintReason): HintState {
  if (reason.kind === "conflict") {
    return {
      title: "提示 · 先处理冲突",
      message: "当前棋盘存在冲突，先把冲突处理掉，再请求提示。",
      helperText: "冲突说明：同一行、列或九宫格里出现了重复数字。",
      level: 1,
      maxLevel: 1,
      focusCells: reason.focusCells,
      signature: null,
    }
  }

  if (reason.kind === "contradiction") {
    return {
      title: "提示 · 先回退错误",
      message: `${formatCellPosition(reason.focusCell)}已经没有任何合法候选，这通常说明前面某一步填错了。先回退或清空再继续。`,
      helperText: "矛盾说明：这个空格按当前盘面已经没有任何数字可填。",
      level: 1,
      maxLevel: 1,
      focusCells: [reason.focusCell],
      signature: null,
    }
  }

  return {
    title: "提示 · 暂无逻辑步",
    message: "当前盘面暂时没有可用的基础逻辑提示。先自行推演，或补充笔记后再看。",
    helperText: "这通常表示盘面目前还合法，只是现有提示器暂时找不到下一步基础技巧。",
    level: 1,
    maxLevel: 1,
    focusCells: [],
    signature: null,
  }
}

export const useGameStore = create<GameStore>((set, get) => {
  const restored = loadState()
  const base = restored
    ? (() => {
        const progress = getGameProgress(restored.board, restored.fixed, restored.autoCheck)

        return {
          ...restored,
          ...progress,
          boardScalePercent: clampBoardScalePercent(restored.boardScalePercent),
          hint: null,
          history: [] as Snapshot[],
          future: [] as Snapshot[],
          maxMistakes: MAX_MISTAKES,
        }
      })()
    : createGame("easy")

  return {
    ...base,
    newGame: (difficulty) => {
      const next = {
        ...createGame(difficulty ?? get().difficulty),
        boardScalePercent: get().boardScalePercent,
      }
      set(() => next)
      saveState(get())
    },
    restartGame: () => {
      set((state) => {
        const nextBoard = cloneBoard(state.puzzle)
        const nextState = {
          board: nextBoard,
          notes: createNotesGrid(),
          selectedCell: listEmptyCells(nextBoard)[0] ?? null,
          noteMode: false,
          elapsedSec: 0,
          ...getGameProgress(nextBoard, state.fixed, state.autoCheck),
          ...clearHintState(),
          history: [] as Snapshot[],
          future: [] as Snapshot[],
        }
        return nextState
      })
      saveState(get())
    },
    setDifficulty: (difficulty) => {
      set({ difficulty })
      saveState(get())
    },
    setSelectedCell: (row, col) => {
      set({ selectedCell: { row, col } })
      saveState(get())
    },
    moveSelection: (dx, dy) => {
      const selected = get().selectedCell
      if (!selected) {
        set({ selectedCell: { row: 0, col: 0 } })
        return
      }

      const row = (selected.row + dy + 9) % 9
      const col = (selected.col + dx + 9) % 9
      set({ selectedCell: { row, col } })
      saveState(get())
    },
    inputDigit: (digit) => {
      const state = get()
      if (state.status === "won" || !state.selectedCell) {
        return
      }

      const { row, col } = state.selectedCell
      if (state.fixed[row][col]) {
        return
      }

      if (state.noteMode) {
        state.toggleNoteDigit(digit)
        return
      }

      set((current) => {
        const { history, future } = pushHistory(current)
        const board = cloneBoard(current.board)
        const notes = cloneNotesGrid(current.notes)

        const previous = board[row][col]
        if (previous === digit) {
          return current
        }

        board[row][col] = digit
        notes[row][col] = Array.from({ length: 9 }, () => false)

        const progress = getGameProgress(board, current.fixed, current.autoCheck)

        return {
          board,
          notes,
          ...progress,
          ...clearHintState(),
          history,
          future,
        }
      })
      saveState(get())
    },
    clearCell: () => {
      const state = get()
      if (state.status === "won" || !state.selectedCell) {
        return
      }

      const { row, col } = state.selectedCell
      if (state.fixed[row][col]) {
        return
      }

      set((current) => {
        const { history, future } = pushHistory(current)
        const board = cloneBoard(current.board)
        const notes = cloneNotesGrid(current.notes)

        board[row][col] = 0
        notes[row][col] = Array.from({ length: 9 }, () => false)

        return {
          board,
          notes,
          ...getGameProgress(board, current.fixed, current.autoCheck),
          ...clearHintState(),
          history,
          future,
        }
      })
      saveState(get())
    },
    toggleNoteMode: () => {
      set((state) => ({ noteMode: !state.noteMode }))
      saveState(get())
    },
    setNoteMode: (enabled) => {
      set({ noteMode: enabled })
      saveState(get())
    },
    toggleNoteDigit: (digit) => {
      const state = get()
      if (state.status === "won" || !state.selectedCell) {
        return
      }

      const { row, col } = state.selectedCell
      if (state.fixed[row][col] || state.board[row][col] !== 0) {
        return
      }

      set((current) => {
        const { history, future } = pushHistory(current)
        const notes = cloneNotesGrid(current.notes)
        notes[row][col][digit - 1] = !notes[row][col][digit - 1]
        return {
          notes,
          ...clearHintState(),
          history,
          future,
        }
      })
      saveState(get())
    },
    undo: () => {
      set((state) => {
        if (state.history.length === 0) {
          return state
        }

        const previous = state.history[state.history.length - 1]
        const history = state.history.slice(0, -1)
        const future = [...state.future, makeSnapshot(state)]

        const progress = getGameProgress(previous.board, state.fixed, state.autoCheck)
        return {
          board: cloneBoard(previous.board),
          notes: cloneNotesGrid(previous.notes),
          ...progress,
          ...clearHintState(),
          history,
          future,
        }
      })
      saveState(get())
    },
    redo: () => {
      set((state) => {
        if (state.future.length === 0) {
          return state
        }

        const next = state.future[state.future.length - 1]
        const future = state.future.slice(0, -1)
        const history = [...state.history, makeSnapshot(state)]
        const progress = getGameProgress(next.board, state.fixed, state.autoCheck)

        return {
          board: cloneBoard(next.board),
          notes: cloneNotesGrid(next.notes),
          ...progress,
          ...clearHintState(),
          history,
          future,
        }
      })
      saveState(get())
    },
    giveHint: () => {
      const state = get()
      if (state.status === "won") {
        return
      }

      set((current) => {
        const logicalStep = findNextLogicalStep(current.board)
        if (!logicalStep) {
          const reason = getBlockedHintReason(current.board)
          return {
            hint: buildBlockedHint(reason),
          }
        }

        const signature = createHintSignature(logicalStep)
        const nextLevel =
          current.hint?.signature === signature ? Math.min(current.hint.level + 1, MAX_HINT_LEVEL) : 1

        return {
          hint: buildHintState(logicalStep, nextLevel),
        }
      })
      saveState(get())
    },
    tick: () => {
      set((state) => {
        if (state.status === "won" || state.status === "idle") {
          return state
        }
        return {
          elapsedSec: state.elapsedSec + 1,
        }
      })
      saveState(get())
    },
    setConflictHighlight: (enabled) => {
      set({ conflictHighlight: enabled })
      saveState(get())
    },
    setAutoCheck: (enabled) => {
      set((state) => ({
        autoCheck: enabled,
        ...getGameProgress(state.board, state.fixed, enabled),
      }))
      saveState(get())
    },
    setBoardScalePercent: (percent) => {
      set({
        boardScalePercent: clampBoardScalePercent(percent),
      })
      saveState(get())
    },
  }
})

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function isWrongValue(board: Board, row: number, col: number): boolean {
  return cellHasConflict(board, row, col)
}

export function isConflictValue(board: Board, row: number, col: number): boolean {
  return cellHasConflict(board, row, col)
}
