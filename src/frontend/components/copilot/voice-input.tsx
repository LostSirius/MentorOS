"use client"

import { CopilotContext } from "@/context/copilot-context"
import { ChatDraftContext } from "@/context/chat-draft-context"
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconX,
  IconKeyboard
} from "@tabler/icons-react"
import { FC, useCallback, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const WAVEFORM_BARS = 24

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

interface SpeechRecognitionType {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType
    webkitSpeechRecognition: new () => SpeechRecognitionType
  }
}

function getSpeechRecognition(): (new () => SpeechRecognitionType) | null {
  if (typeof window === "undefined") return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export const VoiceInputButton: FC = () => {
  const { isVoiceActive, setIsVoiceActive, voiceBullets, setVoiceBullets } =
    useContext(CopilotContext)
  const { setUserInput } = useContext(ChatDraftContext)

  const [waveformData, setWaveformData] = useState<number[]>(
    Array(WAVEFORM_BARS).fill(0)
  )
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentPhrase, setCurrentPhrase] = useState("")
  const [manualInput, setManualInput] = useState("")
  const [useManualMode, setUseManualMode] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionType | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const interimRef = useRef("")
  const isVoiceActiveRef = useRef(isVoiceActive)

  useEffect(() => {
    isVoiceActiveRef.current = isVoiceActive
  }, [isVoiceActive])

  const hasSpeechApi = !!getSpeechRecognition()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll()
    }
  }, [])

  const stopAll = useCallback(() => {
    setIsVoiceActive(false)
    setCurrentPhrase("")
    interimRef.current = ""

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close()
      } catch {
        // ignore
      }
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    analyserRef.current = null
    setWaveformData(Array(WAVEFORM_BARS).fill(0))
  }, [setIsVoiceActive])

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    const bars = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const idx = Math.floor((i / WAVEFORM_BARS) * dataArray.length)
      return dataArray[idx] / 255
    })

    setWaveformData(bars)
    animFrameRef.current = requestAnimationFrame(animateWaveform)
  }, [])

  const startAudioCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      animFrameRef.current = requestAnimationFrame(animateWaveform)
    } catch (err: any) {
      toast.error("Microphone access denied. Please allow microphone permissions.")
      setIsVoiceActive(false)
    }
  }, [animateWaveform, setIsVoiceActive])

  const startRecognition = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognition()
    if (!SpeechRecognitionCtor) {
      toast.error("Speech recognition is not supported in this browser.")
      setIsVoiceActive(false)
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results
      let interim = ""
      let final = ""

      for (let i = 0; i < results.length; i++) {
        const transcript = results[i][0].transcript
        if (results[i].isFinal) {
          final += transcript + " "
        } else {
          interim += transcript
        }
      }

      if (final.trim()) {
        setVoiceBullets(prev => [...prev, final.trim()])
        // Clear interim after final result since continuous mode keeps accumulating
        interimRef.current = ""
        setCurrentPhrase("")
      }

      if (interim.trim()) {
        interimRef.current = interim
        setCurrentPhrase(interim)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        // ignore, just keep listening
        return
      }
      if (event.error === "aborted") {
        return
      }
      toast.error(`Speech recognition error: ${event.error}`)
      stopAll()
    }

    recognition.onend = () => {
      // If still supposed to be active, restart (continuous mode can still stop on some browsers)
      if (isVoiceActiveRef.current) {
        try {
          recognition.start()
        } catch {
          // already started or stopped
        }
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (err: any) {
      toast.error("Failed to start speech recognition: " + err.message)
      setIsVoiceActive(false)
    }
  }, [setVoiceBullets, stopAll, setIsVoiceActive])

  const toggleVoice = async () => {
    if (isVoiceActive) {
      stopAll()
    } else {
      setIsVoiceActive(true)
      setIsExpanded(true)
      if (!useManualMode && hasSpeechApi) {
        await startAudioCapture()
        startRecognition()
      }
    }
  }

  const sendToChat = (text: string) => {
    setUserInput(text)
  }

  const addManualBullet = () => {
    const trimmed = manualInput.trim()
    if (!trimmed) return
    setVoiceBullets(prev => [...prev, trimmed])
    setManualInput("")
  }

  return (
    <div className="relative">
      <button
        className={`flex size-[30px] items-center justify-center rounded p-1 transition-colors ${
          isVoiceActive
            ? "bg-rose-500 text-white"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/70"
        }`}
        onClick={toggleVoice}
        title={isVoiceActive ? "Stop voice capture" : "Start voice capture"}
      >
        {isVoiceActive ? (
          <IconMicrophoneOff size={18} />
        ) : (
          <IconMicrophone size={18} />
        )}
      </button>

      {isExpanded ? (
        <div className="absolute bottom-full right-0 z-50 mb-3 w-80 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#111118]/95">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`size-2 rounded-full ${isVoiceActive ? "animate-pulse bg-rose-500" : "bg-gray-300 dark:bg-white/30"}`}
                />
                <span className="text-xs font-medium text-gray-700 dark:text-white/80">
                  {isVoiceActive
                    ? useManualMode
                      ? "Manual Input"
                      : "Listening — Live"
                    : "Voice Capture Paused"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {hasSpeechApi && (
                  <button
                    type="button"
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                    onClick={() => {
                      setUseManualMode(!useManualMode)
                      if (isVoiceActive && !useManualMode) {
                        stopAll()
                      }
                    }}
                    title={useManualMode ? "Switch to voice" : "Switch to keyboard"}
                  >
                    <IconKeyboard size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => {
                    stopAll()
                    setIsExpanded(false)
                  }}
                >
                  <IconX size={14} />
                </button>
              </div>
            </div>

            {!hasSpeechApi || useManualMode ? (
              <div className="mb-3 space-y-2">
                {!hasSpeechApi && (
                  <p className="text-[10px] text-amber-400/80">
                    Speech recognition not available. Use keyboard input instead.
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-violet-500/30 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:placeholder:text-white/30"
                    placeholder="Type an idea and press Enter..."
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") addManualBullet()
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-violet-500/20 px-3 py-2 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/30"
                    onClick={addManualBullet}
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <>
                {isVoiceActive && (
                  <div className="mb-3 flex h-12 items-end justify-center gap-[2px] rounded-lg bg-gray-100 px-3 py-2 dark:bg-white/5">
                    {waveformData.map((value, i) => (
                      <div
                        key={i}
                        className="w-[4px] rounded-full bg-gradient-to-t from-violet-500 to-cyan-400"
                        style={{
                          minHeight: "2px",
                          height: `${Math.max(4, value * 100)}%`
                        }}
                      />
                    ))}
                  </div>
                )}

                {currentPhrase && (
                  <div className="mb-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2">
                    <span className="text-xs text-gray-600 dark:text-white/70">
                      {currentPhrase}
                    </span>
                    <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-violet-400" />
                  </div>
                )}
              </>
            )}

            <div className="max-h-36 space-y-1.5 overflow-y-auto">
              {voiceBullets.map((bullet, index) => (
                <div
                  key={`${index}-${bullet.slice(0, 24)}`}
                  className="group flex items-start gap-2 rounded-md px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan-400" />
                  <span className="flex-1 text-[11px] leading-relaxed text-gray-600 dark:text-white/60">
                    {bullet}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-gray-400 opacity-0 transition-all hover:bg-violet-500/20 hover:text-violet-600 group-hover:opacity-100 dark:text-white/30 dark:hover:text-violet-300"
                    onClick={() => sendToChat(bullet)}
                  >
                    Send
                  </button>
                </div>
              ))}
            </div>

            {voiceBullets.length > 0 && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-violet-500/20 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/30"
                  onClick={() => sendToChat(voiceBullets.join("\n• "))}
                >
                  Send All
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:bg-white/5 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/60"
                  onClick={() => setVoiceBullets([])}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
      ) : null}
    </div>
  )
}
