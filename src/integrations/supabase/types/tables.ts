export interface ChatHistoryTable {
  Row: {
    id: string
    is_ai: boolean | null
    prompt: string
    response: string | null
    timestamp: string | null
    user_id: string | null
  }
  Insert: {
    id?: string
    is_ai?: boolean | null
    prompt: string
    response?: string | null
    timestamp?: string | null
    user_id?: string | null
  }
  Update: {
    id?: string
    is_ai?: boolean | null
    prompt?: string
    response?: string | null
    timestamp?: string | null
    user_id?: string | null
  }
  Relationships: []
}

export interface DeployedProjectsTable {
  Row: {
    created_at: string | null
    framework: string | null
    id: string
    last_deployment: string | null
    project_url: string | null
    status: string | null
    user_id: string | null
  }
  Insert: {
    created_at?: string | null
    framework?: string | null
    id?: string
    last_deployment?: string | null
    project_url?: string | null
    status?: string | null
    user_id?: string | null
  }
  Update: {
    created_at?: string | null
    framework?: string | null
    id?: string
    last_deployment?: string | null
    project_url?: string | null
    status?: string | null
    user_id?: string | null
  }
  Relationships: []
}

export interface FilesTable {
  Row: {
    content: string | null
    content_type: string | null
    created_at: string
    file_path: string
    filename: string
    id: string
    size: number | null
    user_id: string | null
  }
  Insert: {
    content?: string | null
    content_type?: string | null
    created_at?: string
    file_path: string
    filename: string
    id?: string
    size?: number | null
    user_id?: string | null
  }
  Update: {
    content?: string | null
    content_type?: string | null
    created_at?: string
    file_path?: string
    filename?: string
    id?: string
    size?: number | null
    user_id?: string | null
  }
  Relationships: []
}

export interface ProfilesTable {
  Row: {
    created_at: string
    id: string
    username: string | null
  }
  Insert: {
    created_at?: string
    id: string
    username?: string | null
  }
  Update: {
    created_at?: string
    id?: string
    username?: string | null
  }
  Relationships: []
}
