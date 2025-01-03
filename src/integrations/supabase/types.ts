export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      chat_history: {
        Row: {
          id: string
          user_id: string | null
          prompt: string
          response: string | null
          timestamp: string | null
          is_ai: boolean | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          prompt: string
          response?: string | null
          timestamp?: string | null
          is_ai?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string | null
          prompt?: string
          response?: string | null
          timestamp?: string | null
          is_ai?: boolean | null
        }
      }
      deployed_projects: {
        Row: {
          id: string
          user_id: string | null
          project_url: string | null
          last_deployment: string | null
          status: string | null
          framework: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          project_url?: string | null
          last_deployment?: string | null
          status?: string | null
          framework?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          project_url?: string | null
          last_deployment?: string | null
          status?: string | null
          framework?: string | null
          created_at?: string | null
        }
      }
      files: {
        Row: {
          id: string
          user_id: string | null
          filename: string
          file_path: string
          content_type: string | null
          size: number | null
          created_at: string
          content: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          filename: string
          file_path: string
          content_type?: string | null
          size?: number | null
          created_at?: string
          content?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          filename?: string
          file_path?: string
          content_type?: string | null
          size?: number | null
          created_at?: string
          content?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type ChatHistoryTable = Tables<'chat_history'>
export type DeployedProjectsTable = Tables<'deployed_projects'>
export type FilesTable = Tables<'files'>
export type ProfilesTable = Tables<'profiles'>
