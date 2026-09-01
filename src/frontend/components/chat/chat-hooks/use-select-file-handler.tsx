import { ChatbotUIContext } from "@/context/context"
import { createDocXFile, createFile } from "@/db/files"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import mammoth from "mammoth"
import { useContext, useEffect, useState } from "react"
import { toast } from "sonner"

export const ACCEPTED_FILE_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/json",
  "text/markdown",
  "application/pdf",
  "text/plain"
].join(",")

const ACCEPTED_EXTENSIONS = [
  ".csv",
  ".docx",
  ".json",
  ".md",
  ".markdown",
  ".pdf",
  ".txt"
]

function isAcceptedFile(file: File): boolean {
  if (file.type && ACCEPTED_FILE_TYPES.split(",").includes(file.type)) {
    return true
  }
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
  return ACCEPTED_EXTENSIONS.includes(ext)
}

const EXT_TYPE_MAP: Record<string, string> = {
  ".csv": "csv",
  ".docx": "vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".json": "json",
  ".md": "markdown",
  ".markdown": "markdown",
  ".pdf": "pdf",
  ".txt": "plain"
}

function resolveFileType(file: File): string {
  const dotIdx = file.name.lastIndexOf(".")
  if (dotIdx !== -1) {
    const ext = file.name.toLowerCase().slice(dotIdx)
    if (EXT_TYPE_MAP[ext]) return EXT_TYPE_MAP[ext]
  }
  if (file.type && file.type !== "application/octet-stream") {
    return file.type.split("/")[1]
  }
  return "plain"
}

function isPdfFile(file: File, simplifiedFileType: string): boolean {
  return (
    simplifiedFileType === "pdf" ||
    file.type.includes("pdf") ||
    file.name.toLowerCase().endsWith(".pdf")
  )
}

function isDocxFile(file: File, simplifiedFileType: string): boolean {
  return (
    simplifiedFileType.includes(
      "vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) ||
    simplifiedFileType.includes("docx") ||
    file.type.includes(
      "vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) ||
    file.type.includes("docx") ||
    file.name.toLowerCase().endsWith(".docx")
  )
}

export const useSelectFileHandler = () => {
  const {
    selectedWorkspace,
    profile,
    chatSettings,
    setNewMessageImages,
    setNewMessageFiles,
    setShowFilesDisplay,
    setFiles,
    setUseRetrieval
  } = useContext(ChatbotUIContext)

  const [filesToAccept, setFilesToAccept] = useState(ACCEPTED_FILE_TYPES)

  useEffect(() => {
    handleFilesToAccept()
  }, [chatSettings?.model])

  const handleFilesToAccept = () => {
    const model = chatSettings?.model
    const FULL_MODEL = LLM_LIST.find(llm => llm.modelId === model)

    if (!FULL_MODEL) return

    setFilesToAccept(
      FULL_MODEL.imageInput
        ? `${ACCEPTED_FILE_TYPES},image/*`
        : ACCEPTED_FILE_TYPES
    )
  }

  const handleSelectDeviceFile = async (file: File) => {
    if (!file) return

    if (!profile) {
      toast.error("Profile not ready. Please wait a moment and try again.")
      return
    }
    if (!selectedWorkspace) {
      toast.error("Workspace not ready. Open a workspace before uploading.")
      return
    }
    if (!chatSettings) {
      toast.error("Chat settings not ready. Please wait a moment and try again.")
      return
    }

    setShowFilesDisplay(true)
    setUseRetrieval(true)

    let simplifiedFileType = resolveFileType(file)
    const reader = new FileReader()

    if (file.type.includes("image")) {
      reader.readAsDataURL(file)
    } else if (isAcceptedFile(file)) {
      if (simplifiedFileType.includes("vnd.adobe.pdf")) {
        simplifiedFileType = "pdf"
      } else if (isDocxFile(file, simplifiedFileType)) {
        simplifiedFileType = "docx"
      }

      const loadingId = `loading-${crypto.randomUUID()}`

      setNewMessageFiles(prev => [
        ...prev,
        {
          id: loadingId,
          name: file.name,
          type: simplifiedFileType,
          file: file
        }
      ])

      if (isDocxFile(file, simplifiedFileType)) {
        try {
          const arrayBuffer = await file.arrayBuffer()
          const result = await mammoth.extractRawText({
            arrayBuffer
          })

          const createdFile = await createDocXFile(
            result.value,
            file,
            {
              user_id: profile.user_id,
              description: "",
              file_path: "",
              name: file.name,
              size: file.size,
              tokens: 0,
              type: simplifiedFileType
            },
            selectedWorkspace.id,
            chatSettings.embeddingsProvider
          )

          setFiles(prev => [...prev, createdFile])

          setNewMessageFiles(prev =>
            prev.map(item =>
              item.id === loadingId
                ? {
                    id: createdFile.id,
                    name: createdFile.name,
                    type: createdFile.type,
                    file: file
                  }
                : item
            )
          )
        } catch (error: any) {
          toast.error("Failed to upload. " + (error?.message || String(error)), {
            duration: 10000
          })
          setNewMessageFiles(prev => {
            const next = prev.filter(f => f.id !== loadingId)
            if (next.length === 0) setShowFilesDisplay(false)
            return next
          })
        }
        return
      }

      if (isPdfFile(file, simplifiedFileType)) {
        reader.readAsArrayBuffer(file)
      } else {
        reader.readAsText(file)
      }

      reader.onloadend = async function () {
        try {
          const createdFile = await createFile(
            file,
            {
              user_id: profile.user_id,
              description: "",
              file_path: "",
              name: file.name,
              size: file.size,
              tokens: 0,
              type: simplifiedFileType
            },
            selectedWorkspace.id,
            chatSettings.embeddingsProvider
          )

          setFiles(prev => [...prev, createdFile])

          setNewMessageFiles(prev =>
            prev.map(item =>
              item.id === loadingId
                ? {
                    id: createdFile.id,
                    name: createdFile.name,
                    type: createdFile.type,
                    file: file
                  }
                : item
            )
          )
        } catch (error: any) {
          toast.error("Failed to upload. " + (error?.message || String(error)), {
            duration: 10000
          })
          setNewMessageFiles(prev => prev.filter(f => f.id !== loadingId))
        }
      }

      reader.onerror = () => {
        toast.error("Failed to read file from disk.")
        setNewMessageFiles(prev => prev.filter(f => f.id !== loadingId))
      }
      return
    } else {
      setShowFilesDisplay(false)
      setUseRetrieval(false)
      toast.error(
        `Unsupported file type: ${file.type || file.name.split(".").pop()}. Accepted: CSV, DOCX, JSON, Markdown, PDF, TXT, and images.`
      )
      return
    }

    // Images
    reader.onloadend = async function () {
      try {
        const imageUrl = URL.createObjectURL(file)
        setNewMessageImages(prev => [
          ...prev,
          {
            messageId: "temp",
            path: "",
            base64: reader.result,
            url: imageUrl,
            file
          }
        ])
      } catch (error: any) {
        toast.error("Failed to upload. " + (error?.message || String(error)), {
          duration: 10000
        })
        setNewMessageImages(prev =>
          prev.filter(img => img.messageId !== "temp")
        )
      }
    }

    reader.onerror = () => {
      toast.error("Failed to read image from disk.")
    }
  }

  return {
    handleSelectDeviceFile,
    filesToAccept
  }
}
