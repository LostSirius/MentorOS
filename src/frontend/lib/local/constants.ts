/** Fixed single-user local mode identities */
export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001"
export const LOCAL_PROFILE_ID = "00000000-0000-4000-8000-000000000002"
export const LOCAL_WORKSPACE_ID = "00000000-0000-4000-8000-000000000003"
export const LOCAL_USER_EMAIL = "local@localhost"
export const LOCAL_USERNAME = "local"

export const LOCAL_TABLES = [
  "profiles",
  "workspaces",
  "folders",
  "files",
  "file_items",
  "file_workspaces",
  "chats",
  "chat_files",
  "messages",
  "message_file_items",
  "presets",
  "preset_workspaces",
  "prompts",
  "prompt_workspaces",
  "collections",
  "collection_files",
  "collection_workspaces",
  "assistants",
  "assistant_files",
  "assistant_collections",
  "assistant_tools",
  "assistant_workspaces",
  "tools",
  "tool_workspaces",
  "models",
  "model_workspaces"
] as const

export type LocalTable = (typeof LOCAL_TABLES)[number]

/** Many-to-many join maps for nested selects like `assistants (*)` */
export const RELATION_MAP: Record<
  string,
  Record<string, { junction: LocalTable; localKey: string; foreignKey: string; foreignTable: LocalTable }>
> = {
  workspaces: {
    assistants: {
      junction: "assistant_workspaces",
      localKey: "workspace_id",
      foreignKey: "assistant_id",
      foreignTable: "assistants"
    },
    files: {
      junction: "file_workspaces",
      localKey: "workspace_id",
      foreignKey: "file_id",
      foreignTable: "files"
    },
    collections: {
      junction: "collection_workspaces",
      localKey: "workspace_id",
      foreignKey: "collection_id",
      foreignTable: "collections"
    },
    prompts: {
      junction: "prompt_workspaces",
      localKey: "workspace_id",
      foreignKey: "prompt_id",
      foreignTable: "prompts"
    },
    presets: {
      junction: "preset_workspaces",
      localKey: "workspace_id",
      foreignKey: "preset_id",
      foreignTable: "presets"
    },
    tools: {
      junction: "tool_workspaces",
      localKey: "workspace_id",
      foreignKey: "tool_id",
      foreignTable: "tools"
    },
    models: {
      junction: "model_workspaces",
      localKey: "workspace_id",
      foreignKey: "model_id",
      foreignTable: "models"
    }
  },
  assistants: {
    workspaces: {
      junction: "assistant_workspaces",
      localKey: "assistant_id",
      foreignKey: "workspace_id",
      foreignTable: "workspaces"
    },
    files: {
      junction: "assistant_files",
      localKey: "assistant_id",
      foreignKey: "file_id",
      foreignTable: "files"
    },
    collections: {
      junction: "assistant_collections",
      localKey: "assistant_id",
      foreignKey: "collection_id",
      foreignTable: "collections"
    },
    tools: {
      junction: "assistant_tools",
      localKey: "assistant_id",
      foreignKey: "tool_id",
      foreignTable: "tools"
    }
  },
  files: {
    workspaces: {
      junction: "file_workspaces",
      localKey: "file_id",
      foreignKey: "workspace_id",
      foreignTable: "workspaces"
    }
  },
  collections: {
    workspaces: {
      junction: "collection_workspaces",
      localKey: "collection_id",
      foreignKey: "workspace_id",
      foreignTable: "workspaces"
    },
    files: {
      junction: "collection_files",
      localKey: "collection_id",
      foreignKey: "file_id",
      foreignTable: "files"
    }
  },
  prompts: {
    workspaces: {
      junction: "prompt_workspaces",
      localKey: "prompt_id",
      foreignKey: "workspace_id",
      foreignTable: "workspaces"
    }
  },
  presets: {
    workspaces: {
      junction: "preset_workspaces",
      localKey: "preset_id",
      foreignKey: "workspace_id",
      foreignTable: "workspaces"
    }
  },
  tools: {
    workspaces: {
      junction: "tool_workspaces",
      localKey: "tool_id",
      foreignKey: "workspace_id",
      foreignTable: "workspaces"
    }
  },
  models: {
    workspaces: {
      junction: "model_workspaces",
      localKey: "model_id",
      foreignKey: "workspace_id",
      foreignTable: "workspaces"
    }
  },
  chats: {
    files: {
      junction: "chat_files",
      localKey: "chat_id",
      foreignKey: "file_id",
      foreignTable: "files"
    }
  },
  messages: {
    file_items: {
      junction: "message_file_items",
      localKey: "message_id",
      foreignKey: "file_item_id",
      foreignTable: "file_items"
    }
  }
}
