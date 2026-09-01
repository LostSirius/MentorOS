"use client"

import { CopilotContext } from "@/context/copilot-context"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconUpload,
  IconFileText,
  IconX,
  IconFileTypePdf,
  IconFileTypeCsv,
  IconFileTypeDocx,
  IconJson,
  IconMarkdown
} from "@tabler/icons-react"
import mammoth from "mammoth"
import { FC, useCallback, useContext, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

const MAX_SIZE = 10 * 1024 * 1024

const EXT_READERS: Record<string, (file: File) => Promise<string>> = {
  ".txt": readAsText,
  ".md": readAsText,
  ".markdown": readAsText,
  ".json": readAsText,
  ".csv": readAsText,
  ".docx": readDocx
}

async function readAsText(file: File): Promise<string> {
  return file.text()
}

async function readDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

function getFileIcon(name: string) {
  const ext = name.toLowerCase().slice(name.lastIndexOf("."))
  switch (ext) {
    case ".pdf":
      return IconFileTypePdf
    case ".csv":
      return IconFileTypeCsv
    case ".docx":
      return IconFileTypeDocx
    case ".json":
      return IconJson
    case ".md":
    case ".markdown":
      return IconMarkdown
    default:
      return IconFileText
  }
}

interface FileUploadZoneProps {
  compact?: boolean
  onFileLoaded?: (content: string, fileName: string) => void
}

export const FileUploadZone: FC<FileUploadZoneProps> = ({
  compact = false,
  onFileLoaded
}) => {
  const { t } = useTranslation()
  const {
    uploadedFileContent,
    setUploadedFileContent,
    uploadedFileName,
    setUploadedFileName,
    setCurrentIdea,
    setCanvasMode,
    setDraftContent
  } = useContext(CopilotContext)

  const [isDragging, setIsDragging] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE) {
        toast.error(t("File too large. Maximum 10 MB."))
        return
      }

      const ext = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf("."))
      const reader = EXT_READERS[ext]

      if (!reader) {
        toast.error(
          t("Unsupported file type. Accepted: TXT, MD, JSON, CSV, DOCX")
        )
        return
      }

      setIsReading(true)
      try {
        const content = await reader(file)
        if (!content.trim()) {
          toast.error(t("File is empty."))
          return
        }

        setUploadedFileContent(content)
        setUploadedFileName(file.name)

        const preview =
          content.length > 2000
            ? content.slice(0, 2000) + "\n\n[...truncated]"
            : content
        setCurrentIdea(preview)
        setDraftContent(content)

        onFileLoaded?.(content, file.name)
        toast.success(`${file.name} loaded successfully`)
      } catch (e: any) {
        toast.error("Failed to read file: " + (e?.message || "unknown error"))
      } finally {
        setIsReading(false)
      }
    },
    [setUploadedFileContent, setUploadedFileName, setCurrentIdea, setDraftContent, onFileLoaded, t]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      if (inputRef.current) inputRef.current.value = ""
    },
    [processFile]
  )

  const clearFile = () => {
    setUploadedFileContent("")
    setUploadedFileName("")
    setCurrentIdea("")
  }

  if (uploadedFileName && !compact) {
    const FileIcon = getFileIcon(uploadedFileName)
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
      >
        <FileIcon size={20} className="shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
            {uploadedFileName}
          </p>
          <p className="text-xs text-gray-500 dark:text-white/40">
            {(uploadedFileContent.length / 1024).toFixed(1)} KB •{" "}
            {uploadedFileContent.split(/\n/).length} lines
          </p>
        </div>
        <button
          onClick={clearFile}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 dark:text-white/40"
        >
          <IconX size={16} />
        </button>
      </motion.div>
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.markdown,.json,.csv,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />
      <motion.div
        onDragOver={e => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
          compact ? "gap-1.5 px-3 py-4" : "gap-2 px-6 py-8"
        } ${
          isDragging
            ? "border-violet-400 bg-violet-500/10"
            : "border-gray-300 bg-gray-50 hover:border-violet-400/50 hover:bg-violet-500/5 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-violet-400/30"
        }`}
      >
        {isReading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <IconUpload
              size={compact ? 18 : 28}
              className="text-violet-400"
            />
          </motion.div>
        ) : (
          <IconUpload
            size={compact ? 18 : 28}
            className={
              isDragging
                ? "text-violet-400"
                : "text-gray-400 dark:text-white/30"
            }
          />
        )}
        <p
          className={`text-center font-medium ${compact ? "text-xs" : "text-sm"} ${
            isDragging
              ? "text-violet-400"
              : "text-gray-500 dark:text-white/50"
          }`}
        >
          {isReading
            ? t("Reading file...")
            : isDragging
              ? t("Drop file here")
              : t("Drop file or click to upload")}
        </p>
        {!compact && (
          <p className="text-xs text-gray-400 dark:text-white/30">
            TXT, MD, JSON, CSV, DOCX — max 10 MB
          </p>
        )}
      </motion.div>
    </div>
  )
}
