"use client"

import { ChatUI } from "@/components/chat/chat-ui"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import useHotkey from "@/lib/hooks/use-hotkey"

export default function ChatPage() {
  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  // Always mount ChatUI (empty + active) so ChatInput never remounts on first message
  return <ChatUI />
}
