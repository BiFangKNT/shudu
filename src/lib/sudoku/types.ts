export type Difficulty = "easy" | "medium" | "hard" | "expert"
export type SolveTechnique = "naked-single" | "hidden-single" | "locked-candidate" | "naked-pair" | "guess"

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
  maxTechnique: SolveTechnique
}

export interface Snapshot {
  board: Board
  notes: boolean[][][]
}

export const GRID_SIZE = 9
export const BOX_SIZE = 3
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export const TECHNIQUE_ORDER: SolveTechnique[] = [
  "naked-single",
  "hidden-single",
  "locked-candidate",
  "naked-pair",
  "guess",
]

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { key: "easy", label: "简单", minEmpty: 20, maxEmpty: 25, maxTechnique: "hidden-single" },
  medium: { key: "medium", label: "中等", minEmpty: 26, maxEmpty: 33, maxTechnique: "hidden-single" },
  hard: { key: "hard", label: "困难", minEmpty: 34, maxEmpty: 42, maxTechnique: "naked-pair" },
  expert: { key: "expert", label: "专家", minEmpty: 43, maxEmpty: 52, maxTechnique: "guess" },
}

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard", "expert"]
