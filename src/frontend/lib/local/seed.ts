import {
  LOCAL_PROFILE_ID,
  LOCAL_USER_ID,
  LOCAL_USERNAME,
  LOCAL_WORKSPACE_ID
} from "./constants"
import type { LocalDatabase } from "./store"

export function ensureSeedData(db: LocalDatabase): LocalDatabase {
  const now = new Date().toISOString()

  if (!db.profiles.some(p => p.user_id === LOCAL_USER_ID)) {
    db.profiles.push({
      id: LOCAL_PROFILE_ID,
      user_id: LOCAL_USER_ID,
      created_at: now,
      updated_at: now,
      bio: "Local single-user profile",
      has_onboarded: true,
      image_url: "",
      image_path: "",
      profile_context: "",
      display_name: "Local User",
      use_azure_openai: false,
      username: LOCAL_USERNAME,
      anthropic_api_key: "",
      azure_openai_35_turbo_id: "",
      azure_openai_45_turbo_id: "",
      azure_openai_45_vision_id: "",
      azure_openai_embeddings_id: "",
      azure_openai_api_key: "",
      azure_openai_endpoint: "",
      google_gemini_api_key: "",
      groq_api_key: "",
      mistral_api_key: "",
      openai_api_key: "",
      openai_organization_id: "",
      openrouter_api_key: "",
      perplexity_api_key: "",
      supervisor_skills_api_key: ""
    })
  } else {
    db.profiles = db.profiles.map(p =>
      p.user_id === LOCAL_USER_ID ? { ...p, has_onboarded: true } : p
    )
  }

  if (!db.workspaces.some(w => w.id === LOCAL_WORKSPACE_ID)) {
    db.workspaces.push({
      id: LOCAL_WORKSPACE_ID,
      user_id: LOCAL_USER_ID,
      created_at: now,
      updated_at: now,
      sharing: "private",
      default_context_length: 16000,
      default_model: "gpt-4o",
      default_prompt: "You are a friendly, helpful AI assistant.",
      default_temperature: 0.5,
      description: "Local home workspace",
      embeddings_provider: "openai",
      include_profile_context: true,
      include_workspace_instructions: true,
      instructions: "",
      is_home: true,
      name: "Home",
      image_path: ""
    })
  } else {
    // Keep local defaults current without wiping user edits to name/instructions
    db.workspaces = db.workspaces.map(w => {
      if (w.id !== LOCAL_WORKSPACE_ID) return w
      const legacy = ["gpt-4-turbo-preview", "gpt-4-1106-preview", "supervisor-skills"]
      if (legacy.includes(w.default_model)) {
        return { ...w, default_model: "gpt-4o", default_context_length: 16000 }
      }
      return w
    })
  }

  return db
}
