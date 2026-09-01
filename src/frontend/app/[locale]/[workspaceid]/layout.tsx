"use client"

import { Dashboard } from "@/components/ui/dashboard"
import { ChatbotUIContext } from "@/context/context"
import { ChatDraftContext } from "@/context/chat-draft-context"
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { getModelWorkspacesByWorkspaceId } from "@/db/models"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images"
import { getToolWorkspacesByWorkspaceId } from "@/db/tools"
import { getWorkspaceById } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { LLMID } from "@/types"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ReactNode, useContext, useEffect, useRef, useState } from "react"
import Loading from "../loading"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()

  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceid as string

  const {
    setChatSettings,
    setAssistants,
    setAssistantImages,
    setChats,
    setCollections,
    setFolders,
    setFiles,
    setPresets,
    setPrompts,
    setTools,
    setModels,
    selectedWorkspace,
    setSelectedWorkspace,
    setSelectedChat,
    setChatMessages,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay
  } = useContext(ChatbotUIContext)

  const { setUserInput } = useContext(ChatDraftContext)

  // Keep UI warm across locale remounts when the same workspace is already loaded.
  const [loading, setLoading] = useState(
    () => selectedWorkspace?.id !== workspaceId
  )
  const prevWorkspaceIdRef = useRef<string | null>(
    selectedWorkspace?.id === workspaceId ? workspaceId : null
  )

  useEffect(() => {
    const prev = prevWorkspaceIdRef.current
    const workspaceChanged = prev !== null && prev !== workspaceId
    prevWorkspaceIdRef.current = workspaceId

    // Only wipe in-flight chat attachments when the workspace actually changes —
    // not when [locale] remounts on language switch (same workspaceId).
    if (workspaceChanged) {
      setUserInput("")
      setChatMessages([])
      setSelectedChat(null)

      setIsGenerating(false)
      setFirstTokenReceived(false)

      setChatFiles([])
      setChatImages([])
      setNewMessageFiles([])
      setNewMessageImages([])
      setShowFilesDisplay(false)
    }

    const sameWorkspaceReady =
      !workspaceChanged && selectedWorkspace?.id === workspaceId

    if (sameWorkspaceReady) {
      setLoading(false)
      void fetchWorkspaceData(workspaceId, { quiet: true })
      return
    }

    void fetchWorkspaceData(workspaceId, { quiet: false })
  }, [workspaceId])

  const fetchWorkspaceData = async (
    workspaceId: string,
    opts: { quiet?: boolean } = {}
  ) => {
    if (!opts.quiet) setLoading(true)

    const workspace = await getWorkspaceById(workspaceId)
    setSelectedWorkspace(workspace)

    const assistantData = await getAssistantWorkspacesByWorkspaceId(workspaceId)
    setAssistants(assistantData.assistants)

    // Replace (do not append) so locale remount / quiet refresh cannot duplicate.
    const nextAssistantImages: {
      assistantId: string
      path: string
      base64: string
      url: string
    }[] = []

    for (const assistant of assistantData.assistants) {
      let url = ""

      if (assistant.image_path) {
        url = (await getAssistantImageFromStorage(assistant.image_path)) || ""
      }

      if (url) {
        const response = await fetch(url)
        const blob = await response.blob()
        const base64 = await convertBlobToBase64(blob)

        nextAssistantImages.push({
          assistantId: assistant.id,
          path: assistant.image_path,
          base64,
          url
        })
      } else {
        nextAssistantImages.push({
          assistantId: assistant.id,
          path: assistant.image_path,
          base64: "",
          url
        })
      }
    }
    setAssistantImages(nextAssistantImages)

    const chats = await getChatsByWorkspaceId(workspaceId)
    setChats(chats)

    const collectionData =
      await getCollectionWorkspacesByWorkspaceId(workspaceId)
    setCollections(collectionData.collections)

    const folders = await getFoldersByWorkspaceId(workspaceId)
    setFolders(folders)

    const fileData = await getFileWorkspacesByWorkspaceId(workspaceId)
    setFiles(fileData.files)

    const presetData = await getPresetWorkspacesByWorkspaceId(workspaceId)
    setPresets(presetData.presets)

    const promptData = await getPromptWorkspacesByWorkspaceId(workspaceId)
    setPrompts(promptData.prompts)

    const toolData = await getToolWorkspacesByWorkspaceId(workspaceId)
    setTools(toolData.tools)

    const modelData = await getModelWorkspacesByWorkspaceId(workspaceId)
    setModels(modelData.models)

    // Quiet refresh (e.g. language switch): keep the user's current chat settings.
    if (!opts.quiet) {
      setChatSettings({
        model: (searchParams.get("model") ||
          workspace?.default_model ||
          "gpt-4o") as LLMID,
        prompt:
          workspace?.default_prompt ||
          "You are a friendly, helpful AI assistant.",
        temperature: workspace?.default_temperature || 0.5,
        contextLength: workspace?.default_context_length || 4096,
        includeProfileContext: workspace?.include_profile_context || true,
        includeWorkspaceInstructions:
          workspace?.include_workspace_instructions || true,
        embeddingsProvider:
          (workspace?.embeddings_provider as "openai" | "local") || "openai"
      })
    }

    setLoading(false)
  }

  if (loading) {
    return <Loading />
  }

  return <Dashboard>{children}</Dashboard>
}
