import { useEffect, useState } from "react"
import { ChevronDown, Keyboard, RefreshCcw, RotateCcw, RotateCw, Sparkles, Timer } from "lucide-react"

import { NumberPad } from "@/components/number-pad"
import { SudokuBoard } from "@/components/sudoku-board"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { DIFFICULTY_ORDER } from "@/lib/sudoku/types"
import { cn } from "@/lib/utils"
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
  const [canHoverPanel, setCanHoverPanel] = useState(false)
  const [isMainPanelExpanded, setIsMainPanelExpanded] = useState(true)
  const [isPointerInsideMainPanel, setIsPointerInsideMainPanel] = useState(false)
  const [isDifficultySelectOpen, setIsDifficultySelectOpen] = useState(false)
  const isMainPanelCollapsed = canHoverPanel && !isMainPanelExpanded

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
    const media = window.matchMedia("(hover: hover) and (pointer: fine)")
    const updateHoverState = () => {
      const supportsHover = media.matches
      setCanHoverPanel(supportsHover)
      setIsMainPanelExpanded(true)
    }

    updateHoverState()
    media.addEventListener("change", updateHoverState)

    return () => {
      media.removeEventListener("change", updateHoverState)
    }
  }, [])

  useEffect(() => {
    if (!canHoverPanel || isPointerInsideMainPanel || isDifficultySelectOpen) {
      return
    }

    const timer = window.setTimeout(() => {
      setIsMainPanelExpanded(false)
    }, 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [canHoverPanel, isDifficultySelectOpen, isPointerInsideMainPanel])

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
    <main className="relative min-h-screen overflow-x-hidden bg-linear-to-br from-emerald-50 via-sky-50 to-cyan-100 px-4 py-5 pb-44 text-slate-900 sm:px-6 sm:py-8 sm:pb-48 lg:px-8 lg:py-10 lg:pb-10">
      <div className="pointer-events-none absolute -left-20 top-12 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <section className="space-y-4">
          <Card
            className="relative overflow-hidden border-emerald-100/80"
            onMouseEnter={() => {
              if (canHoverPanel) {
                setIsPointerInsideMainPanel(true)
                setIsMainPanelExpanded(true)
              }
            }}
            onMouseLeave={() => {
              if (canHoverPanel) {
                setIsPointerInsideMainPanel(false)
                if (!isDifficultySelectOpen) {
                  setIsMainPanelExpanded(false)
                }
              }
            }}
          >
            <CardHeader className="gap-2 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl sm:text-[2rem]">数独</CardTitle>
                  <CardDescription className="mt-1 text-sm">随机生成 + 难度选择 + 唯一解校验</CardDescription>
                </div>
                <Badge variant={status === "won" ? "default" : status === "lost" ? "destructive" : "secondary"}>{STATUS_TEXT[status]}</Badge>
              </div>
            </CardHeader>

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out",
                isMainPanelCollapsed ? "pointer-events-none grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
              )}
              aria-hidden={isMainPanelCollapsed}
            >
              <div className="min-h-0 overflow-hidden" inert={isMainPanelCollapsed}>
                <CardContent
                  className={cn(
                    "space-y-3 pt-0 transition-[opacity,transform] duration-300 ease-out",
                    isMainPanelCollapsed ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100"
                  )}
                >
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-12">
                    <div className="space-y-1 lg:col-span-8">
                      <Label htmlFor="difficulty">难度</Label>
                      <Select
                        value={difficulty}
                        onOpenChange={(open) => {
                          setIsDifficultySelectOpen(open)
                          if (open) {
                            setIsMainPanelExpanded(true)
                            return
                          }
                          if (canHoverPanel && !isPointerInsideMainPanel) {
                            setIsMainPanelExpanded(false)
                          }
                        }}
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

                    <div className="space-y-1 lg:col-span-2">
                      <Label>计时</Label>
                      <div className="flex h-10 min-w-28 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
                        <Timer className="mr-2 size-4 text-emerald-600" />
                        {formatTime(elapsedSec)}
                      </div>
                    </div>

                    <div className="space-y-1 lg:col-span-2">
                      <Label>错误</Label>
                      <div className="flex h-10 min-w-28 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
                        {mistakes}/{maxMistakes}
                      </div>
                    </div>
                  </div>

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

                  <details className="group rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-700">
                      次级信息
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <div>
                          <p className="text-sm font-medium text-slate-700">冲突高亮</p>
                          <p className="text-xs text-slate-500">显示行列宫重复</p>
                        </div>
                        <Switch checked={conflictHighlight} onCheckedChange={setConflictHighlight} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <div>
                          <p className="text-sm font-medium text-slate-700">自动判错</p>
                          <p className="text-xs text-slate-500">输入即计错</p>
                        </div>
                        <Switch checked={autoCheck} onCheckedChange={setAutoCheck} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <div>
                          <p className="text-sm font-medium text-slate-700">笔记模式</p>
                          <p className="text-xs text-slate-500">N 快捷切换</p>
                        </div>
                        <Badge variant={noteMode ? "default" : "outline"}>{noteMode ? "开启" : "关闭"}</Badge>
                      </div>
                      <div className="truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">Seed: {seed}</div>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-2 py-1.5 text-emerald-800">
                        快捷键：数字输入，N 笔记，H 提示，方向键移动，Backspace/Delete 清空。
                      </div>
                    </div>
                  </details>
                </CardContent>
              </div>
            </div>

            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-emerald-100/90 via-emerald-50/65 to-transparent transition-[opacity,transform] duration-300 ease-out",
                isMainPanelCollapsed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              )}
              aria-hidden={!isMainPanelCollapsed}
            >
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                鼠标悬停以展开
                <ChevronDown className="size-3.5 animate-bounce" />
              </div>
            </div>
          </Card>

          <SudokuBoard />
        </section>

        <aside className="relative hidden lg:block">
          <div className="fixed right-[max(2rem,calc((100vw-80rem)/2))] top-1/2 z-30 w-88 -translate-y-1/2">
            <Card className="border-emerald-100/80 bg-white/90 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
              <CardHeader className="gap-2">
                <CardTitle>操作面板</CardTitle>
                <CardDescription>浮动悬停，滚动时持续可操作</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    noteMode ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"
                  )}
                >
                  笔记模式：<span className="font-semibold">{noteMode ? "开启" : "关闭"}</span>
                </div>
                <NumberPad />
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-20px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden">
        <div className="mx-auto w-full max-w-7xl space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Keyboard className="size-3.5" />
              移动端快捷输入
            </span>
            <span className={cn("font-medium", noteMode ? "text-emerald-700" : "text-slate-600")}>笔记：{noteMode ? "开" : "关"}</span>
          </div>
          <NumberPad compact />
        </div>
      </div>
    </main>
  )
}

export default App
