import { Eraser, Lightbulb, PenLine } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGameStore } from "@/store/game-store"

export function NumberPad() {
  const noteMode = useGameStore((state) => state.noteMode)
  const status = useGameStore((state) => state.status)
  const inputDigit = useGameStore((state) => state.inputDigit)
  const clearCell = useGameStore((state) => state.clearCell)
  const toggleNoteMode = useGameStore((state) => state.toggleNoteMode)
  const giveHint = useGameStore((state) => state.giveHint)

  const disabled = status !== "playing"

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-9 gap-2">
        {Array.from({ length: 9 }, (_, index) => index + 1).map((digit) => (
          <Button
            key={digit}
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "h-11 w-full rounded-xl border-slate-300 text-base font-semibold text-slate-700 shadow-sm sm:h-12",
              !disabled && "hover:border-emerald-300 hover:bg-emerald-50"
            )}
            onClick={() => inputDigit(digit)}
            disabled={disabled}
          >
            {digit}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={noteMode ? "default" : "outline"}
          className="h-11 rounded-xl"
          onClick={toggleNoteMode}
          disabled={disabled}
        >
          <PenLine className="size-4" />
          {noteMode ? "笔记中" : "笔记"}
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={clearCell} disabled={disabled}>
          <Eraser className="size-4" />
          清空
        </Button>
        <Button type="button" variant="secondary" className="h-11 rounded-xl" onClick={giveHint} disabled={disabled}>
          <Lightbulb className="size-4" />
          提示
        </Button>
      </div>
    </div>
  )
}
