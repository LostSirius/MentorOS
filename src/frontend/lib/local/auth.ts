import {
  LOCAL_USER_EMAIL,
  LOCAL_USER_ID
} from "./constants"

export function getLocalUser() {
  return {
    id: LOCAL_USER_ID,
    email: LOCAL_USER_EMAIL,
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString()
  }
}

export function getLocalSession() {
  const user = getLocalUser()
  return {
    access_token: "local-token",
    refresh_token: "local-refresh",
    expires_in: 60 * 60 * 24 * 365,
    token_type: "bearer",
    user
  }
}
