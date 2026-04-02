import { create } from "zustand"

import { cloneBoard, cloneNotesGrid, createNotesGrid, isBoardComplete } from "@/lib/sudoku/board"
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

export const BOARD_SCALE_PERCENT_MIN = 90
export const BOARD_SCALE_PERCENT_MAX = 110
export const BOARD_SCALE_PERCENT_DEFAULT = 100

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

export const useGameStore = create<GameStore>((set, get) => {
  const restored = loadState()
  const base = restored
    ? (() => {
        const progress = getGameProgress(restored.board, restored.fixed, restored.autoCheck)

        return {
          ...restored,
          ...progress,
          boardScalePercent: clampBoardScalePercent(restored.boardScalePercent),
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

      const empties = listEmptyCells(state.board)
      if (empties.length === 0) {
        return
      }

      const target =
        state.selectedCell && state.board[state.selectedCell.row][state.selectedCell.col] === 0
          ? state.selectedCell
          : empties[Math.floor(Math.random() * empties.length)]

      set((current) => {
        const { history, future } = pushHistory(current)
        const board = cloneBoard(current.board)
        const notes = cloneNotesGrid(current.notes)

        board[target.row][target.col] = current.solution[target.row][target.col]
        notes[target.row][target.col] = Array.from({ length: 9 }, () => false)

        const progress = getGameProgress(board, current.fixed, current.autoCheck)
        return {
          board,
          notes,
          ...progress,
          history,
          future,
          selectedCell: target,
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
