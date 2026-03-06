import { useMemo } from "react"

import { cn } from "@/lib/utils"
import { useGameStore, isConflictValue, isWrongValue } from "@/store/game-store"

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

export function SudokuBoard() {
  const board = useGameStore((state) => state.board)
  const notes = useGameStore((state) => state.notes)
  const fixed = useGameStore((state) => state.fixed)
  const selectedCell = useGameStore((state) => state.selectedCell)
  const solution = useGameStore((state) => state.solution)
  const status = useGameStore((state) => state.status)
  const conflictHighlight = useGameStore((state) => state.conflictHighlight)
  const autoCheck = useGameStore((state) => state.autoCheck)
  const setSelectedCell = useGameStore((state) => state.setSelectedCell)

  const boardRows = useMemo(() => board.map((row) => row.slice()), [board])

  return (
    <div className="relative mx-auto w-full max-w-xl rounded-4xl border border-slate-200/80 bg-white/80 p-3 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.9)] backdrop-blur-sm sm:p-5">
      <div className="grid grid-cols-9 overflow-hidden rounded-2xl border border-slate-200/90 bg-white">
        {boardRows.map((rowValues, row) =>
          rowValues.map((value, col) => {
            const selected = selectedCell?.row === row && selectedCell?.col === col
            const related = shouldHighlightRelated(selectedCell, row, col)
            const sameBox = shouldHighlightRelated(selectedCell, row, col, true)
            const locked = fixed[row][col]
            const conflict = conflictHighlight && isConflictValue(board, row, col)
            const wrong = autoCheck && isWrongValue(board, solution, row, col)
            const winning = status === "won"

            return (
              <button
                key={`${row}-${col}`}
                type="button"
                onClick={() => setSelectedCell(row, col)}
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
                      "text-lg font-semibold sm:text-2xl",
                      locked ? "text-slate-800" : "text-emerald-700",
                      (conflict || wrong) && "text-rose-700"
                    )}
                  >
                    {value}
                  </span>
                ) : (
                  <div className="grid h-full grid-cols-3 grid-rows-3 p-1 text-[0.55rem] leading-none text-slate-500 sm:text-[0.62rem]">
                    {Array.from({ length: 9 }, (_, i) => (
                      <span key={i} className="flex items-center justify-center">
                        {notes[row][col][i] ? i + 1 : ""}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
