import Loading from "@/app/[locale]/loading"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { CopilotContext } from "@/context/copilot-context"
import { ChatbotUIContext } from "@/context/context"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { getChatFilesByChatId } from "@/db/chat-files"
import { getChatById } from "@/db/chats"
import { getMessageFileItemsByMessageId } from "@/db/message-file-items"
import { getMessagesByChatId } from "@/db/messages"
import { getMessageImageFromStorage } from "@/db/storage/message-images"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLMID, MessageImage } from "@/types"
import { Tables } from "@/supabase/types"
import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightCollapse
} from "@tabler/icons-react"
import { useParams } from "next/navigation"
import { FC, useContext, useEffect, useState } from "react"
import { LanguageSwitcher } from "../utility/language-switcher"
import { ProfileSettings } from "../utility/profile-settings"
import { ChatHelp } from "./chat-help"
import { useScroll } from "./chat-hooks/use-scroll"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { ChatScrollButtons } from "./chat-scroll-buttons"
import { ChatSecondaryButtons } from "./chat-secondary-buttons"
import { ChatSettings } from "./chat-settings"

interface ChatUIProps {}

export const ChatUI: FC<ChatUIProps> = ({}) => {
  useHotkey("o", () => handleNewChat())

  const params = useParams()

  const {
    setChatMessages,
    selectedChat,
    setSelectedChat,
    setChatSettings,
    setChatImages,
    assistants,
    setSelectedAssistant,
    setChatFileItems,
    setChatFiles,
    setShowFilesDisplay,
    setUseRetrieval,
    setSelectedTools
  } = useContext(ChatbotUIContext)

  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  const {
    messagesStartRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
    setIsAtBottom,
    isAtTop,
    isAtBottom,
    isOverflowing,
    scrollToTop
  } = useScroll()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      await fetchMessages()
      await fetchChat()

      scrollToBottom()
      setIsAtBottom(true)
    }

    if (params.chatid) {
      fetchData().then(() => {
        handleFocusChatInput()
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const fetchMessages = async () => {
    const fetchedMessages = await getMessagesByChatId(params.chatid as string)

    const imagePromises: Promise<MessageImage>[] = fetchedMessages.flatMap(
      (message: Tables<"messages">) =>
        message.image_paths
          ? message.image_paths.map(async (imagePath: string) => {
              const url = await getMessageImageFromStorage(imagePath)

              if (url) {
                const response = await fetch(url)
                const blob = await response.blob()
                const base64 = await convertBlobToBase64(blob)

                return {
                  messageId: message.id,
                  path: imagePath,
                  base64,
                  url,
                  file: null
                }
              }

              return {
                messageId: message.id,
                path: imagePath,
                base64: "",
                url,
                file: null
              }
            })
          : []
    )

    const images: MessageImage[] = await Promise.all(imagePromises.flat())
    setChatImages(images)

    const messageFileItemPromises = fetchedMessages.map(
      async (message: Tables<"messages">) =>
        await getMessageFileItemsByMessageId(message.id)
    )

    const messageFileItems = await Promise.all(messageFileItemPromises)

    const uniqueFileItems = messageFileItems.flatMap(item => item.file_items)
    setChatFileItems(uniqueFileItems)

    const chatFiles = await getChatFilesByChatId(params.chatid as string)

    setChatFiles(
      chatFiles.files.map((file: Tables<"files">) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        file: null
      }))
    )

    setUseRetrieval(true)
    setShowFilesDisplay(true)

    const fetchedChatMessages = fetchedMessages.map(
      (message: Tables<"messages">) => {
        return {
          message,
          fileItems: messageFileItems
            .filter(messageFileItem => messageFileItem.id === message.id)
            .flatMap(messageFileItem =>
              messageFileItem.file_items.map(
                (fileItem: Tables<"file_items">) => fileItem.id
              )
            )
        }
      }
    )

    setChatMessages(fetchedChatMessages)
  }

  const fetchChat = async () => {
    const chat = await getChatById(params.chatid as string)
    if (!chat) return

    if (chat.assistant_id) {
      const assistant = assistants.find(
        assistant => assistant.id === chat.assistant_id
      )

      if (assistant) {
        setSelectedAssistant(assistant)

        const assistantTools = (
          await getAssistantToolsByAssistantId(assistant.id)
        ).tools
        setSelectedTools(assistantTools)
      }
    }

    setSelectedChat(chat)
    setChatSettings({
      model: chat.model as LLMID,
      prompt: chat.prompt,
      temperature: chat.temperature,
      contextLength: chat.context_length,
      includeProfileContext: chat.include_profile_context,
      includeWorkspaceInstructions: chat.include_workspace_instructions,
      embeddingsProvider: chat.embeddings_provider as "openai" | "local"
    })
  }

  if (loading) {
    return <Loading />
  }

  const { showCanvas, setShowCanvas } = useContext(CopilotContext)

  return (
    <div className="relative flex h-full flex-col items-center bg-transparent">
      <div className="absolute left-4 top-2.5 z-20 flex justify-center">
        <ChatScrollButtons
          isAtTop={isAtTop}
          isAtBottom={isAtBottom}
          isOverflowing={isOverflowing}
          scrollToTop={scrollToTop}
          scrollToBottom={scrollToBottom}
        />
      </div>

      <div className="flex h-[50px] w-full shrink-0 items-center border-b border-gray-200 bg-gray-50/80 px-4 font-bold backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="flex flex-1 items-center justify-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500/60" />
          <div className="max-w-[200px] truncate text-sm text-gray-700 dark:text-white/70 sm:max-w-[400px]">
            {selectedChat?.name || "Agent Chat"}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ProfileSettings variant="header" defaultTab="keys" />
          <LanguageSwitcher />
          <ChatSettings />
          <ChatSecondaryButtons />
          <button
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-white/30 dark:hover:bg-white/5 dark:hover:text-white/60"
            onClick={() => setShowCanvas(prev => !prev)}
          >
            {showCanvas ? (
              <IconLayoutSidebarRightCollapse size={18} />
            ) : (
              <IconLayoutSidebarRight size={18} />
            )}
          </button>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-auto"
        onScroll={handleScroll}
      >
        <div ref={messagesStartRef} />

        <ChatMessages />

        <div ref={messagesEndRef} />
      </div>

      <div className="relative w-full shrink-0 items-end border-t border-gray-200 bg-gray-50/80 p-3 backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.02]">
        <ChatInput />
      </div>

      <div className="absolute bottom-[76px] right-2 hidden md:block">
        <ChatHelp />
      </div>
    </div>
  )
}
