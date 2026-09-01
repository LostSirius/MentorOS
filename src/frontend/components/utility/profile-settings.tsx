import { ChatbotUIContext } from "@/context/context"
import {
  PROFILE_CONTEXT_MAX,
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_USERNAME_MAX,
  PROFILE_USERNAME_MIN
} from "@/db/limits"
import { updateProfile } from "@/db/profile"
import { uploadProfileImage } from "@/db/storage/profile-images"
import { exportLocalStorageAsJSON } from "@/lib/export-old-data"
import { fetchOpenRouterModels } from "@/lib/models/fetch-models"
import { LLM_LIST_MAP } from "@/lib/models/llm/llm-list"
import { supabase } from "@/lib/supabase/browser-client"
import { OpenRouterLLM } from "@/types"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconFileDownload,
  IconKey,
  IconLoader2,
  IconLogout,
  IconSettings,
  IconUser
} from "@tabler/icons-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FC, useCallback, useContext, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"
import { Button } from "../ui/button"
import ImagePicker from "../ui/image-picker"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { LimitDisplay } from "../ui/limit-display"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "../ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { ThemeSwitcher } from "./theme-switcher"

interface ProfileSettingsProps {
  /** icon = ghost user button; nav = labeled API entry for module rail; header = compact chat header */
  variant?: "icon" | "nav" | "header"
  /** Open on this tab when the sheet mounts open */
  defaultTab?: "profile" | "keys"
}

