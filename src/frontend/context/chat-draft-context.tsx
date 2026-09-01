"use client"

/**
 * Chat draft state (input + command pickers) lives in a separate context so
 * keystrokes do not re-render ChatbotUIContext consumers (research modules).
 */

import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useMemo,
  useState
} from "react"

export type ChatDraftContextValue = {
  userInput: string
  setUserInput: Dispatch<SetStateAction<string>>
  isPromptPickerOpen: boolean
  setIsPromptPickerOpen: Dispatch<SetStateAction<boolean>>
  slashCommand: string
  setSlashCommand: Dispatch<SetStateAction<string>>
  isFilePickerOpen: boolean
  setIsFilePickerOpen: Dispatch<SetStateAction<boolean>>
  hashtagCommand: string
  setHashtagCommand: Dispatch<SetStateAction<string>>
  isToolPickerOpen: boolean
  setIsToolPickerOpen: Dispatch<SetStateAction<boolean>>
  toolCommand: string
  setToolCommand: Dispatch<SetStateAction<string>>
  focusPrompt: boolean
  setFocusPrompt: Dispatch<SetStateAction<boolean>>
  focusFile: boolean
  setFocusFile: Dispatch<SetStateAction<boolean>>
  focusTool: boolean
  setFocusTool: Dispatch<SetStateAction<boolean>>
  focusAssistant: boolean
  setFocusAssistant: Dispatch<SetStateAction<boolean>>
  atCommand: string
  setAtCommand: Dispatch<SetStateAction<string>>
  isAssistantPickerOpen: boolean
  setIsAssistantPickerOpen: Dispatch<SetStateAction<boolean>>
}

const noop = (() => {}) as Dispatch<SetStateAction<any>>

export const ChatDraftContext = createContext<ChatDraftContextValue>({
  userInput: "",
  setUserInput: noop,
  isPromptPickerOpen: false,
  setIsPromptPickerOpen: noop,
  slashCommand: "",
  setSlashCommand: noop,
  isFilePickerOpen: false,
  setIsFilePickerOpen: noop,
  hashtagCommand: "",
  setHashtagCommand: noop,
  isToolPickerOpen: false,
  setIsToolPickerOpen: noop,
  toolCommand: "",
  setToolCommand: noop,
  focusPrompt: false,
  setFocusPrompt: noop,
  focusFile: false,
  setFocusFile: noop,
  focusTool: false,
  setFocusTool: noop,
  focusAssistant: false,
  setFocusAssistant: noop,
  atCommand: "",
  setAtCommand: noop,
  isAssistantPickerOpen: false,
  setIsAssistantPickerOpen: noop
})

export const ChatDraftProvider: FC<{ children: ReactNode }> = ({
  children
}) => {
  const [userInput, setUserInput] = useState("")
  const [isPromptPickerOpen, setIsPromptPickerOpen] = useState(false)
  const [slashCommand, setSlashCommand] = useState("")
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false)
  const [hashtagCommand, setHashtagCommand] = useState("")
  const [isToolPickerOpen, setIsToolPickerOpen] = useState(false)
  const [toolCommand, setToolCommand] = useState("")
  const [focusPrompt, setFocusPrompt] = useState(false)
  const [focusFile, setFocusFile] = useState(false)
  const [focusTool, setFocusTool] = useState(false)
  const [focusAssistant, setFocusAssistant] = useState(false)
  const [atCommand, setAtCommand] = useState("")
  const [isAssistantPickerOpen, setIsAssistantPickerOpen] = useState(false)

  const value = useMemo(
    () => ({
      userInput,
      setUserInput,
      isPromptPickerOpen,
      setIsPromptPickerOpen,
      slashCommand,
      setSlashCommand,
      isFilePickerOpen,
      setIsFilePickerOpen,
      hashtagCommand,
      setHashtagCommand,
      isToolPickerOpen,
      setIsToolPickerOpen,
      toolCommand,
      setToolCommand,
      focusPrompt,
      setFocusPrompt,
      focusFile,
      setFocusFile,
      focusTool,
      setFocusTool,
      focusAssistant,
      setFocusAssistant,
      atCommand,
      setAtCommand,
      isAssistantPickerOpen,
      setIsAssistantPickerOpen
    }),
    [
      userInput,
      isPromptPickerOpen,
      slashCommand,
      isFilePickerOpen,
      hashtagCommand,
      isToolPickerOpen,
      toolCommand,
      focusPrompt,
      focusFile,
      focusTool,
      focusAssistant,
      atCommand,
      isAssistantPickerOpen
    ]
  )

  return (
    <ChatDraftContext.Provider value={value}>{children}</ChatDraftContext.Provider>
  )
}
