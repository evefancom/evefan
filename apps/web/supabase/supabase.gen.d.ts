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
      _migrations: {
        Row: {
          date: string
          hash: string
          name: string
        }
        Insert: {
          date?: string
          hash: string
          name: string
        }
        Update: {
          date?: string
          hash?: string
          name?: string
        }
        Relationships: []
      }
      connector_config: {
        Row: {
          config: Json
          connector_name: string
          created_at: string
          disabled: boolean | null
          display_name: string | null
          end_user_access: boolean | null
          env_name: string | null
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          connector_name?: string
          created_at?: string
          disabled?: boolean | null
          display_name?: string | null
          end_user_access?: boolean | null
          env_name?: string | null
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          connector_name?: string
          created_at?: string
          disabled?: boolean | null
          display_name?: string | null
          end_user_access?: boolean | null
          env_name?: string | null
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration: {
        Row: {
          connector_name: string
          created_at: string
          external: Json
          id: string
          standard: Json
          updated_at: string
        }
        Insert: {
          connector_name?: string
          created_at?: string
          external?: Json
          id?: string
          standard?: Json
          updated_at?: string
        }
        Update: {
          connector_name?: string
          created_at?: string
          external?: Json
          id?: string
          standard?: Json
          updated_at?: string
        }
        Relationships: []
      }
      pipeline: {
        Row: {
          created_at: string
          destination_id: string | null
          destination_state: Json
          disabled: boolean | null
          id: string
          last_sync_completed_at: string | null
          last_sync_started_at: string | null
          link_options: Json
          source_id: string | null
          source_state: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_id?: string | null
          destination_state?: Json
          disabled?: boolean | null
          id?: string
          last_sync_completed_at?: string | null
          last_sync_started_at?: string | null
          link_options?: Json
          source_id?: string | null
          source_state?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_id?: string | null
          destination_state?: Json
          disabled?: boolean | null
          id?: string
          last_sync_completed_at?: string | null
          last_sync_started_at?: string | null
          link_options?: Json
          source_id?: string | null
          source_state?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_destination_id"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_source_id"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "resource"
            referencedColumns: ["id"]
          }
        ]
      }
      resource: {
        Row: {
          connector_config_id: string | null
          connector_name: string
          created_at: string
          disabled: boolean | null
          display_name: string | null
          end_user_id: string | null
          env_name: string | null
          id: string
          integration_id: string | null
          settings: Json
          updated_at: string
        }
        Insert: {
          connector_config_id?: string | null
          connector_name?: string
          created_at?: string
          disabled?: boolean | null
          display_name?: string | null
          end_user_id?: string | null
          env_name?: string | null
          id?: string
          integration_id?: string | null
          settings?: Json
          updated_at?: string
        }
        Update: {
          connector_config_id?: string | null
          connector_name?: string
          created_at?: string
          disabled?: boolean | null
          display_name?: string | null
          end_user_id?: string | null
          env_name?: string | null
          id?: string
          integration_id?: string | null
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_connector_config_id"
            columns: ["connector_config_id"]
            isOneToOne: false
            referencedRelation: "connector_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_integration_id"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      format_relative_date: {
        Args: {
          date: string
        }
        Returns: string
      }
      generate_ulid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      jsonb_array_to_text_array: {
        Args: {
          _js: Json
        }
        Returns: unknown
      }
      jwt_end_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      jwt_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      jwt_sub: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
