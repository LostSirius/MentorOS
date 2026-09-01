import { ChatbotUIContext } from "@/context/context"
import { ChatDraftContext } from "@/context/chat-draft-context"
import { getAssistantCollectionsByAssistantId } from "@/db/assistant-collections"
import { getAssistantFilesByAssistantId } from "@/db/assistant-files"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { Tables } from "@/supabase/types"
import { LLMID } from "@/types"
import { useContext } from "react"

export const usePromptAndCommand = () => {
  const {
    chatFiles,
    setNewMessageFiles,
    setShowFilesDisplay,
    setUseRetrieval,
    setSelectedTools,
    setSelectedAssistant,
    setChatSettings,
    setChatFiles
  } = useContext(ChatbotUIContext)

  const {
    userInput,
    setUserInput,
    isPromptPickerOpen,
    setIsPromptPickerOpen,
    setIsFilePickerOpen,
    setSlashCommand,
    setHashtagCommand,
    setToolCommand,
    setIsToolPickerOpen,
    setAtCommand,
    setIsAssistantPickerOpen
  } = useContext(ChatDraftContext)

  const handleInputChange = (value: string) => {
    // Assistants / presets / tools / prompt templates are retired from the UI.
    // Keep #file picker for research document attachment.
    const hashtagTextRegex = /#([^ ]*)$/
    const hashtagMatch = value.match(hashtagTextRegex)

    if (isPromptPickerOpen) setIsPromptPickerOpen(false)
    setIsAssistantPickerOpen(false)
    setIsToolPickerOpen(false)
    setAtCommand("")
    setSlashCommand("")
    setToolCommand("")

    if (hashtagMatch) {
      setIsFilePickerOpen(true)
      setHashtagCommand(hashtagMatch[1])
    } else {
      setIsFilePickerOpen(false)
      setHashtagCommand("")
    }

    setUserInput(value)
  }

  const handleSelectPrompt = (prompt: Tables<"prompts">) => {
    setIsPromptPickerOpen(false)
    setUserInput(userInput.replace(/\/[^ ]*$/, "") + prompt.content)
  }

  const handleSelectUserFile = async (file: Tables<"files">) => {
    setShowFilesDisplay(true)
    setIsFilePickerOpen(false)
    setUseRetrieval(true)

    setNewMessageFiles(prev => {
      const fileAlreadySelected =
        prev.some(prevFile => prevFile.id === file.id) ||
        chatFiles.some(chatFile => chatFile.id === file.id)

      if (!fileAlreadySelected) {
        return [
          ...prev,
          {
            id: file.id,
            name: file.name,
            type: file.type,
            file: null
          }
        ]
      }
      return prev
    })

    setUserInput(userInput.replace(/#[^ ]*$/, ""))
  }

  const handleSelectUserCollection = async (
    collection: Tables<"collections">
  ) => {
    setShowFilesDisplay(true)
    setIsFilePickerOpen(false)
    setUseRetrieval(true)

    const collectionFiles = await getCollectionFilesByCollectionId(
      collection.id
    )

    setNewMessageFiles(prev => {
      const newFiles = collectionFiles.files
        .filter(
          (file: { id: string; name: string; type: string }) =>
            !prev.some(prevFile => prevFile.id === file.id) &&
            !chatFiles.some(chatFile => chatFile.id === file.id)
        )
        .map((file: { id: string; name: string; type: string }) => ({
          id: file.id,
          name: file.name,
          type: file.type,
          file: null
        }))

      return [...prev, ...newFiles]
    })

    setUserInput(userInput.replace(/#[^ ]*$/, ""))
  }

  const handleSelectTool = (tool: Tables<"tools">) => {
    setIsToolPickerOpen(false)
    setUserInput(userInput.replace(/![^ ]*$/, ""))
    setSelectedTools(prev => [...prev, tool])
  }

  const handleSelectAssistant = async (assistant: Tables<"assistants">) => {
    setIsAssistantPickerOpen(false)
    setUserInput(userInput.replace(/@[^ ]*$/, ""))
    setSelectedAssistant(assistant)

    setChatSettings({
      model: assistant.model as LLMID,
      prompt: assistant.prompt,
      temperature: assistant.temperature,
      contextLength: assistant.context_length,
      includeProfileContext: assistant.include_profile_context,
      includeWorkspaceInstructions: assistant.include_workspace_instructions,
      embeddingsProvider: assistant.embeddings_provider as "openai" | "local"
    })

    let allFiles = []

    const assistantFiles = (await getAssistantFilesByAssistantId(assistant.id))
      .files
    allFiles = [...assistantFiles]
    const assistantCollections = (
      await getAssistantCollectionsByAssistantId(assistant.id)
    ).collections
    for (const collection of assistantCollections) {
      const collectionFiles = (
        await getCollectionFilesByCollectionId(collection.id)
      ).files
      allFiles = [...allFiles, ...collectionFiles]
    }
    const assistantTools = (await getAssistantToolsByAssistantId(assistant.id))
      .tools

    setSelectedTools(assistantTools)
    setChatFiles(
      allFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        file: null
      }))
    )
  }

  return {
    handleInputChange,
    handleSelectPrompt,
    handleSelectUserFile,
    handleSelectUserCollection,
    handleSelectTool,
    handleSelectAssistant
  }
}
