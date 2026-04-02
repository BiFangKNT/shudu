import { Eraser, Lightbulb, PenLine } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGameStore } from "@/store/game-store"

interface NumberPadProps {
  compact?: boolean
  showDigits?: boolean
}

export function NumberPad({ compact = false, showDigits = true }: NumberPadProps) {
  const noteMode = useGameStore((state) => state.noteMode)
  const status = useGameStore((state) => state.status)
  const inputDigit = useGameStore((state) => state.inputDigit)
  const clearCell = useGameStore((state) => state.clearCell)
  const toggleNoteMode = useGameStore((state) => state.toggleNoteMode)
  const giveHint = useGameStore((state) => state.giveHint)
  const hint = useGameStore((state) => state.hint)

  const disabled = status === "won"
  const hintLabel = hint && hint.level < hint.maxLevel ? "下一层" : "提示"

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {showDigits && (
        <div className={cn("grid grid-cols-9 gap-2", compact && "gap-1.5")}>
          {Array.from({ length: 9 }, (_, index) => index + 1).map((digit) => (
            <Button
              key={digit}
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "h-11 w-full rounded-xl border-slate-300 text-base font-semibold text-slate-700 shadow-sm sm:h-12",
                compact && "h-10 rounded-lg text-sm sm:h-10",
                !disabled && "hover:border-emerald-300 hover:bg-emerald-50"
              )}
              onClick={() => inputDigit(digit)}
              disabled={disabled}
            >
              {digit}
            </Button>
          ))}
        </div>
      )}
      <div className={cn("grid grid-cols-3 gap-2", compact && "gap-1.5")}>
        <Button
          type="button"
          variant={noteMode ? "default" : "outline"}
          className={cn("h-11 rounded-xl", compact && "h-10 rounded-lg px-2 text-sm")}
          onClick={toggleNoteMode}
          disabled={disabled}
        >
          <PenLine className="size-4" />
          {noteMode ? "笔记中" : "笔记"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn("h-11 rounded-xl", compact && "h-10 rounded-lg px-2 text-sm")}
          onClick={clearCell}
          disabled={disabled}
        >
          <Eraser className="size-4" />
          清空
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn("h-11 rounded-xl", compact && "h-10 rounded-lg px-2 text-sm")}
          onClick={giveHint}
          disabled={disabled}
        >
          <Lightbulb className="size-4" />
          {hintLabel}
        </Button>
      </div>
      {!showDigits && hint && (
        <section className="rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50 via-orange-50 to-white px-3 py-3 shadow-[0_18px_45px_-35px_rgba(180,83,9,0.75)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900">{hint.title}</p>
              <p className="text-sm leading-6 text-amber-800">{hint.message}</p>
              {hint.helperText && (
                <p className="pt-1 text-xs leading-5 text-amber-700/90">
                  术语解释：{hint.helperText}
                </p>
              )}
            </div>
            <span className="rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {hint.level < hint.maxLevel ? "再按一次提示查看下一层" : "已显示最强提示"}
            </span>
          </div>
        </section>
      )}
    </div>
  )
}
