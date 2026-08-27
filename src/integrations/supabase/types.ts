export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_score_history: {
        Row: {
          clickup_score: number
          collaboration_score: number
          communication_score: number
          consistency_score: number
          created_at: string
          employee_id: string
          github_score: number
          id: string
          innovation_score: number
          jira_score: number
          leadership_score: number
          learning_score: number
          organization_id: string
          overall_score: number
          period_month: string
          productivity_score: number
          quality_score: number
          risk_flags: Json
          workload_score: number
        }
        Insert: {
          clickup_score?: number
          collaboration_score?: number
          communication_score?: number
          consistency_score?: number
          created_at?: string
          employee_id: string
          github_score?: number
          id?: string
          innovation_score?: number
          jira_score?: number
          leadership_score?: number
          learning_score?: number
          organization_id: string
          overall_score?: number
          period_month: string
          productivity_score?: number
          quality_score?: number
          risk_flags?: Json
          workload_score?: number
        }
        Update: {
          clickup_score?: number
          collaboration_score?: number
          communication_score?: number
          consistency_score?: number
          created_at?: string
          employee_id?: string
          github_score?: number
          id?: string
          innovation_score?: number
          jira_score?: number
          leadership_score?: number
          learning_score?: number
          organization_id?: string
          overall_score?: number
          period_month?: string
          productivity_score?: number
          quality_score?: number
          risk_flags?: Json
          workload_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_score_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_score_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_scoring_settings: {
        Row: {
          created_at: string
          organization_id: string
          rules: Json
          thresholds: Json
          updated_at: string
          updated_by: string | null
          weights: Json
        }
        Insert: {
          created_at?: string
          organization_id: string
          rules?: Json
          thresholds?: Json
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Update: {
          created_at?: string
          organization_id?: string
          rules?: Json
          thresholds?: Json
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_scoring_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          encrypted_value: string
          id: string
          label: string | null
          last_used_at: string | null
          organization_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          encrypted_value: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          organization_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          encrypted_value?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          organization_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          hours_worked: number
          id: string
          is_remote: boolean
          notes: string | null
          organization_id: string
          status: string
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          hours_worked?: number
          id?: string
          is_remote?: boolean
          notes?: string | null
          organization_id: string
          status?: string
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          hours_worked?: number
          id?: string
          is_remote?: boolean
          notes?: string | null
          organization_id?: string
          status?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_attachments: {
        Row: {
          attachment_created_at: string | null
          attachment_id: string
          created_at: string
          extension: string | null
          id: string
          kind: string
          mime_type: string | null
          organization_id: string
          size_bytes: number
          task_id: string
          thumbnail_url: string | null
          title: string | null
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          attachment_created_at?: string | null
          attachment_id: string
          created_at?: string
          extension?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          organization_id: string
          size_bytes?: number
          task_id: string
          thumbnail_url?: string | null
          title?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          attachment_created_at?: string | null
          attachment_id?: string
          created_at?: string
          extension?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number
          task_id?: string
          thumbnail_url?: string | null
          title?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clickup_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "clickup_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_checklist_items: {
        Row: {
          assignee_name: string | null
          checklist_id: string
          created_at: string
          id: string
          item_id: string
          name: string
          organization_id: string
          resolved: boolean
        }
        Insert: {
          assignee_name?: string | null
          checklist_id: string
          created_at?: string
          id?: string
          item_id: string
          name: string
          organization_id: string
          resolved?: boolean
        }
        Update: {
          assignee_name?: string | null
          checklist_id?: string
          created_at?: string
          id?: string
          item_id?: string
          name?: string
          organization_id?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "clickup_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "clickup_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_checklists: {
        Row: {
          checklist_id: string
          created_at: string
          id: string
          item_count: number
          name: string
          organization_id: string
          resolved_count: number
          task_id: string
          updated_at: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          id?: string
          item_count?: number
          name: string
          organization_id: string
          resolved_count?: number
          task_id: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          id?: string
          item_count?: number
          name?: string
          organization_id?: string
          resolved_count?: number
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "clickup_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_connections: {
        Row: {
          access_token_ciphertext: string
          auto_sync: boolean
          connected_by: string | null
          connected_user_email: string | null
          connected_user_name: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          last_sync_status:
            | Database["public"]["Enums"]["clickup_sync_status"]
            | null
          organization_id: string
          refresh_token_ciphertext: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
          workspace_avatar: string | null
          workspace_color: string | null
          workspace_id: string
          workspace_name: string
        }
        Insert: {
          access_token_ciphertext: string
          auto_sync?: boolean
          connected_by?: string | null
          connected_user_email?: string | null
          connected_user_name?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?:
            | Database["public"]["Enums"]["clickup_sync_status"]
            | null
          organization_id: string
          refresh_token_ciphertext?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          workspace_avatar?: string | null
          workspace_color?: string | null
          workspace_id: string
          workspace_name: string
        }
        Update: {
          access_token_ciphertext?: string
          auto_sync?: boolean
          connected_by?: string | null
          connected_user_email?: string | null
          connected_user_name?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?:
            | Database["public"]["Enums"]["clickup_sync_status"]
            | null
          organization_id?: string
          refresh_token_ciphertext?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          workspace_avatar?: string | null
          workspace_color?: string | null
          workspace_id?: string
          workspace_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_folders: {
        Row: {
          archived: boolean
          created_at: string
          folder_id: string
          hidden: boolean
          id: string
          name: string
          organization_id: string
          space_id: string | null
          task_count: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          folder_id: string
          hidden?: boolean
          id?: string
          name: string
          organization_id: string
          space_id?: string | null
          task_count?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          folder_id?: string
          hidden?: boolean
          id?: string
          name?: string
          organization_id?: string
          space_id?: string | null
          task_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_folders_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "clickup_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_lists: {
        Row: {
          archived: boolean
          content: string | null
          created_at: string
          due_date: string | null
          folder_id: string | null
          id: string
          list_id: string
          name: string
          organization_id: string
          space_id: string | null
          start_date: string | null
          status: string | null
          task_count: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          content?: string | null
          created_at?: string
          due_date?: string | null
          folder_id?: string | null
          id?: string
          list_id: string
          name: string
          organization_id: string
          space_id?: string | null
          start_date?: string | null
          status?: string | null
          task_count?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          content?: string | null
          created_at?: string
          due_date?: string | null
          folder_id?: string | null
          id?: string
          list_id?: string
          name?: string
          organization_id?: string
          space_id?: string | null
          start_date?: string | null
          status?: string | null
          task_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_lists_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "clickup_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_lists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "clickup_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_members: {
        Row: {
          active: boolean
          color: string | null
          connection_id: string | null
          created_at: string
          email: string | null
          id: string
          invited_by: string | null
          linked_employee_id: string | null
          member_id: string
          organization_id: string
          profile_picture: string | null
          role: string | null
          role_key: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          active?: boolean
          color?: string | null
          connection_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invited_by?: string | null
          linked_employee_id?: string | null
          member_id: string
          organization_id: string
          profile_picture?: string | null
          role?: string | null
          role_key?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          active?: boolean
          color?: string | null
          connection_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invited_by?: string | null
          linked_employee_id?: string | null
          member_id?: string
          organization_id?: string
          profile_picture?: string | null
          role?: string | null
          role_key?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clickup_members_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "clickup_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_members_linked_employee_id_fkey"
            columns: ["linked_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          organization_id: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          organization_id: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          organization_id?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      clickup_spaces: {
        Row: {
          archived: boolean
          avatar: string | null
          color: string | null
          connection_id: string
          created_at: string
          description: string | null
          id: string
          last_synced_at: string | null
          name: string
          organization_id: string
          private: boolean
          space_created_at: string | null
          space_id: string
          statuses: Json
          updated_at: string
        }
        Insert: {
          archived?: boolean
          avatar?: string | null
          color?: string | null
          connection_id: string
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          organization_id: string
          private?: boolean
          space_created_at?: string | null
          space_id: string
          statuses?: Json
          updated_at?: string
        }
        Update: {
          archived?: boolean
          avatar?: string | null
          color?: string | null
          connection_id?: string
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          private?: boolean
          space_created_at?: string | null
          space_id?: string
          statuses?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_spaces_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "clickup_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_spaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_sync_logs: {
        Row: {
          api_calls: number
          connection_id: string | null
          created_at: string
          duration_ms: number | null
          finished_at: string | null
          id: string
          kind: Database["public"]["Enums"]["clickup_sync_kind"]
          message: string | null
          organization_id: string
          started_at: string
          stats: Json
          status: Database["public"]["Enums"]["clickup_sync_status"]
          triggered_by: string | null
        }
        Insert: {
          api_calls?: number
          connection_id?: string | null
          created_at?: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["clickup_sync_kind"]
          message?: string | null
          organization_id: string
          started_at?: string
          stats?: Json
          status: Database["public"]["Enums"]["clickup_sync_status"]
          triggered_by?: string | null
        }
        Update: {
          api_calls?: number
          connection_id?: string | null
          created_at?: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["clickup_sync_kind"]
          message?: string | null
          organization_id?: string
          started_at?: string
          stats?: Json
          status?: Database["public"]["Enums"]["clickup_sync_status"]
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clickup_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "clickup_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_task_comments: {
        Row: {
          author_member_id: string | null
          author_name: string | null
          body: string | null
          comment_created_at: string | null
          comment_id: string
          comment_updated_at: string | null
          created_at: string
          id: string
          organization_id: string
          resolved: boolean
          task_id: string
        }
        Insert: {
          author_member_id?: string | null
          author_name?: string | null
          body?: string | null
          comment_created_at?: string | null
          comment_id: string
          comment_updated_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          resolved?: boolean
          task_id: string
        }
        Update: {
          author_member_id?: string | null
          author_name?: string | null
          body?: string | null
          comment_created_at?: string | null
          comment_id?: string
          comment_updated_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          resolved?: boolean
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_task_comments_author_member_id_fkey"
            columns: ["author_member_id"]
            isOneToOne: false
            referencedRelation: "clickup_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_task_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "clickup_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_tasks: {
        Row: {
          archived: boolean
          assignees: Json
          comment_count: number
          completed_at: string | null
          created_at: string
          creator_member_id: string | null
          creator_name: string | null
          custom_id: string | null
          description: string | null
          due_date: string | null
          folder_id: string | null
          id: string
          list_id: string | null
          name: string
          organization_id: string
          parent_task_id: string | null
          primary_assignee_id: string | null
          primary_assignee_name: string | null
          priority: string | null
          priority_order: number | null
          space_id: string | null
          start_date: string | null
          status: string | null
          status_type: string | null
          tags: Json
          task_created_at: string | null
          task_id: string
          task_state: Database["public"]["Enums"]["clickup_task_state"]
          task_updated_at: string | null
          time_estimate_ms: number
          time_spent_ms: number
          updated_at: string
          url: string | null
          watchers: Json
        }
        Insert: {
          archived?: boolean
          assignees?: Json
          comment_count?: number
          completed_at?: string | null
          created_at?: string
          creator_member_id?: string | null
          creator_name?: string | null
          custom_id?: string | null
          description?: string | null
          due_date?: string | null
          folder_id?: string | null
          id?: string
          list_id?: string | null
          name: string
          organization_id: string
          parent_task_id?: string | null
          primary_assignee_id?: string | null
          primary_assignee_name?: string | null
          priority?: string | null
          priority_order?: number | null
          space_id?: string | null
          start_date?: string | null
          status?: string | null
          status_type?: string | null
          tags?: Json
          task_created_at?: string | null
          task_id: string
          task_state?: Database["public"]["Enums"]["clickup_task_state"]
          task_updated_at?: string | null
          time_estimate_ms?: number
          time_spent_ms?: number
          updated_at?: string
          url?: string | null
          watchers?: Json
        }
        Update: {
          archived?: boolean
          assignees?: Json
          comment_count?: number
          completed_at?: string | null
          created_at?: string
          creator_member_id?: string | null
          creator_name?: string | null
          custom_id?: string | null
          description?: string | null
          due_date?: string | null
          folder_id?: string | null
          id?: string
          list_id?: string | null
          name?: string
          organization_id?: string
          parent_task_id?: string | null
          primary_assignee_id?: string | null
          primary_assignee_name?: string | null
          priority?: string | null
          priority_order?: number | null
          space_id?: string | null
          start_date?: string | null
          status?: string | null
          status_type?: string | null
          tags?: Json
          task_created_at?: string | null
          task_id?: string
          task_state?: Database["public"]["Enums"]["clickup_task_state"]
          task_updated_at?: string | null
          time_estimate_ms?: number
          time_spent_ms?: number
          updated_at?: string
          url?: string | null
          watchers?: Json
        }
        Relationships: [
          {
            foreignKeyName: "clickup_tasks_creator_member_id_fkey"
            columns: ["creator_member_id"]
            isOneToOne: false
            referencedRelation: "clickup_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_tasks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "clickup_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "clickup_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_tasks_primary_assignee_id_fkey"
            columns: ["primary_assignee_id"]
            isOneToOne: false
            referencedRelation: "clickup_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_tasks_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "clickup_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_time_entries: {
        Row: {
          billable: boolean
          created_at: string
          description: string | null
          duration_ms: number
          ended_at: string | null
          entry_id: string
          id: string
          member_id: string | null
          member_name: string | null
          organization_id: string
          started_at: string | null
          task_id: string | null
        }
        Insert: {
          billable?: boolean
          created_at?: string
          description?: string | null
          duration_ms?: number
          ended_at?: string | null
          entry_id: string
          id?: string
          member_id?: string | null
          member_name?: string | null
          organization_id: string
          started_at?: string | null
          task_id?: string | null
        }
        Update: {
          billable?: boolean
          created_at?: string
          description?: string | null
          duration_ms?: number
          ended_at?: string | null
          entry_id?: string
          id?: string
          member_id?: string | null
          member_name?: string | null
          organization_id?: string
          started_at?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clickup_time_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "clickup_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "clickup_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_errors: {
        Row: {
          column_name: string | null
          created_at: string
          error_type: string
          id: string
          import_id: string
          message: string
          organization_id: string
          raw_row: Json | null
          row_number: number
          severity: Database["public"]["Enums"]["data_import_severity"]
        }
        Insert: {
          column_name?: string | null
          created_at?: string
          error_type: string
          id?: string
          import_id: string
          message: string
          organization_id: string
          raw_row?: Json | null
          row_number?: number
          severity?: Database["public"]["Enums"]["data_import_severity"]
        }
        Update: {
          column_name?: string | null
          created_at?: string
          error_type?: string
          id?: string
          import_id?: string
          message?: string
          organization_id?: string
          raw_row?: Json | null
          row_number?: number
          severity?: Database["public"]["Enums"]["data_import_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "data_import_errors_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "data_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_errors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_records: {
        Row: {
          created_at: string
          dataset: Database["public"]["Enums"]["data_import_dataset"]
          external_key: string | null
          id: string
          import_id: string
          organization_id: string
          payload: Json
          row_number: number
        }
        Insert: {
          created_at?: string
          dataset: Database["public"]["Enums"]["data_import_dataset"]
          external_key?: string | null
          id?: string
          import_id: string
          organization_id: string
          payload?: Json
          row_number?: number
        }
        Update: {
          created_at?: string
          dataset?: Database["public"]["Enums"]["data_import_dataset"]
          external_key?: string | null
          id?: string
          import_id?: string
          organization_id?: string
          payload?: Json
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_import_records_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "data_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_imports: {
        Row: {
          column_mapping: Json
          created_at: string
          created_by: string | null
          created_by_name: string | null
          dataset: Database["public"]["Enums"]["data_import_dataset"]
          detected_columns: Json
          duplicate_rows: number
          duration_ms: number | null
          error_count: number
          error_message: string | null
          failed_rows: number
          file_name: string
          file_path: string | null
          file_size: number
          file_type: string | null
          finished_at: string | null
          id: string
          imported_rows: number
          mode: Database["public"]["Enums"]["data_import_mode"]
          options: Json
          organization_id: string
          sheet_name: string | null
          sheet_names: Json
          skipped_rows: number
          started_at: string | null
          status: Database["public"]["Enums"]["data_import_status"]
          total_rows: number
          updated_at: string
          updated_rows: number
          warning_count: number
        }
        Insert: {
          column_mapping?: Json
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          dataset?: Database["public"]["Enums"]["data_import_dataset"]
          detected_columns?: Json
          duplicate_rows?: number
          duration_ms?: number | null
          error_count?: number
          error_message?: string | null
          failed_rows?: number
          file_name: string
          file_path?: string | null
          file_size?: number
          file_type?: string | null
          finished_at?: string | null
          id?: string
          imported_rows?: number
          mode?: Database["public"]["Enums"]["data_import_mode"]
          options?: Json
          organization_id: string
          sheet_name?: string | null
          sheet_names?: Json
          skipped_rows?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["data_import_status"]
          total_rows?: number
          updated_at?: string
          updated_rows?: number
          warning_count?: number
        }
        Update: {
          column_mapping?: Json
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          dataset?: Database["public"]["Enums"]["data_import_dataset"]
          detected_columns?: Json
          duplicate_rows?: number
          duration_ms?: number | null
          error_count?: number
          error_message?: string | null
          failed_rows?: number
          file_name?: string
          file_path?: string | null
          file_size?: number
          file_type?: string | null
          finished_at?: string | null
          id?: string
          imported_rows?: number
          mode?: Database["public"]["Enums"]["data_import_mode"]
          options?: Json
          organization_id?: string
          sheet_name?: string | null
          sheet_names?: Json
          skipped_rows?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["data_import_status"]
          total_rows?: number
          updated_at?: string
          updated_rows?: number
          warning_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          budget: number | null
          color: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_code: string | null
          description: string | null
          email: string | null
          head_user_id: string | null
          icon: string | null
          id: string
          location: string | null
          manager_id: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_code?: string | null
          description?: string | null
          email?: string | null
          head_user_id?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_code?: string | null
          description?: string | null
          email?: string | null
          head_user_id?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certifications: {
        Row: {
          created_at: string
          credential_id: string | null
          employee_id: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          name: string
          organization_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          employee_id: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name: string
          organization_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          employee_id?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_projects: {
        Row: {
          allocation_percent: number | null
          assigned_at: string
          employee_id: string
          id: string
          project_id: string
          role: string | null
        }
        Insert: {
          allocation_percent?: number | null
          assigned_at?: string
          employee_id: string
          id?: string
          project_id: string
          role?: string | null
        }
        Update: {
          allocation_percent?: number | null
          assigned_at?: string
          employee_id?: string
          id?: string
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_projects_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          proficiency: Database["public"]["Enums"]["proficiency_level"]
          skill_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          proficiency?: Database["public"]["Enums"]["proficiency_level"]
          skill_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          proficiency?: Database["public"]["Enums"]["proficiency_level"]
          skill_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          deleted_at: string | null
          department_id: string | null
          designation: string | null
          dob: string | null
          email: string
          employee_code: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          experience_years: number | null
          first_name: string | null
          full_name: string
          id: string
          joining_date: string | null
          last_name: string | null
          location: string | null
          manager_id: string | null
          notes: string | null
          office_location: string | null
          organization_id: string
          phone: string | null
          profile_photo: string | null
          salary: number | null
          salary_band: string | null
          seniority_level: string | null
          status: Database["public"]["Enums"]["employee_status"]
          team_id: string | null
          updated_at: string
          user_id: string | null
          work_location: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          department_id?: string | null
          designation?: string | null
          dob?: string | null
          email: string
          employee_code: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_years?: number | null
          first_name?: string | null
          full_name: string
          id?: string
          joining_date?: string | null
          last_name?: string | null
          location?: string | null
          manager_id?: string | null
          notes?: string | null
          office_location?: string | null
          organization_id: string
          phone?: string | null
          profile_photo?: string | null
          salary?: number | null
          salary_band?: string | null
          seniority_level?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          work_location?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          department_id?: string | null
          designation?: string | null
          dob?: string | null
          email?: string
          employee_code?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_years?: number | null
          first_name?: string | null
          full_name?: string
          id?: string
          joining_date?: string | null
          last_name?: string | null
          location?: string | null
          manager_id?: string | null
          notes?: string | null
          office_location?: string | null
          organization_id?: string
          phone?: string | null
          profile_photo?: string | null
          salary?: number | null
          salary_band?: string | null
          seniority_level?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      github_commits: {
        Row: {
          additions: number
          author_contributor_id: string | null
          author_email: string | null
          author_login: string | null
          branch: string | null
          changed_files: number
          committed_at: string
          created_at: string
          deletions: number
          id: string
          message: string | null
          organization_id: string
          repository_id: string
          sha: string
        }
        Insert: {
          additions?: number
          author_contributor_id?: string | null
          author_email?: string | null
          author_login?: string | null
          branch?: string | null
          changed_files?: number
          committed_at: string
          created_at?: string
          deletions?: number
          id?: string
          message?: string | null
          organization_id: string
          repository_id: string
          sha: string
        }
        Update: {
          additions?: number
          author_contributor_id?: string | null
          author_email?: string | null
          author_login?: string | null
          branch?: string | null
          changed_files?: number
          committed_at?: string
          created_at?: string
          deletions?: number
          id?: string
          message?: string | null
          organization_id?: string
          repository_id?: string
          sha?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_commits_author_contributor_id_fkey"
            columns: ["author_contributor_id"]
            isOneToOne: false
            referencedRelation: "github_contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_commits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_commits_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "github_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      github_connections: {
        Row: {
          access_token_ciphertext: string
          account_type: Database["public"]["Enums"]["github_account_type"]
          auto_sync: boolean
          avatar: string | null
          connected_by: string | null
          created_at: string
          github_account_id: number | null
          github_login: string
          id: string
          last_sync_at: string | null
          last_sync_status:
            | Database["public"]["Enums"]["github_sync_status"]
            | null
          organization_id: string
          refresh_token_ciphertext: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_ciphertext: string
          account_type?: Database["public"]["Enums"]["github_account_type"]
          auto_sync?: boolean
          avatar?: string | null
          connected_by?: string | null
          created_at?: string
          github_account_id?: number | null
          github_login: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?:
            | Database["public"]["Enums"]["github_sync_status"]
            | null
          organization_id: string
          refresh_token_ciphertext?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_ciphertext?: string
          account_type?: Database["public"]["Enums"]["github_account_type"]
          auto_sync?: boolean
          avatar?: string | null
          connected_by?: string | null
          created_at?: string
          github_account_id?: number | null
          github_login?: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?:
            | Database["public"]["Enums"]["github_sync_status"]
            | null
          organization_id?: string
          refresh_token_ciphertext?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      github_contributors: {
        Row: {
          avatar: string | null
          bio: string | null
          company: string | null
          created_at: string
          email: string | null
          followers: number
          following: number
          github_id: number
          id: string
          linked_employee_id: string | null
          location: string | null
          login: string
          name: string | null
          organization_id: string
          public_repos: number
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          followers?: number
          following?: number
          github_id: number
          id?: string
          linked_employee_id?: string | null
          location?: string | null
          login: string
          name?: string | null
          organization_id: string
          public_repos?: number
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          followers?: number
          following?: number
          github_id?: number
          id?: string
          linked_employee_id?: string | null
          location?: string | null
          login?: string
          name?: string | null
          organization_id?: string
          public_repos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_contributors_linked_employee_id_fkey"
            columns: ["linked_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_contributors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      github_issues: {
        Row: {
          assignee_contributor_id: string | null
          assignee_login: string | null
          author_contributor_id: string | null
          author_login: string | null
          body: string | null
          closed_at: string | null
          comment_count: number
          created_at: string
          github_id: number
          id: string
          issue_created_at: string
          labels: Json
          number: number
          organization_id: string
          repository_id: string
          state: Database["public"]["Enums"]["github_issue_state"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_contributor_id?: string | null
          assignee_login?: string | null
          author_contributor_id?: string | null
          author_login?: string | null
          body?: string | null
          closed_at?: string | null
          comment_count?: number
          created_at?: string
          github_id: number
          id?: string
          issue_created_at: string
          labels?: Json
          number: number
          organization_id: string
          repository_id: string
          state?: Database["public"]["Enums"]["github_issue_state"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_contributor_id?: string | null
          assignee_login?: string | null
          author_contributor_id?: string | null
          author_login?: string | null
          body?: string | null
          closed_at?: string | null
          comment_count?: number
          created_at?: string
          github_id?: number
          id?: string
          issue_created_at?: string
          labels?: Json
          number?: number
          organization_id?: string
          repository_id?: string
          state?: Database["public"]["Enums"]["github_issue_state"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_issues_assignee_contributor_id_fkey"
            columns: ["assignee_contributor_id"]
            isOneToOne: false
            referencedRelation: "github_contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_issues_author_contributor_id_fkey"
            columns: ["author_contributor_id"]
            isOneToOne: false
            referencedRelation: "github_contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_issues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_issues_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "github_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      github_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          organization_id: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          organization_id: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          organization_id?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_oauth_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      github_pull_requests: {
        Row: {
          additions: number
          author_contributor_id: string | null
          author_login: string | null
          base_branch: string | null
          body: string | null
          changed_files: number
          closed_at: string | null
          comment_count: number
          created_at: string
          deletions: number
          draft: boolean
          github_id: number
          head_branch: string | null
          id: string
          merged: boolean
          merged_at: string | null
          number: number
          organization_id: string
          pr_created_at: string
          repository_id: string
          review_count: number
          state: Database["public"]["Enums"]["github_pr_state"]
          title: string
          updated_at: string
        }
        Insert: {
          additions?: number
          author_contributor_id?: string | null
          author_login?: string | null
          base_branch?: string | null
          body?: string | null
          changed_files?: number
          closed_at?: string | null
          comment_count?: number
          created_at?: string
          deletions?: number
          draft?: boolean
          github_id: number
          head_branch?: string | null
          id?: string
          merged?: boolean
          merged_at?: string | null
          number: number
          organization_id: string
          pr_created_at: string
          repository_id: string
          review_count?: number
          state?: Database["public"]["Enums"]["github_pr_state"]
          title: string
          updated_at?: string
        }
        Update: {
          additions?: number
          author_contributor_id?: string | null
          author_login?: string | null
          base_branch?: string | null
          body?: string | null
          changed_files?: number
          closed_at?: string | null
          comment_count?: number
          created_at?: string
          deletions?: number
          draft?: boolean
          github_id?: number
          head_branch?: string | null
          id?: string
          merged?: boolean
          merged_at?: string | null
          number?: number
          organization_id?: string
          pr_created_at?: string
          repository_id?: string
          review_count?: number
          state?: Database["public"]["Enums"]["github_pr_state"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_pull_requests_author_contributor_id_fkey"
            columns: ["author_contributor_id"]
            isOneToOne: false
            referencedRelation: "github_contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_pull_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_pull_requests_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "github_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      github_repo_contributors: {
        Row: {
          contributions: number
          contributor_id: string
          created_at: string
          id: string
          organization_id: string
          repository_id: string
        }
        Insert: {
          contributions?: number
          contributor_id: string
          created_at?: string
          id?: string
          organization_id: string
          repository_id: string
        }
        Update: {
          contributions?: number
          contributor_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          repository_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_repo_contributors_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "github_contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_repo_contributors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_repo_contributors_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "github_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      github_repositories: {
        Row: {
          archived: boolean
          connection_id: string
          created_at: string
          default_branch: string | null
          description: string | null
          disabled: boolean
          forks: number
          full_name: string
          github_id: number
          id: string
          language: string | null
          last_synced_at: string | null
          name: string
          open_issues: number
          organization_id: string
          owner: string
          pushed_at: string | null
          repo_created_at: string | null
          size_kb: number
          stars: number
          tracked: boolean
          updated_at: string
          visibility: Database["public"]["Enums"]["github_repo_visibility"]
          watchers: number
        }
        Insert: {
          archived?: boolean
          connection_id: string
          created_at?: string
          default_branch?: string | null
          description?: string | null
          disabled?: boolean
          forks?: number
          full_name: string
          github_id: number
          id?: string
          language?: string | null
          last_synced_at?: string | null
          name: string
          open_issues?: number
          organization_id: string
          owner: string
          pushed_at?: string | null
          repo_created_at?: string | null
          size_kb?: number
          stars?: number
          tracked?: boolean
          updated_at?: string
          visibility?: Database["public"]["Enums"]["github_repo_visibility"]
          watchers?: number
        }
        Update: {
          archived?: boolean
          connection_id?: string
          created_at?: string
          default_branch?: string | null
          description?: string | null
          disabled?: boolean
          forks?: number
          full_name?: string
          github_id?: number
          id?: string
          language?: string | null
          last_synced_at?: string | null
          name?: string
          open_issues?: number
          organization_id?: string
          owner?: string
          pushed_at?: string | null
          repo_created_at?: string | null
          size_kb?: number
          stars?: number
          tracked?: boolean
          updated_at?: string
          visibility?: Database["public"]["Enums"]["github_repo_visibility"]
          watchers?: number
        }
        Relationships: [
          {
            foreignKeyName: "github_repositories_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "github_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_repositories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      github_reviews: {
        Row: {
          body: string | null
          created_at: string
          github_id: number
          id: string
          organization_id: string
          pull_request_id: string
          reviewer_contributor_id: string | null
          reviewer_login: string | null
          state: Database["public"]["Enums"]["github_review_state"]
          submitted_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          github_id: number
          id?: string
          organization_id: string
          pull_request_id: string
          reviewer_contributor_id?: string | null
          reviewer_login?: string | null
          state: Database["public"]["Enums"]["github_review_state"]
          submitted_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          github_id?: number
          id?: string
          organization_id?: string
          pull_request_id?: string
          reviewer_contributor_id?: string | null
          reviewer_login?: string | null
          state?: Database["public"]["Enums"]["github_review_state"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "github_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_reviews_pull_request_id_fkey"
            columns: ["pull_request_id"]
            isOneToOne: false
            referencedRelation: "github_pull_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_reviews_reviewer_contributor_id_fkey"
            columns: ["reviewer_contributor_id"]
            isOneToOne: false
            referencedRelation: "github_contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      github_sync_logs: {
        Row: {
          connection_id: string | null
          created_at: string
          duration_ms: number | null
          finished_at: string | null
          id: string
          kind: Database["public"]["Enums"]["github_sync_kind"]
          message: string | null
          organization_id: string
          repository_id: string | null
          started_at: string
          stats: Json
          status: Database["public"]["Enums"]["github_sync_status"]
          triggered_by: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["github_sync_kind"]
          message?: string | null
          organization_id: string
          repository_id?: string | null
          started_at?: string
          stats?: Json
          status?: Database["public"]["Enums"]["github_sync_status"]
          triggered_by?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["github_sync_kind"]
          message?: string | null
          organization_id?: string
          repository_id?: string | null
          started_at?: string
          stats?: Json
          status?: Database["public"]["Enums"]["github_sync_status"]
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "github_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "github_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_sync_logs_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "github_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_accounts: {
        Row: {
          account_id: string
          active: boolean
          avatar: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          linked_employee_id: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          active?: boolean
          avatar?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          linked_employee_id?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          avatar?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          linked_employee_id?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_accounts_linked_employee_id_fkey"
            columns: ["linked_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_boards: {
        Row: {
          board_type: string | null
          created_at: string
          id: string
          jira_id: number
          name: string
          organization_id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          board_type?: string | null
          created_at?: string
          id?: string
          jira_id: number
          name: string
          organization_id: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          board_type?: string | null
          created_at?: string
          id?: string
          jira_id?: number
          name?: string
          organization_id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_boards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "jira_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_comments: {
        Row: {
          author_account_id: string | null
          author_name: string | null
          body: string | null
          comment_created_at: string
          comment_updated_at: string | null
          created_at: string
          id: string
          issue_id: string
          jira_id: string
          organization_id: string
        }
        Insert: {
          author_account_id?: string | null
          author_name?: string | null
          body?: string | null
          comment_created_at?: string
          comment_updated_at?: string | null
          created_at?: string
          id?: string
          issue_id: string
          jira_id: string
          organization_id: string
        }
        Update: {
          author_account_id?: string | null
          author_name?: string | null
          body?: string | null
          comment_created_at?: string
          comment_updated_at?: string | null
          created_at?: string
          id?: string
          issue_id?: string
          jira_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_comments_author_account_id_fkey"
            columns: ["author_account_id"]
            isOneToOne: false
            referencedRelation: "jira_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "jira_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_connections: {
        Row: {
          access_token_ciphertext: string
          auto_sync: boolean
          avatar: string | null
          cloud_id: string
          connected_by: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          last_sync_status:
            | Database["public"]["Enums"]["jira_sync_status"]
            | null
          organization_id: string
          refresh_token_ciphertext: string | null
          scope: string | null
          site_name: string
          site_url: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_ciphertext: string
          auto_sync?: boolean
          avatar?: string | null
          cloud_id: string
          connected_by?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?:
            | Database["public"]["Enums"]["jira_sync_status"]
            | null
          organization_id: string
          refresh_token_ciphertext?: string | null
          scope?: string | null
          site_name: string
          site_url: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_ciphertext?: string
          auto_sync?: boolean
          avatar?: string | null
          cloud_id?: string
          connected_by?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?:
            | Database["public"]["Enums"]["jira_sync_status"]
            | null
          organization_id?: string
          refresh_token_ciphertext?: string | null
          scope?: string | null
          site_name?: string
          site_url?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_epics: {
        Row: {
          created_at: string
          description: string | null
          epic_key: string
          id: string
          jira_id: string
          name: string
          organization_id: string
          owner_account_id: string | null
          owner_name: string | null
          progress: number
          project_id: string | null
          status: string | null
          status_category: Database["public"]["Enums"]["jira_status_category"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          epic_key: string
          id?: string
          jira_id: string
          name: string
          organization_id: string
          owner_account_id?: string | null
          owner_name?: string | null
          progress?: number
          project_id?: string | null
          status?: string | null
          status_category?: Database["public"]["Enums"]["jira_status_category"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          epic_key?: string
          id?: string
          jira_id?: string
          name?: string
          organization_id?: string
          owner_account_id?: string | null
          owner_name?: string | null
          progress?: number
          project_id?: string | null
          status?: string | null
          status_category?: Database["public"]["Enums"]["jira_status_category"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_epics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_epics_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "jira_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_epics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "jira_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_issues: {
        Row: {
          assignee_account_id: string | null
          assignee_name: string | null
          blocked: boolean
          comment_count: number
          created_at: string
          description: string | null
          epic_id: string | null
          id: string
          issue_created_at: string
          issue_key: string
          issue_kind: Database["public"]["Enums"]["jira_issue_kind"]
          issue_type: string | null
          issue_updated_at: string | null
          jira_id: string
          labels: Json
          organization_id: string
          original_estimate_seconds: number
          parent_key: string | null
          priority: string | null
          project_id: string | null
          remaining_estimate_seconds: number
          reporter_account_id: string | null
          reporter_name: string | null
          resolution: string | null
          resolved_at: string | null
          sprint_id: string | null
          status: string | null
          status_category: Database["public"]["Enums"]["jira_status_category"]
          story_points: number | null
          summary: string
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          assignee_account_id?: string | null
          assignee_name?: string | null
          blocked?: boolean
          comment_count?: number
          created_at?: string
          description?: string | null
          epic_id?: string | null
          id?: string
          issue_created_at?: string
          issue_key: string
          issue_kind?: Database["public"]["Enums"]["jira_issue_kind"]
          issue_type?: string | null
          issue_updated_at?: string | null
          jira_id: string
          labels?: Json
          organization_id: string
          original_estimate_seconds?: number
          parent_key?: string | null
          priority?: string | null
          project_id?: string | null
          remaining_estimate_seconds?: number
          reporter_account_id?: string | null
          reporter_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sprint_id?: string | null
          status?: string | null
          status_category?: Database["public"]["Enums"]["jira_status_category"]
          story_points?: number | null
          summary: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          assignee_account_id?: string | null
          assignee_name?: string | null
          blocked?: boolean
          comment_count?: number
          created_at?: string
          description?: string | null
          epic_id?: string | null
          id?: string
          issue_created_at?: string
          issue_key?: string
          issue_kind?: Database["public"]["Enums"]["jira_issue_kind"]
          issue_type?: string | null
          issue_updated_at?: string | null
          jira_id?: string
          labels?: Json
          organization_id?: string
          original_estimate_seconds?: number
          parent_key?: string | null
          priority?: string | null
          project_id?: string | null
          remaining_estimate_seconds?: number
          reporter_account_id?: string | null
          reporter_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sprint_id?: string | null
          status?: string | null
          status_category?: Database["public"]["Enums"]["jira_status_category"]
          story_points?: number | null
          summary?: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_issues_assignee_account_id_fkey"
            columns: ["assignee_account_id"]
            isOneToOne: false
            referencedRelation: "jira_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issues_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "jira_epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "jira_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issues_reporter_account_id_fkey"
            columns: ["reporter_account_id"]
            isOneToOne: false
            referencedRelation: "jira_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issues_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "jira_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          organization_id: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          organization_id: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          organization_id?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      jira_projects: {
        Row: {
          archived: boolean
          avatar: string | null
          connection_id: string
          created_at: string
          description: string | null
          id: string
          jira_id: string
          last_synced_at: string | null
          lead_account_id: string | null
          lead_name: string | null
          name: string
          organization_id: string
          project_category: string | null
          project_created_at: string | null
          project_key: string
          project_type: string | null
          status: string
          tracked: boolean
          updated_at: string
        }
        Insert: {
          archived?: boolean
          avatar?: string | null
          connection_id: string
          created_at?: string
          description?: string | null
          id?: string
          jira_id: string
          last_synced_at?: string | null
          lead_account_id?: string | null
          lead_name?: string | null
          name: string
          organization_id: string
          project_category?: string | null
          project_created_at?: string | null
          project_key: string
          project_type?: string | null
          status?: string
          tracked?: boolean
          updated_at?: string
        }
        Update: {
          archived?: boolean
          avatar?: string | null
          connection_id?: string
          created_at?: string
          description?: string | null
          id?: string
          jira_id?: string
          last_synced_at?: string | null
          lead_account_id?: string | null
          lead_name?: string | null
          name?: string
          organization_id?: string
          project_category?: string | null
          project_created_at?: string | null
          project_key?: string
          project_type?: string | null
          status?: string
          tracked?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_projects_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_projects_lead_account_id_fkey"
            columns: ["lead_account_id"]
            isOneToOne: false
            referencedRelation: "jira_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_sprints: {
        Row: {
          board_id: string | null
          committed_points: number
          complete_date: string | null
          completed_points: number
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          jira_id: number
          name: string
          organization_id: string
          project_id: string | null
          remaining_points: number
          start_date: string | null
          state: Database["public"]["Enums"]["jira_sprint_state"]
          updated_at: string
        }
        Insert: {
          board_id?: string | null
          committed_points?: number
          complete_date?: string | null
          completed_points?: number
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          jira_id: number
          name: string
          organization_id: string
          project_id?: string | null
          remaining_points?: number
          start_date?: string | null
          state?: Database["public"]["Enums"]["jira_sprint_state"]
          updated_at?: string
        }
        Update: {
          board_id?: string | null
          committed_points?: number
          complete_date?: string | null
          completed_points?: number
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          jira_id?: number
          name?: string
          organization_id?: string
          project_id?: string | null
          remaining_points?: number
          start_date?: string | null
          state?: Database["public"]["Enums"]["jira_sprint_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_sprints_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "jira_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_sprints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "jira_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_sync_logs: {
        Row: {
          connection_id: string | null
          created_at: string
          duration_ms: number | null
          finished_at: string | null
          id: string
          kind: Database["public"]["Enums"]["jira_sync_kind"]
          message: string | null
          organization_id: string
          project_id: string | null
          started_at: string
          stats: Json
          status: Database["public"]["Enums"]["jira_sync_status"]
          triggered_by: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["jira_sync_kind"]
          message?: string | null
          organization_id: string
          project_id?: string | null
          started_at?: string
          stats?: Json
          status: Database["public"]["Enums"]["jira_sync_status"]
          triggered_by?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["jira_sync_kind"]
          message?: string | null
          organization_id?: string
          project_id?: string | null
          started_at?: string
          stats?: Json
          status?: Database["public"]["Enums"]["jira_sync_status"]
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_sync_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "jira_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_worklogs: {
        Row: {
          author_account_id: string | null
          author_name: string | null
          created_at: string
          description: string | null
          id: string
          issue_id: string
          jira_id: string
          organization_id: string
          started_at: string
          time_spent_seconds: number
        }
        Insert: {
          author_account_id?: string | null
          author_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_id: string
          jira_id: string
          organization_id: string
          started_at?: string
          time_spent_seconds?: number
        }
        Update: {
          author_account_id?: string | null
          author_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_id?: string
          jira_id?: string
          organization_id?: string
          started_at?: string
          time_spent_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "jira_worklogs_author_account_id_fkey"
            columns: ["author_account_id"]
            isOneToOne: false
            referencedRelation: "jira_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_worklogs_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "jira_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_worklogs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          category: string
          created_at: string
          entries: Json
          id: string
          organization_id: string
          period_label: string
          period_month: string | null
        }
        Insert: {
          category: string
          created_at?: string
          entries?: Json
          id?: string
          organization_id: string
          period_label: string
          period_month?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          entries?: Json
          id?: string
          organization_id?: string
          period_label?: string
          period_month?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_records: {
        Row: {
          approved_by_employee_id: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          organization_id: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by_employee_id?: string | null
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string
          organization_id: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by_employee_id?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          organization_id?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_records_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          link: string | null
          organization_id: string
          read_at: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          organization_id: string
          read_at?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          organization_id?: string
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          brand_color: string | null
          created_at: string
          logo: string | null
          notification_preferences: Json
          organization_id: string
          theme: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          logo?: string | null
          notification_preferences?: Json
          organization_id: string
          theme?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          logo?: string | null
          notification_preferences?: Json
          organization_id?: string
          theme?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          id: string
          industry: string | null
          logo: string | null
          name: string
          slug: string | null
          status: Database["public"]["Enums"]["org_status"]
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          logo?: string | null
          name: string
          slug?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          logo?: string | null
          name?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          collaboration_rating: number | null
          comments: string | null
          communication_rating: number | null
          created_at: string
          delivery_rating: number | null
          employee_id: string
          id: string
          improvements: string | null
          leadership_rating: number | null
          organization_id: string
          overall_rating: number
          period_end: string | null
          period_label: string
          period_start: string | null
          reviewer_employee_id: string | null
          status: string
          strengths: string | null
          updated_at: string
        }
        Insert: {
          collaboration_rating?: number | null
          comments?: string | null
          communication_rating?: number | null
          created_at?: string
          delivery_rating?: number | null
          employee_id: string
          id?: string
          improvements?: string | null
          leadership_rating?: number | null
          organization_id: string
          overall_rating?: number
          period_end?: string | null
          period_label: string
          period_start?: string | null
          reviewer_employee_id?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
        }
        Update: {
          collaboration_rating?: number | null
          comments?: string | null
          communication_rating?: number | null
          created_at?: string
          delivery_rating?: number | null
          employee_id?: string
          id?: string
          improvements?: string | null
          leadership_rating?: number | null
          organization_id?: string
          overall_rating?: number
          period_end?: string | null
          period_label?: string
          period_start?: string | null
          reviewer_employee_id?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_employee_id_fkey"
            columns: ["reviewer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          key: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key?: string
        }
        Relationships: []
      }
      productivity_history: {
        Row: {
          commits: number
          created_at: string
          employee_id: string
          hours_logged: number
          id: string
          issues_closed: number
          organization_id: string
          period_month: string
          productivity_score: number
          pull_requests: number
          reviews: number
          story_points: number
          tasks_completed: number
        }
        Insert: {
          commits?: number
          created_at?: string
          employee_id: string
          hours_logged?: number
          id?: string
          issues_closed?: number
          organization_id: string
          period_month: string
          productivity_score?: number
          pull_requests?: number
          reviews?: number
          story_points?: number
          tasks_completed?: number
        }
        Update: {
          commits?: number
          created_at?: string
          employee_id?: string
          hours_logged?: number
          id?: string
          issues_closed?: number
          organization_id?: string
          period_month?: string
          productivity_score?: number
          pull_requests?: number
          reviews?: number
          story_points?: number
          tasks_completed?: number
        }
        Relationships: [
          {
            foreignKeyName: "productivity_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productivity_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_proposals: {
        Row: {
          budget: number | null
          client_name: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          industry: string | null
          organization_id: string
          required_skills: Json
          start_date: string | null
          status: string
          suggested_employees: Json
          suggested_team: Json
          summary: string | null
          tech_stack: Json
          timeline_weeks: number | null
          title: string
          updated_at: string
          win_probability: number | null
        }
        Insert: {
          budget?: number | null
          client_name: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          industry?: string | null
          organization_id: string
          required_skills?: Json
          start_date?: string | null
          status?: string
          suggested_employees?: Json
          suggested_team?: Json
          summary?: string | null
          tech_stack?: Json
          timeline_weeks?: number | null
          title: string
          updated_at?: string
          win_probability?: number | null
        }
        Update: {
          budget?: number | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          industry?: string | null
          organization_id?: string
          required_skills?: Json
          start_date?: string | null
          status?: string
          suggested_employees?: Json
          suggested_team?: Json
          summary?: string | null
          tech_stack?: Json
          timeline_weeks?: number | null
          title?: string
          updated_at?: string
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          complexity: string | null
          created_at: string
          deleted_at: string | null
          delivery_status: string | null
          department_id: string | null
          description: string | null
          duration_weeks: number | null
          end_date: string | null
          id: string
          name: string
          organization_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          tech_stack: Json
          updated_at: string
        }
        Insert: {
          budget?: number | null
          complexity?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_status?: string | null
          department_id?: string | null
          description?: string | null
          duration_weeks?: number | null
          end_date?: string | null
          id?: string
          name: string
          organization_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tech_stack?: Json
          updated_at?: string
        }
        Update: {
          budget?: number | null
          complexity?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_status?: string | null
          department_id?: string | null
          description?: string | null
          duration_weeks?: number | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tech_stack?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          approved_by_employee_id: string | null
          created_at: string
          effective_date: string
          employee_id: string
          id: string
          new_designation: string
          new_level: string | null
          new_salary: number | null
          organization_id: string
          previous_designation: string | null
          previous_level: string | null
          previous_salary: number | null
          reason: string | null
          updated_at: string
        }
        Insert: {
          approved_by_employee_id?: string | null
          created_at?: string
          effective_date: string
          employee_id: string
          id?: string
          new_designation: string
          new_level?: string | null
          new_salary?: number | null
          organization_id: string
          previous_designation?: string | null
          previous_level?: string | null
          previous_salary?: number | null
          reason?: string | null
          updated_at?: string
        }
        Update: {
          approved_by_employee_id?: string | null
          created_at?: string
          effective_date?: string
          employee_id?: string
          id?: string
          new_designation?: string
          new_level?: string | null
          new_salary?: number | null
          organization_id?: string
          previous_designation?: string | null
          previous_level?: string | null
          previous_salary?: number | null
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          file_path: string | null
          format: string
          generated_by: string | null
          generated_by_name: string | null
          id: string
          name: string
          organization_id: string
          period_label: string | null
          report_type: string
          status: string
          summary: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          format?: string
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          name: string
          organization_id: string
          period_label?: string | null
          report_type?: string
          status?: string
          summary?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          format?: string
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          name?: string
          organization_id?: string
          period_label?: string | null
          report_type?: string
          status?: string
          summary?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          name: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          name: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          name?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      sessions: {
        Row: {
          ended_at: string | null
          id: string
          ip_address: unknown
          organization_id: string | null
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"]
          created_at: string
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_match_settings: {
        Row: {
          created_at: string
          organization_id: string
          role_templates: Json
          rules: Json
          skill_categories: Json
          updated_at: string
          updated_by: string | null
          weights: Json
        }
        Insert: {
          created_at?: string
          organization_id: string
          role_templates?: Json
          rules?: Json
          skill_categories?: Json
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Update: {
          created_at?: string
          organization_id?: string
          role_templates?: Json
          rules?: Json
          skill_categories?: Json
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "talent_match_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_match_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_messages: {
        Row: {
          client_message_id: string | null
          created_at: string
          id: string
          organization_id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          client_message_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          parts?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          client_message_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "talent_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_recommendations: {
        Row: {
          candidate_count: number
          created_at: string
          id: string
          kind: string
          organization_id: string
          query: string
          requirements: Json
          results: Json
          source_name: string | null
          summary: Json
          top_score: number | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          candidate_count?: number
          created_at?: string
          id?: string
          kind?: string
          organization_id: string
          query: string
          requirements?: Json
          results?: Json
          source_name?: string | null
          summary?: Json
          top_score?: number | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          candidate_count?: number
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          query?: string
          requirements?: Json
          results?: Json
          source_name?: string | null
          summary?: Json
          top_score?: number | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_threads: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          organization_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          organization_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_threads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          deleted_at: string | null
          department_id: string
          description: string | null
          id: string
          lead_user_id: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          department_id: string
          description?: string | null
          id?: string
          lead_user_id?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          department_id?: string
          description?: string | null
          id?: string
          lead_user_id?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          category: string | null
          completed_on: string | null
          course_name: string
          created_at: string
          employee_id: string
          hours: number
          id: string
          organization_id: string
          provider: string | null
          score: number | null
          started_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          completed_on?: string | null
          course_name: string
          created_at?: string
          employee_id: string
          hours?: number
          id?: string
          organization_id: string
          provider?: string | null
          score?: number | null
          started_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          completed_on?: string | null
          course_name?: string
          created_at?: string
          employee_id?: string
          hours?: number
          id?: string
          organization_id?: string
          provider?: string | null
          score?: number | null
          started_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          dashboard_preferences: Json
          language: string | null
          theme: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_preferences?: Json
          language?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_preferences?: Json
          language?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          last_login: string | null
          organization_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          last_login?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_workforce: { Args: { _user_id: string }; Returns: boolean }
      create_organization_and_join: {
        Args: {
          _country?: string
          _currency?: string
          _industry?: string
          _name: string
          _timezone?: string
        }
        Returns: string
      }
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "org_admin"
        | "hr"
        | "engineering_manager"
        | "team_lead"
        | "employee"
        | "recruiter"
      clickup_sync_kind:
        | "manual_full"
        | "manual_incremental"
        | "auto_incremental"
        | "background"
        | "retry"
      clickup_sync_status: "running" | "success" | "partial" | "failed"
      clickup_task_state:
        | "open"
        | "in_progress"
        | "blocked"
        | "done"
        | "cancelled"
        | "unknown"
      data_import_dataset:
        | "employees"
        | "departments"
        | "teams"
        | "projects"
        | "skills"
        | "attendance"
        | "leaves"
        | "payroll"
        | "performance_reviews"
        | "training_records"
        | "assets"
        | "github"
        | "jira"
        | "clickup"
        | "custom"
      data_import_mode:
        | "insert"
        | "update"
        | "upsert"
        | "skip_duplicates"
        | "replace"
        | "dry_run"
      data_import_severity: "error" | "warning"
      data_import_status:
        | "pending"
        | "uploading"
        | "validating"
        | "ready"
        | "importing"
        | "completed"
        | "partial"
        | "failed"
        | "cancelled"
        | "dry_run"
      employee_status: "active" | "on_leave" | "terminated" | "probation"
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "intern"
        | "consultant"
      github_account_type: "user" | "organization"
      github_issue_state: "open" | "closed"
      github_pr_state: "open" | "closed" | "merged"
      github_repo_visibility: "public" | "private" | "internal"
      github_review_state:
        | "approved"
        | "changes_requested"
        | "commented"
        | "dismissed"
        | "pending"
      github_sync_kind:
        | "manual_full"
        | "manual_incremental"
        | "auto_incremental"
        | "background"
      github_sync_status: "running" | "success" | "partial" | "failed"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      jira_issue_kind: "story" | "task" | "bug" | "epic" | "subtask" | "other"
      jira_sprint_state: "future" | "active" | "closed"
      jira_status_category: "todo" | "in_progress" | "done" | "unknown"
      jira_sync_kind:
        | "manual_full"
        | "manual_incremental"
        | "auto_incremental"
        | "background"
      jira_sync_status: "running" | "success" | "partial" | "failed"
      org_status: "active" | "trialing" | "suspended" | "archived"
      proficiency_level: "beginner" | "intermediate" | "advanced" | "expert"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "archived"
      skill_category:
        | "programming"
        | "cloud"
        | "database"
        | "ai"
        | "leadership"
        | "soft_skills"
        | "other"
      subscription_plan: "free" | "starter" | "growth" | "enterprise"
      user_status: "active" | "invited" | "suspended" | "disabled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "org_admin",
        "hr",
        "engineering_manager",
        "team_lead",
        "employee",
        "recruiter",
      ],
      clickup_sync_kind: [
        "manual_full",
        "manual_incremental",
        "auto_incremental",
        "background",
        "retry",
      ],
      clickup_sync_status: ["running", "success", "partial", "failed"],
      clickup_task_state: [
        "open",
        "in_progress",
        "blocked",
        "done",
        "cancelled",
        "unknown",
      ],
      data_import_dataset: [
        "employees",
        "departments",
        "teams",
        "projects",
        "skills",
        "attendance",
        "leaves",
        "payroll",
        "performance_reviews",
        "training_records",
        "assets",
        "github",
        "jira",
        "clickup",
        "custom",
      ],
      data_import_mode: [
        "insert",
        "update",
        "upsert",
        "skip_duplicates",
        "replace",
        "dry_run",
      ],
      data_import_severity: ["error", "warning"],
      data_import_status: [
        "pending",
        "uploading",
        "validating",
        "ready",
        "importing",
        "completed",
        "partial",
        "failed",
        "cancelled",
        "dry_run",
      ],
      employee_status: ["active", "on_leave", "terminated", "probation"],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "intern",
        "consultant",
      ],
      github_account_type: ["user", "organization"],
      github_issue_state: ["open", "closed"],
      github_pr_state: ["open", "closed", "merged"],
      github_repo_visibility: ["public", "private", "internal"],
      github_review_state: [
        "approved",
        "changes_requested",
        "commented",
        "dismissed",
        "pending",
      ],
      github_sync_kind: [
        "manual_full",
        "manual_incremental",
        "auto_incremental",
        "background",
      ],
      github_sync_status: ["running", "success", "partial", "failed"],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      jira_issue_kind: ["story", "task", "bug", "epic", "subtask", "other"],
      jira_sprint_state: ["future", "active", "closed"],
      jira_status_category: ["todo", "in_progress", "done", "unknown"],
      jira_sync_kind: [
        "manual_full",
        "manual_incremental",
        "auto_incremental",
        "background",
      ],
      jira_sync_status: ["running", "success", "partial", "failed"],
      org_status: ["active", "trialing", "suspended", "archived"],
      proficiency_level: ["beginner", "intermediate", "advanced", "expert"],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "archived",
      ],
      skill_category: [
        "programming",
        "cloud",
        "database",
        "ai",
        "leadership",
        "soft_skills",
        "other",
      ],
      subscription_plan: ["free", "starter", "growth", "enterprise"],
      user_status: ["active", "invited", "suspended", "disabled"],
    },
  },
} as const
