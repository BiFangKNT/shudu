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

  const disabled = status === "won"

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
          提示
        </Button>
      </div>
    </div>
  )
}
