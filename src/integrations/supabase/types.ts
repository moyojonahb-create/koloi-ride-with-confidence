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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_earnings: {
        Row: {
          created_at: string
          driver_earnings: number
          driver_id: string
          fare_amount: number
          id: string
          platform_fee: number
          ride_id: string | null
        }
        Insert: {
          created_at?: string
          driver_earnings: number
          driver_id: string
          fare_amount: number
          id?: string
          platform_fee: number
          ride_id?: string | null
        }
        Update: {
          created_at?: string
          driver_earnings?: number
          driver_id?: string
          fare_amount?: number
          id?: string
          platform_fee?: number
          ride_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_earnings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          admin_note: string | null
          amount_usd: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          driver_id: string
          ecocash_phone: string
          ecocash_reference: string
          id: string
          proof_path: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          amount_usd: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          driver_id: string
          ecocash_phone: string
          ecocash_reference: string
          id?: string
          proof_path?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          amount_usd?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          driver_id?: string
          ecocash_phone?: string
          ecocash_reference?: string
          id?: string
          proof_path?: string | null
          status?: string
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          created_at: string
          document_type: string
          driver_id: string
          file_url: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          driver_id: string
          file_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          driver_id?: string
          file_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_wallets: {
        Row: {
          balance_usd: number
          created_at: string
          driver_id: string
          id: string
          updated_at: string
        }
        Insert: {
          balance_usd?: number
          created_at?: string
          driver_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          balance_usd?: number
          created_at?: string
          driver_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          avatar_url: string | null
          created_at: string
          gender: string | null
          id: string
          is_online: boolean | null
          plate_number: string | null
          rating_avg: number | null
          status: string
          total_trips: number | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_type: string
          vehicle_year: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          is_online?: boolean | null
          plate_number?: string | null
          rating_avg?: number | null
          status?: string
          total_trips?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string
          vehicle_year?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          is_online?: boolean | null
          plate_number?: string | null
          rating_avg?: number | null
          status?: string
          total_trips?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string
          vehicle_year?: number | null
        }
        Relationships: []
      }
      favorite_locations: {
        Row: {
          address: string
          created_at: string
          icon: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          icon?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          icon?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          created_at: string
          effective_date: string
          id: string
          set_by: string | null
          zar_per_usd: number
        }
        Insert: {
          created_at?: string
          effective_date?: string
          id?: string
          set_by?: string | null
          zar_per_usd: number
        }
        Update: {
          created_at?: string
          effective_date?: string
          id?: string
          set_by?: string | null
          zar_per_usd?: number
        }
        Relationships: []
      }
      koloi_landmarks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          keywords: string[] | null
          latitude: number
          longitude: number
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          latitude: number
          longitude: number
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          latitude?: number
          longitude?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_locations: {
        Row: {
          accuracy: number | null
          heading: number | null
          id: string
          is_online: boolean | null
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          is_online?: boolean | null
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          is_online?: boolean | null
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          ride_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          ride_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          ride_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean | null
          notification_type: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          notification_type: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          notification_type?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
          driver_id: string
          eta_minutes: number | null
          id: string
          message: string | null
          price: number
          ride_id: string
          status: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          eta_minutes?: number | null
          id?: string
          message?: string | null
          price: number
          ride_id: string
          status?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          eta_minutes?: number | null
          id?: string
          message?: string | null
          price?: number
          ride_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      places_cache: {
        Row: {
          address: Json | null
          class: string | null
          created_at: string
          display_name: string
          id: string
          lat: number
          lon: number
          name: string | null
          osm_id: number | null
          osm_type: string | null
          type: string | null
        }
        Insert: {
          address?: Json | null
          class?: string | null
          created_at?: string
          display_name: string
          id?: string
          lat: number
          lon: number
          name?: string | null
          osm_id?: number | null
          osm_type?: string | null
          type?: string | null
        }
        Update: {
          address?: Json | null
          class?: string | null
          created_at?: string
          display_name?: string
          id?: string
          lat?: number
          lon?: number
          name?: string | null
          osm_id?: number | null
          osm_type?: string | null
          type?: string | null
        }
        Relationships: []
      }
      platform_ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string
          driver_id: string | null
          id: string
          passenger_id: string | null
          status: string
          to_account_id: string
          trip_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          driver_id?: string | null
          id?: string
          passenger_id?: string | null
          status?: string
          to_account_id?: string
          trip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          driver_id?: string | null
          id?: string
          passenger_id?: string | null
          status?: string
          to_account_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_ledger_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          base_fare: number
          fixed_town_fare: number
          gwanda_cbd_lat: number
          gwanda_cbd_lng: number
          id: string
          max_town_fare: number
          min_fare: number
          night_multiplier: number
          peak_multiplier: number
          per_km_rate: number
          town_radius_km: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_fare?: number
          fixed_town_fare?: number
          gwanda_cbd_lat?: number
          gwanda_cbd_lng?: number
          id?: string
          max_town_fare?: number
          min_fare?: number
          night_multiplier?: number
          peak_multiplier?: number
          per_km_rate?: number
          town_radius_km?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_fare?: number
          fixed_town_fare?: number
          gwanda_cbd_lat?: number
          gwanda_cbd_lng?: number
          id?: string
          max_town_fare?: number
          min_fare?: number
          night_multiplier?: number
          peak_multiplier?: number
          per_km_rate?: number
          town_radius_km?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          created_at: string
          distance_km: number
          driver_id: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lon: number
          duration_minutes: number
          expires_at: string | null
          fare: number
          id: string
          pickup_address: string
          pickup_lat: number
          pickup_lon: number
          route_polyline: string | null
          status: string
          updated_at: string
          user_id: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          distance_km: number
          driver_id?: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lon: number
          duration_minutes: number
          expires_at?: string | null
          fare: number
          id?: string
          pickup_address: string
          pickup_lat: number
          pickup_lon: number
          route_polyline?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle_type?: string
        }
        Update: {
          created_at?: string
          distance_km?: number
          driver_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number
          dropoff_lon?: number
          duration_minutes?: number
          expires_at?: string | null
          fare?: number
          id?: string
          pickup_address?: string
          pickup_lat?: number
          pickup_lon?: number
          route_polyline?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      system_events: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      trip_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          ride_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          ride_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_events_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          ride_id: string | null
          transaction_type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          ride_id?: string | null
          transaction_type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          ride_id?: string | null
          transaction_type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_deposit: {
        Args: { p_deposit_id: string; p_note?: string }
        Returns: Json
      }
      admin_set_fx_rate: { Args: { p_zar_per_usd: number }; Returns: Json }
      can_driver_operate: { Args: { p_driver_id: string }; Returns: boolean }
      complete_trip_and_charge_flat_r4: {
        Args: { p_trip_id: string }
        Returns: Json
      }
      expire_old_rides: { Args: never; Returns: number }
      get_driver_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_online_driver: { Args: { _user_id: string }; Returns: boolean }
      is_ride_driver: {
        Args: { _driver_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_driver: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
