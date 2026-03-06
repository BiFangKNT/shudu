import { create } from "zustand"

import { boardEquals, cloneBoard, cloneNotesGrid, createNotesGrid, isBoardComplete } from "@/lib/sudoku/board"
import { buildFixedGrid, generatePuzzle, listEmptyCells } from "@/lib/sudoku/generator"
import { cellHasConflict } from "@/lib/sudoku/validator"
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
  seed: string
  status: GameStatus
}

export type GameStatus = "idle" | "playing" | "won" | "lost"

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
}

const STORAGE_KEY = "sudoku.v1"
const MAX_MISTAKES = 3

function createGame(difficulty: Difficulty, seed?: string) {
  const puzzle = generatePuzzle({ difficulty, unique: true, symmetry: "center", seed })
  return {
    difficulty: puzzle.difficulty,
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
    mistakes: state.mistakes,
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
    seed: state.seed,
    status: state.status,
  }
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

function evaluateStatus(board: Board, solution: Board, mistakes: number): GameStatus {
  if (mistakes >= MAX_MISTAKES) {
    return "lost"
  }

  if (isBoardComplete(board) && boardEquals(board, solution)) {
    return "won"
  }

  return "playing"
}

export const useGameStore = create<GameStore>((set, get) => {
  const restored = loadState()
  const base = restored
    ? {
        ...restored,
        history: [] as Snapshot[],
        future: [] as Snapshot[],
        maxMistakes: MAX_MISTAKES,
      }
    : createGame("medium")

  return {
    ...base,
    newGame: (difficulty) => {
      const next = createGame(difficulty ?? get().difficulty)
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
          mistakes: 0,
          elapsedSec: 0,
          status: "playing" as GameStatus,
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
      if (state.status !== "playing" || !state.selectedCell) {
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

        const incorrect = current.autoCheck && digit !== current.solution[row][col]
        const mistakes = incorrect ? current.mistakes + 1 : current.mistakes
        const status = evaluateStatus(board, current.solution, mistakes)

        return {
          board,
          notes,
          mistakes,
          status,
          history,
          future,
        }
      })
      saveState(get())
    },
    clearCell: () => {
      const state = get()
      if (state.status !== "playing" || !state.selectedCell) {
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
          history,
          future,
          status: evaluateStatus(board, current.solution, current.mistakes),
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
      if (state.status !== "playing" || !state.selectedCell) {
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

        const status = evaluateStatus(previous.board, state.solution, previous.mistakes)
        return {
          board: cloneBoard(previous.board),
          notes: cloneNotesGrid(previous.notes),
          mistakes: previous.mistakes,
          status,
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
        const status = evaluateStatus(next.board, state.solution, next.mistakes)

        return {
          board: cloneBoard(next.board),
          notes: cloneNotesGrid(next.notes),
          mistakes: next.mistakes,
          status,
          history,
          future,
        }
      })
      saveState(get())
    },
    giveHint: () => {
      const state = get()
      if (state.status !== "playing") {
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

        const status = evaluateStatus(board, current.solution, current.mistakes)
        return {
          board,
          notes,
          status,
          history,
          future,
          selectedCell: target,
        }
      })
      saveState(get())
    },
    tick: () => {
      set((state) => {
        if (state.status !== "playing") {
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
      set({ autoCheck: enabled })
      saveState(get())
    },
  }
})

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function isWrongValue(board: Board, solution: Board, row: number, col: number): boolean {
  const value = board[row][col]
  if (value === 0) {
    return false
  }
  return value !== solution[row][col]
}

export function isConflictValue(board: Board, row: number, col: number): boolean {
  return cellHasConflict(board, row, col)
}
