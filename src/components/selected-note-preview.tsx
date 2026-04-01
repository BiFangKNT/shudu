import { getNoteDigits } from "@/lib/sudoku/board"
import { cn } from "@/lib/utils"
import { useGameStore } from "@/store/game-store"

interface SelectedNotePreviewProps {
  compact?: boolean
}

export function SelectedNotePreview({ compact = false }: SelectedNotePreviewProps) {
  const board = useGameStore((state) => state.board)
  const fixed = useGameStore((state) => state.fixed)
  const notes = useGameStore((state) => state.notes)
  const selectedCell = useGameStore((state) => state.selectedCell)
  const noteMode = useGameStore((state) => state.noteMode)
  const status = useGameStore((state) => state.status)
  const inputDigit = useGameStore((state) => state.inputDigit)

  const selectedValue = selectedCell ? board[selectedCell.row][selectedCell.col] : 0
  const selectedNotes = selectedCell ? notes[selectedCell.row][selectedCell.col] : Array.from({ length: 9 }, () => false)
  const noteDigits = getNoteDigits(selectedNotes)
  const hasEmptySelection = Boolean(selectedCell && selectedValue === 0)
  const selectedLocked = selectedCell ? fixed[selectedCell.row][selectedCell.col] : false
  const digitButtonsDisabled = status === "won" || !selectedCell || selectedLocked

  return (
    <section
      className={cn(
        "rounded-3xl border border-sky-100/90 bg-linear-to-br from-sky-50 via-cyan-50 to-white shadow-[0_20px_45px_-35px_rgba(2,132,199,0.55)]",
        compact ? "px-3 py-3" : "px-4 py-4"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-sky-700">放大候选</p>
          <p className="mt-1 text-xs text-slate-600">
            {selectedCell ? `第 ${selectedCell.row + 1} 行，第 ${selectedCell.col + 1} 列` : "选中空白格后显示候选"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2 py-1 text-[0.68rem] font-semibold shadow-sm ring-1",
              noteMode
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-white/90 text-slate-500 ring-slate-200"
            )}
          >
            {noteMode ? "笔记中" : "笔记"}
          </span>
          {hasEmptySelection && (
            <span className="rounded-full bg-white/90 px-2 py-1 text-[0.68rem] font-semibold text-sky-700 shadow-sm ring-1 ring-sky-100">
              {noteDigits.length} 个
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "mt-3 grid grid-cols-3 gap-2 rounded-[1.75rem] border border-sky-100/90 bg-white/85 p-2.5 shadow-inner shadow-sky-100/50",
          compact ? "mx-auto max-w-[12.5rem]" : "mx-auto max-w-[15rem]"
        )}
      >
        {Array.from({ length: 9 }, (_, index) => {
          const digit = index + 1
          const active = selectedCell ? selectedNotes[index] : false

          return (
            <button
              key={digit}
              type="button"
              onClick={() => inputDigit(digit)}
              disabled={digitButtonsDisabled}
              aria-pressed={active}
              aria-label={`${noteMode ? "切换候选" : "输入数字"} ${digit}`}
              className={cn(
                "flex aspect-square cursor-pointer items-center justify-center rounded-xl border font-semibold tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-55",
                compact ? "text-lg" : "text-[1.35rem]",
                active
                  ? "border-sky-300 bg-sky-100 text-sky-700 shadow-[0_12px_24px_-18px_rgba(2,132,199,0.95)]"
                  : "border-slate-200 bg-slate-50/90 text-slate-500",
                !digitButtonsDisabled && active && "hover:border-sky-400 hover:bg-sky-200",
                !digitButtonsDisabled && !active && "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              )}
            >
              {digit}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-600">
        {selectedCell
          ? hasEmptySelection
            ? noteDigits.length > 0
              ? noteMode
                ? "点击数字按钮可直接切换候选。"
                : "点击数字按钮可直接填入，候选位置仅作核对。"
              : noteMode
                ? "当前空格还没有笔记，点击数字按钮即可添加。"
                : "当前空格还没有笔记，点击数字按钮可直接填入。"
            : selectedLocked
              ? "当前选中格是题目给定数字，不能修改。"
              : "当前选中格已有正式数字，可直接点击按钮改写。"
          : "点击棋盘中的空白格后，这里会显示对应候选并支持直接输入。"}
      </p>
    </section>
  )
}
