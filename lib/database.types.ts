export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: Database["public"]["Enums"]["achievement_category"]
          created_at: string
          description: string
          icon_name: string
          id: string
          is_active: boolean
          key: string
          name: string
          requirement: number
          tier: Database["public"]["Enums"]["badge_tier"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          description: string
          icon_name: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          requirement: number
          tier?: Database["public"]["Enums"]["badge_tier"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          requirement?: number
          tier?: Database["public"]["Enums"]["badge_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      allowance_schedules: {
        Row: {
          amount: number
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["frequency"]
          id: string
          is_active: boolean
          is_paused: boolean
          last_processed_at: string | null
          member_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          frequency: Database["public"]["Enums"]["frequency"]
          id?: string
          is_active?: boolean
          is_paused?: boolean
          last_processed_at?: string | null
          member_id: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["frequency"]
          id?: string
          is_active?: boolean
          is_paused?: boolean
          last_processed_at?: string | null
          member_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowance_schedules_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          expires_at: string | null
          family_id: string
          id: string
          ip_address: string | null
          member_id: string | null
          metadata: Json | null
          new_value: Json | null
          previous_value: Json | null
          result: Database["public"]["Enums"]["audit_result"]
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          expires_at?: string | null
          family_id: string
          id?: string
          ip_address?: string | null
          member_id?: string | null
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          result?: Database["public"]["Enums"]["audit_result"]
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          expires_at?: string | null
          family_id?: string
          id?: string
          ip_address?: string | null
          member_id?: string | null
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          result?: Database["public"]["Enums"]["audit_result"]
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json | null
          created_at: string
          created_by_id: string
          description: string | null
          family_id: string
          id: string
          is_enabled: boolean
          name: string
          trigger: Json
          updated_at: string
        }
        Insert: {
          actions: Json
          conditions?: Json | null
          created_at?: string
          created_by_id: string
          description?: string | null
          family_id: string
          id?: string
          is_enabled?: boolean
          name: string
          trigger: Json
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json | null
          created_at?: string
          created_by_id?: string
          description?: string | null
          family_id?: string
          id?: string
          is_enabled?: boolean
          name?: string
          trigger?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_periods: {
        Row: {
          budget_id: string
          created_at: string
          id: string
          period_end: string
          period_key: string
          period_start: string
          spent: number
          updated_at: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          id?: string
          period_end: string
          period_key: string
          period_start: string
          spent?: number
          updated_at?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          id?: string
          period_end?: string
          period_key?: string
          period_start?: string
          spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_periods_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          category: Database["public"]["Enums"]["spending_category"]
          created_at: string
          id: string
          is_active: boolean
          limit_amount: number
          member_id: string
          period: string
          reset_day: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["spending_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          limit_amount: number
          member_id: string
          period: string
          reset_day?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["spending_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          limit_amount?: number
          member_id?: string
          period?: string
          reset_day?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string
          created_at: string
          export_to_google: boolean
          family_id: string
          google_calendar_id: string | null
          google_email: string | null
          id: string
          import_from_google: boolean
          last_successful_sync_at: string | null
          last_sync_at: string | null
          member_id: string
          next_sync_at: string | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          refresh_token: string
          sync_enabled: boolean
          sync_error: string | null
          sync_status: Database["public"]["Enums"]["sync_status"]
          sync_token: string | null
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          export_to_google?: boolean
          family_id: string
          google_calendar_id?: string | null
          google_email?: string | null
          id?: string
          import_from_google?: boolean
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          member_id: string
          next_sync_at?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"]
          refresh_token: string
          sync_enabled?: boolean
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          sync_token?: string | null
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          export_to_google?: boolean
          family_id?: string
          google_calendar_id?: string | null
          google_email?: string | null
          id?: string
          import_from_google?: boolean
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          member_id?: string
          next_sync_at?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"]
          refresh_token?: string
          sync_enabled?: boolean
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          sync_token?: string | null
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_connections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_assignments: {
        Row: {
          created_at: string
          event_id: string
          id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          member_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          calendar_connection_id: string | null
          color: string | null
          created_at: string
          created_by_id: string
          description: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["event_type"]
          external_id: string | null
          external_subscription_id: string | null
          family_id: string
          google_event_id: string | null
          id: string
          is_all_day: boolean
          last_synced_at: string | null
          location: string | null
          project_id: string | null
          start_time: string
          sync_hash: string | null
          title: string
          updated_at: string
        }
        Insert: {
          calendar_connection_id?: string | null
          color?: string | null
          created_at?: string
          created_by_id: string
          description?: string | null
          end_time: string
          event_type?: Database["public"]["Enums"]["event_type"]
          external_id?: string | null
          external_subscription_id?: string | null
          family_id: string
          google_event_id?: string | null
          id?: string
          is_all_day?: boolean
          last_synced_at?: string | null
          location?: string | null
          project_id?: string | null
          start_time: string
          sync_hash?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          calendar_connection_id?: string | null
          color?: string | null
          created_at?: string
          created_by_id?: string
          description?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          external_id?: string | null
          external_subscription_id?: string | null
          family_id?: string
          google_event_id?: string | null
          id?: string
          is_all_day?: boolean
          last_synced_at?: string | null
          location?: string | null
          project_id?: string | null
          start_time?: string
          sync_hash?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calendar_events_connection"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calendar_events_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calendar_events_subscription"
            columns: ["external_subscription_id"]
            isOneToOne: false
            referencedRelation: "external_calendar_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_logs: {
        Row: {
          calendar_connection_id: string | null
          created_at: string
          duration: number | null
          error_message: string | null
          events_added: number
          events_deleted: number
          events_skipped: number
          events_updated: number
          external_subscription_id: string | null
          family_id: string
          id: string
          status: string
          sync_direction: Database["public"]["Enums"]["sync_direction"]
        }
        Insert: {
          calendar_connection_id?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          events_added?: number
          events_deleted?: number
          events_skipped?: number
          events_updated?: number
          external_subscription_id?: string | null
          family_id: string
          id?: string
          status: string
          sync_direction: Database["public"]["Enums"]["sync_direction"]
        }
        Update: {
          calendar_connection_id?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          events_added?: number
          events_deleted?: number
          events_skipped?: number
          events_updated?: number
          external_subscription_id?: string | null
          family_id?: string
          id?: string
          status?: string
          sync_direction?: Database["public"]["Enums"]["sync_direction"]
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_logs_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_logs_external_subscription_id_fkey"
            columns: ["external_subscription_id"]
            isOneToOne: false
            referencedRelation: "external_calendar_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      carpool_groups: {
        Row: {
          created_at: string
          family_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carpool_groups_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      carpool_members: {
        Row: {
          carpool_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          carpool_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          carpool_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carpool_members_carpool_id_fkey"
            columns: ["carpool_id"]
            isOneToOne: false
            referencedRelation: "carpool_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_assignments: {
        Row: {
          chore_schedule_id: string
          created_at: string
          id: string
          is_active: boolean
          member_id: string
          rotation_order: number | null
          updated_at: string
        }
        Insert: {
          chore_schedule_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_id: string
          rotation_order?: number | null
          updated_at?: string
        }
        Update: {
          chore_schedule_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_id?: string
          rotation_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_assignments_chore_schedule_id_fkey"
            columns: ["chore_schedule_id"]
            isOneToOne: false
            referencedRelation: "chore_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_definitions: {
        Row: {
          created_at: string
          credit_value: number
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          estimated_minutes: number
          family_id: string
          icon_name: string
          id: string
          instructions: string | null
          is_active: boolean
          minimum_age: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_value?: number
          description?: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          estimated_minutes: number
          family_id: string
          icon_name?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          minimum_age?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_value?: number
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          estimated_minutes?: number
          family_id?: string
          icon_name?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          minimum_age?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_definitions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_instances: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          assigned_to_id: string
          chore_schedule_id: string
          completed_at: string | null
          completed_by_id: string | null
          created_at: string
          credits_awarded: number | null
          due_date: string
          id: string
          notes: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["chore_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          assigned_to_id: string
          chore_schedule_id: string
          completed_at?: string | null
          completed_by_id?: string | null
          created_at?: string
          credits_awarded?: number | null
          due_date: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["chore_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          assigned_to_id?: string
          chore_schedule_id?: string
          completed_at?: string | null
          completed_by_id?: string | null
          created_at?: string
          credits_awarded?: number | null
          due_date?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["chore_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_instances_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_instances_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_instances_chore_schedule_id_fkey"
            columns: ["chore_schedule_id"]
            isOneToOne: false
            referencedRelation: "chore_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_instances_completed_by_id_fkey"
            columns: ["completed_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_schedules: {
        Row: {
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          chore_definition_id: string
          created_at: string
          custom_cron: string | null
          day_of_week: number | null
          frequency: Database["public"]["Enums"]["frequency"]
          id: string
          is_active: boolean
          requires_approval: boolean
          requires_photo: boolean
          updated_at: string
        }
        Insert: {
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          chore_definition_id: string
          created_at?: string
          custom_cron?: string | null
          day_of_week?: number | null
          frequency: Database["public"]["Enums"]["frequency"]
          id?: string
          is_active?: boolean
          requires_approval?: boolean
          requires_photo?: boolean
          updated_at?: string
        }
        Update: {
          assignment_type?: Database["public"]["Enums"]["assignment_type"]
          chore_definition_id?: string
          created_at?: string
          custom_cron?: string | null
          day_of_week?: number | null
          frequency?: Database["public"]["Enums"]["frequency"]
          id?: string
          is_active?: boolean
          requires_approval?: boolean
          requires_photo?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_schedules_chore_definition_id_fkey"
            columns: ["chore_definition_id"]
            isOneToOne: false
            referencedRelation: "chore_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          expires_at: string | null
          family_id: string
          id: string
          image_url: string | null
          is_pinned: boolean
          title: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          expires_at?: string | null
          family_id: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          title?: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          expires_at?: string | null
          family_id?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          title?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_posts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balances: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          lifetime_earned: number
          lifetime_spent: number
          member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_balances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          adjusted_by_id: string | null
          amount: number
          balance_after: number
          category: Database["public"]["Enums"]["spending_category"]
          created_at: string
          id: string
          member_id: string
          reason: string | null
          related_chore_instance_id: string | null
          type: Database["public"]["Enums"]["credit_transaction_type"]
        }
        Insert: {
          adjusted_by_id?: string | null
          amount: number
          balance_after: number
          category?: Database["public"]["Enums"]["spending_category"]
          created_at?: string
          id?: string
          member_id: string
          reason?: string | null
          related_chore_instance_id?: string | null
          type: Database["public"]["Enums"]["credit_transaction_type"]
        }
        Update: {
          adjusted_by_id?: string | null
          amount?: number
          balance_after?: number
          category?: Database["public"]["Enums"]["spending_category"]
          created_at?: string
          id?: string
          member_id?: string
          reason?: string | null
          related_chore_instance_id?: string | null
          type?: Database["public"]["Enums"]["credit_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_adjusted_by_id_fkey"
            columns: ["adjusted_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          layout: Json
          member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout: Json
          member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_logs: {
        Row: {
          accessed_at: string
          accessed_by: string | null
          document_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          via_share_link: string | null
        }
        Insert: {
          accessed_at?: string
          accessed_by?: string | null
          document_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          via_share_link?: string | null
        }
        Update: {
          accessed_at?: string
          accessed_by?: string | null
          document_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          via_share_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_logs_accessed_by_fkey"
            columns: ["accessed_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_share_links: {
        Row: {
          access_count: number
          created_at: string
          created_by: string
          document_id: string
          expires_at: string
          id: string
          last_accessed_at: string | null
          max_access: number | null
          password: string | null
          revoked_at: string | null
          revoked_by: string | null
          token: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          created_by: string
          document_id: string
          expires_at: string
          id?: string
          last_accessed_at?: string | null
          max_access?: number | null
          password?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token: string
        }
        Update: {
          access_count?: number
          created_at?: string
          created_by?: string
          document_id?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          max_access?: number | null
          password?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_share_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          document_id: string
          file_url: string
          id: string
          notes: string | null
          uploaded_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          document_id: string
          file_url: string
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by: string
          version: number
        }
        Update: {
          document_id?: string
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          access_list: string[] | null
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          document_number: string | null
          expires_at: string | null
          family_id: string
          file_size: number
          file_url: string
          id: string
          issued_date: string | null
          mime_type: string
          name: string
          notes: string | null
          tags: string[] | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          access_list?: string[] | null
          category: Database["public"]["Enums"]["document_category"]
          created_at?: string
          document_number?: string | null
          expires_at?: string | null
          family_id: string
          file_size: number
          file_url: string
          id?: string
          issued_date?: string | null
          mime_type: string
          name: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          access_list?: string[] | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          document_number?: string | null
          expires_at?: string | null
          family_id?: string
          file_size?: number
          file_url?: string
          id?: string
          issued_date?: string | null
          mime_type?: string
          name?: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      external_calendar_subscriptions: {
        Row: {
          color: string
          created_at: string
          created_by_id: string
          description: string | null
          etag: string | null
          family_id: string
          id: string
          is_active: boolean
          last_successful_sync_at: string | null
          last_sync_at: string | null
          name: string
          next_sync_at: string | null
          refresh_interval: number
          sync_error: string | null
          sync_status: Database["public"]["Enums"]["sync_status"]
          updated_at: string
          url: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by_id: string
          description?: string | null
          etag?: string | null
          family_id: string
          id?: string
          is_active?: boolean
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          name: string
          next_sync_at?: string | null
          refresh_interval?: number
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          updated_at?: string
          url: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by_id?: string
          description?: string | null
          etag?: string | null
          family_id?: string
          id?: string
          is_active?: boolean
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          name?: string
          next_sync_at?: string | null
          refresh_interval?: number
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_calendar_subscriptions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_calendar_subscriptions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          settings: Json | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          settings?: Json | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          settings?: Json | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          family_id: string
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          password_hash: string | null
          pin: string | null
          role: Database["public"]["Enums"]["role"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          family_id: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name: string
          password_hash?: string | null
          pin?: string | null
          role: Database["public"]["Enums"]["role"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          family_id?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          password_hash?: string | null
          pin?: string | null
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          deleted_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          family_id: string
          file_size_bytes: number
          id: string
          is_public: boolean
          mime_type: string
          original_filename: string
          storage_path: string
          storage_provider: Database["public"]["Enums"]["storage_provider"]
          thumbnail_path: string | null
          uploaded_at: string
          uploaded_by_id: string
        }
        Insert: {
          deleted_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          family_id: string
          file_size_bytes: number
          id?: string
          is_public?: boolean
          mime_type: string
          original_filename: string
          storage_path: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          thumbnail_path?: string | null
          uploaded_at?: string
          uploaded_by_id: string
        }
        Update: {
          deleted_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          family_id?: string
          file_size_bytes?: number
          id?: string
          is_public?: boolean
          mime_type?: string
          original_filename?: string
          storage_path?: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          thumbnail_path?: string | null
          uploaded_at?: string
          uploaded_by_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_uploads_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      grace_period_logs: {
        Row: {
          approved_by_id: string | null
          id: string
          member_id: string
          minutes_granted: number
          reason: string | null
          related_transaction_id: string | null
          repaid_at: string | null
          repayment_status: Database["public"]["Enums"]["repayment_status"]
          requested_at: string
        }
        Insert: {
          approved_by_id?: string | null
          id?: string
          member_id: string
          minutes_granted: number
          reason?: string | null
          related_transaction_id?: string | null
          repaid_at?: string | null
          repayment_status?: Database["public"]["Enums"]["repayment_status"]
          requested_at?: string
        }
        Update: {
          approved_by_id?: string | null
          id?: string
          member_id?: string
          minutes_granted?: number
          reason?: string | null
          related_transaction_id?: string | null
          repaid_at?: string | null
          repayment_status?: Database["public"]["Enums"]["repayment_status"]
          requested_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grace_period_logs_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grace_period_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_invites: {
        Row: {
          access_level: Database["public"]["Enums"]["guest_access_level"]
          created_at: string
          expires_at: string
          family_id: string
          guest_email: string | null
          guest_name: string
          id: string
          invite_code: string
          invite_token: string
          invited_by_id: string
          last_accessed_at: string | null
          max_uses: number
          revoked_at: string | null
          status: Database["public"]["Enums"]["invite_status"]
          use_count: number
        }
        Insert: {
          access_level: Database["public"]["Enums"]["guest_access_level"]
          created_at?: string
          expires_at: string
          family_id: string
          guest_email?: string | null
          guest_name: string
          id?: string
          invite_code: string
          invite_token: string
          invited_by_id: string
          last_accessed_at?: string | null
          max_uses?: number
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          use_count?: number
        }
        Update: {
          access_level?: Database["public"]["Enums"]["guest_access_level"]
          created_at?: string
          expires_at?: string
          family_id?: string
          guest_email?: string | null
          guest_name?: string
          id?: string
          invite_code?: string
          invite_token?: string
          invited_by_id?: string
          last_accessed_at?: string | null
          max_uses?: number
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "guest_invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_invites_invited_by_id_fkey"
            columns: ["invited_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          ended_at: string | null
          expires_at: string
          guest_invite_id: string
          id: string
          ip_address: string
          session_token: string
          started_at: string
          user_agent: string
        }
        Insert: {
          ended_at?: string | null
          expires_at: string
          guest_invite_id: string
          id?: string
          ip_address: string
          session_token: string
          started_at?: string
          user_agent: string
        }
        Update: {
          ended_at?: string | null
          expires_at?: string
          guest_invite_id?: string
          id?: string
          ip_address?: string
          session_token?: string
          started_at?: string
          user_agent?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_guest_invite_id_fkey"
            columns: ["guest_invite_id"]
            isOneToOne: false
            referencedRelation: "guest_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      health_events: {
        Row: {
          created_at: string
          ended_at: string | null
          event_type: Database["public"]["Enums"]["health_event_type"]
          id: string
          member_id: string
          notes: string | null
          severity: number | null
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          event_type: Database["public"]["Enums"]["health_event_type"]
          id?: string
          member_id: string
          notes?: string | null
          severity?: number | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          event_type?: Database["public"]["Enums"]["health_event_type"]
          id?: string
          member_id?: string
          notes?: string | null
          severity?: number | null
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      health_medications: {
        Row: {
          dosage: string
          given_at: string
          given_by: string
          health_event_id: string
          id: string
          medication_name: string
          next_dose_at: string | null
          notes: string | null
        }
        Insert: {
          dosage: string
          given_at: string
          given_by: string
          health_event_id: string
          id?: string
          medication_name: string
          next_dose_at?: string | null
          notes?: string | null
        }
        Update: {
          dosage?: string
          given_at?: string
          given_by?: string
          health_event_id?: string
          id?: string
          medication_name?: string
          next_dose_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_medications_health_event_id_fkey"
            columns: ["health_event_id"]
            isOneToOne: false
            referencedRelation: "health_events"
            referencedColumns: ["id"]
          },
        ]
      }
      health_symptoms: {
        Row: {
          health_event_id: string
          id: string
          notes: string | null
          recorded_at: string
          severity: number
          symptom_type: Database["public"]["Enums"]["symptom_type"]
        }
        Insert: {
          health_event_id: string
          id?: string
          notes?: string | null
          recorded_at?: string
          severity: number
          symptom_type: Database["public"]["Enums"]["symptom_type"]
        }
        Update: {
          health_event_id?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          severity?: number
          symptom_type?: Database["public"]["Enums"]["symptom_type"]
        }
        Relationships: [
          {
            foreignKeyName: "health_symptoms_health_event_id_fkey"
            columns: ["health_event_id"]
            isOneToOne: false
            referencedRelation: "health_events"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string
          current_quantity: number
          expires_at: string | null
          family_id: string
          id: string
          last_restocked_at: string | null
          location: Database["public"]["Enums"]["inventory_location"]
          low_stock_threshold: number | null
          name: string
          notes: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          current_quantity?: number
          expires_at?: string | null
          family_id: string
          id?: string
          last_restocked_at?: string | null
          location: Database["public"]["Enums"]["inventory_location"]
          low_stock_threshold?: number | null
          name: string
          notes?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          current_quantity?: number
          expires_at?: string | null
          family_id?: string
          id?: string
          last_restocked_at?: string | null
          location?: Database["public"]["Enums"]["inventory_location"]
          low_stock_threshold?: number | null
          name?: string
          notes?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_sessions: {
        Row: {
          auto_lock_minutes: number
          created_at: string
          current_member_id: string | null
          device_id: string
          family_id: string
          id: string
          is_active: boolean
          last_activity_at: string
          session_token: string
          updated_at: string
        }
        Insert: {
          auto_lock_minutes?: number
          created_at?: string
          current_member_id?: string | null
          device_id: string
          family_id: string
          id?: string
          is_active?: boolean
          last_activity_at?: string
          session_token?: string
          updated_at?: string
        }
        Update: {
          auto_lock_minutes?: number
          created_at?: string
          current_member_id?: string | null
          device_id?: string
          family_id?: string
          id?: string
          is_active?: boolean
          last_activity_at?: string
          session_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_sessions_current_member_id_fkey"
            columns: ["current_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_sessions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_settings: {
        Row: {
          allow_guest_view: boolean
          auto_lock_minutes: number
          created_at: string
          enabled_widgets: string[] | null
          family_id: string
          id: string
          is_enabled: boolean
          require_pin_for_switch: boolean
          updated_at: string
        }
        Insert: {
          allow_guest_view?: boolean
          auto_lock_minutes?: number
          created_at?: string
          enabled_widgets?: string[] | null
          family_id: string
          id?: string
          is_enabled?: boolean
          require_pin_for_switch?: boolean
          updated_at?: string
        }
        Update: {
          allow_guest_view?: boolean
          auto_lock_minutes?: number
          created_at?: string
          enabled_widgets?: string[] | null
          family_id?: string
          id?: string
          is_enabled?: boolean
          require_pin_for_switch?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_settings_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_entries: {
        Row: {
          created_at: string
          family_id: string
          id: string
          period: string
          period_key: string
          rank: number | null
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          period: string
          period_key: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          period?: string
          period_key?: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      leftovers: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          family_id: string
          id: string
          meal_plan_entry_id: string | null
          name: string
          notes: string | null
          quantity: string | null
          stored_at: string
          tossed_at: string | null
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          family_id: string
          id?: string
          meal_plan_entry_id?: string | null
          name: string
          notes?: string | null
          quantity?: string | null
          stored_at?: string
          tossed_at?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          family_id?: string
          id?: string
          meal_plan_entry_id?: string | null
          name?: string
          notes?: string | null
          quantity?: string | null
          stored_at?: string
          tossed_at?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leftovers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leftovers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_completions: {
        Row: {
          completed_at: string
          completed_by: string
          cost: number | null
          id: string
          maintenance_item_id: string
          notes: string | null
          photo_urls: string[] | null
          service_provider: string | null
        }
        Insert: {
          completed_at?: string
          completed_by: string
          cost?: number | null
          id?: string
          maintenance_item_id: string
          notes?: string | null
          photo_urls?: string[] | null
          service_provider?: string | null
        }
        Update: {
          completed_at?: string
          completed_by?: string
          cost?: number | null
          id?: string
          maintenance_item_id?: string
          notes?: string | null
          photo_urls?: string[] | null
          service_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_completions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_completions_maintenance_item_id_fkey"
            columns: ["maintenance_item_id"]
            isOneToOne: false
            referencedRelation: "maintenance_items"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_items: {
        Row: {
          category: Database["public"]["Enums"]["maintenance_category"]
          created_at: string
          description: string | null
          estimated_cost: number | null
          family_id: string
          frequency: string
          id: string
          last_completed_at: string | null
          name: string
          next_due_at: string | null
          notes: string | null
          season: Database["public"]["Enums"]["season"] | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["maintenance_category"]
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          family_id: string
          frequency: string
          id?: string
          last_completed_at?: string | null
          name: string
          next_due_at?: string | null
          notes?: string | null
          season?: Database["public"]["Enums"]["season"] | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["maintenance_category"]
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          family_id?: string
          frequency?: string
          id?: string
          last_completed_at?: string | null
          name?: string
          next_due_at?: string | null
          notes?: string | null
          season?: Database["public"]["Enums"]["season"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_dishes: {
        Row: {
          created_at: string
          dish_name: string
          id: string
          meal_entry_id: string
          recipe_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dish_name: string
          id?: string
          meal_entry_id: string
          recipe_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dish_name?: string
          id?: string
          meal_entry_id?: string
          recipe_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_meal_plan_dishes_recipe"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_dishes_meal_entry_id_fkey"
            columns: ["meal_entry_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_entries: {
        Row: {
          created_at: string
          custom_name: string | null
          date: string
          id: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string | null
          recipe_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          date: string
          id?: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          recipe_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          date?: string
          id?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          recipe_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_entries_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          family_id: string
          id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_profiles: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          conditions: string[] | null
          id: string
          medications: string[] | null
          member_id: string
          updated_at: string
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          conditions?: string[] | null
          id?: string
          medications?: string[] | null
          member_id: string
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          conditions?: string[] | null
          id?: string
          medications?: string[] | null
          member_id?: string
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_doses: {
        Row: {
          dosage: string
          given_at: string
          given_by: string
          id: string
          medication_safety_id: string
          notes: string | null
          override_approved_by: string | null
          override_reason: string | null
          was_override: boolean
        }
        Insert: {
          dosage: string
          given_at?: string
          given_by: string
          id?: string
          medication_safety_id: string
          notes?: string | null
          override_approved_by?: string | null
          override_reason?: string | null
          was_override?: boolean
        }
        Update: {
          dosage?: string
          given_at?: string
          given_by?: string
          id?: string
          medication_safety_id?: string
          notes?: string | null
          override_approved_by?: string | null
          override_reason?: string | null
          was_override?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "medication_doses_medication_safety_id_fkey"
            columns: ["medication_safety_id"]
            isOneToOne: false
            referencedRelation: "medication_safety"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_safety: {
        Row: {
          active_ingredient: string | null
          created_at: string
          id: string
          last_dose_at: string | null
          max_doses_per_day: number | null
          medication_name: string
          member_id: string
          min_interval_hours: number
          next_dose_available_at: string | null
          notify_when_ready: boolean
          updated_at: string
        }
        Insert: {
          active_ingredient?: string | null
          created_at?: string
          id?: string
          last_dose_at?: string | null
          max_doses_per_day?: number | null
          medication_name: string
          member_id: string
          min_interval_hours: number
          next_dose_available_at?: string | null
          notify_when_ready?: boolean
          updated_at?: string
        }
        Update: {
          active_ingredient?: string | null
          created_at?: string
          id?: string
          last_dose_at?: string | null
          max_doses_per_day?: number | null
          medication_name?: string
          member_id?: string
          min_interval_hours?: number
          next_dose_available_at?: string | null
          notify_when_ready?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_safety_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_module_access: {
        Row: {
          created_at: string
          has_access: boolean
          id: string
          member_id: string
          module_id: Database["public"]["Enums"]["module_id"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_access?: boolean
          id?: string
          member_id: string
          module_id: Database["public"]["Enums"]["module_id"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_access?: boolean
          id?: string
          member_id?: string
          module_id?: Database["public"]["Enums"]["module_id"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_module_access_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      module_configurations: {
        Row: {
          created_at: string
          disabled_at: string | null
          enabled_at: string | null
          family_id: string
          id: string
          is_enabled: boolean
          module_id: Database["public"]["Enums"]["module_id"]
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          enabled_at?: string | null
          family_id: string
          id?: string
          is_enabled?: boolean
          module_id: Database["public"]["Enums"]["module_id"]
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          enabled_at?: string | null
          family_id?: string
          id?: string
          is_enabled?: boolean
          module_id?: Database["public"]["Enums"]["module_id"]
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_configurations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          carpool_reminder_minutes: number
          created_at: string
          document_expiring_days: number
          enabled_types: string[] | null
          id: string
          in_app_enabled: boolean
          leftover_expiring_hours: number
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carpool_reminder_minutes?: number
          created_at?: string
          document_expiring_days?: number
          enabled_types?: string[] | null
          id?: string
          in_app_enabled?: boolean
          leftover_expiring_hours?: number
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carpool_reminder_minutes?: number
          created_at?: string
          document_expiring_days?: number
          enabled_types?: string[] | null
          id?: string
          in_app_enabled?: boolean
          leftover_expiring_hours?: number
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_feedings: {
        Row: {
          amount: string | null
          created_at: string
          fed_at: string
          fed_by: string
          food_type: string | null
          id: string
          notes: string | null
          pet_id: string
        }
        Insert: {
          amount?: string | null
          created_at?: string
          fed_at?: string
          fed_by: string
          food_type?: string | null
          id?: string
          notes?: string | null
          pet_id: string
        }
        Update: {
          amount?: string | null
          created_at?: string
          fed_at?: string
          fed_by?: string
          food_type?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_feedings_fed_by_fkey"
            columns: ["fed_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_feedings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_medication_doses: {
        Row: {
          created_at: string
          dosage: string
          given_at: string
          given_by: string
          id: string
          medication_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          dosage: string
          given_at?: string
          given_by: string
          id?: string
          medication_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          dosage?: string
          given_at?: string
          given_by?: string
          id?: string
          medication_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_medication_doses_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "pet_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_medications: {
        Row: {
          created_at: string
          dosage: string
          frequency: string
          id: string
          is_active: boolean
          last_given_at: string | null
          last_given_by: string | null
          medication_name: string
          min_interval_hours: number | null
          next_dose_at: string | null
          notes: string | null
          pet_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dosage: string
          frequency: string
          id?: string
          is_active?: boolean
          last_given_at?: string | null
          last_given_by?: string | null
          medication_name: string
          min_interval_hours?: number | null
          next_dose_at?: string | null
          notes?: string | null
          pet_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dosage?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_given_at?: string | null
          last_given_by?: string | null
          medication_name?: string
          min_interval_hours?: number | null
          next_dose_at?: string | null
          notes?: string | null
          pet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_medications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_vet_visits: {
        Row: {
          cost: number | null
          created_at: string
          diagnosis: string | null
          id: string
          next_visit: string | null
          notes: string | null
          pet_id: string
          reason: string
          treatment: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          next_visit?: string | null
          notes?: string | null
          pet_id: string
          reason: string
          treatment?: string | null
          updated_at?: string
          visit_date: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          next_visit?: string | null
          notes?: string | null
          pet_id?: string
          reason?: string
          treatment?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_vet_visits_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_weights: {
        Row: {
          id: string
          notes: string | null
          pet_id: string
          recorded_at: string
          unit: string
          weight: number
        }
        Insert: {
          id?: string
          notes?: string | null
          pet_id: string
          recorded_at?: string
          unit: string
          weight: number
        }
        Update: {
          id?: string
          notes?: string | null
          pet_id?: string
          recorded_at?: string
          unit?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_weights_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          birthday: string | null
          breed: string | null
          created_at: string
          family_id: string
          id: string
          image_url: string | null
          name: string
          notes: string | null
          species: Database["public"]["Enums"]["pet_species"]
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          breed?: string | null
          created_at?: string
          family_id: string
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          species: Database["public"]["Enums"]["pet_species"]
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          breed?: string | null
          created_at?: string
          family_id?: string
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          species?: Database["public"]["Enums"]["pet_species"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pets_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          member_id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          member_id: string
          post_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          member_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "communication_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_hours: number | null
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          name: string
          notes: string | null
          project_id: string
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          created_at: string
          created_by_id: string
          description: string | null
          due_date: string | null
          family_id: string
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          created_by_id: string
          description?: string | null
          due_date?: string | null
          family_id: string
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          created_by_id?: string
          description?: string | null
          due_date?: string | null
          family_id?: string
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          name: string
          notes: string | null
          quantity: number | null
          recipe_id: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          id?: string
          name: string
          notes?: string | null
          quantity?: number | null
          recipe_id: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          id?: string
          name?: string
          notes?: string | null
          quantity?: number | null
          recipe_id?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ratings: {
        Row: {
          created_at: string
          id: string
          member_id: string
          notes: string | null
          rating: number
          recipe_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          rating: number
          recipe_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          rating?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ratings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ratings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: Database["public"]["Enums"]["recipe_category"] | null
          cook_time_minutes: number | null
          created_at: string
          created_by: string
          description: string | null
          dietary_tags: Database["public"]["Enums"]["dietary_tag"][] | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          family_id: string
          id: string
          image_url: string | null
          instructions: string
          is_favorite: boolean
          name: string
          notes: string | null
          prep_time_minutes: number | null
          servings: number
          source_url: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["recipe_category"] | null
          cook_time_minutes?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          dietary_tags?: Database["public"]["Enums"]["dietary_tag"][] | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          family_id: string
          id?: string
          image_url?: string | null
          instructions: string
          is_favorite?: boolean
          name: string
          notes?: string | null
          prep_time_minutes?: number | null
          servings?: number
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["recipe_category"] | null
          cook_time_minutes?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          dietary_tags?: Database["public"]["Enums"]["dietary_tag"][] | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          family_id?: string
          id?: string
          image_url?: string | null
          instructions?: string
          is_favorite?: boolean
          name?: string
          notes?: string | null
          prep_time_minutes?: number | null
          servings?: number
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_items: {
        Row: {
          category: Database["public"]["Enums"]["reward_category"]
          cost_credits: number
          created_at: string
          created_by_id: string
          description: string | null
          family_id: string
          id: string
          image_url: string | null
          name: string
          quantity: number | null
          status: Database["public"]["Enums"]["reward_status"]
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["reward_category"]
          cost_credits: number
          created_at?: string
          created_by_id: string
          description?: string | null
          family_id: string
          id?: string
          image_url?: string | null
          name: string
          quantity?: number | null
          status?: Database["public"]["Enums"]["reward_status"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["reward_category"]
          cost_credits?: number
          created_at?: string
          created_by_id?: string
          description?: string | null
          family_id?: string
          id?: string
          image_url?: string | null
          name?: string
          quantity?: number | null
          status?: Database["public"]["Enums"]["reward_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_items_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          credit_transaction_id: string | null
          fulfilled_at: string | null
          fulfilled_by_id: string | null
          id: string
          member_id: string
          notes: string | null
          rejected_at: string | null
          rejected_by_id: string | null
          rejection_reason: string | null
          requested_at: string
          reward_id: string
          status: Database["public"]["Enums"]["redemption_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          credit_transaction_id?: string | null
          fulfilled_at?: string | null
          fulfilled_by_id?: string | null
          id?: string
          member_id: string
          notes?: string | null
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reward_id: string
          status?: Database["public"]["Enums"]["redemption_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          credit_transaction_id?: string | null
          fulfilled_at?: string | null
          fulfilled_by_id?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reward_id?: string
          status?: Database["public"]["Enums"]["redemption_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_fulfilled_by_id_fkey"
            columns: ["fulfilled_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_rejected_by_id_fkey"
            columns: ["rejected_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_completions: {
        Row: {
          completed_at: string
          date: string
          id: string
          member_id: string
          routine_id: string
        }
        Insert: {
          completed_at?: string
          date: string
          id?: string
          member_id: string
          routine_id: string
        }
        Update: {
          completed_at?: string
          date?: string
          id?: string
          member_id?: string
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_completions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_completions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_steps: {
        Row: {
          estimated_minutes: number | null
          icon: string | null
          id: string
          name: string
          routine_id: string
          sort_order: number
        }
        Insert: {
          estimated_minutes?: number | null
          icon?: string | null
          id?: string
          name: string
          routine_id: string
          sort_order?: number
        }
        Update: {
          estimated_minutes?: number | null
          icon?: string | null
          id?: string
          name?: string
          routine_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_steps_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          assigned_to: string | null
          created_at: string
          family_id: string
          id: string
          is_weekday: boolean
          is_weekend: boolean
          name: string
          type: Database["public"]["Enums"]["routine_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          family_id: string
          id?: string
          is_weekday?: boolean
          is_weekend?: boolean
          name: string
          type: Database["public"]["Enums"]["routine_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          family_id?: string
          id?: string
          is_weekday?: boolean
          is_weekend?: boolean
          name?: string
          type?: Database["public"]["Enums"]["routine_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_executions: {
        Row: {
          error: string | null
          executed_at: string
          id: string
          metadata: Json | null
          result: Json | null
          rule_id: string
          success: boolean
        }
        Insert: {
          error?: string | null
          executed_at?: string
          id?: string
          metadata?: Json | null
          result?: Json | null
          rule_id: string
          success: boolean
        }
        Update: {
          error?: string | null
          executed_at?: string
          id?: string
          metadata?: Json | null
          result?: Json | null
          rule_id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rule_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          color: string
          completed_at: string | null
          created_at: string
          current_amount: number
          deadline: string | null
          description: string | null
          icon_name: string
          id: string
          is_completed: boolean
          member_id: string
          name: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          color?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          description?: string | null
          icon_name?: string
          id?: string
          is_completed?: boolean
          member_id: string
          name: string
          target_amount: number
          updated_at?: string
        }
        Update: {
          color?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          description?: string | null
          icon_name?: string
          id?: string
          is_completed?: boolean
          member_id?: string
          name?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_time_allowances: {
        Row: {
          allowance_minutes: number
          created_at: string
          id: string
          member_id: string
          period: Database["public"]["Enums"]["screen_time_period"]
          rollover_cap_minutes: number | null
          rollover_enabled: boolean
          screen_time_type_id: string
          updated_at: string
        }
        Insert: {
          allowance_minutes: number
          created_at?: string
          id?: string
          member_id: string
          period?: Database["public"]["Enums"]["screen_time_period"]
          rollover_cap_minutes?: number | null
          rollover_enabled?: boolean
          screen_time_type_id: string
          updated_at?: string
        }
        Update: {
          allowance_minutes?: number
          created_at?: string
          id?: string
          member_id?: string
          period?: Database["public"]["Enums"]["screen_time_period"]
          rollover_cap_minutes?: number | null
          rollover_enabled?: boolean
          screen_time_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_allowances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_time_allowances_screen_time_type_id_fkey"
            columns: ["screen_time_type_id"]
            isOneToOne: false
            referencedRelation: "screen_time_types"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_time_balances: {
        Row: {
          created_at: string
          current_balance_minutes: number
          id: string
          member_id: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          current_balance_minutes: number
          id?: string
          member_id: string
          updated_at?: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          current_balance_minutes?: number
          id?: string
          member_id?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_balances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_time_grace_settings: {
        Row: {
          created_at: string
          grace_period_minutes: number
          grace_repayment_mode: Database["public"]["Enums"]["grace_repayment_mode"]
          id: string
          low_balance_warning_minutes: number
          max_grace_per_day: number
          max_grace_per_week: number
          member_id: string
          requires_approval: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          grace_period_minutes?: number
          grace_repayment_mode?: Database["public"]["Enums"]["grace_repayment_mode"]
          id?: string
          low_balance_warning_minutes?: number
          max_grace_per_day?: number
          max_grace_per_week?: number
          member_id: string
          requires_approval?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          grace_period_minutes?: number
          grace_repayment_mode?: Database["public"]["Enums"]["grace_repayment_mode"]
          id?: string
          low_balance_warning_minutes?: number
          max_grace_per_day?: number
          max_grace_per_week?: number
          member_id?: string
          requires_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_grace_settings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_time_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          member_id: string
          reset_day: Database["public"]["Enums"]["reset_day"]
          rollover_cap_minutes: number | null
          rollover_type: Database["public"]["Enums"]["rollover_type"]
          updated_at: string
          weekly_allocation_minutes: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_id: string
          reset_day?: Database["public"]["Enums"]["reset_day"]
          rollover_cap_minutes?: number | null
          rollover_type?: Database["public"]["Enums"]["rollover_type"]
          updated_at?: string
          weekly_allocation_minutes: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_id?: string
          reset_day?: Database["public"]["Enums"]["reset_day"]
          rollover_cap_minutes?: number | null
          rollover_type?: Database["public"]["Enums"]["rollover_type"]
          updated_at?: string
          weekly_allocation_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_settings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_time_transactions: {
        Row: {
          amount_minutes: number
          balance_after: number
          created_at: string
          created_by_id: string
          device_type: Database["public"]["Enums"]["device_type"] | null
          id: string
          member_id: string
          notes: string | null
          override_reason: string | null
          reason: string | null
          related_chore_instance_id: string | null
          screen_time_type_id: string | null
          type: Database["public"]["Enums"]["screen_time_transaction_type"]
          was_override: boolean
        }
        Insert: {
          amount_minutes: number
          balance_after: number
          created_at?: string
          created_by_id: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          id?: string
          member_id: string
          notes?: string | null
          override_reason?: string | null
          reason?: string | null
          related_chore_instance_id?: string | null
          screen_time_type_id?: string | null
          type: Database["public"]["Enums"]["screen_time_transaction_type"]
          was_override?: boolean
        }
        Update: {
          amount_minutes?: number
          balance_after?: number
          created_at?: string
          created_by_id?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          id?: string
          member_id?: string
          notes?: string | null
          override_reason?: string | null
          reason?: string | null
          related_chore_instance_id?: string | null
          screen_time_type_id?: string | null
          type?: Database["public"]["Enums"]["screen_time_transaction_type"]
          was_override?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_transactions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_time_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_time_transactions_screen_time_type_id_fkey"
            columns: ["screen_time_type_id"]
            isOneToOne: false
            referencedRelation: "screen_time_types"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_time_types: {
        Row: {
          created_at: string
          description: string | null
          family_id: string
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          family_id: string
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          family_id?: string
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_types_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          added_by_id: string
          category: string | null
          created_at: string
          id: string
          list_id: string
          name: string
          notes: string | null
          priority: Database["public"]["Enums"]["shopping_priority"]
          project_id: string | null
          purchased_at: string | null
          purchased_by_id: string | null
          quantity: number
          requested_by_id: string
          status: Database["public"]["Enums"]["shopping_status"]
          unit: string | null
          updated_at: string
        }
        Insert: {
          added_by_id: string
          category?: string | null
          created_at?: string
          id?: string
          list_id: string
          name: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["shopping_priority"]
          project_id?: string | null
          purchased_at?: string | null
          purchased_by_id?: string | null
          quantity?: number
          requested_by_id: string
          status?: Database["public"]["Enums"]["shopping_status"]
          unit?: string | null
          updated_at?: string
        }
        Update: {
          added_by_id?: string
          category?: string | null
          created_at?: string
          id?: string
          list_id?: string
          name?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["shopping_priority"]
          project_id?: string | null
          purchased_at?: string | null
          purchased_by_id?: string | null
          quantity?: number
          requested_by_id?: string
          status?: Database["public"]["Enums"]["shopping_status"]
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shopping_items_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_added_by_id_fkey"
            columns: ["added_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_purchased_by_id_fkey"
            columns: ["purchased_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_requested_by_id_fkey"
            columns: ["requested_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          family_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      sick_mode_instances: {
        Row: {
          created_at: string
          ended_at: string | null
          ended_by_id: string | null
          family_id: string
          health_event_id: string | null
          id: string
          is_active: boolean
          member_id: string
          notes: string | null
          started_at: string
          triggered_by: Database["public"]["Enums"]["sick_mode_trigger"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          ended_by_id?: string | null
          family_id: string
          health_event_id?: string | null
          id?: string
          is_active?: boolean
          member_id: string
          notes?: string | null
          started_at?: string
          triggered_by: Database["public"]["Enums"]["sick_mode_trigger"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          ended_by_id?: string | null
          family_id?: string
          health_event_id?: string | null
          id?: string
          is_active?: boolean
          member_id?: string
          notes?: string | null
          started_at?: string
          triggered_by?: Database["public"]["Enums"]["sick_mode_trigger"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sick_mode_instances_ended_by_id_fkey"
            columns: ["ended_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sick_mode_instances_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sick_mode_instances_health_event_id_fkey"
            columns: ["health_event_id"]
            isOneToOne: false
            referencedRelation: "health_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sick_mode_instances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      sick_mode_settings: {
        Row: {
          auto_disable_after_24_hours: boolean
          auto_enable_on_temperature: boolean
          created_at: string
          family_id: string
          id: string
          mute_non_essential_notifs: boolean
          pause_chores: boolean
          pause_screen_time_tracking: boolean
          screen_time_bonus: number
          skip_bedtime_routine: boolean
          skip_morning_routine: boolean
          temperature_threshold: number
          updated_at: string
        }
        Insert: {
          auto_disable_after_24_hours?: boolean
          auto_enable_on_temperature?: boolean
          created_at?: string
          family_id: string
          id?: string
          mute_non_essential_notifs?: boolean
          pause_chores?: boolean
          pause_screen_time_tracking?: boolean
          screen_time_bonus?: number
          skip_bedtime_routine?: boolean
          skip_morning_routine?: boolean
          temperature_threshold?: number
          updated_at?: string
        }
        Update: {
          auto_disable_after_24_hours?: boolean
          auto_enable_on_temperature?: boolean
          created_at?: string
          family_id?: string
          id?: string
          mute_non_essential_notifs?: boolean
          pause_chores?: boolean
          pause_screen_time_tracking?: boolean
          screen_time_bonus?: number
          skip_bedtime_routine?: boolean
          skip_morning_routine?: boolean
          temperature_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sick_mode_settings_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          created_at: string
          current_count: number
          frozen_until: string | null
          id: string
          is_active: boolean
          last_activity_date: string | null
          longest_count: number
          type: Database["public"]["Enums"]["streak_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_count?: number
          frozen_until?: string | null
          id?: string
          is_active?: boolean
          last_activity_date?: string | null
          longest_count?: number
          type: Database["public"]["Enums"]["streak_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_count?: number
          frozen_until?: string | null
          id?: string
          is_active?: boolean
          last_activity_date?: string | null
          longest_count?: number
          type?: Database["public"]["Enums"]["streak_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string
          id: string
          onboarding_complete: boolean
          setup_completed_at: string | null
          setup_completed_by: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          setup_completed_at?: string | null
          setup_completed_by?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          setup_completed_at?: string | null
          setup_completed_by?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          blocking_task_id: string
          created_at: string
          dependency_type: Database["public"]["Enums"]["dependency_type"]
          dependent_task_id: string
          id: string
        }
        Insert: {
          blocking_task_id: string
          created_at?: string
          dependency_type?: Database["public"]["Enums"]["dependency_type"]
          dependent_task_id: string
          id?: string
        }
        Update: {
          blocking_task_id?: string
          created_at?: string
          dependency_type?: Database["public"]["Enums"]["dependency_type"]
          dependent_task_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_blocking_task_id_fkey"
            columns: ["blocking_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_dependent_task_id_fkey"
            columns: ["dependent_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      temperature_logs: {
        Row: {
          id: string
          member_id: string
          method: Database["public"]["Enums"]["temp_method"]
          notes: string | null
          recorded_at: string
          temperature: number
        }
        Insert: {
          id?: string
          member_id: string
          method: Database["public"]["Enums"]["temp_method"]
          notes?: string | null
          recorded_at?: string
          temperature: number
        }
        Update: {
          id?: string
          member_id?: string
          method?: Database["public"]["Enums"]["temp_method"]
          notes?: string | null
          recorded_at?: string
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "temperature_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_items: {
        Row: {
          assigned_to_id: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by_id: string
          description: string | null
          due_date: string | null
          family_id: string
          id: string
          is_recurring: boolean
          notes: string | null
          priority: Database["public"]["Enums"]["todo_priority"]
          status: Database["public"]["Enums"]["todo_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_id: string
          description?: string | null
          due_date?: string | null
          family_id: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          priority?: Database["public"]["Enums"]["todo_priority"]
          status?: Database["public"]["Enums"]["todo_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_id?: string
          description?: string | null
          due_date?: string | null
          family_id?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          priority?: Database["public"]["Enums"]["todo_priority"]
          status?: Database["public"]["Enums"]["todo_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_items_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_drivers: {
        Row: {
          created_at: string
          family_id: string
          id: string
          name: string
          phone: string | null
          relationship: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          name: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_drivers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_locations: {
        Row: {
          address: string | null
          created_at: string
          family_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          family_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_locations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_schedules: {
        Row: {
          carpool_id: string | null
          created_at: string
          day_of_week: number
          driver_id: string | null
          family_id: string
          id: string
          is_active: boolean
          location_id: string | null
          member_id: string
          notes: string | null
          time: string
          type: Database["public"]["Enums"]["transport_type"]
          updated_at: string
        }
        Insert: {
          carpool_id?: string | null
          created_at?: string
          day_of_week: number
          driver_id?: string | null
          family_id: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          member_id: string
          notes?: string | null
          time: string
          type: Database["public"]["Enums"]["transport_type"]
          updated_at?: string
        }
        Update: {
          carpool_id?: string | null
          created_at?: string
          day_of_week?: number
          driver_id?: string | null
          family_id?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          member_id?: string
          notes?: string | null
          time?: string
          type?: Database["public"]["Enums"]["transport_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_schedules_carpool_id_fkey"
            columns: ["carpool_id"]
            isOneToOne: false
            referencedRelation: "carpool_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "transport_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_schedules_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "transport_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_schedules_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_chore: {
        Args: { p_approved_by_id: string; p_instance_id: string }
        Returns: Json
      }
      complete_chore_with_credits: {
        Args: {
          p_completed_by_id: string
          p_instance_id: string
          p_notes?: string
          p_photo_url?: string
        }
        Returns: Json
      }
      generate_daily_chore_instances: { Args: never; Returns: number }
      get_family_id_from_chore_schedule: {
        Args: { schedule_id: string }
        Returns: string
      }
      get_family_id_from_meal_plan_entry: {
        Args: { plan_id: string }
        Returns: string
      }
      get_family_id_from_member: {
        Args: { member_id: string }
        Returns: string
      }
      get_family_id_from_project_task: {
        Args: { project_id: string }
        Returns: string
      }
      get_family_id_from_routine_step: {
        Args: { routine_id: string }
        Returns: string
      }
      get_family_id_from_shopping_item: {
        Args: { list_id: string }
        Returns: string
      }
      get_member_in_family: {
        Args: { check_family_id: string }
        Returns: string
      }
      get_role_in_family: {
        Args: { check_family_id: string }
        Returns: Database["public"]["Enums"]["role"]
      }
      get_user_family_ids: { Args: never; Returns: string[] }
      has_active_kiosk_session: {
        Args: { check_family_id: string }
        Returns: boolean
      }
      is_member_of_family: {
        Args: { check_family_id: string }
        Returns: boolean
      }
      is_owner: { Args: { owner_member_id: string }; Returns: boolean }
      is_parent_in_family: {
        Args: { check_family_id: string }
        Returns: boolean
      }
      redeem_reward: {
        Args: { p_member_id: string; p_reward_id: string }
        Returns: Json
      }
      reset_weekly_screen_time: { Args: never; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      achievement_category:
        | "CHORES"
        | "CREDITS"
        | "STREAKS"
        | "SOCIAL"
        | "SPECIAL"
      assignment_type: "FIXED" | "ROTATING" | "OPT_IN"
      audit_action:
        | "LOGIN"
        | "LOGOUT"
        | "LOGIN_FAILED"
        | "PASSWORD_CHANGE"
        | "PIN_CHANGE"
        | "SESSION_EXPIRED"
        | "MEMBER_ADDED"
        | "MEMBER_REMOVED"
        | "MEMBER_UPDATED"
        | "ROLE_CHANGED"
        | "CHORE_COMPLETED"
        | "CHORE_APPROVED"
        | "CHORE_REJECTED"
        | "CHORE_ASSIGNED"
        | "CREDITS_AWARDED"
        | "CREDITS_DEDUCTED"
        | "REWARD_REDEEMED"
        | "REWARD_APPROVED"
        | "SCREENTIME_LOGGED"
        | "SCREENTIME_ADJUSTED"
        | "GRACE_PERIOD_USED"
        | "SCREENTIME_TYPE_CREATED"
        | "SCREENTIME_TYPE_UPDATED"
        | "SCREENTIME_TYPE_ARCHIVED"
        | "SCREENTIME_TYPE_DELETED"
        | "SCREENTIME_ALLOWANCE_UPDATED"
        | "ROUTINE_CREATED"
        | "ROUTINE_UPDATED"
        | "ROUTINE_DELETED"
        | "ROUTINE_COMPLETED"
        | "POST_CREATED"
        | "POST_UPDATED"
        | "POST_DELETED"
        | "POST_PINNED"
        | "POST_UNPINNED"
        | "MEAL_PLAN_CREATED"
        | "MEAL_ENTRY_ADDED"
        | "MEAL_ENTRY_UPDATED"
        | "MEAL_ENTRY_DELETED"
        | "LEFTOVER_LOGGED"
        | "LEFTOVER_MARKED_USED"
        | "LEFTOVER_MARKED_TOSSED"
        | "RECIPE_CREATED"
        | "RECIPE_UPDATED"
        | "RECIPE_DELETED"
        | "RECIPE_RATED"
        | "PET_ADDED"
        | "PET_UPDATED"
        | "PET_DELETED"
        | "PET_FED"
        | "PET_MEDICATION_GIVEN"
        | "PET_VET_VISIT_LOGGED"
        | "PET_WEIGHT_LOGGED"
        | "INVENTORY_ITEM_ADDED"
        | "INVENTORY_ITEM_UPDATED"
        | "INVENTORY_ITEM_DELETED"
        | "INVENTORY_QUANTITY_ADJUSTED"
        | "INVENTORY_ITEM_RESTOCKED"
        | "MAINTENANCE_ITEM_CREATED"
        | "MAINTENANCE_ITEM_UPDATED"
        | "MAINTENANCE_ITEM_DELETED"
        | "MAINTENANCE_TASK_COMPLETED"
        | "GUEST_INVITE_CREATED"
        | "GUEST_INVITE_REVOKED"
        | "GUEST_SESSION_STARTED"
        | "GUEST_SESSION_ENDED"
        | "GUEST_ACCESS_DENIED"
        | "KIOSK_SESSION_STARTED"
        | "KIOSK_SESSION_ENDED"
        | "KIOSK_MEMBER_SWITCHED"
        | "KIOSK_AUTO_LOCKED"
        | "KIOSK_SETTINGS_UPDATED"
        | "TRANSPORT_SCHEDULE_CREATED"
        | "TRANSPORT_SCHEDULE_UPDATED"
        | "TRANSPORT_SCHEDULE_DELETED"
        | "TRANSPORT_LOCATION_ADDED"
        | "TRANSPORT_DRIVER_ADDED"
        | "CARPOOL_GROUP_CREATED"
        | "CARPOOL_MEMBER_ADDED"
        | "TRANSPORT_CONFIRMED"
        | "DOCUMENT_UPLOADED"
        | "DOCUMENT_UPDATED"
        | "DOCUMENT_DELETED"
        | "DOCUMENT_ACCESSED"
        | "DOCUMENT_SHARED"
        | "DOCUMENT_SHARE_ACCESSED"
        | "MEDICATION_SAFETY_CREATED"
        | "MEDICATION_DOSE_LOGGED"
        | "MEDICATION_DOSE_OVERRIDE"
        | "MEDICATION_SAFETY_UPDATED"
        | "MEDICATION_SAFETY_DELETED"
        | "HEALTH_EVENT_CREATED"
        | "HEALTH_EVENT_UPDATED"
        | "HEALTH_EVENT_ENDED"
        | "HEALTH_SYMPTOM_LOGGED"
        | "HEALTH_MEDICATION_GIVEN"
        | "TEMPERATURE_LOGGED"
        | "MEDICAL_PROFILE_UPDATED"
        | "SICK_MODE_STARTED"
        | "SICK_MODE_ENDED"
        | "SICK_MODE_SETTINGS_UPDATED"
        | "SICK_MODE_AUTO_TRIGGERED"
        | "SHOPPING_ITEM_ADDED"
        | "SHOPPING_ITEM_UPDATED"
        | "SHOPPING_ITEM_DELETED"
        | "RULE_CREATED"
        | "RULE_UPDATED"
        | "RULE_DELETED"
        | "RULE_ENABLED"
        | "RULE_DISABLED"
        | "RULE_EXECUTED"
        | "RULE_TEST_RUN"
        | "PROJECT_CREATED"
        | "PROJECT_UPDATED"
        | "PROJECT_DELETED"
        | "PROJECT_STATUS_CHANGED"
        | "PROJECT_TASK_CREATED"
        | "PROJECT_TASK_UPDATED"
        | "PROJECT_TASK_DELETED"
        | "PROJECT_TASK_STATUS_CHANGED"
        | "PROJECT_DEPENDENCY_ADDED"
        | "PROJECT_DEPENDENCY_REMOVED"
        | "SETTINGS_CHANGED"
        | "MODULE_ENABLED"
        | "MODULE_DISABLED"
        | "RATE_LIMIT_HIT"
        | "AUTH_DENIED"
        | "SUSPICIOUS_ACTIVITY"
      audit_result: "SUCCESS" | "FAILURE" | "DENIED"
      badge_tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND"
      calendar_provider: "GOOGLE" | "OUTLOOK" | "APPLE"
      chore_status:
        | "PENDING"
        | "COMPLETED"
        | "APPROVED"
        | "REJECTED"
        | "SKIPPED"
      credit_transaction_type:
        | "CHORE_REWARD"
        | "BONUS"
        | "SCREENTIME_PURCHASE"
        | "REWARD_REDEMPTION"
        | "ADJUSTMENT"
        | "TRANSFER"
      dependency_type: "FINISH_TO_START" | "START_TO_START" | "BLOCKING"
      device_type: "TV" | "TABLET" | "PHONE" | "COMPUTER" | "GAMING" | "OTHER"
      dietary_tag:
        | "VEGETARIAN"
        | "VEGAN"
        | "GLUTEN_FREE"
        | "DAIRY_FREE"
        | "NUT_FREE"
        | "EGG_FREE"
        | "SOY_FREE"
        | "LOW_CARB"
        | "KETO"
        | "PALEO"
      difficulty: "EASY" | "MEDIUM" | "HARD"
      document_category:
        | "IDENTITY"
        | "MEDICAL"
        | "FINANCIAL"
        | "HOUSEHOLD"
        | "EDUCATION"
        | "LEGAL"
        | "PETS"
        | "OTHER"
      entity_type:
        | "AVATAR"
        | "CHORE_PROOF"
        | "BOARD_IMAGE"
        | "PET_PHOTO"
        | "MAINTENANCE_PHOTO"
        | "DOCUMENT"
      event_type: "INTERNAL" | "GOOGLE" | "OUTLOOK" | "APPLE"
      frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM"
      grace_repayment_mode: "DEDUCT_NEXT_WEEK" | "EARN_BACK" | "FORGIVE"
      guest_access_level: "VIEW_ONLY" | "LIMITED" | "CAREGIVER"
      health_event_type:
        | "ILLNESS"
        | "INJURY"
        | "DOCTOR_VISIT"
        | "WELLNESS_CHECK"
        | "VACCINATION"
        | "OTHER"
      inventory_category:
        | "FOOD_PANTRY"
        | "FOOD_FRIDGE"
        | "FOOD_FREEZER"
        | "CLEANING"
        | "TOILETRIES"
        | "PAPER_GOODS"
        | "MEDICINE"
        | "PET_SUPPLIES"
        | "OTHER"
      inventory_location:
        | "PANTRY"
        | "FRIDGE"
        | "FREEZER"
        | "BATHROOM"
        | "GARAGE"
        | "LAUNDRY_ROOM"
        | "KITCHEN_CABINET"
        | "OTHER"
      invite_status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED"
      maintenance_category:
        | "HVAC"
        | "PLUMBING"
        | "ELECTRICAL"
        | "EXTERIOR"
        | "INTERIOR"
        | "LAWN_GARDEN"
        | "APPLIANCES"
        | "SAFETY"
        | "SEASONAL"
        | "OTHER"
      meal_type: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"
      module_id:
        | "CHORES"
        | "SCREEN_TIME"
        | "CREDITS"
        | "SHOPPING"
        | "CALENDAR"
        | "TODOS"
        | "ROUTINES"
        | "MEAL_PLANNING"
        | "RECIPES"
        | "INVENTORY"
        | "HEALTH"
        | "PROJECTS"
        | "COMMUNICATION"
        | "TRANSPORT"
        | "PETS"
        | "MAINTENANCE"
        | "DOCUMENTS"
        | "FINANCIAL"
        | "LEADERBOARD"
        | "RULES_ENGINE"
      notification_type:
        | "CHORE_COMPLETED"
        | "CHORE_APPROVED"
        | "CHORE_REJECTED"
        | "CHORE_ASSIGNED"
        | "REWARD_REQUESTED"
        | "REWARD_APPROVED"
        | "REWARD_REJECTED"
        | "CREDITS_EARNED"
        | "CREDITS_SPENT"
        | "SCREENTIME_ADJUSTED"
        | "SCREENTIME_LOW"
        | "TODO_ASSIGNED"
        | "SHOPPING_REQUEST"
        | "GENERAL"
        | "LEFTOVER_EXPIRING"
        | "DOCUMENT_EXPIRING"
        | "MEDICATION_AVAILABLE"
        | "ROUTINE_TIME"
        | "MAINTENANCE_DUE"
        | "PET_CARE_REMINDER"
        | "CARPOOL_REMINDER"
        | "SAVINGS_GOAL_ACHIEVED"
        | "BUSY_DAY_ALERT"
        | "RULE_TRIGGERED"
      pet_species:
        | "DOG"
        | "CAT"
        | "BIRD"
        | "FISH"
        | "HAMSTER"
        | "RABBIT"
        | "GUINEA_PIG"
        | "REPTILE"
        | "OTHER"
      post_type: "ANNOUNCEMENT" | "KUDOS" | "NOTE" | "PHOTO"
      project_status: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED"
      recipe_category:
        | "BREAKFAST"
        | "LUNCH"
        | "DINNER"
        | "DESSERT"
        | "SNACK"
        | "SIDE"
        | "APPETIZER"
        | "DRINK"
      redemption_status: "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED"
      repayment_status: "PENDING" | "DEDUCTED" | "EARNED_BACK" | "FORGIVEN"
      reset_day:
        | "SUNDAY"
        | "MONDAY"
        | "TUESDAY"
        | "WEDNESDAY"
        | "THURSDAY"
        | "FRIDAY"
        | "SATURDAY"
      reward_category:
        | "PRIVILEGE"
        | "ITEM"
        | "EXPERIENCE"
        | "SCREEN_TIME"
        | "OTHER"
      reward_status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK"
      role: "PARENT" | "CHILD" | "GUEST"
      rollover_type: "NONE" | "FULL" | "CAPPED"
      routine_type:
        | "MORNING"
        | "BEDTIME"
        | "HOMEWORK"
        | "AFTER_SCHOOL"
        | "CUSTOM"
      screen_time_period: "DAILY" | "WEEKLY"
      screen_time_transaction_type:
        | "ALLOCATION"
        | "EARNED"
        | "SPENT"
        | "ADJUSTMENT"
        | "ROLLOVER"
        | "GRACE_BORROWED"
        | "GRACE_REPAID"
      season: "SPRING" | "SUMMER" | "FALL" | "WINTER"
      shopping_priority: "NORMAL" | "NEEDED_SOON" | "URGENT"
      shopping_status: "PENDING" | "IN_CART" | "PURCHASED" | "REMOVED"
      sick_mode_trigger: "MANUAL" | "AUTO_FROM_HEALTH_EVENT"
      spending_category:
        | "REWARDS"
        | "SCREEN_TIME"
        | "SAVINGS"
        | "TRANSFER"
        | "OTHER"
      storage_provider: "LOCAL" | "S3" | "CLOUDFLARE"
      streak_type:
        | "DAILY_CHORES"
        | "WEEKLY_CHORES"
        | "PERFECT_WEEK"
        | "REWARD_SAVER"
      symptom_type:
        | "FEVER"
        | "COUGH"
        | "SORE_THROAT"
        | "RUNNY_NOSE"
        | "HEADACHE"
        | "STOMACH_ACHE"
        | "VOMITING"
        | "DIARRHEA"
        | "RASH"
        | "FATIGUE"
        | "LOSS_OF_APPETITE"
        | "OTHER"
      sync_direction: "IMPORT" | "EXPORT" | "BOTH"
      sync_status: "ACTIVE" | "PAUSED" | "ERROR" | "DISCONNECTED"
      task_status:
        | "PENDING"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "BLOCKED"
        | "CANCELLED"
      temp_method: "ORAL" | "RECTAL" | "ARMPIT" | "EAR" | "FOREHEAD"
      todo_priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      todo_status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
      transport_type: "PICKUP" | "DROPOFF"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      achievement_category: [
        "CHORES",
        "CREDITS",
        "STREAKS",
        "SOCIAL",
        "SPECIAL",
      ],
      assignment_type: ["FIXED", "ROTATING", "OPT_IN"],
      audit_action: [
        "LOGIN",
        "LOGOUT",
        "LOGIN_FAILED",
        "PASSWORD_CHANGE",
        "PIN_CHANGE",
        "SESSION_EXPIRED",
        "MEMBER_ADDED",
        "MEMBER_REMOVED",
        "MEMBER_UPDATED",
        "ROLE_CHANGED",
        "CHORE_COMPLETED",
        "CHORE_APPROVED",
        "CHORE_REJECTED",
        "CHORE_ASSIGNED",
        "CREDITS_AWARDED",
        "CREDITS_DEDUCTED",
        "REWARD_REDEEMED",
        "REWARD_APPROVED",
        "SCREENTIME_LOGGED",
        "SCREENTIME_ADJUSTED",
        "GRACE_PERIOD_USED",
        "SCREENTIME_TYPE_CREATED",
        "SCREENTIME_TYPE_UPDATED",
        "SCREENTIME_TYPE_ARCHIVED",
        "SCREENTIME_TYPE_DELETED",
        "SCREENTIME_ALLOWANCE_UPDATED",
        "ROUTINE_CREATED",
        "ROUTINE_UPDATED",
        "ROUTINE_DELETED",
        "ROUTINE_COMPLETED",
        "POST_CREATED",
        "POST_UPDATED",
        "POST_DELETED",
        "POST_PINNED",
        "POST_UNPINNED",
        "MEAL_PLAN_CREATED",
        "MEAL_ENTRY_ADDED",
        "MEAL_ENTRY_UPDATED",
        "MEAL_ENTRY_DELETED",
        "LEFTOVER_LOGGED",
        "LEFTOVER_MARKED_USED",
        "LEFTOVER_MARKED_TOSSED",
        "RECIPE_CREATED",
        "RECIPE_UPDATED",
        "RECIPE_DELETED",
        "RECIPE_RATED",
        "PET_ADDED",
        "PET_UPDATED",
        "PET_DELETED",
        "PET_FED",
        "PET_MEDICATION_GIVEN",
        "PET_VET_VISIT_LOGGED",
        "PET_WEIGHT_LOGGED",
        "INVENTORY_ITEM_ADDED",
        "INVENTORY_ITEM_UPDATED",
        "INVENTORY_ITEM_DELETED",
        "INVENTORY_QUANTITY_ADJUSTED",
        "INVENTORY_ITEM_RESTOCKED",
        "MAINTENANCE_ITEM_CREATED",
        "MAINTENANCE_ITEM_UPDATED",
        "MAINTENANCE_ITEM_DELETED",
        "MAINTENANCE_TASK_COMPLETED",
        "GUEST_INVITE_CREATED",
        "GUEST_INVITE_REVOKED",
        "GUEST_SESSION_STARTED",
        "GUEST_SESSION_ENDED",
        "GUEST_ACCESS_DENIED",
        "KIOSK_SESSION_STARTED",
        "KIOSK_SESSION_ENDED",
        "KIOSK_MEMBER_SWITCHED",
        "KIOSK_AUTO_LOCKED",
        "KIOSK_SETTINGS_UPDATED",
        "TRANSPORT_SCHEDULE_CREATED",
        "TRANSPORT_SCHEDULE_UPDATED",
        "TRANSPORT_SCHEDULE_DELETED",
        "TRANSPORT_LOCATION_ADDED",
        "TRANSPORT_DRIVER_ADDED",
        "CARPOOL_GROUP_CREATED",
        "CARPOOL_MEMBER_ADDED",
        "TRANSPORT_CONFIRMED",
        "DOCUMENT_UPLOADED",
        "DOCUMENT_UPDATED",
        "DOCUMENT_DELETED",
        "DOCUMENT_ACCESSED",
        "DOCUMENT_SHARED",
        "DOCUMENT_SHARE_ACCESSED",
        "MEDICATION_SAFETY_CREATED",
        "MEDICATION_DOSE_LOGGED",
        "MEDICATION_DOSE_OVERRIDE",
        "MEDICATION_SAFETY_UPDATED",
        "MEDICATION_SAFETY_DELETED",
        "HEALTH_EVENT_CREATED",
        "HEALTH_EVENT_UPDATED",
        "HEALTH_EVENT_ENDED",
        "HEALTH_SYMPTOM_LOGGED",
        "HEALTH_MEDICATION_GIVEN",
        "TEMPERATURE_LOGGED",
        "MEDICAL_PROFILE_UPDATED",
        "SICK_MODE_STARTED",
        "SICK_MODE_ENDED",
        "SICK_MODE_SETTINGS_UPDATED",
        "SICK_MODE_AUTO_TRIGGERED",
        "SHOPPING_ITEM_ADDED",
        "SHOPPING_ITEM_UPDATED",
        "SHOPPING_ITEM_DELETED",
        "RULE_CREATED",
        "RULE_UPDATED",
        "RULE_DELETED",
        "RULE_ENABLED",
        "RULE_DISABLED",
        "RULE_EXECUTED",
        "RULE_TEST_RUN",
        "PROJECT_CREATED",
        "PROJECT_UPDATED",
        "PROJECT_DELETED",
        "PROJECT_STATUS_CHANGED",
        "PROJECT_TASK_CREATED",
        "PROJECT_TASK_UPDATED",
        "PROJECT_TASK_DELETED",
        "PROJECT_TASK_STATUS_CHANGED",
        "PROJECT_DEPENDENCY_ADDED",
        "PROJECT_DEPENDENCY_REMOVED",
        "SETTINGS_CHANGED",
        "MODULE_ENABLED",
        "MODULE_DISABLED",
        "RATE_LIMIT_HIT",
        "AUTH_DENIED",
        "SUSPICIOUS_ACTIVITY",
      ],
      audit_result: ["SUCCESS", "FAILURE", "DENIED"],
      badge_tier: ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"],
      calendar_provider: ["GOOGLE", "OUTLOOK", "APPLE"],
      chore_status: ["PENDING", "COMPLETED", "APPROVED", "REJECTED", "SKIPPED"],
      credit_transaction_type: [
        "CHORE_REWARD",
        "BONUS",
        "SCREENTIME_PURCHASE",
        "REWARD_REDEMPTION",
        "ADJUSTMENT",
        "TRANSFER",
      ],
      dependency_type: ["FINISH_TO_START", "START_TO_START", "BLOCKING"],
      device_type: ["TV", "TABLET", "PHONE", "COMPUTER", "GAMING", "OTHER"],
      dietary_tag: [
        "VEGETARIAN",
        "VEGAN",
        "GLUTEN_FREE",
        "DAIRY_FREE",
        "NUT_FREE",
        "EGG_FREE",
        "SOY_FREE",
        "LOW_CARB",
        "KETO",
        "PALEO",
      ],
      difficulty: ["EASY", "MEDIUM", "HARD"],
      document_category: [
        "IDENTITY",
        "MEDICAL",
        "FINANCIAL",
        "HOUSEHOLD",
        "EDUCATION",
        "LEGAL",
        "PETS",
        "OTHER",
      ],
      entity_type: [
        "AVATAR",
        "CHORE_PROOF",
        "BOARD_IMAGE",
        "PET_PHOTO",
        "MAINTENANCE_PHOTO",
        "DOCUMENT",
      ],
      event_type: ["INTERNAL", "GOOGLE", "OUTLOOK", "APPLE"],
      frequency: ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"],
      grace_repayment_mode: ["DEDUCT_NEXT_WEEK", "EARN_BACK", "FORGIVE"],
      guest_access_level: ["VIEW_ONLY", "LIMITED", "CAREGIVER"],
      health_event_type: [
        "ILLNESS",
        "INJURY",
        "DOCTOR_VISIT",
        "WELLNESS_CHECK",
        "VACCINATION",
        "OTHER",
      ],
      inventory_category: [
        "FOOD_PANTRY",
        "FOOD_FRIDGE",
        "FOOD_FREEZER",
        "CLEANING",
        "TOILETRIES",
        "PAPER_GOODS",
        "MEDICINE",
        "PET_SUPPLIES",
        "OTHER",
      ],
      inventory_location: [
        "PANTRY",
        "FRIDGE",
        "FREEZER",
        "BATHROOM",
        "GARAGE",
        "LAUNDRY_ROOM",
        "KITCHEN_CABINET",
        "OTHER",
      ],
      invite_status: ["PENDING", "ACTIVE", "EXPIRED", "REVOKED"],
      maintenance_category: [
        "HVAC",
        "PLUMBING",
        "ELECTRICAL",
        "EXTERIOR",
        "INTERIOR",
        "LAWN_GARDEN",
        "APPLIANCES",
        "SAFETY",
        "SEASONAL",
        "OTHER",
      ],
      meal_type: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"],
      module_id: [
        "CHORES",
        "SCREEN_TIME",
        "CREDITS",
        "SHOPPING",
        "CALENDAR",
        "TODOS",
        "ROUTINES",
        "MEAL_PLANNING",
        "RECIPES",
        "INVENTORY",
        "HEALTH",
        "PROJECTS",
        "COMMUNICATION",
        "TRANSPORT",
        "PETS",
        "MAINTENANCE",
        "DOCUMENTS",
        "FINANCIAL",
        "LEADERBOARD",
        "RULES_ENGINE",
      ],
      notification_type: [
        "CHORE_COMPLETED",
        "CHORE_APPROVED",
        "CHORE_REJECTED",
        "CHORE_ASSIGNED",
        "REWARD_REQUESTED",
        "REWARD_APPROVED",
        "REWARD_REJECTED",
        "CREDITS_EARNED",
        "CREDITS_SPENT",
        "SCREENTIME_ADJUSTED",
        "SCREENTIME_LOW",
        "TODO_ASSIGNED",
        "SHOPPING_REQUEST",
        "GENERAL",
        "LEFTOVER_EXPIRING",
        "DOCUMENT_EXPIRING",
        "MEDICATION_AVAILABLE",
        "ROUTINE_TIME",
        "MAINTENANCE_DUE",
        "PET_CARE_REMINDER",
        "CARPOOL_REMINDER",
        "SAVINGS_GOAL_ACHIEVED",
        "BUSY_DAY_ALERT",
        "RULE_TRIGGERED",
      ],
      pet_species: [
        "DOG",
        "CAT",
        "BIRD",
        "FISH",
        "HAMSTER",
        "RABBIT",
        "GUINEA_PIG",
        "REPTILE",
        "OTHER",
      ],
      post_type: ["ANNOUNCEMENT", "KUDOS", "NOTE", "PHOTO"],
      project_status: ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"],
      recipe_category: [
        "BREAKFAST",
        "LUNCH",
        "DINNER",
        "DESSERT",
        "SNACK",
        "SIDE",
        "APPETIZER",
        "DRINK",
      ],
      redemption_status: ["PENDING", "APPROVED", "REJECTED", "FULFILLED"],
      repayment_status: ["PENDING", "DEDUCTED", "EARNED_BACK", "FORGIVEN"],
      reset_day: [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ],
      reward_category: [
        "PRIVILEGE",
        "ITEM",
        "EXPERIENCE",
        "SCREEN_TIME",
        "OTHER",
      ],
      reward_status: ["ACTIVE", "INACTIVE", "OUT_OF_STOCK"],
      role: ["PARENT", "CHILD", "GUEST"],
      rollover_type: ["NONE", "FULL", "CAPPED"],
      routine_type: [
        "MORNING",
        "BEDTIME",
        "HOMEWORK",
        "AFTER_SCHOOL",
        "CUSTOM",
      ],
      screen_time_period: ["DAILY", "WEEKLY"],
      screen_time_transaction_type: [
        "ALLOCATION",
        "EARNED",
        "SPENT",
        "ADJUSTMENT",
        "ROLLOVER",
        "GRACE_BORROWED",
        "GRACE_REPAID",
      ],
      season: ["SPRING", "SUMMER", "FALL", "WINTER"],
      shopping_priority: ["NORMAL", "NEEDED_SOON", "URGENT"],
      shopping_status: ["PENDING", "IN_CART", "PURCHASED", "REMOVED"],
      sick_mode_trigger: ["MANUAL", "AUTO_FROM_HEALTH_EVENT"],
      spending_category: [
        "REWARDS",
        "SCREEN_TIME",
        "SAVINGS",
        "TRANSFER",
        "OTHER",
      ],
      storage_provider: ["LOCAL", "S3", "CLOUDFLARE"],
      streak_type: [
        "DAILY_CHORES",
        "WEEKLY_CHORES",
        "PERFECT_WEEK",
        "REWARD_SAVER",
      ],
      symptom_type: [
        "FEVER",
        "COUGH",
        "SORE_THROAT",
        "RUNNY_NOSE",
        "HEADACHE",
        "STOMACH_ACHE",
        "VOMITING",
        "DIARRHEA",
        "RASH",
        "FATIGUE",
        "LOSS_OF_APPETITE",
        "OTHER",
      ],
      sync_direction: ["IMPORT", "EXPORT", "BOTH"],
      sync_status: ["ACTIVE", "PAUSED", "ERROR", "DISCONNECTED"],
      task_status: [
        "PENDING",
        "IN_PROGRESS",
        "COMPLETED",
        "BLOCKED",
        "CANCELLED",
      ],
      temp_method: ["ORAL", "RECTAL", "ARMPIT", "EAR", "FOREHEAD"],
      todo_priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      todo_status: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      transport_type: ["PICKUP", "DROPOFF"],
    },
  },
} as const

