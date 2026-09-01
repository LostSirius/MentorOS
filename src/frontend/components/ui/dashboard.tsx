"use client"

import { Button } from "@/components/ui/button"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { IconMessage } from "@tabler/icons-react"
import { FC, useContext, useState } from "react"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"
import { CommandK } from "../utility/command-k"
import { CopilotContext } from "@/context/copilot-context"
import { ModuleWorkspace } from "../research/module-workspace"

export const SIDEBAR_WIDTH = 300

interface DashboardProps {
  children: React.ReactNode
}

export const Dashboard: FC<DashboardProps> = ({ children }) => {
  const { setShowCanvas } = useContext(CopilotContext)
  const [showChat, setShowChat] = useState(true)

  useHotkey("e", () => setShowChat(prev => !prev))

  const { handleSelectDeviceFile } = useSelectFileHandler()
  const [isDragging, setIsDragging] = useState(false)

  const onFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = event.dataTransfer.files
    const file = files[0]
    if (file) handleSelectDeviceFile(file)
    setIsDragging(false)
  }

  return (
    <div className="relative flex size-full overflow-hidden bg-stone-50 dark:bg-[#0a0a0f]">
      <CommandK />

      {/* Research modules + active module page */}
      <div className="relative z-10 flex min-w-0 flex-1 overflow-hidden">
        <ModuleWorkspace />
      </div>

      {/* Chat panel — CSS width toggle; keep children mounted to avoid insertBefore races */}
      <div
        className={cn(
          "relative z-10 flex h-full shrink-0 flex-col overflow-hidden border-l border-stone-200 bg-white transition-[width] duration-300 ease-out dark:border-white/[0.06] dark:bg-white/[0.01]",
          showChat
            ? "w-[min(420px,42vw)]"
            : "pointer-events-none w-0 border-l-0"
        )}
        onDrop={onFileDrop}
        onDragOver={e => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
      >
        <div
          className={cn(
            "relative flex h-full min-h-0 min-w-[360px] flex-1 flex-col",
            !showChat && "invisible"
          )}
        >
          {/* Keep chat mounted — overlay only (avoids insertBefore on remount) */}
          <div
            className={
              isDragging
                ? "absolute inset-0 z-20 flex items-center justify-center bg-white/90 text-stone-400 dark:bg-[#0a0a0f]/90"
                : "hidden"
            }
          >
            Drop file into chat
          </div>
          {children}
        </div>
      </div>

      {/* Toggle chat — sit left of the chat panel when open so it never covers the input */}
      <Button
        className={cn(
          "absolute bottom-4 z-30 size-10 rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm dark:border-white/10 dark:bg-[#14141a] dark:text-white/70"
        )}
        style={{
          right: showChat ? "calc(min(420px, 42vw) + 1rem)" : "1rem"
        }}
        variant="ghost"
        size="icon"
        title={showChat ? "Hide chat" : "Show chat"}
        onClick={() => {
          setShowChat(v => !v)
          setShowCanvas(true)
        }}
      >
        <IconMessage size={18} />
      </Button>
    </div>
  )
}
