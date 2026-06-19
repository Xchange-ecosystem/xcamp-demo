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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _migration_markers: {
        Row: {
          backfill_complete_at: string | null
          backfill_duration_seconds: number | null
          column_added_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          notes: string | null
          rls_enabled_at: string | null
          row_count: number | null
          status: string | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          backfill_complete_at?: string | null
          backfill_duration_seconds?: number | null
          column_added_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          notes?: string | null
          rls_enabled_at?: string | null
          row_count?: number | null
          status?: string | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          backfill_complete_at?: string | null
          backfill_duration_seconds?: number | null
          column_added_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          notes?: string | null
          rls_enabled_at?: string | null
          row_count?: number | null
          status?: string | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      access_rights: {
        Row: {
          access_level: string | null
          access_type: string | null
          content_id: string
          content_type: string
          created_at: string
          expires_at: string | null
          grantee_central_id: string
          grantor_central_id: string
          id: string
          metadata: Json | null
          purchase_id: string | null
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          access_type?: string | null
          content_id: string
          content_type: string
          created_at?: string
          expires_at?: string | null
          grantee_central_id: string
          grantor_central_id: string
          id?: string
          metadata?: Json | null
          purchase_id?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          access_type?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          expires_at?: string | null
          grantee_central_id?: string
          grantor_central_id?: string
          id?: string
          metadata?: Json | null
          purchase_id?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_rights_grantee_central_id_fkey"
            columns: ["grantee_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_rights_grantor_central_id_fkey"
            columns: ["grantor_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_rights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          capabilities_used: string[]
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          execution_id: string | null
          id: string
          input: Json
          output: Json | null
          policy_violations: Json | null
          started_at: string | null
          status: string
          step_id: string | null
          steps_taken: number
          tenant_id: string
          tokens_used: number | null
        }
        Insert: {
          agent_id: string
          capabilities_used?: string[]
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          execution_id?: string | null
          id?: string
          input?: Json
          output?: Json | null
          policy_violations?: Json | null
          started_at?: string | null
          status?: string
          step_id?: string | null
          steps_taken?: number
          tenant_id: string
          tokens_used?: number | null
        }
        Update: {
          agent_id?: string
          capabilities_used?: string[]
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          execution_id?: string | null
          id?: string
          input?: Json
          output?: Json | null
          policy_violations?: Json | null
          started_at?: string | null
          status?: string
          step_id?: string | null
          steps_taken?: number
          tenant_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_type: string
          capabilities: string[]
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          instructions: Json
          is_active: boolean
          max_steps: number
          metadata: Json
          model_config: Json
          name: string
          tenant_id: string
          timeout_seconds: number
          updated_at: string | null
        }
        Insert: {
          agent_type?: string
          capabilities?: string[]
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          instructions?: Json
          is_active?: boolean
          max_steps?: number
          metadata?: Json
          model_config?: Json
          name: string
          tenant_id: string
          timeout_seconds?: number
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          capabilities?: string[]
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          instructions?: Json
          is_active?: boolean
          max_steps?: number
          metadata?: Json
          model_config?: Json
          name?: string
          tenant_id?: string
          timeout_seconds?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_installations: {
        Row: {
          app_id: string
          configuration: Json | null
          id: string
          installed_at: string | null
          installed_by: string
          is_enabled: boolean | null
          metadata: Json | null
          tenant_id: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          app_id: string
          configuration?: Json | null
          id?: string
          installed_at?: string | null
          installed_by: string
          is_enabled?: boolean | null
          metadata?: Json | null
          tenant_id: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          app_id?: string
          configuration?: Json | null
          id?: string
          installed_at?: string | null
          installed_by?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          tenant_id?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_installations_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_installations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          capabilities: string[]
          created_at: string | null
          created_by: string
          dependencies: string[] | null
          description: string | null
          id: string
          is_enabled: boolean | null
          is_public: boolean | null
          manifest: Json
          metadata: Json | null
          name: string
          routes: Json | null
          slug: string
          tenant_id: string
          updated_at: string | null
          version: string | null
          widgets: Json
        }
        Insert: {
          capabilities?: string[]
          created_at?: string | null
          created_by: string
          dependencies?: string[] | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          is_public?: boolean | null
          manifest: Json
          metadata?: Json | null
          name: string
          routes?: Json | null
          slug: string
          tenant_id: string
          updated_at?: string | null
          version?: string | null
          widgets?: Json
        }
        Update: {
          capabilities?: string[]
          created_at?: string | null
          created_by?: string
          dependencies?: string[] | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          is_public?: boolean | null
          manifest?: Json
          metadata?: Json | null
          name?: string
          routes?: Json | null
          slug?: string
          tenant_id?: string
          updated_at?: string | null
          version?: string | null
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "apps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_term_acceptances: {
        Row: {
          accepted_at: string
          assignment_id: string
          fund_id: string
          fund_terms_snapshot: Json
          fund_terms_version: number
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          assignment_id: string
          fund_id: string
          fund_terms_snapshot: Json
          fund_terms_version: number
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          assignment_id?: string
          fund_id?: string
          fund_terms_snapshot?: Json
          fund_terms_version?: number
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_term_acceptances_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_term_acceptances_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_term_acceptances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          contract_id: string | null
          contract_version: number | null
          created_at: string
          currency_type: string
          fund_id: string | null
          id: string
          init_id: string | null
          invited_by: string
          object_id: string
          object_type: string
          percentage_share: number | null
          proposed_value: number | null
          reward_status: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          tenant_id: string
          updated_at: string
          user_id: string
          value_type: Database["public"]["Enums"]["assignment_value_type"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          contract_id?: string | null
          contract_version?: number | null
          created_at?: string
          currency_type?: string
          fund_id?: string | null
          id?: string
          init_id?: string | null
          invited_by: string
          object_id: string
          object_type: string
          percentage_share?: number | null
          proposed_value?: number | null
          reward_status?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
          value_type?: Database["public"]["Enums"]["assignment_value_type"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          contract_id?: string | null
          contract_version?: number | null
          created_at?: string
          currency_type?: string
          fund_id?: string | null
          id?: string
          init_id?: string | null
          invited_by?: string
          object_id?: string
          object_type?: string
          percentage_share?: number | null
          proposed_value?: number | null
          reward_status?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
          value_type?: Database["public"]["Enums"]["assignment_value_type"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_init_id_fkey"
            columns: ["init_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
        ]
      }
      assistants: {
        Row: {
          avatar_url: string | null
          cost_rules: Json
          created_at: string
          id: string
          model: string
          name: string
          owner_central_id: string
          provider: string
          system_prompt: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cost_rules?: Json
          created_at?: string
          id?: string
          model?: string
          name: string
          owner_central_id: string
          provider?: string
          system_prompt?: string
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cost_rules?: Json
          created_at?: string
          id?: string
          model?: string
          name?: string
          owner_central_id?: string
          provider?: string
          system_prompt?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistants_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attachment_links: {
        Row: {
          attachment_id: string
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          label: string | null
          owner_central_id: string
          tenant_id: string
        }
        Insert: {
          attachment_id: string
          created_at?: string
          entity_id: string
          entity_table: string
          id?: string
          label?: string | null
          owner_central_id: string
          tenant_id: string
        }
        Update: {
          attachment_id?: string
          created_at?: string
          entity_id?: string
          entity_table?: string
          id?: string
          label?: string | null
          owner_central_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachment_links_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_links_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          bucket_id: string
          created_at: string
          file_name: string
          id: string
          metadata: Json
          mime_type: string | null
          object_path: string
          owner_central_id: string
          size_bytes: number | null
          tenant_id: string
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          file_name: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          object_path: string
          owner_central_id: string
          size_bytes?: number | null
          tenant_id: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          file_name?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          object_path?: string
          owner_central_id?: string
          size_bytes?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          actor_central_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          hash: string | null
          id: string
          object_id: string
          object_type: string
          operation: string
          prev_hash: string | null
          tenant_id: string
        }
        Insert: {
          actor_central_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          hash?: string | null
          id?: string
          object_id: string
          object_type: string
          operation: string
          prev_hash?: string | null
          tenant_id: string
        }
        Update: {
          actor_central_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          hash?: string | null
          id?: string
          object_id?: string
          object_type?: string
          operation?: string
          prev_hash?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_central_id_fkey"
            columns: ["actor_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backcaster_modes: {
        Row: {
          allowed_depth_max: number
          allowed_depth_min: number
          category: string
          created_at: string
          default_ai_character_id: string | null
          default_depth: number
          description: string
          display_name: string | null
          example_input: string | null
          example_output: Json | null
          framework_slug: string | null
          framework_version: string | null
          generation_prompt_template: string
          id: string
          interpretation_prompt_template: string
          is_system_mode: boolean
          name: string
          output_schema: Json
          output_type: string
          owner_central_id: string | null
          parameter_schema: Json
          prompt_config: Json
          road: string
          slug: string
          sort_order: number
          status: string
          tenant_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          allowed_depth_max?: number
          allowed_depth_min?: number
          category?: string
          created_at?: string
          default_ai_character_id?: string | null
          default_depth?: number
          description?: string
          display_name?: string | null
          example_input?: string | null
          example_output?: Json | null
          framework_slug?: string | null
          framework_version?: string | null
          generation_prompt_template?: string
          id?: string
          interpretation_prompt_template?: string
          is_system_mode?: boolean
          name: string
          output_schema?: Json
          output_type?: string
          owner_central_id?: string | null
          parameter_schema?: Json
          prompt_config?: Json
          road?: string
          slug: string
          sort_order?: number
          status?: string
          tenant_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          allowed_depth_max?: number
          allowed_depth_min?: number
          category?: string
          created_at?: string
          default_ai_character_id?: string | null
          default_depth?: number
          description?: string
          display_name?: string | null
          example_input?: string | null
          example_output?: Json | null
          framework_slug?: string | null
          framework_version?: string | null
          generation_prompt_template?: string
          id?: string
          interpretation_prompt_template?: string
          is_system_mode?: boolean
          name?: string
          output_schema?: Json
          output_type?: string
          owner_central_id?: string | null
          parameter_schema?: Json
          prompt_config?: Json
          road?: string
          slug?: string
          sort_order?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "backcaster_modes_default_ai_character_id_fkey"
            columns: ["default_ai_character_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backcaster_modes_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backcaster_modes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backcaster_sessions: {
        Row: {
          ai_character_id: string | null
          archetype_slug: string | null
          created_at: string
          current_version_id: string | null
          framework_slug: string | null
          framework_version: string | null
          id: string
          interpreted_input: string | null
          materialized_init_id: string | null
          mode_id: string | null
          owner_central_id: string
          raw_input: string
          selected_parameters: Json
          status: string
          sync_integration_id: string | null
          sync_provider: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_character_id?: string | null
          archetype_slug?: string | null
          created_at?: string
          current_version_id?: string | null
          framework_slug?: string | null
          framework_version?: string | null
          id?: string
          interpreted_input?: string | null
          materialized_init_id?: string | null
          mode_id?: string | null
          owner_central_id: string
          raw_input?: string
          selected_parameters?: Json
          status?: string
          sync_integration_id?: string | null
          sync_provider?: string | null
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          ai_character_id?: string | null
          archetype_slug?: string | null
          created_at?: string
          current_version_id?: string | null
          framework_slug?: string | null
          framework_version?: string | null
          id?: string
          interpreted_input?: string | null
          materialized_init_id?: string | null
          mode_id?: string | null
          owner_central_id?: string
          raw_input?: string
          selected_parameters?: Json
          status?: string
          sync_integration_id?: string | null
          sync_provider?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backcaster_sessions_ai_character_id_fkey"
            columns: ["ai_character_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backcaster_sessions_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "backcaster_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backcaster_sessions_mode_id_fkey"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "backcaster_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backcaster_sessions_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backcaster_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backcaster_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          interpretation_snapshot: string | null
          model_name: string | null
          output_json: Json | null
          parameter_snapshot: Json
          session_id: string
          tenant_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          interpretation_snapshot?: string | null
          model_name?: string | null
          output_json?: Json | null
          parameter_snapshot?: Json
          session_id: string
          tenant_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          interpretation_snapshot?: string | null
          model_name?: string | null
          output_json?: Json | null
          parameter_snapshot?: Json
          session_id?: string
          tenant_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "backcaster_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backcaster_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "backcaster_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backcaster_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          creator_central_id: string
          grants_access: boolean
          id: string
          is_preview: boolean
          item_id: string
          item_type: string
          label: string | null
          tenant_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          creator_central_id: string
          grants_access?: boolean
          id?: string
          is_preview?: boolean
          item_id: string
          item_type?: string
          label?: string | null
          tenant_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          creator_central_id?: string
          grants_access?: boolean
          id?: string
          is_preview?: boolean
          item_id?: string
          item_type?: string
          label?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_creator_central_id_fkey"
            columns: ["creator_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_subscriptions: {
        Row: {
          bundle_id: string
          ended_at: string | null
          id: string
          started_at: string
          status: string
          subscriber_central_id: string
          tenant_id: string
        }
        Insert: {
          bundle_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          subscriber_central_id: string
          tenant_id: string
        }
        Update: {
          bundle_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          subscriber_central_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_subscriptions_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_subscriptions_subscriber_central_id_fkey"
            columns: ["subscriber_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          ai_summary: string
          created_at: string
          creator_central_id: string
          description: string
          feature_image_attachment_id: string | null
          id: string
          is_paid: boolean
          price_credits: number
          tenant_id: string
          title: string
          updated_at: string
          visibility: string
          withdrawn: boolean
        }
        Insert: {
          ai_summary?: string
          created_at?: string
          creator_central_id: string
          description?: string
          feature_image_attachment_id?: string | null
          id?: string
          is_paid?: boolean
          price_credits?: number
          tenant_id: string
          title: string
          updated_at?: string
          visibility?: string
          withdrawn?: boolean
        }
        Update: {
          ai_summary?: string
          created_at?: string
          creator_central_id?: string
          description?: string
          feature_image_attachment_id?: string | null
          id?: string
          is_paid?: boolean
          price_credits?: number
          tenant_id?: string
          title?: string
          updated_at?: string
          visibility?: string
          withdrawn?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bundles_creator_central_id_fkey"
            columns: ["creator_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_feature_image_attachment_id_fkey"
            columns: ["feature_image_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capabilities: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string
          description: string | null
          events: string[] | null
          execution_endpoint: string | null
          execution_type: string
          handler_config: Json
          handler_type: string
          id: string
          input_schema: Json
          is_active: boolean | null
          name: string
          output_schema: Json
          permissions: string[]
          semantic_tags: string[] | null
          status: string | null
          tenant_id: string
          timeout_seconds: number | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          events?: string[] | null
          execution_endpoint?: string | null
          execution_type: string
          handler_config?: Json
          handler_type?: string
          id?: string
          input_schema: Json
          is_active?: boolean | null
          name: string
          output_schema: Json
          permissions?: string[]
          semantic_tags?: string[] | null
          status?: string | null
          tenant_id: string
          timeout_seconds?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          events?: string[] | null
          execution_endpoint?: string | null
          execution_type?: string
          handler_config?: Json
          handler_type?: string
          id?: string
          input_schema?: Json
          is_active?: boolean | null
          name?: string
          output_schema?: Json
          permissions?: string[]
          semantic_tags?: string[] | null
          status?: string | null
          tenant_id?: string
          timeout_seconds?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capabilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_visibility: {
        Row: {
          capability_id: string
          created_at: string | null
          enabled: boolean
          id: string
          max_executions_per_day: number | null
          requires_approval: boolean | null
          tenant_id: string
          updated_at: string | null
          visible: boolean
        }
        Insert: {
          capability_id: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          max_executions_per_day?: number | null
          requires_approval?: boolean | null
          tenant_id: string
          updated_at?: string | null
          visible?: boolean
        }
        Update: {
          capability_id?: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          max_executions_per_day?: number | null
          requires_approval?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "capability_visibility_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_visibility_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      central_users: {
        Row: {
          auth_uid: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          preferences: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_uid?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          preferences?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_uid?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          preferences?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "central_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          assistant_id: string | null
          content_markdown: string
          content_text: string
          created_at: string
          id: string
          owner_central_id: string
          role: string
          session_id: string
          tenant_id: string
        }
        Insert: {
          assistant_id?: string | null
          content_markdown?: string
          content_text?: string
          created_at?: string
          id?: string
          owner_central_id: string
          role: string
          session_id: string
          tenant_id: string
        }
        Update: {
          assistant_id?: string | null
          content_markdown?: string
          content_text?: string
          created_at?: string
          id?: string
          owner_central_id?: string
          role?: string
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          owner_central_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_central_id: string
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_central_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          access_source: string
          created_at: string
          id: string
          invited_by: string | null
          is_external: boolean
          object_id: string
          object_type: string
          role: Database["public"]["Enums"]["collab_role"]
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_source?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_external?: boolean
          object_id: string
          object_type: string
          role?: Database["public"]["Enums"]["collab_role"]
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_source?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_external?: boolean
          object_id?: string
          object_type?: string
          role?: Database["public"]["Enums"]["collab_role"]
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_acceptances: {
        Row: {
          accepted_at: string
          assignment_id: string
          contract_id: string
          contract_snapshot: string | null
          contract_version: number
          created_at: string
          fund_id: string | null
          fund_terms_snapshot: string | null
          fund_terms_version: number | null
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          assignment_id: string
          contract_id: string
          contract_snapshot?: string | null
          contract_version: number
          created_at?: string
          fund_id?: string | null
          fund_terms_snapshot?: string | null
          fund_terms_version?: number | null
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          assignment_id?: string
          contract_id?: string
          contract_snapshot?: string | null
          contract_version?: number
          created_at?: string
          fund_id?: string | null
          fund_terms_snapshot?: string | null
          fund_terms_version?: number | null
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_acceptances_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_acceptances_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_acceptances_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_acceptances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_text: string
          created_at: string
          created_by: string
          fund_id: string | null
          id: string
          idempotency_key: string | null
          init_id: string | null
          is_active: boolean
          tenant_id: string
          title: string
          version: number
        }
        Insert: {
          contract_text?: string
          created_at?: string
          created_by: string
          fund_id?: string | null
          id?: string
          idempotency_key?: string | null
          init_id?: string | null
          is_active?: boolean
          tenant_id: string
          title?: string
          version?: number
        }
        Update: {
          contract_text?: string
          created_at?: string
          created_by?: string
          fund_id?: string | null
          id?: string
          idempotency_key?: string | null
          init_id?: string | null
          is_active?: boolean
          tenant_id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_init_id_fkey"
            columns: ["init_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      design_theme_assignments: {
        Row: {
          app_key: string
          assigned_at: string
          assigned_by: string | null
          environment: string
          id: string
          published_version: string
          tenant_id: string
          theme_id: string
          token_set_id: string
        }
        Insert: {
          app_key: string
          assigned_at?: string
          assigned_by?: string | null
          environment: string
          id?: string
          published_version: string
          tenant_id: string
          theme_id: string
          token_set_id: string
        }
        Update: {
          app_key?: string
          assigned_at?: string
          assigned_by?: string | null
          environment?: string
          id?: string
          published_version?: string
          tenant_id?: string
          theme_id?: string
          token_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_theme_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_theme_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_theme_assignments_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "design_themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_theme_assignments_token_set_id_fkey"
            columns: ["token_set_id"]
            isOneToOne: false
            referencedRelation: "design_token_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      design_themes: {
        Row: {
          created_at: string
          created_by: string | null
          extraction_notes: string | null
          extraction_source: string | null
          id: string
          mode: string
          name: string
          slug: string
          source_image_url: string | null
          status: string
          tenant_id: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          extraction_notes?: string | null
          extraction_source?: string | null
          id?: string
          mode?: string
          name: string
          slug: string
          source_image_url?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          extraction_notes?: string | null
          extraction_source?: string | null
          id?: string
          mode?: string
          name?: string
          slug?: string
          source_image_url?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_themes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_themes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      design_token_sets: {
        Row: {
          created_at: string
          id: string
          is_draft: boolean
          label: string
          published_at: string | null
          published_by: string | null
          published_tokens: Json | null
          published_version: string | null
          tenant_id: string
          theme_id: string
          tokens: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_draft?: boolean
          label?: string
          published_at?: string | null
          published_by?: string | null
          published_tokens?: Json | null
          published_version?: string | null
          tenant_id: string
          theme_id: string
          tokens?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_draft?: boolean
          label?: string
          published_at?: string | null
          published_by?: string | null
          published_tokens?: Json | null
          published_version?: string | null
          tenant_id?: string
          theme_id?: string
          tokens?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_token_sets_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_token_sets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_token_sets_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "design_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamix_action_suggestions: {
        Row: {
          created_at: string
          created_note_id: string | null
          expires_at: string | null
          id: string
          kind: string | null
          note_id: string | null
          objective_id: string | null
          owner_central_id: string | null
          priority: string | null
          project_id: string | null
          proposal: Json | null
          rationale: string | null
          recipient_user_id: string | null
          round_id: string | null
          status: string
          suggestion_type: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_note_id?: string | null
          expires_at?: string | null
          id?: string
          kind?: string | null
          note_id?: string | null
          objective_id?: string | null
          owner_central_id?: string | null
          priority?: string | null
          project_id?: string | null
          proposal?: Json | null
          rationale?: string | null
          recipient_user_id?: string | null
          round_id?: string | null
          status?: string
          suggestion_type: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_note_id?: string | null
          expires_at?: string | null
          id?: string
          kind?: string | null
          note_id?: string | null
          objective_id?: string | null
          owner_central_id?: string | null
          priority?: string | null
          project_id?: string | null
          proposal?: Json | null
          rationale?: string | null
          recipient_user_id?: string | null
          round_id?: string | null
          status?: string
          suggestion_type?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dynamix_action_suggestions_created_note_id_fkey"
            columns: ["created_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamix_action_suggestions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamix_action_suggestions_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamix_action_suggestions_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamix_action_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamix_action_suggestions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "dynamix_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamix_action_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamix_rounds: {
        Row: {
          chat_session_id: string | null
          created_at: string
          dashboard_plan: Json | null
          enriched_brief: string | null
          generated_view_data: Json | null
          generation_source: string | null
          hero_image_status: string | null
          hero_image_url: string | null
          id: string
          input_text: string
          input_tool_pill: string | null
          interactive_content: Json | null
          interpretation: Json | null
          owner_central_id: string
          project_id: string | null
          recommendations: Json | null
          scenario_key: string | null
          status: string
          tags: string[]
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          chat_session_id?: string | null
          created_at?: string
          dashboard_plan?: Json | null
          enriched_brief?: string | null
          generated_view_data?: Json | null
          generation_source?: string | null
          hero_image_status?: string | null
          hero_image_url?: string | null
          id?: string
          input_text?: string
          input_tool_pill?: string | null
          interactive_content?: Json | null
          interpretation?: Json | null
          owner_central_id: string
          project_id?: string | null
          recommendations?: Json | null
          scenario_key?: string | null
          status?: string
          tags?: string[]
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          chat_session_id?: string | null
          created_at?: string
          dashboard_plan?: Json | null
          enriched_brief?: string | null
          generated_view_data?: Json | null
          generation_source?: string | null
          hero_image_status?: string | null
          hero_image_url?: string | null
          id?: string
          input_text?: string
          input_tool_pill?: string | null
          interactive_content?: Json | null
          interpretation?: Json | null
          owner_central_id?: string
          project_id?: string | null
          recommendations?: Json | null
          scenario_key?: string | null
          status?: string
          tags?: string[]
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dynamix_rounds_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamix_rounds_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamix_rounds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamix_rounds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_events: {
        Row: {
          amount: number | null
          created_at: string
          event_type: string
          fund_id: string | null
          id: string
          init_id: string | null
          metadata: Json
          related_object_id: string | null
          related_object_type: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          event_type: string
          fund_id?: string | null
          id?: string
          init_id?: string | null
          metadata?: Json
          related_object_id?: string | null
          related_object_type?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          event_type?: string
          fund_id?: string | null
          id?: string
          init_id?: string | null
          metadata?: Json
          related_object_id?: string | null
          related_object_type?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "economic_events_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economic_events_init_id_fkey"
            columns: ["init_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economic_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_schemas: {
        Row: {
          created_at: string | null
          created_by: string
          entity_type: string
          id: string
          is_latest: boolean | null
          schema: Json
          tenant_id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by: string
          entity_type: string
          id?: string
          is_latest?: boolean | null
          schema: Json
          tenant_id: string
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string
          entity_type?: string
          id?: string
          is_latest?: boolean | null
          schema?: Json
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "entity_schemas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_subscribers: {
        Row: {
          agent_id: string | null
          app_id: string | null
          created_at: string | null
          event_type: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          retry_count: number | null
          tenant_id: string
          timeout_seconds: number | null
          webhook_url: string | null
        }
        Insert: {
          agent_id?: string | null
          app_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          retry_count?: number | null
          tenant_id: string
          timeout_seconds?: number | null
          webhook_url?: string | null
        }
        Update: {
          agent_id?: string | null
          app_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          retry_count?: number | null
          tenant_id?: string
          timeout_seconds?: number | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_subscribers_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_subscribers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          aggregate_id: string
          aggregate_type: string
          correlation_id: string | null
          data: Json
          emitted_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          processed_at: string | null
          tenant_id: string
          workspace_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          aggregate_id: string
          aggregate_type: string
          correlation_id?: string | null
          data: Json
          emitted_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          tenant_id: string
          workspace_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          aggregate_id?: string
          aggregate_type?: string
          correlation_id?: string | null
          data?: Json
          emitted_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          tenant_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      external_objects: {
        Row: {
          created_at: string
          external_container_id: string | null
          external_id: string
          id: string
          local_id: string
          local_type: string
          local_updated_at_at_last_push: string | null
          metadata: Json
          owner_central_id: string
          provider: string
          remote_updated_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_container_id?: string | null
          external_id: string
          id?: string
          local_id: string
          local_type: string
          local_updated_at_at_last_push?: string | null
          metadata?: Json
          owner_central_id: string
          provider: string
          remote_updated_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_container_id?: string | null
          external_id?: string
          id?: string
          local_id?: string
          local_type?: string
          local_updated_at_at_last_push?: string | null
          metadata?: Json
          owner_central_id?: string
          provider?: string
          remote_updated_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_objects_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_objects_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_objects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_concepts: {
        Row: {
          aliases: string[]
          base_dimension: string | null
          category_hint: string | null
          concept_id: string
          concept_type: string
          created_at: string
          description: string | null
          exclusion_signals: string[]
          expected_outcome: string | null
          id: string
          intent: string | null
          maturity_band: string | null
          name: string
          relations: Json
          selection_signals: string[]
          slug: string
          status: string
          tags: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          base_dimension?: string | null
          category_hint?: string | null
          concept_id: string
          concept_type: string
          created_at?: string
          description?: string | null
          exclusion_signals?: string[]
          expected_outcome?: string | null
          id?: string
          intent?: string | null
          maturity_band?: string | null
          name: string
          relations?: Json
          selection_signals?: string[]
          slug: string
          status?: string
          tags?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          base_dimension?: string | null
          category_hint?: string | null
          concept_id?: string
          concept_type?: string
          created_at?: string
          description?: string | null
          exclusion_signals?: string[]
          expected_outcome?: string | null
          id?: string
          intent?: string | null
          maturity_band?: string | null
          name?: string
          relations?: Json
          selection_signals?: string[]
          slug?: string
          status?: string
          tags?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_concepts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_objective_links: {
        Row: {
          concept_id: string
          confidence_score: number
          created_at: string
          entity_path: Json
          entity_type: string
          evidence: Json
          id: string
          mapping_type: string
          status: string
          template_slug: string
          tenant_id: string
        }
        Insert: {
          concept_id: string
          confidence_score: number
          created_at?: string
          entity_path: Json
          entity_type: string
          evidence?: Json
          id?: string
          mapping_type: string
          status?: string
          template_slug: string
          tenant_id: string
        }
        Update: {
          concept_id?: string
          confidence_score?: number
          created_at?: string
          entity_path?: Json
          entity_type?: string
          evidence?: Json
          id?: string
          mapping_type?: string
          status?: string
          template_slug?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_objective_links_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "framework_concepts"
            referencedColumns: ["concept_id"]
          },
          {
            foreignKeyName: "framework_objective_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_templates: {
        Row: {
          config: Json
          created_at: string
          description: string
          id: string
          name: string
          slug: string
          source_framework: string | null
          source_reference: string | null
          status: string
          tags: string[]
          tenant_id: string
          updated_at: string
          version: string
          visibility: string
        }
        Insert: {
          config: Json
          created_at?: string
          description?: string
          id?: string
          name: string
          slug: string
          source_framework?: string | null
          source_reference?: string | null
          status?: string
          tags?: string[]
          tenant_id: string
          updated_at?: string
          version?: string
          visibility?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
          source_framework?: string | null
          source_reference?: string | null
          status?: string
          tags?: string[]
          tenant_id?: string
          updated_at?: string
          version?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_approvals: {
        Row: {
          approval_method: string
          approval_required: boolean
          approval_type: string
          approved_at: string | null
          approved_by: string[]
          created_at: string
          fund_id: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          approval_method: string
          approval_required?: boolean
          approval_type: string
          approved_at?: string | null
          approved_by?: string[]
          created_at?: string
          fund_id: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          approval_method?: string
          approval_required?: boolean
          approval_type?: string
          approved_at?: string | null
          approved_by?: string[]
          created_at?: string
          fund_id?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_approvals_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_valuations: {
        Row: {
          active_credit_supply: number
          created_at: string
          created_by: string | null
          fund_id: string
          fund_value_total: number
          id: string
          project_value_ref: number
          snapshot_reason: string | null
          tenant_id: string
          value_per_credit: number
        }
        Insert: {
          active_credit_supply?: number
          created_at?: string
          created_by?: string | null
          fund_id: string
          fund_value_total?: number
          id?: string
          project_value_ref?: number
          snapshot_reason?: string | null
          tenant_id: string
          value_per_credit?: number
        }
        Update: {
          active_credit_supply?: number
          created_at?: string
          created_by?: string | null
          fund_id?: string
          fund_value_total?: number
          id?: string
          project_value_ref?: number
          snapshot_reason?: string | null
          tenant_id?: string
          value_per_credit?: number
        }
        Relationships: [
          {
            foreignKeyName: "fund_valuations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_valuations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_valuations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          fund_type: Database["public"]["Enums"]["fund_type"]
          id: string
          incorporation_required: boolean
          is_default: boolean
          is_transferable: boolean
          jurisdiction: string | null
          legal_entity_stage: string | null
          name: string
          participant_group_label: string | null
          payout_config: Json | null
          payout_logic_type: string | null
          project_id: string
          redemption_rules: Json
          requires_shareholder_approval: boolean
          reserved_value_percent: number
          status: Database["public"]["Enums"]["fund_status"]
          tenant_id: string
          transferability_rules: Json
          trigger_config: Json | null
          trigger_logic_type: string | null
          updated_at: string
          vesting_rules: Json
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          fund_type?: Database["public"]["Enums"]["fund_type"]
          id?: string
          incorporation_required?: boolean
          is_default?: boolean
          is_transferable?: boolean
          jurisdiction?: string | null
          legal_entity_stage?: string | null
          name?: string
          participant_group_label?: string | null
          payout_config?: Json | null
          payout_logic_type?: string | null
          project_id: string
          redemption_rules?: Json
          requires_shareholder_approval?: boolean
          reserved_value_percent?: number
          status?: Database["public"]["Enums"]["fund_status"]
          tenant_id: string
          transferability_rules?: Json
          trigger_config?: Json | null
          trigger_logic_type?: string | null
          updated_at?: string
          vesting_rules?: Json
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          fund_type?: Database["public"]["Enums"]["fund_type"]
          id?: string
          incorporation_required?: boolean
          is_default?: boolean
          is_transferable?: boolean
          jurisdiction?: string | null
          legal_entity_stage?: string | null
          name?: string
          participant_group_label?: string | null
          payout_config?: Json | null
          payout_logic_type?: string | null
          project_id?: string
          redemption_rules?: Json
          requires_shareholder_approval?: boolean
          reserved_value_percent?: number
          status?: Database["public"]["Enums"]["fund_status"]
          tenant_id?: string
          transferability_rules?: Json
          trigger_config?: Json | null
          trigger_logic_type?: string | null
          updated_at?: string
          vesting_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "funds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      general_objects: {
        Row: {
          created_at: string
          objective_id: string
          project_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          objective_id: string
          project_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          objective_id?: string
          project_id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          assignment_offer_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          invited_by: string
          invitee_email: string | null
          invitee_user_id: string | null
          is_external: boolean
          message: string | null
          object_id: string
          object_type: string
          role: Database["public"]["Enums"]["collab_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assignment_offer_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by: string
          invitee_email?: string | null
          invitee_user_id?: string | null
          is_external?: boolean
          message?: string | null
          object_id: string
          object_type: string
          role?: Database["public"]["Enums"]["collab_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assignment_offer_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          invitee_email?: string | null
          invitee_user_id?: string | null
          is_external?: boolean
          message?: string | null
          object_id?: string
          object_type?: string
          role?: Database["public"]["Enums"]["collab_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_invitations_assignment"
            columns: ["assignment_offer_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      jarvix_action_logs: {
        Row: {
          action_payload: Json
          action_type: string
          conversation_id: string | null
          created_at: string
          decided_at: string
          id: string
          message_id: string | null
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          action_payload?: Json
          action_type: string
          conversation_id?: string | null
          created_at?: string
          decided_at?: string
          id?: string
          message_id?: string | null
          status: string
          tenant_id: string
          user_id: string
        }
        Update: {
          action_payload?: Json
          action_type?: string
          conversation_id?: string | null
          created_at?: string
          decided_at?: string
          id?: string
          message_id?: string | null
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jarvix_action_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      jarvix_conversations: {
        Row: {
          created_at: string
          id: string
          owner_central_id: string
          project_id: string | null
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_central_id?: string
          project_id?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_central_id?: string
          project_id?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jarvix_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jarvix_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      jarvix_messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          parts: Json | null
          role: string
          tenant_id: string
        }
        Insert: {
          citations?: Json | null
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          parts?: Json | null
          role: string
          tenant_id: string
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          parts?: Json | null
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jarvix_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "jarvix_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jarvix_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          ai_suggestions: Json
          ai_tags: string[]
          created_at: string
          id: string
          mood_data: Json
          note_id: string | null
          owner_central_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_suggestions?: Json
          ai_tags?: string[]
          created_at?: string
          id?: string
          mood_data?: Json
          note_id?: string | null
          owner_central_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_suggestions?: Json
          ai_tags?: string[]
          created_at?: string
          id?: string
          mood_data?: Json
          note_id?: string | null
          owner_central_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_answers: {
        Row: {
          audio_url: string | null
          created_at: string
          entry_id: string
          id: string
          question_id: string | null
          question_text: string
          sort_order: number
          tenant_id: string
          transcript_text: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          entry_id: string
          id?: string
          question_id?: string | null
          question_text?: string
          sort_order?: number
          tenant_id: string
          transcript_text?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          question_id?: string | null
          question_text?: string
          sort_order?: number
          tenant_id?: string
          transcript_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_answers_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "journal_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_answers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_questions: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_default: boolean
          question_text: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          question_text: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          question_text?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          asking_price: number
          created_at: string
          credit_amount: number
          expires_at: string | null
          fund_id: string
          id: string
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          asking_price: number
          created_at?: string
          credit_amount: number
          expires_at?: string | null
          fund_id: string
          id?: string
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          asking_price?: number
          created_at?: string
          credit_amount?: number
          expires_at?: string | null
          fund_id?: string
          id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_trades: {
        Row: {
          buyer_id: string
          completed_at: string | null
          created_at: string
          credit_amount: number
          fund_id: string
          id: string
          listing_id: string
          price_paid: number
          seller_id: string
          status: Database["public"]["Enums"]["trade_status"]
          tenant_id: string
        }
        Insert: {
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          credit_amount: number
          fund_id: string
          id?: string
          listing_id: string
          price_paid: number
          seller_id: string
          status?: Database["public"]["Enums"]["trade_status"]
          tenant_id: string
        }
        Update: {
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          credit_amount?: number
          fund_id?: string
          id?: string
          listing_id?: string
          price_paid?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["trade_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_trades_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_trades_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_trades_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_trades_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_trades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_chunks: {
        Row: {
          char_end: number | null
          char_start: number | null
          chunk_index: number
          embedding_version: string | null
          heading: string | null
          id: string
          memory_document_id: string
          mirrored_at: string
          token_estimate: number | null
        }
        Insert: {
          char_end?: number | null
          char_start?: number | null
          chunk_index: number
          embedding_version?: string | null
          heading?: string | null
          id?: string
          memory_document_id: string
          mirrored_at?: string
          token_estimate?: number | null
        }
        Update: {
          char_end?: number | null
          char_start?: number | null
          chunk_index?: number
          embedding_version?: string | null
          heading?: string | null
          id?: string
          memory_document_id?: string
          mirrored_at?: string
          token_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_chunks_memory_document_id_fkey"
            columns: ["memory_document_id"]
            isOneToOne: false
            referencedRelation: "memory_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      memory_documents: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          last_invalidated_at: string | null
          last_synced_at: string | null
          mirror_path: string | null
          source_id: string
          source_type: string
          source_version: string | null
          status: string
          title: string | null
          updated_at: string
          visibility_scope: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          last_invalidated_at?: string | null
          last_synced_at?: string | null
          mirror_path?: string | null
          source_id: string
          source_type: string
          source_version?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          visibility_scope?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          last_invalidated_at?: string | null
          last_synced_at?: string | null
          mirror_path?: string | null
          source_id?: string
          source_type?: string
          source_version?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          visibility_scope?: string | null
        }
        Relationships: []
      }
      memory_search_logs: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          latency_ms: number | null
          query_text: string
          resolved_source_refs: Json | null
          retrieved_document_ids: Json | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          latency_ms?: number | null
          query_text: string
          resolved_source_refs?: Json | null
          retrieved_document_ids?: Json | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          latency_ms?: number | null
          query_text?: string
          resolved_source_refs?: Json | null
          retrieved_document_ids?: Json | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_search_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_sources: {
        Row: {
          chunk_strategy: string
          created_at: string
          enabled: boolean
          id: string
          priority: number
          snapshot_strategy: string
          source_type: string
          updated_at: string
        }
        Insert: {
          chunk_strategy?: string
          created_at?: string
          enabled?: boolean
          id?: string
          priority?: number
          snapshot_strategy?: string
          source_type: string
          updated_at?: string
        }
        Update: {
          chunk_strategy?: string
          created_at?: string
          enabled?: boolean
          id?: string
          priority?: number
          snapshot_strategy?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      memory_sync_jobs: {
        Row: {
          attempts: number
          created_at: string
          error_text: string | null
          id: string
          processed_at: string | null
          queued_at: string
          source_id: string
          source_type: string
          status: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_text?: string | null
          id?: string
          processed_at?: string | null
          queued_at?: string
          source_id: string
          source_type: string
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_text?: string | null
          id?: string
          processed_at?: string | null
          queued_at?: string
          source_id?: string
          source_type?: string
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      note_links: {
        Row: {
          created_at: string
          from_note_id: string
          id: string
          link_type: string
          owner_central_id: string
          tenant_id: string
          to_note_id: string
        }
        Insert: {
          created_at?: string
          from_note_id: string
          id?: string
          link_type?: string
          owner_central_id: string
          tenant_id: string
          to_note_id: string
        }
        Update: {
          created_at?: string
          from_note_id?: string
          id?: string
          link_type?: string
          owner_central_id?: string
          tenant_id?: string
          to_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_links_from_note_id_fkey"
            columns: ["from_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_links_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_links_to_note_id_fkey"
            columns: ["to_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_tags: {
        Row: {
          created_at: string
          note_id: string
          owner_central_id: string
          source: string
          tag_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          note_id: string
          owner_central_id: string
          source?: string
          tag_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          note_id?: string
          owner_central_id?: string
          source?: string
          tag_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_tags_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_tags_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body_html: string
          body_markdown: string
          body_text: string
          created_at: string
          detail: Json
          done: boolean
          id: string
          is_restricted: boolean
          note_type: string
          owner_central_id: string
          preferred_external_container_id: string | null
          price_credits: number
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string
          visibility: string
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
        }
        Insert: {
          body_html?: string
          body_markdown?: string
          body_text?: string
          created_at?: string
          detail?: Json
          done?: boolean
          id?: string
          is_restricted?: boolean
          note_type?: string
          owner_central_id: string
          preferred_external_container_id?: string | null
          price_credits?: number
          tags?: string[]
          tenant_id: string
          title?: string
          updated_at?: string
          visibility?: string
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
        }
        Update: {
          body_html?: string
          body_markdown?: string
          body_text?: string
          created_at?: string
          detail?: Json
          done?: boolean
          id?: string
          is_restricted?: boolean
          note_type?: string
          owner_central_id?: string
          preferred_external_container_id?: string | null
          price_credits?: number
          tags?: string[]
          tenant_id?: string
          title?: string
          updated_at?: string
          visibility?: string
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "notes_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_app_users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          central_user_id: string
          created_at: string
          display_name: string | null
          id: string
          preferences: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          central_user_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          central_user_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_app_users_central_user_id_fkey"
            columns: ["central_user_id"]
            isOneToOne: true
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          recipient_central_id: string
          sent_at: string | null
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          recipient_central_id: string
          sent_at?: string | null
          status?: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          recipient_central_id?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_recipient_central_id_fkey"
            columns: ["recipient_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_pending: {
        Row: {
          created_at: string
          state: string
          tenant_id: string
          token_payload: Json | null
        }
        Insert: {
          created_at?: string
          state: string
          tenant_id: string
          token_payload?: Json | null
        }
        Update: {
          created_at?: string
          state?: string
          tenant_id?: string
          token_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_pending_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      object_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          object_id: string
          object_type: string
          role: string
          status: string
          tenant_id: string
          updated_at: string | null
          user_central_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          object_id: string
          object_type: string
          role: string
          status?: string
          tenant_id: string
          updated_at?: string | null
          user_central_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          object_id?: string
          object_type?: string
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_central_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_memberships_user_central_id_fkey"
            columns: ["user_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_completion_confirmations: {
        Row: {
          created_at: string
          decided_at: string | null
          decision: string
          id: string
          note: string | null
          objective_id: string
          participant_central_id: string
          round_id: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          note?: string | null
          objective_id: string
          participant_central_id: string
          round_id?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          note?: string | null
          objective_id?: string
          participant_central_id?: string
          round_id?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_completion_confirmations_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_completion_confirmations_participant_central_id_fkey"
            columns: ["participant_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_completion_confirmations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_notes: {
        Row: {
          created_at: string | null
          id: string
          note_id: string
          objective_id: string
          owner_central_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_id: string
          objective_id: string
          owner_central_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_id?: string
          objective_id?: string
          owner_central_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_notes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_notes_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_notes_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          category: string | null
          completion_deadline: string | null
          completion_initiated_at: string | null
          completion_resolution: string | null
          completion_round: number
          created_at: string | null
          credit_value: number | null
          description: string | null
          detail: Json
          dimension: string | null
          end_date: string | null
          id: string
          is_restricted: boolean
          objective_total_value: number | null
          owner_central_id: string
          project_id: string
          sort_order: number | null
          start_date: string | null
          status: string | null
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string | null
          value_distribution_locked: boolean
          value_mode: Database["public"]["Enums"]["value_mode"]
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
        }
        Insert: {
          category?: string | null
          completion_deadline?: string | null
          completion_initiated_at?: string | null
          completion_resolution?: string | null
          completion_round?: number
          created_at?: string | null
          credit_value?: number | null
          description?: string | null
          detail?: Json
          dimension?: string | null
          end_date?: string | null
          id?: string
          is_restricted?: boolean
          objective_total_value?: number | null
          owner_central_id: string
          project_id: string
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          tags?: string[]
          tenant_id: string
          title?: string
          updated_at?: string | null
          value_distribution_locked?: boolean
          value_mode?: Database["public"]["Enums"]["value_mode"]
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
        }
        Update: {
          category?: string | null
          completion_deadline?: string | null
          completion_initiated_at?: string | null
          completion_resolution?: string | null
          completion_round?: number
          created_at?: string | null
          credit_value?: number | null
          description?: string | null
          detail?: Json
          dimension?: string | null
          end_date?: string | null
          id?: string
          is_restricted?: boolean
          objective_total_value?: number | null
          owner_central_id?: string
          project_id?: string
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          tags?: string[]
          tenant_id?: string
          title?: string
          updated_at?: string | null
          value_distribution_locked?: boolean
          value_mode?: Database["public"]["Enums"]["value_mode"]
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "objectives_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orga_app_users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          central_user_id: string
          created_at: string
          display_name: string | null
          gamification_points: number
          id: string
          preferences: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          central_user_id: string
          created_at?: string
          display_name?: string | null
          gamification_points?: number
          id?: string
          preferences?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          central_user_id?: string
          created_at?: string
          display_name?: string | null
          gamification_points?: number
          id?: string
          preferences?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orga_app_users_central_user_id_fkey"
            columns: ["central_user_id"]
            isOneToOne: true
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orga_app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_proposals: {
        Row: {
          committed_at: string | null
          committed_id: string | null
          created_at: string
          description: string | null
          id: string
          parent_proposal_id: string | null
          payload: Json | null
          priority: string | null
          proposal_type: string
          session_id: string
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          committed_at?: string | null
          committed_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          parent_proposal_id?: string | null
          payload?: Json | null
          priority?: string | null
          proposal_type: string
          session_id: string
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          committed_at?: string | null
          committed_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          parent_proposal_id?: string | null
          payload?: Json | null
          priority?: string | null
          proposal_type?: string
          session_id?: string
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "organiser_proposals_parent_proposal_id_fkey"
            columns: ["parent_proposal_id"]
            isOneToOne: false
            referencedRelation: "organiser_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organiser_proposals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "organiser_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organiser_proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_sessions: {
        Row: {
          context_blocks: Json
          context_summary: string | null
          created_at: string
          emotion: string | null
          goal: string
          id: string
          project_id: string
          source: string | null
          status: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_blocks?: Json
          context_summary?: string | null
          created_at?: string
          emotion?: string | null
          goal: string
          id?: string
          project_id: string
          source?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_blocks?: Json
          context_summary?: string | null
          created_at?: string
          emotion?: string | null
          goal?: string
          id?: string
          project_id?: string
          source?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organiser_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          note_visibility_max: Database["public"]["Enums"]["visibility_scope"]
          objective_visibility_max: Database["public"]["Enums"]["visibility_scope"]
          owner_central_id: string
          project_visibility_max: Database["public"]["Enums"]["visibility_scope"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note_visibility_max?: Database["public"]["Enums"]["visibility_scope"]
          objective_visibility_max?: Database["public"]["Enums"]["visibility_scope"]
          owner_central_id: string
          project_visibility_max?: Database["public"]["Enums"]["visibility_scope"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note_visibility_max?: Database["public"]["Enums"]["visibility_scope"]
          objective_visibility_max?: Database["public"]["Enums"]["visibility_scope"]
          owner_central_id?: string
          project_visibility_max?: Database["public"]["Enums"]["visibility_scope"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_positions: {
        Row: {
          created_at: string
          credits_active: number
          credits_earned: number
          credits_locked: number
          credits_redeemed: number
          credits_sold: number
          fund_id: string
          id: string
          init_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_active?: number
          credits_earned?: number
          credits_locked?: number
          credits_redeemed?: number
          credits_sold?: number
          fund_id: string
          id?: string
          init_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_active?: number
          credits_earned?: number
          credits_locked?: number
          credits_redeemed?: number
          credits_sold?: number
          fund_id?: string
          id?: string
          init_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_positions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_positions_init_id_fkey"
            columns: ["init_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_allocations: {
        Row: {
          created_at: string
          credit_amount: number
          fund_id: string
          id: string
          payout_amount: number
          payout_event_id: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_amount?: number
          fund_id: string
          id?: string
          payout_amount?: number
          payout_event_id: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_amount?: number
          fund_id?: string
          id?: string
          payout_amount?: number
          payout_event_id?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_allocations_payout_event_id_fkey"
            columns: ["payout_event_id"]
            isOneToOne: false
            referencedRelation: "payout_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_events: {
        Row: {
          approved_by: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          fund_id: string
          id: string
          initiated_by: string
          payout_type: Database["public"]["Enums"]["payout_type"]
          status: Database["public"]["Enums"]["payout_status"]
          tenant_id: string
          total_amount: number
          trigger_ref: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          fund_id: string
          id?: string
          initiated_by: string
          payout_type?: Database["public"]["Enums"]["payout_type"]
          status?: Database["public"]["Enums"]["payout_status"]
          tenant_id: string
          total_amount?: number
          trigger_ref?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          fund_id?: string
          id?: string
          initiated_by?: string
          payout_type?: Database["public"]["Enums"]["payout_type"]
          status?: Database["public"]["Enums"]["payout_status"]
          tenant_id?: string
          total_amount?: number
          trigger_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_events_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_events_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_events_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      point_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          points: number
          tenant_id: string
          user_central_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          points?: number
          tenant_id: string
          user_central_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          points?: number
          tenant_id?: string
          user_central_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_events_user_central_id_fkey"
            columns: ["user_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          action: string
          conditions: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          effect: string
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          resource_type: string
          subject_id: string | null
          subject_type: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          action: string
          conditions?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          effect: string
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          resource_type: string
          subject_id?: string | null
          subject_type: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          conditions?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          effect?: string
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          resource_type?: string
          subject_id?: string | null
          subject_type?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_evaluations: {
        Row: {
          action: string
          allowed: boolean
          conditions_met: boolean | null
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          policy_id: string | null
          reason: string | null
          resource_id: string
          resource_type: string
          subject_id: string
          subject_type: string
          tenant_id: string
        }
        Insert: {
          action: string
          allowed: boolean
          conditions_met?: boolean | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          policy_id?: string | null
          reason?: string | null
          resource_id: string
          resource_type: string
          subject_id: string
          subject_type: string
          tenant_id: string
        }
        Update: {
          action?: string
          allowed?: boolean
          conditions_met?: boolean | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          policy_id?: string | null
          reason?: string | null
          resource_id?: string
          resource_type?: string
          subject_id?: string
          subject_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_evaluations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          object_id: string
          object_type: string
          responded_at: string | null
          role: string
          status: string
          tenant_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          object_id: string
          object_type: string
          responded_at?: string | null
          role: string
          status?: string
          tenant_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          object_id?: string
          object_type?: string
          responded_at?: string | null
          role?: string
          status?: string
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          created_at: string
          id: string
          note_id: string
          owner_central_id: string
          project_id: string
          role: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          owner_central_id: string
          project_id: string
          role?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          owner_central_id?: string
          project_id?: string
          role?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_presets: {
        Row: {
          config: Json
          description: string | null
          id: string
          is_active: boolean
          label: string
          name: string
          preset_type: string
          sort_order: number
          tenant_id: string | null
        }
        Insert: {
          config?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          name: string
          preset_type: string
          sort_order?: number
          tenant_id?: string | null
        }
        Update: {
          config?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          name?: string
          preset_type?: string
          sort_order?: number
          tenant_id?: string | null
        }
        Relationships: []
      }
      project_template_metadata: {
        Row: {
          category: string | null
          framework: string | null
          preview_tags: string[] | null
          project_id: string
          tenant_id: string
          use_count: number
        }
        Insert: {
          category?: string | null
          framework?: string | null
          preview_tags?: string[] | null
          project_id: string
          tenant_id: string
          use_count?: number
        }
        Update: {
          category?: string | null
          framework?: string | null
          preview_tags?: string[] | null
          project_id?: string
          tenant_id?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_template_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_valuations: {
        Row: {
          created_at: string
          created_by: string
          effective_at: string
          id: string
          init_id: string
          notes: string | null
          project_value_reference: number
          tenant_id: string
          valuation_source_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          effective_at?: string
          id?: string
          init_id: string
          notes?: string | null
          project_value_reference: number
          tenant_id: string
          valuation_source_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          effective_at?: string
          id?: string
          init_id?: string
          notes?: string | null
          project_value_reference?: number
          tenant_id?: string
          valuation_source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_valuations_init_id_fkey"
            columns: ["init_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_valuations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archetype_slug: string | null
          color: string | null
          created_at: string
          description: string | null
          framework_slug: string | null
          framework_version: string | null
          icon: string | null
          id: string
          is_favorite: boolean | null
          is_template: boolean
          organization_id: string | null
          owner_central_id: string
          status: string
          tags: string[]
          template_scope: string
          tenant_id: string
          title: string
          updated_at: string
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
          workplace_id: string | null
        }
        Insert: {
          archetype_slug?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          framework_slug?: string | null
          framework_version?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          is_template?: boolean
          organization_id?: string | null
          owner_central_id: string
          status?: string
          tags?: string[]
          template_scope?: string
          tenant_id: string
          title: string
          updated_at?: string
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
          workplace_id?: string | null
        }
        Update: {
          archetype_slug?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          framework_slug?: string | null
          framework_version?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          is_template?: boolean
          organization_id?: string | null
          owner_central_id?: string
          status?: string
          tags?: string[]
          template_scope?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
          workplace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workplace_id_fkey"
            columns: ["workplace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      qualification_runs: {
        Row: {
          archetype_slug: string | null
          category_scores: Json
          dimension_scores: Json
          framework_slug: string
          framework_version: string
          gap_list: Json
          id: string
          mode: string
          overall_certainty: number
          overall_similarity: number
          peer_ids: string[]
          project_id: string
          run_at: string
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          archetype_slug?: string | null
          category_scores?: Json
          dimension_scores?: Json
          framework_slug: string
          framework_version: string
          gap_list?: Json
          id?: string
          mode: string
          overall_certainty?: number
          overall_similarity?: number
          peer_ids?: string[]
          project_id: string
          run_at?: string
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          archetype_slug?: string | null
          category_scores?: Json
          dimension_scores?: Json
          framework_slug?: string
          framework_version?: string
          gap_list?: Json
          id?: string
          mode?: string
          overall_certainty?: number
          overall_similarity?: number
          peer_ids?: string[]
          project_id?: string
          run_at?: string
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualification_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualification_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualification_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_issuances: {
        Row: {
          assignment_id: string
          created_at: string
          credit_amount: number
          fund_id: string
          id: string
          issued_by: string
          reason: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          credit_amount: number
          fund_id: string
          id?: string
          issued_by: string
          reason?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          credit_amount?: number
          fund_id?: string
          id?: string
          issued_by?: string
          reason?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_issuances_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_issuances_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_issuances_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_issuances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_issuances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_documents: {
        Row: {
          content: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_indexed: boolean | null
          metadata: Json | null
          semantic_tags: string[] | null
          tenant_id: string
          title: string | null
          updated_at: string | null
          vox_id: string | null
          vox_indexed_at: string | null
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_indexed?: boolean | null
          metadata?: Json | null
          semantic_tags?: string[] | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          vox_id?: string | null
          vox_indexed_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_indexed?: boolean | null
          metadata?: Json | null
          semantic_tags?: string[] | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          vox_id?: string | null
          vox_indexed_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semantic_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_relationships: {
        Row: {
          created_at: string | null
          from_entity_id: string
          from_entity_type: string
          id: string
          metadata: Json | null
          relationship_type: string
          semantic_score: number | null
          tenant_id: string
          to_entity_id: string
          to_entity_type: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          from_entity_id: string
          from_entity_type: string
          id?: string
          metadata?: Json | null
          relationship_type: string
          semantic_score?: number | null
          tenant_id: string
          to_entity_id: string
          to_entity_type: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          from_entity_id?: string
          from_entity_type?: string
          id?: string
          metadata?: Json | null
          relationship_type?: string
          semantic_score?: number | null
          tenant_id?: string
          to_entity_id?: string
          to_entity_type?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "semantic_relationships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_channels: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          integration_id: string
          owner_central_id: string
          provider: string
          requesting_apps: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          integration_id: string
          owner_central_id: string
          provider: string
          requesting_apps?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          integration_id?: string
          owner_central_id?: string
          provider?: string
          requesting_apps?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_channels_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_channels_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_outbox: {
        Row: {
          action: string
          attempt_count: number
          created_at: string
          dedupe_key: string | null
          desired_container_id: string | null
          id: string
          last_error: string | null
          local_id: string
          local_type: string
          next_run_at: string
          owner_central_id: string
          payload: Json
          provider: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action: string
          attempt_count?: number
          created_at?: string
          dedupe_key?: string | null
          desired_container_id?: string | null
          id?: string
          last_error?: string | null
          local_id: string
          local_type: string
          next_run_at?: string
          owner_central_id: string
          payload?: Json
          provider: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          attempt_count?: number
          created_at?: string
          dedupe_key?: string | null
          desired_container_id?: string | null
          id?: string
          last_error?: string | null
          local_id?: string
          local_type?: string
          next_run_at?: string
          owner_central_id?: string
          payload?: Json
          provider?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_outbox_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          container_id: string
          created_at: string
          cursor_type: string
          cursor_value: string | null
          id: string
          last_polled_at: string | null
          owner_central_id: string
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          container_id: string
          created_at?: string
          cursor_type?: string
          cursor_value?: string | null
          id?: string
          last_polled_at?: string | null
          owner_central_id: string
          provider: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          container_id?: string
          created_at?: string
          cursor_type?: string
          cursor_value?: string | null
          id?: string
          last_polled_at?: string | null
          owner_central_id?: string
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_state_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_central_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_central_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_central_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_by_central_id: string
          assignee_central_id: string
          created_at: string
          id: string
          task_note_id: string
          tenant_id: string
        }
        Insert: {
          assigned_by_central_id: string
          assignee_central_id: string
          created_at?: string
          id?: string
          task_note_id: string
          tenant_id: string
        }
        Update: {
          assigned_by_central_id?: string
          assignee_central_id?: string
          created_at?: string
          id?: string
          task_note_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assigned_by_central_id_fkey"
            columns: ["assigned_by_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_assignee_central_id_fkey"
            columns: ["assignee_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_note_id_fkey"
            columns: ["task_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          id: string
          invited_at: string | null
          joined_at: string | null
          left_at: string | null
          metadata: Json | null
          role: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          left_at?: string | null
          metadata?: Json | null
          role?: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          left_at?: string | null
          metadata?: Json | null
          role?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          display_name: string | null
          enabled_apps: string[] | null
          enabled_capabilities: string[] | null
          feature_flags: Json | null
          id: string
          metadata: Json | null
          name: string
          policies: Json | null
          semantic_namespace: string | null
          slug: string | null
          status: string
          ui_config: Json | null
          updated_at: string | null
        }
        Insert: {
          branding?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          display_name?: string | null
          enabled_apps?: string[] | null
          enabled_capabilities?: string[] | null
          feature_flags?: Json | null
          id?: string
          metadata?: Json | null
          name: string
          policies?: Json | null
          semantic_namespace?: string | null
          slug?: string | null
          status?: string
          ui_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          branding?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          display_name?: string | null
          enabled_apps?: string[] | null
          enabled_capabilities?: string[] | null
          feature_flags?: Json | null
          id?: string
          metadata?: Json | null
          name?: string
          policies?: Json | null
          semantic_namespace?: string | null
          slug?: string | null
          status?: string
          ui_config?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          last_error: string | null
          metadata: Json
          owner_central_id: string
          provider: string
          provider_account_id: string
          refresh_token: string | null
          scopes: string[] | null
          status: string | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          owner_central_id: string
          provider: string
          provider_account_id: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          owner_central_id?: string
          provider?: string
          provider_account_id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_integrations_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          accent_hsl: string
          altitude: number
          gradient_from_hsl: string
          gradient_to_hsl: string
          language: string
          skin_config: Json
          theme_config: Json
          theme_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_hsl?: string
          altitude?: number
          gradient_from_hsl?: string
          gradient_to_hsl?: string
          language?: string
          skin_config?: Json
          theme_config?: Json
          theme_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_hsl?: string
          altitude?: number
          gradient_from_hsl?: string
          gradient_to_hsl?: string
          language?: string
          skin_config?: Json
          theme_config?: Json
          theme_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_accounts: {
        Row: {
          central_user_id: string
          created_at: string
          tenant_id: string
        }
        Insert: {
          central_user_id: string
          created_at?: string
          tenant_id: string
        }
        Update: {
          central_user_id?: string
          created_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_accounts_central_user_id_fkey"
            columns: ["central_user_id"]
            isOneToOne: true
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          account_central_user_id: string
          amount_credits: number
          bundle_id: string | null
          chat_session_id: string | null
          created_at: string
          credit_state: Database["public"]["Enums"]["credit_state"] | null
          credit_status: string | null
          entry_type: string
          fund_id: string | null
          id: string
          issuance_id: string | null
          metadata: Json
          note_id: string | null
          objective_id: string | null
          payable: boolean
          project_id: string | null
          tenant_id: string
        }
        Insert: {
          account_central_user_id: string
          amount_credits: number
          bundle_id?: string | null
          chat_session_id?: string | null
          created_at?: string
          credit_state?: Database["public"]["Enums"]["credit_state"] | null
          credit_status?: string | null
          entry_type: string
          fund_id?: string | null
          id?: string
          issuance_id?: string | null
          metadata?: Json
          note_id?: string | null
          objective_id?: string | null
          payable?: boolean
          project_id?: string | null
          tenant_id: string
        }
        Update: {
          account_central_user_id?: string
          amount_credits?: number
          bundle_id?: string | null
          chat_session_id?: string | null
          created_at?: string
          credit_state?: Database["public"]["Enums"]["credit_state"] | null
          credit_status?: string | null
          entry_type?: string
          fund_id?: string | null
          id?: string
          issuance_id?: string | null
          metadata?: Json
          note_id?: string | null
          objective_id?: string | null
          payable?: boolean
          project_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_account_central_user_id_fkey"
            columns: ["account_central_user_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "reward_issuances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          context: Json
          created_at: string | null
          error: string | null
          id: string
          result: Json | null
          retry_count: number
          started_at: string | null
          status: string
          step_cursor: string | null
          tenant_id: string
          trigger_event_id: string | null
          triggered_by: string
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json
          created_at?: string | null
          error?: string | null
          id?: string
          result?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          step_cursor?: string | null
          tenant_id: string
          trigger_event_id?: string | null
          triggered_by: string
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          context?: Json
          created_at?: string | null
          error?: string | null
          id?: string
          result?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          step_cursor?: string | null
          tenant_id?: string
          trigger_event_id?: string | null
          triggered_by?: string
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_trigger_event_id_fkey"
            columns: ["trigger_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_executions: {
        Row: {
          capability_id: string | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          execution_id: string
          id: string
          input: Json
          output: Json | null
          retry_count: number
          started_at: string | null
          status: string
          step_id: string
          tenant_id: string
        }
        Insert: {
          capability_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          execution_id: string
          id?: string
          input?: Json
          output?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          step_id: string
          tenant_id: string
        }
        Update: {
          capability_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          execution_id?: string
          id?: string
          input?: Json
          output?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          step_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_executions_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          created_at: string | null
          created_by: string
          event_type: string
          filter_conditions: Json | null
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          event_type: string
          filter_conditions?: Json | null
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          event_type?: string
          filter_conditions?: Json | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_triggers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_central_id: string
          steps: Json
          tenant_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          version: string | null
          visibility_scope: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_central_id: string
          steps: Json
          tenant_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
          version?: string | null
          visibility_scope?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_central_id?: string
          steps?: Json
          tenant_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          version?: string | null
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_owner_central_id_fkey"
            columns: ["owner_central_id"]
            isOneToOne: false
            referencedRelation: "central_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          slug: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          slug: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          slug?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _assert_authenticated: { Args: never; Returns: undefined }
      _audit_append: {
        Args: {
          p_actor_central_id: string
          p_after_data: Json
          p_before_data: Json
          p_object_id: string
          p_object_type: string
          p_operation: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      _finalize_objective: {
        Args: {
          p_actor_id: string
          p_objective_id: string
          p_resolution: string
        }
        Returns: undefined
      }
      accept_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      accept_objective_agreement: {
        Args: { p_assignment_id: string }
        Returns: Json
      }
      add_project_member: {
        Args: {
          p_actor_id: string
          p_project_id: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      archive_objective_note: {
        Args: { p_note_id: string; p_objective_id: string }
        Returns: undefined
      }
      assign_to_note: {
        Args: {
          p_actor_id: string
          p_note_id: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      can_access_capability: {
        Args: {
          p_action?: string
          p_capability_id: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          allowed: boolean
          policy_id: string
          reason: string
        }[]
      }
      cancel_objective_agreement: {
        Args: { p_objective_id: string }
        Returns: Json
      }
      check_content_access: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_user_id: string
        }
        Returns: {
          access_level: string
          access_source: string
          can_access: boolean
        }[]
      }
      confirm_objective_completion: {
        Args: { p_objective_id: string }
        Returns: Json
      }
      create_objective: {
        Args: {
          p_category?: string
          p_description?: string
          p_detail?: Json
          p_dimension?: string
          p_project_id: string
          p_title: string
        }
        Returns: {
          category: string | null
          completion_deadline: string | null
          completion_initiated_at: string | null
          completion_resolution: string | null
          completion_round: number
          created_at: string | null
          credit_value: number | null
          description: string | null
          detail: Json
          dimension: string | null
          end_date: string | null
          id: string
          is_restricted: boolean
          objective_total_value: number | null
          owner_central_id: string
          project_id: string
          sort_order: number | null
          start_date: string | null
          status: string | null
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string | null
          value_distribution_locked: boolean
          value_mode: Database["public"]["Enums"]["value_mode"]
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
        }
        SetofOptions: {
          from: "*"
          to: "objectives"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_project_from_chat: {
        Args: {
          p_actor_id: string
          p_description: string
          p_tenant_id: string
          p_title: string
        }
        Returns: string
      }
      current_central_id: { Args: never; Returns: string }
      current_user_tenant_ids: { Args: never; Returns: string[] }
      enqueue_workflow_execution: {
        Args: {
          p_context?: Json
          p_tenant_id: string
          p_trigger_event_id?: string
          p_triggered_by: string
          p_workflow_id: string
        }
        Returns: string
      }
      ensure_general_objects: {
        Args: { p_tenant_id: string }
        Returns: {
          objective_id: string
          project_id: string
        }[]
      }
      get_accessible_capabilities: {
        Args: { p_agent_id?: string; p_tenant_id: string }
        Returns: {
          capability_id: string
          capability_name: string
        }[]
      }
      get_collab_role: {
        Args: { _object_id: string; _object_type: string; _user_id: string }
        Returns: string
      }
      get_effective_role: {
        Args: { _object_id: string; _object_type: string; _user_id: string }
        Returns: string
      }
      get_general_objects: {
        Args: { p_tenant_id: string }
        Returns: {
          objective_id: string
          project_id: string
        }[]
      }
      get_note_organization: { Args: { _note_id: string }; Returns: string }
      get_object_project_id: {
        Args: { _object_id: string; _object_type: string }
        Returns: string
      }
      get_objective_organization: {
        Args: { _objective_id: string }
        Returns: string
      }
      get_objective_status: { Args: { p_objective_id: string }; Returns: Json }
      get_pending_workflow_executions: {
        Args: { p_limit?: number; p_tenant_id?: string }
        Returns: {
          context: Json
          created_at: string
          id: string
          tenant_id: string
          triggered_by: string
          workflow_id: string
        }[]
      }
      get_project_organization: {
        Args: { _project_id: string }
        Returns: string
      }
      grant_access: {
        Args: {
          p_access_level?: string
          p_content_id: string
          p_content_type: string
          p_grantee_id: string
          p_grantor_id: string
          p_reason?: string
        }
        Returns: {
          access_rights_id: string
          message: string
          success: boolean
        }[]
      }
      has_collab_access: {
        Args: {
          _min_role?: string
          _object_id: string
          _object_type: string
          _user_id: string
        }
        Returns: boolean
      }
      has_note_role: {
        Args: { p_note_id: string; p_roles: string[]; p_user_id: string }
        Returns: boolean
      }
      has_object_membership: {
        Args: { _object_id: string; _object_type: string; _roles?: string[] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initiate_objective_completion: {
        Args: { p_deadline_hours?: number; p_objective_id: string }
        Returns: Json
      }
      invite_to_object: {
        Args: {
          p_email?: string
          p_is_external?: boolean
          p_message?: string
          p_object_id: string
          p_object_type: string
          p_role: Database["public"]["Enums"]["collab_role"]
          p_user_id?: string
        }
        Returns: string
      }
      is_attachment_readable_by_user: {
        Args: { p_bucket: string; p_name: string; p_uid: string }
        Returns: boolean
      }
      is_object_creator: {
        Args: { _object_id: string; _object_type: string; _user_id: string }
        Returns: boolean
      }
      is_object_owner: {
        Args: { p_object_id: string; p_object_type: string; p_user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member_safe: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_public_attachment: {
        Args: { p_bucket: string; p_name: string }
        Returns: boolean
      }
      is_valid_role: { Args: { r: string }; Returns: boolean }
      is_visibility_allowed: {
        Args: {
          _object_type: string
          _org_id: string
          _requested_visibility: Database["public"]["Enums"]["visibility_scope"]
        }
        Returns: boolean
      }
      link_notes: {
        Args: {
          p_from_note_id: string
          p_link_type?: string
          p_to_note_id: string
        }
        Returns: {
          created_at: string
          from_note_id: string
          id: string
          link_type: string
          owner_central_id: string
          tenant_id: string
          to_note_id: string
        }
        SetofOptions: {
          from: "*"
          to: "note_links"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      manage_tags: {
        Args: {
          p_actor_id: string
          p_entity_id: string
          p_entity_type: string
          p_tags_add?: string[]
          p_tags_remove?: string[]
        }
        Returns: undefined
      }
      mark_objective_complete: {
        Args: { p_objective_id: string }
        Returns: {
          category: string | null
          completion_deadline: string | null
          completion_initiated_at: string | null
          completion_resolution: string | null
          completion_round: number
          created_at: string | null
          credit_value: number | null
          description: string | null
          detail: Json
          dimension: string | null
          end_date: string | null
          id: string
          is_restricted: boolean
          objective_total_value: number | null
          owner_central_id: string
          project_id: string
          sort_order: number | null
          start_date: string | null
          status: string | null
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string | null
          value_distribution_locked: boolean
          value_mode: Database["public"]["Enums"]["value_mode"]
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
        }
        SetofOptions: {
          from: "*"
          to: "objectives"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      owner_close_with_dissent: {
        Args: { p_objective_id: string; p_reason: string }
        Returns: Json
      }
      process_completion_deadline_reminders: {
        Args: { p_tiers?: Json }
        Returns: Json
      }
      promote_objective_to_agreement: {
        Args: {
          p_contract_text: string
          p_contract_title: string
          p_idempotency_key: string
          p_objective_id: string
        }
        Returns: Json
      }
      propose_assignee_removal: {
        Args: {
          p_assignee_id: string
          p_objective_id: string
          p_reason?: string
        }
        Returns: Json
      }
      record_completion_decision: {
        Args: { p_decision: string; p_note?: string; p_objective_id: string }
        Returns: Json
      }
      reject_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      resolve_assignee_removal: {
        Args: {
          p_assignment_id: string
          p_proposal_id: string
          p_resolution: string
        }
        Returns: Json
      }
      revoke_access: {
        Args: { p_access_rights_id: string; p_revoked_by_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      set_objective_timeframe: {
        Args: {
          p_actor_id: string
          p_end_date: string
          p_objective_id: string
          p_start_date: string
        }
        Returns: undefined
      }
      toggle_task_done: {
        Args: { p_done: boolean; p_task_note_id: string }
        Returns: {
          body_html: string
          body_markdown: string
          body_text: string
          created_at: string
          detail: Json
          done: boolean
          id: string
          is_restricted: boolean
          note_type: string
          owner_central_id: string
          preferred_external_container_id: string | null
          price_credits: number
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string
          visibility: string
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
        }
        SetofOptions: {
          from: "*"
          to: "notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_objective: {
        Args: {
          p_category?: string
          p_description?: string
          p_detail?: Json
          p_dimension?: string
          p_objective_id: string
          p_reset_confirmations?: boolean
          p_title?: string
        }
        Returns: {
          category: string | null
          completion_deadline: string | null
          completion_initiated_at: string | null
          completion_resolution: string | null
          completion_round: number
          created_at: string | null
          credit_value: number | null
          description: string | null
          detail: Json
          dimension: string | null
          end_date: string | null
          id: string
          is_restricted: boolean
          objective_total_value: number | null
          owner_central_id: string
          project_id: string
          sort_order: number | null
          start_date: string | null
          status: string | null
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string | null
          value_distribution_locked: boolean
          value_mode: Database["public"]["Enums"]["value_mode"]
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
        }
        SetofOptions: {
          from: "*"
          to: "objectives"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_objective_note: {
        Args: {
          p_body_html?: string
          p_body_markdown?: string
          p_detail?: Json
          p_note_id?: string
          p_note_type?: string
          p_objective_id: string
          p_title?: string
        }
        Returns: {
          body_html: string
          body_markdown: string
          body_text: string
          created_at: string
          detail: Json
          done: boolean
          id: string
          is_restricted: boolean
          note_type: string
          owner_central_id: string
          preferred_external_container_id: string | null
          price_credits: number
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string
          visibility: string
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
        }
        SetofOptions: {
          from: "*"
          to: "notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      visibility_rank: {
        Args: { _scope: Database["public"]["Enums"]["visibility_scope"] }
        Returns: number
      }
    }
    Enums: {
      app_role: "super_admin" | "tenant_admin" | "user"
      assignment_reward_status:
        | "open"
        | "confirmed"
        | "payable"
        | "paid"
        | "cancelled"
      assignment_status:
        | "draft"
        | "invited"
        | "accepted"
        | "declined"
        | "withdrawn"
        | "completed"
        | "cancelled"
      assignment_value_type: "fund_linked" | "informational"
      collab_role: "creator" | "manager" | "editor" | "viewer"
      credit_state:
        | "locked"
        | "available"
        | "redeemable"
        | "listed"
        | "redeemed"
        | "sold"
      fund_status:
        | "draft"
        | "submitted"
        | "approved"
        | "active"
        | "paused"
        | "closed"
      fund_type:
        | "collaboration"
        | "employee"
        | "owner"
        | "advisor"
        | "community"
        | "partner"
        | "custom"
      invitation_status:
        | "pending"
        | "accepted"
        | "declined"
        | "revoked"
        | "expired"
      listing_status: "active" | "sold" | "cancelled" | "expired"
      payout_status:
        | "draft"
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      payout_type:
        | "manual"
        | "milestone"
        | "recurring"
        | "revenue"
        | "reserve"
        | "dividend"
      trade_status: "pending" | "completed" | "cancelled" | "disputed"
      value_mode: "cumulative" | "divided"
      visibility_scope: "project_only" | "organization_only" | "global"
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
      app_role: ["super_admin", "tenant_admin", "user"],
      assignment_reward_status: [
        "open",
        "confirmed",
        "payable",
        "paid",
        "cancelled",
      ],
      assignment_status: [
        "draft",
        "invited",
        "accepted",
        "declined",
        "withdrawn",
        "completed",
        "cancelled",
      ],
      assignment_value_type: ["fund_linked", "informational"],
      collab_role: ["creator", "manager", "editor", "viewer"],
      credit_state: [
        "locked",
        "available",
        "redeemable",
        "listed",
        "redeemed",
        "sold",
      ],
      fund_status: [
        "draft",
        "submitted",
        "approved",
        "active",
        "paused",
        "closed",
      ],
      fund_type: [
        "collaboration",
        "employee",
        "owner",
        "advisor",
        "community",
        "partner",
        "custom",
      ],
      invitation_status: [
        "pending",
        "accepted",
        "declined",
        "revoked",
        "expired",
      ],
      listing_status: ["active", "sold", "cancelled", "expired"],
      payout_status: [
        "draft",
        "pending",
        "approved",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      payout_type: [
        "manual",
        "milestone",
        "recurring",
        "revenue",
        "reserve",
        "dividend",
      ],
      trade_status: ["pending", "completed", "cancelled", "disputed"],
      value_mode: ["cumulative", "divided"],
      visibility_scope: ["project_only", "organization_only", "global"],
    },
  },
} as const
