export type Difficulty = "easy" | "medium" | "hard" | "expert"

export type Board = number[][]

export interface CellPosition {
  row: number
  col: number
}

export interface Puzzle {
  givens: Board
  solution: Board
  difficulty: Difficulty
  seed: string
}

export interface GeneratorOptions {
  difficulty: Difficulty
  unique?: boolean
  symmetry?: "none" | "center"
  seed?: string
}

export interface DifficultyConfig {
  key: Difficulty
  label: string
  minEmpty: number
  maxEmpty: number
}

export interface Snapshot {
  board: Board
  notes: boolean[][][]
  mistakes: number
}

export const GRID_SIZE = 9
export const BOX_SIZE = 3
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { key: "easy", label: "简单", minEmpty: 38, maxEmpty: 42 },
  medium: { key: "medium", label: "中等", minEmpty: 43, maxEmpty: 48 },
  hard: { key: "hard", label: "困难", minEmpty: 49, maxEmpty: 54 },
  expert: { key: "expert", label: "专家", minEmpty: 55, maxEmpty: 59 },
}

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard", "expert"]
