import { useMemo } from "react"

import { getNoteDigits } from "@/lib/sudoku/board"
import { cn } from "@/lib/utils"
import { useGameStore, isConflictValue, isWrongValue } from "@/store/game-store"

interface SudokuBoardProps {
  scale?: number
}

const BOARD_SCALE_BASELINE = 0.94

function shouldHighlightRelated(
  selected: { row: number; col: number } | null,
  row: number,
  col: number,
  sameBoxOnly = false
): boolean {
  if (!selected) {
    return false
  }

  const sameBox = Math.floor(selected.row / 3) === Math.floor(row / 3) && Math.floor(selected.col / 3) === Math.floor(col / 3)
  if (sameBoxOnly) {
    return sameBox
  }

  return selected.row === row || selected.col === col || sameBox
}
function getNoteGroupClasses(noteCount: number) {
  const base = "grid h-full place-content-center font-semibold leading-none tabular-nums text-sky-600"

  switch (noteCount) {
    case 2:
      return {
        container: `${base} grid-cols-2 gap-x-[4cqw] px-[7cqw] py-[8cqw]`,
        item: "flex items-center justify-center text-[clamp(0.95rem,40cqw,1.32rem)]",
      }
    case 3:
      return {
        container: `${base} grid-cols-3 gap-x-[2.5cqw] px-[4cqw] py-[8cqw]`,
        item: "flex items-center justify-center text-[clamp(0.9rem,31cqw,1.2rem)]",
      }
    case 4:
      return {
        container: `${base} grid-cols-2 gap-x-[5cqw] gap-y-[2cqw] px-[7cqw] py-[4cqw]`,
        item: "flex items-center justify-center text-[clamp(0.9rem,35cqw,1.2rem)]",
      }
    default:
      if (noteCount <= 6) {
        return {
          container: `${base} grid-cols-3 gap-x-[2.5cqw] gap-y-[1cqw] px-[4cqw] py-[4cqw]`,
          item: "flex items-center justify-center text-[clamp(0.8rem,28cqw,1.05rem)]",
        }
      }

      return {
        container: `${base} grid-cols-3 gap-x-[1.5cqw] gap-y-[0.5cqw] px-[3cqw] py-[3cqw]`,
        item: "flex items-center justify-center text-[clamp(0.74rem,24cqw,0.96rem)]",
      }
  }
}

export function SudokuBoard({ scale = 1 }: SudokuBoardProps) {
  const board = useGameStore((state) => state.board)
  const notes = useGameStore((state) => state.notes)
  const fixed = useGameStore((state) => state.fixed)
  const selectedCell = useGameStore((state) => state.selectedCell)
  const status = useGameStore((state) => state.status)
  const conflictHighlight = useGameStore((state) => state.conflictHighlight)
  const autoCheck = useGameStore((state) => state.autoCheck)
  const setSelectedCell = useGameStore((state) => state.setSelectedCell)

  const boardRows = useMemo(() => board.map((row) => row.slice()), [board])
  const cellDigitClassName = "text-[clamp(1.1rem,50cqw,2.35rem)] font-semibold"
  const singleNoteClassName = "text-[clamp(1rem,44cqw,2rem)] font-semibold tabular-nums text-sky-500"
  const effectiveScale = scale * BOARD_SCALE_BASELINE
  const boardWidth = `min(100%, ${(86 * effectiveScale).toFixed(2)}vmin)`
  const boardMaxWidth = `${(50 * effectiveScale).toFixed(2)}rem`

  return (
    <div
      className="relative mx-auto rounded-4xl border border-slate-200/80 bg-white/80 p-3 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.9)] backdrop-blur-sm sm:p-5"
      style={{ width: boardWidth, maxWidth: boardMaxWidth }}
    >
      <div className="grid grid-cols-9 overflow-hidden rounded-2xl border border-slate-200/90 bg-white">
        {boardRows.map((rowValues, row) =>
          rowValues.map((value, col) => {
            const noteDigits = getNoteDigits(notes[row][col])
            const singleNoteDigit = noteDigits.length === 1 ? noteDigits[0] : null
            const selected = selectedCell?.row === row && selectedCell?.col === col
            const related = shouldHighlightRelated(selectedCell, row, col)
            const sameBox = shouldHighlightRelated(selectedCell, row, col, true)
            const locked = fixed[row][col]
            const conflict = conflictHighlight && isConflictValue(board, row, col)
            const wrong = autoCheck && isWrongValue(board, row, col)
            const winning = status === "won"
            const noteGroupClasses = getNoteGroupClasses(noteDigits.length)

            return (
              <button
                key={`${row}-${col}`}
                type="button"
                onClick={() => setSelectedCell(row, col)}
                style={{ containerType: "inline-size" }}
                className={cn(
                  "relative aspect-square border border-slate-100 text-center transition-colors duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
                  "cursor-pointer",
                  row % 3 === 0 && "border-t-slate-300",
                  col % 3 === 0 && "border-l-slate-300",
                  row === 8 && "border-b-slate-300",
                  col === 8 && "border-r-slate-300",
                  related && "bg-emerald-50/65",
                  sameBox && "bg-emerald-100/45",
                  selected && "bg-emerald-200/60 ring-1 ring-emerald-300",
                  locked && "bg-slate-100/80",
                  conflict && "bg-rose-100/80 text-rose-700",
                  wrong && "text-rose-700",
                  winning && "bg-emerald-100/70"
                )}
              >
                {value > 0 ? (
                  <span
                    className={cn(
                      cellDigitClassName,
                      locked ? "text-slate-800" : "text-emerald-700",
                      (conflict || wrong) && "text-rose-700"
                    )}
                  >
                    {value}
                  </span>
                ) : singleNoteDigit ? (
                  <span className={singleNoteClassName}>{singleNoteDigit}</span>
                ) : noteDigits.length > 1 ? (
                  <div className={noteGroupClasses.container}>
                    {noteDigits.map((digit) => (
                      <span key={digit} className={noteGroupClasses.item}>
                        {digit}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="h-full" />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