export const ProfileSettings: FC<ProfileSettingsProps> = ({
  variant = "icon",
  defaultTab = "profile"
}) => {
  const { t } = useTranslation()
  const {
    profile,
    setProfile,
    envKeyMap,
    setAvailableHostedModels,
    setAvailableOpenRouterModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const router = useRouter()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [showMoreProviders, setShowMoreProviders] = useState(false)
  const [showAzureAdvanced, setShowAzureAdvanced] = useState(false)

  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [username, setUsername] = useState(profile?.username || "")
  const [usernameAvailable, setUsernameAvailable] = useState(true)
  const [loadingUsername, setLoadingUsername] = useState(false)
  const [profileImageSrc, setProfileImageSrc] = useState(
    profile?.image_url || ""
  )
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileInstructions, setProfileInstructions] = useState(
    profile?.profile_context || ""
  )

  const [useAzureOpenai, setUseAzureOpenai] = useState(
    profile?.use_azure_openai
  )
  const [openaiAPIKey, setOpenaiAPIKey] = useState(
    profile?.openai_api_key || ""
  )
  const [openaiOrgID, setOpenaiOrgID] = useState(
    profile?.openai_organization_id || ""
  )
  const [azureOpenaiAPIKey, setAzureOpenaiAPIKey] = useState(
    profile?.azure_openai_api_key || ""
  )
  const [azureOpenaiEndpoint, setAzureOpenaiEndpoint] = useState(
    profile?.azure_openai_endpoint || ""
  )
  const [azureOpenai35TurboID, setAzureOpenai35TurboID] = useState(
    profile?.azure_openai_35_turbo_id || ""
  )
  const [azureOpenai45TurboID, setAzureOpenai45TurboID] = useState(
    profile?.azure_openai_45_turbo_id || ""
  )
  const [azureOpenai45VisionID, setAzureOpenai45VisionID] = useState(
    profile?.azure_openai_45_vision_id || ""
  )
  const [azureEmbeddingsID, setAzureEmbeddingsID] = useState(
    profile?.azure_openai_embeddings_id || ""
  )
  const [anthropicAPIKey, setAnthropicAPIKey] = useState(
    profile?.anthropic_api_key || ""
  )
  const [googleGeminiAPIKey, setGoogleGeminiAPIKey] = useState(
    profile?.google_gemini_api_key || ""
  )
  const [mistralAPIKey, setMistralAPIKey] = useState(
    profile?.mistral_api_key || ""
  )
  const [groqAPIKey, setGroqAPIKey] = useState(profile?.groq_api_key || "")
  const [perplexityAPIKey, setPerplexityAPIKey] = useState(
    profile?.perplexity_api_key || ""
  )

  const [openrouterAPIKey, setOpenrouterAPIKey] = useState(
    profile?.openrouter_api_key || ""
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
    return
  }

  const handleSave = async () => {
    if (!profile) return
    let profileImageUrl = profile.image_url
    let profileImagePath = ""

    if (profileImageFile) {
      const { path, url } = await uploadProfileImage(profile, profileImageFile)
      profileImageUrl = url ?? profileImageUrl
      profileImagePath = path
    }

    const updatedProfile = await updateProfile(profile.id, {
      ...profile,
      display_name: displayName,
      username,
      profile_context: profileInstructions,
      image_url: profileImageUrl,
      image_path: profileImagePath,
      openai_api_key: openaiAPIKey,
      openai_organization_id: openaiOrgID,
      anthropic_api_key: anthropicAPIKey,
      google_gemini_api_key: googleGeminiAPIKey,
      mistral_api_key: mistralAPIKey,
      groq_api_key: groqAPIKey,
      perplexity_api_key: perplexityAPIKey,
      use_azure_openai: useAzureOpenai,
      azure_openai_api_key: azureOpenaiAPIKey,
      azure_openai_endpoint: azureOpenaiEndpoint,
      azure_openai_35_turbo_id: azureOpenai35TurboID,
      azure_openai_45_turbo_id: azureOpenai45TurboID,
      azure_openai_45_vision_id: azureOpenai45VisionID,
      azure_openai_embeddings_id: azureEmbeddingsID,
      openrouter_api_key: openrouterAPIKey
    })

    setProfile(updatedProfile)

    toast.success(t("research.settings.saved"))

    const providers = [
      "openai",
      "google",
      "azure",
      "anthropic",
      "mistral",
      "groq",
      "perplexity",
      "openrouter"
    ]

    providers.forEach(async provider => {
      let providerKey: keyof typeof profile

      if (provider === "google") {
        providerKey = "google_gemini_api_key"
      } else if (provider === "azure") {
        providerKey = "azure_openai_api_key"
      } else {
        providerKey = `${provider}_api_key` as keyof typeof profile
      }

      const models = LLM_LIST_MAP[provider]
      const envKeyActive = envKeyMap[provider]

      if (!envKeyActive) {
        const hasApiKey = !!updatedProfile[providerKey]

        if (provider === "openrouter") {
          if (hasApiKey && availableOpenRouterModels.length === 0) {
            const openrouterModels: OpenRouterLLM[] =
              await fetchOpenRouterModels()
            setAvailableOpenRouterModels(prev => {
              const newModels = openrouterModels.filter(
                model =>
                  !prev.some(prevModel => prevModel.modelId === model.modelId)
              )
              return [...prev, ...newModels]
            })
          } else {
            setAvailableOpenRouterModels([])
          }
        } else {
          if (hasApiKey && Array.isArray(models)) {
            setAvailableHostedModels(prev => {
              const newModels = models.filter(
                model =>
                  !prev.some(prevModel => prevModel.modelId === model.modelId)
              )
              return [...prev, ...newModels]
            })
          } else if (!hasApiKey && Array.isArray(models)) {
            setAvailableHostedModels(prev =>
              prev.filter(model => !models.includes(model))
            )
          }
        }
      }
    })

    setIsOpen(false)
  }

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout | null

    return (...args: any[]) => {
      const later = () => {
        if (timeout) clearTimeout(timeout)
        func(...args)
      }

      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const checkUsernameAvailability = useCallback(
    debounce(async (username: string) => {
      if (!username) return

      if (username.length < PROFILE_USERNAME_MIN) {
        setUsernameAvailable(false)
        return
      }

      if (username.length > PROFILE_USERNAME_MAX) {
        setUsernameAvailable(false)
        return
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/
      if (!usernameRegex.test(username)) {
        setUsernameAvailable(false)
        toast.error(
          "Username must be letters, numbers, or underscores only - no other characters or spacing allowed."
        )
        return
      }

      setLoadingUsername(true)

      const response = await fetch(`/api/username/available`, {
        method: "POST",
        body: JSON.stringify({ username })
      })

      const data = await response.json()
      const isAvailable = data.isAvailable

      setUsernameAvailable(isAvailable)

      if (username === profile?.username) {
        setUsernameAvailable(true)
      }

      setLoadingUsername(false)
    }, 500),
    []
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  const settingsLabel = t("research.nav.settings")
  const apiKeysLabel = t("research.settings.tabKeys")

  const trigger =
    variant === "nav" ? (
      <button
        type="button"
        title={settingsLabel}
        className="flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center text-gray-600 transition hover:bg-gray-100 dark:text-white/65 dark:hover:bg-white/[0.06]"
      >
        <IconSettings size={22} stroke={1.5} />
        <span className="text-[10px] font-medium leading-tight">
          {settingsLabel}
        </span>
      </button>
    ) : variant === "header" ? (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        title={apiKeysLabel}
        className="size-8 text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80"
      >
        <IconKey size={16} stroke={1.6} />
      </Button>
    ) : profile?.image_url ? (
      <Image
        className="mt-2 size-[34px] cursor-pointer rounded hover:opacity-50"
        src={profile.image_url + "?" + new Date().getTime()}
        height={34}
        width={34}
        alt={"Image"}
      />
    ) : (
      <Button size="icon" variant="ghost" title={settingsLabel}>
        <IconUser size={SIDEBAR_ICON_SIZE} />
      </Button>
    )

  const renderKeyInput = (
    label: string,
    envFlag: unknown,
    value: string,
    onChange: (v: string) => void,
    placeholder?: string,
    inputType: "password" | "text" = "password"
  ) => {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label>{label}</Label>
          {envFlag ? (
            <span className="rounded-md bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:text-teal-300">
              {t("research.settings.envDefault")}
            </span>
          ) : null}
        </div>
        <Input
          placeholder={
            envFlag
              ? t("research.settings.envOverridePlaceholder")
              : placeholder || label
          }
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="off"
        />
        {envFlag ? (
          <p className="text-[11px] text-stone-500 dark:text-white/40">
            {t("research.settings.envOverrideHint")}
          </p>
        ) : null}
      </div>
    )
  }

  if (!profile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="flex flex-col" side="left">
          <SheetHeader>
            <SheetTitle>{t("research.settings.title")}</SheetTitle>
          </SheetHeader>
          <p className="mt-4 text-sm text-stone-600 dark:text-white/70">
            {t("research.settings.noProfile")}
          </p>
          <p className="mt-3 text-xs text-stone-400">
            {t("research.settings.figuresHint")}
          </p>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent
        className="flex w-full flex-col justify-between sm:max-w-md"
        side="left"
        onKeyDown={handleKeyDown}
      >
        <div className="grow overflow-auto pr-1">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between gap-2">
              <span>{t("research.settings.title")}</span>
              <Button
                tabIndex={-1}
                className="text-xs"
                size="sm"
                variant="ghost"
                onClick={handleSignOut}
              >
                <IconLogout className="mr-1" size={16} />
                Logout
              </Button>
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue={defaultTab}>
            <TabsList className="mt-4 grid w-full grid-cols-2">
              <TabsTrigger value="keys">
                {t("research.settings.tabKeys")}
              </TabsTrigger>
              <TabsTrigger value="profile">
                {t("research.settings.tabAccount")}
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4 space-y-4" value="keys">
              <div className="rounded-xl border border-teal-600/20 bg-teal-500/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-stone-700 dark:border-teal-400/20 dark:bg-teal-400/5 dark:text-white/70">
                <p>{t("research.settings.keysIntro")}</p>
                <p className="mt-1.5 text-stone-500 dark:text-white/45">
                  {t("research.settings.keysEnvHint")}
                </p>
                <p className="mt-1 text-stone-500 dark:text-white/45">
                  {t("research.settings.figuresHint")}
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  {t("research.settings.primaryProviders")}
                </div>
                {renderKeyInput(
                  "Google Gemini API Key",
                  envKeyMap["google"],
                  googleGeminiAPIKey,
                  setGoogleGeminiAPIKey
                )}
                {renderKeyInput(
                  "OpenAI API Key",
                  envKeyMap["openai"] && !useAzureOpenai,
                  openaiAPIKey,
                  setOpenaiAPIKey
                )}
                {renderKeyInput(
                  "Anthropic API Key",
                  envKeyMap["anthropic"],
                  anthropicAPIKey,
                  setAnthropicAPIKey
                )}
                {renderKeyInput(
                  "OpenRouter API Key",
                  envKeyMap["openrouter"],
                  openrouterAPIKey,
                  setOpenrouterAPIKey
                )}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  className="text-[12px] font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                  onClick={() => setShowMoreProviders(v => !v)}
                >
                  {showMoreProviders ? "− " : "+ "}
                  {t("research.settings.moreProviders")}
                </button>
                {showMoreProviders ? (
                  <div className="space-y-3 rounded-xl border border-stone-200/80 p-3 dark:border-white/10">
                    {renderKeyInput(
                      "Mistral API Key",
                      envKeyMap["mistral"],
                      mistralAPIKey,
                      setMistralAPIKey
                    )}
                    {renderKeyInput(
                      "Groq API Key",
                      envKeyMap["groq"],
                      groqAPIKey,
                      setGroqAPIKey
                    )}
                    {renderKeyInput(
                      "Perplexity API Key",
                      envKeyMap["perplexity"],
                      perplexityAPIKey,
                      setPerplexityAPIKey
                    )}
                    {renderKeyInput(
                      "OpenAI Organization ID (optional)",
                      envKeyMap["openai_organization_id"] && !useAzureOpenai,
                      openaiOrgID,
                      setOpenaiOrgID,
                      "org-..."
                    )}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  className="text-[12px] font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                  onClick={() => setShowAzureAdvanced(v => !v)}
                >
                  {showAzureAdvanced ? "− " : "+ "}
                  {t("research.settings.azureAdvanced")}
                </button>
                {showAzureAdvanced ? (
                  <div className="space-y-3 rounded-xl border border-stone-200/80 p-3 dark:border-white/10">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      onClick={() => setUseAzureOpenai(!useAzureOpenai)}
                    >
                      {useAzureOpenai
                        ? "Switch to standard OpenAI"
                        : "Switch to Azure OpenAI"}
                    </Button>
                    {useAzureOpenai ? (
                      <>
                        {renderKeyInput(
                          "Azure OpenAI API Key",
                          envKeyMap["azure"],
                          azureOpenaiAPIKey,
                          setAzureOpenaiAPIKey
                        )}
                        {renderKeyInput(
                          "Azure Endpoint",
                          envKeyMap["azure_openai_endpoint"],
                          azureOpenaiEndpoint,
                          setAzureOpenaiEndpoint,
                          "https://your-endpoint.openai.azure.com",
                          "text"
                        )}
                        {renderKeyInput(
                          "GPT-3.5 Turbo deployment",
                          envKeyMap["azure_gpt_35_turbo_name"],
                          azureOpenai35TurboID,
                          setAzureOpenai35TurboID,
                          undefined,
                          "text"
                        )}
                        {renderKeyInput(
                          "GPT-4 Turbo deployment",
                          envKeyMap["azure_gpt_45_turbo_name"],
                          azureOpenai45TurboID,
                          setAzureOpenai45TurboID,
                          undefined,
                          "text"
                        )}
                        {renderKeyInput(
                          "GPT-4 Vision deployment",
                          envKeyMap["azure_gpt_45_vision_name"],
                          azureOpenai45VisionID,
                          setAzureOpenai45VisionID,
                          undefined,
                          "text"
                        )}
                        {renderKeyInput(
                          "Embeddings deployment",
                          envKeyMap["azure_embeddings_name"],
                          azureEmbeddingsID,
                          setAzureEmbeddingsID,
                          undefined,
                          "text"
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-stone-500">
                        Azure mode is off. Turn it on to enter endpoint and
                        deployment names.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent className="mt-4 space-y-4" value="profile">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Label>Username</Label>
                  <div className="text-xs">
                    {username !== profile.username ? (
                      usernameAvailable ? (
                        <div className="text-green-500">AVAILABLE</div>
                      ) : (
                        <div className="text-red-500">UNAVAILABLE</div>
                      )
                    ) : null}
                  </div>
                </div>
                <div className="relative">
                  <Input
                    className="pr-10"
                    placeholder="Username..."
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value)
                      checkUsernameAvailability(e.target.value)
                    }}
                    minLength={PROFILE_USERNAME_MIN}
                    maxLength={PROFILE_USERNAME_MAX}
                  />
                  {username !== profile.username ? (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {loadingUsername ? (
                        <IconLoader2 className="animate-spin" />
                      ) : usernameAvailable ? (
                        <IconCircleCheckFilled className="text-green-500" />
                      ) : (
                        <IconCircleXFilled className="text-red-500" />
                      )}
                    </div>
                  ) : null}
                </div>
                <LimitDisplay
                  used={username.length}
                  limit={PROFILE_USERNAME_MAX}
                />
              </div>

              <div className="space-y-1">
                <Label>Profile Image</Label>
                <ImagePicker
                  src={profileImageSrc}
                  image={profileImageFile}
                  height={50}
                  width={50}
                  onSrcChange={setProfileImageSrc}
                  onImageChange={setProfileImageFile}
                />
              </div>

              <div className="space-y-1">
                <Label>Display Name</Label>
                <Input
                  placeholder="Display name..."
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={PROFILE_DISPLAY_NAME_MAX}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">
                  Optional context for the assistant
                </Label>
                <TextareaAutosize
                  value={profileInstructions}
                  onValueChange={setProfileInstructions}
                  placeholder="What should the AI know about you? (optional)"
                  minRows={4}
                  maxRows={8}
                />
                <LimitDisplay
                  used={profileInstructions.length}
                  limit={PROFILE_CONTEXT_MAX}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-4 flex items-center border-t border-stone-200 pt-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <WithTooltip
              display={
                <div>Download local MentorOS data as JSON.</div>
              }
              trigger={
                <IconFileDownload
                  className="cursor-pointer text-stone-500 hover:opacity-70"
                  size={22}
                  onClick={exportLocalStorageAsJSON}
                />
              }
            />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              {t("research.settings.cancel")}
            </Button>
            <Button ref={buttonRef} onClick={handleSave}>
              {t("research.settings.save")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
