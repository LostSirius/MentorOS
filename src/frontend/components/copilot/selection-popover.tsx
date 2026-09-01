"use client"

import { motion } from "framer-motion"
import {
  IconMessageChatbot,
  IconPencilPlus,
  IconBookmark
} from "@tabler/icons-react"
import { FC, useContext } from "react"
import { ChatDraftContext } from "@/context/chat-draft-context"

interface SelectionPopoverProps {
  x: number
  y: number
  selectedText: string
  onClose: () => void
}

const ACTIONS = [
  {
    id: "ask",
    label: "Ask Supervisor",
    icon: IconMessageChatbot,
    color: "from-violet-500 to-purple-600",
    hoverBg: "hover:bg-violet-500/20"
  },
  {
    id: "improve",
    label: "Improve Tone",
    icon: IconPencilPlus,
    color: "from-cyan-500 to-blue-600",
    hoverBg: "hover:bg-cyan-500/20"
  },
  {
    id: "cite",
    label: "Find Citations",
    icon: IconBookmark,
    color: "from-amber-500 to-orange-600",
    hoverBg: "hover:bg-amber-500/20"
  }
]

export const SelectionPopover: FC<SelectionPopoverProps> = ({
  x,
  y,
  selectedText,
  onClose
}) => {
  const { setUserInput } = useContext(ChatDraftContext)

  const handleAction = (actionId: string) => {
    // Silent procedure triggers — skill names never shown to the user
    const prefix =
      actionId === "ask"
        ? "scientific feedback / peer review outline for this excerpt: "
        : actionId === "improve"
          ? "paper polish — improve the academic tone of: "
          : "literature review — find relevant citations for: "

    setUserInput(`${prefix}"${selectedText}"`)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="absolute z-50 flex items-center gap-1 rounded-xl border border-gray-200 bg-white/90 px-2 py-1.5 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-black/80"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -100%)"
      }}
    >
      {ACTIONS.map((action, index) => {
        const Icon = action.icon
        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors dark:text-white/80 ${action.hoverBg}`}
            onClick={() => handleAction(action.id)}
          >
            <Icon size={14} />
            <span>{action.label}</span>
          </motion.button>
        )
      })}

      <div
        className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-gray-200 bg-white/90 dark:border-white/15 dark:bg-black/80"
        style={{ backdropFilter: "blur(20px)" }}
      />
    </motion.div>
  )
}
