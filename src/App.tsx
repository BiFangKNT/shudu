import { useEffect } from "react"
import { RefreshCcw, RotateCcw, RotateCw, Sparkles, Timer } from "lucide-react"

import { NumberPad } from "@/components/number-pad"
import { SudokuBoard } from "@/components/sudoku-board"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { DIFFICULTY_ORDER } from "@/lib/sudoku/types"
import { formatTime, useGameStore } from "@/store/game-store"

const DIFFICULTY_TEXT: Record<(typeof DIFFICULTY_ORDER)[number], string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
  expert: "专家",
}

const STATUS_TEXT = {
  idle: "未开始",
  playing: "进行中",
  won: "已完成",
  lost: "失败",
} as const

function App() {
  const difficulty = useGameStore((state) => state.difficulty)
  const status = useGameStore((state) => state.status)
  const elapsedSec = useGameStore((state) => state.elapsedSec)
  const mistakes = useGameStore((state) => state.mistakes)
  const maxMistakes = useGameStore((state) => state.maxMistakes)
  const seed = useGameStore((state) => state.seed)
  const noteMode = useGameStore((state) => state.noteMode)
  const conflictHighlight = useGameStore((state) => state.conflictHighlight)
  const autoCheck = useGameStore((state) => state.autoCheck)
  const historySize = useGameStore((state) => state.history.length)
  const futureSize = useGameStore((state) => state.future.length)

  const setDifficulty = useGameStore((state) => state.setDifficulty)
  const newGame = useGameStore((state) => state.newGame)
  const restartGame = useGameStore((state) => state.restartGame)
  const undo = useGameStore((state) => state.undo)
  const redo = useGameStore((state) => state.redo)
  const tick = useGameStore((state) => state.tick)
  const inputDigit = useGameStore((state) => state.inputDigit)
  const clearCell = useGameStore((state) => state.clearCell)
  const moveSelection = useGameStore((state) => state.moveSelection)
  const toggleNoteMode = useGameStore((state) => state.toggleNoteMode)
  const setConflictHighlight = useGameStore((state) => state.setConflictHighlight)
  const setAutoCheck = useGameStore((state) => state.setAutoCheck)
  const giveHint = useGameStore((state) => state.giveHint)

  useEffect(() => {
    const timer = window.setInterval(() => {
      tick()
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [tick])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
        return
      }

      if (event.key >= "1" && event.key <= "9") {
        event.preventDefault()
        inputDigit(Number(event.key))
        return
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault()
        clearCell()
        return
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault()
        toggleNoteMode()
        return
      }

      if (event.key.toLowerCase() === "h") {
        event.preventDefault()
        giveHint()
        return
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        moveSelection(0, -1)
      }
      if (event.key === "ArrowDown") {
        event.preventDefault()
        moveSelection(0, 1)
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        moveSelection(-1, 0)
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        moveSelection(1, 0)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [clearCell, giveHint, inputDigit, moveSelection, toggleNoteMode])

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-emerald-50 via-sky-50 to-cyan-100 px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -left-20 top-12 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row lg:items-start">
        <section className="flex-1 space-y-4">
          <Card className="border-emerald-100/80">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl sm:text-3xl">数独</CardTitle>
                  <CardDescription className="mt-1 text-sm sm:text-base">随机生成 + 难度选择 + 唯一解校验</CardDescription>
                </div>
                <Badge variant={status === "won" ? "default" : status === "lost" ? "destructive" : "secondary"}>{STATUS_TEXT[status]}</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="difficulty">难度</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(value) => {
                      const next = value as (typeof DIFFICULTY_ORDER)[number]
                      setDifficulty(next)
                      newGame(next)
                    }}
                  >
                    <SelectTrigger id="difficulty">
                      <SelectValue placeholder="选择难度" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_ORDER.map((level) => (
                        <SelectItem key={level} value={level}>
                          {DIFFICULTY_TEXT[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>计时</Label>
                  <div className="flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
                    <Timer className="mr-2 size-4 text-emerald-600" />
                    {formatTime(elapsedSec)}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>错误次数</Label>
                  <div className="flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
                    {mistakes} / {maxMistakes}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>当前 Seed</Label>
                  <div className="h-10 truncate rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">{seed}</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button type="button" variant="default" onClick={() => newGame(difficulty)}>
                  <Sparkles className="size-4" />
                  新局
                </Button>
                <Button type="button" variant="outline" onClick={restartGame}>
                  <RefreshCcw className="size-4" />
                  重开
                </Button>
                <Button type="button" variant="outline" onClick={undo} disabled={historySize === 0}>
                  <RotateCcw className="size-4" />
                  撤销
                </Button>
                <Button type="button" variant="outline" onClick={redo} disabled={futureSize === 0}>
                  <RotateCw className="size-4" />
                  重做
                </Button>
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">冲突高亮</p>
                    <p className="text-xs text-slate-500">显示行列宫重复</p>
                  </div>
                  <Switch checked={conflictHighlight} onCheckedChange={setConflictHighlight} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">自动判错</p>
                    <p className="text-xs text-slate-500">输入与答案不符时计错</p>
                  </div>
                  <Switch checked={autoCheck} onCheckedChange={setAutoCheck} />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
                快捷键：数字键输入，`N` 切换笔记，`H` 提示，方向键移动，`Backspace/Delete` 清空。
              </div>
            </CardContent>
          </Card>

          <SudokuBoard />
        </section>

        <aside className="w-full lg:sticky lg:top-6 lg:w-[24rem]">
          <Card>
            <CardHeader>
              <CardTitle>操作面板</CardTitle>
              <CardDescription>移动端支持触控输入；桌面端可键盘操作</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                笔记模式：<span className="font-semibold text-slate-900">{noteMode ? "开启" : "关闭"}</span>
              </div>
              <NumberPad />
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}

export default App
