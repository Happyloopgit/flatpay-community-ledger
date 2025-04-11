export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      expenses: {
        Row: {
          allocation_rule: string | null
          amount: number
          category: string | null
          created_at: string
          description: string | null
          entered_by_profile_id: string
          expense_date: string
          id: number
          is_allocated_to_bill: boolean | null
          receipt_url: string | null
          society_id: number
          updated_at: string
        }
        Insert: {
          allocation_rule?: string | null
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          entered_by_profile_id: string
          expense_date: string
          id?: number
          is_allocated_to_bill?: boolean | null
          receipt_url?: string | null
          society_id: number
          updated_at?: string
        }
        Update: {
          allocation_rule?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          entered_by_profile_id?: string
          expense_date?: string
          id?: number
          is_allocated_to_bill?: boolean | null
          receipt_url?: string | null
          society_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_entered_by_profile_id_fkey"
            columns: ["entered_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_batches: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          finalized_at: string | null
          generated_at: string
          generated_by_profile_id: string
          id: number
          sent_at: string | null
          society_id: number
          status: string
          total_amount: number | null
          total_invoice_count: number | null
          updated_at: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          finalized_at?: string | null
          generated_at?: string
          generated_by_profile_id: string
          id?: number
          sent_at?: string | null
          society_id: number
          status?: string
          total_amount?: number | null
          total_invoice_count?: number | null
          updated_at?: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          finalized_at?: string | null
          generated_at?: string
          generated_by_profile_id?: string
          id?: number
          sent_at?: string | null
          society_id?: number
          status?: string
          total_amount?: number | null
          total_invoice_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_batches_generated_by_profile_id_fkey"
            columns: ["generated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_batches_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: number
          related_charge_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: number
          related_charge_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: number
          related_charge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_related_charge_id_fkey"
            columns: ["related_charge_id"]
            isOneToOne: false
            referencedRelation: "recurring_charges"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          balance_due: number | null
          billing_period_end: string
          billing_period_start: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          created_at: string
          due_date: string
          generated_by_profile_id: string
          generation_date: string | null
          id: number
          invoice_batch_id: number | null
          invoice_number: string
          invoice_pdf_url: string | null
          resident_id: number
          society_id: number
          status: string
          total_amount: number
          unit_id: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number | null
          billing_period_end: string
          billing_period_start: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          created_at?: string
          due_date: string
          generated_by_profile_id: string
          generation_date?: string | null
          id?: number
          invoice_batch_id?: number | null
          invoice_number: string
          invoice_pdf_url?: string | null
          resident_id: number
          society_id: number
          status?: string
          total_amount: number
          unit_id: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number | null
          billing_period_end?: string
          billing_period_start?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          created_at?: string
          due_date?: string
          generated_by_profile_id?: string
          generation_date?: string | null
          id?: number
          invoice_batch_id?: number | null
          invoice_number?: string
          invoice_pdf_url?: string | null
          resident_id?: number
          society_id?: number
          status?: string
          total_amount?: number
          unit_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_cancelled_by_profile_id_fkey"
            columns: ["cancelled_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_generated_by_profile_id_fkey"
            columns: ["generated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_invoice_batch_id_fkey"
            columns: ["invoice_batch_id"]
            isOneToOne: false
            referencedRelation: "invoice_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          phone_number: string | null
          role: string
          society_id: number | null
          two_factor_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          phone_number?: string | null
          role?: string
          society_id?: number | null
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone_number?: string | null
          role?: string
          society_id?: number | null
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_charges: {
        Row: {
          amount_or_rate: number
          calculation_type: string
          charge_name: string
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          society_id: number
          updated_at: string
        }
        Insert: {
          amount_or_rate: number
          calculation_type: string
          charge_name: string
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          society_id: number
          updated_at?: string
        }
        Update: {
          amount_or_rate?: number
          calculation_type?: string
          charge_name?: string
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          society_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_charges_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          created_at: string
          email: string | null
          id: number
          is_active: boolean | null
          move_in_date: string | null
          move_out_date: string | null
          name: string
          phone_number: string
          primary_unit_id: number | null
          society_id: number
          updated_at: string
          virtual_payment_upi_id: string | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          is_active?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          name: string
          phone_number: string
          primary_unit_id?: number | null
          society_id: number
          updated_at?: string
          virtual_payment_upi_id?: string | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          is_active?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          name?: string
          phone_number?: string
          primary_unit_id?: number | null
          society_id?: number
          updated_at?: string
          virtual_payment_upi_id?: string | null
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "residents_primary_unit_id_fkey"
            columns: ["primary_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      societies: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc_code: string | null
          created_at: string
          due_date_days: number
          id: number
          late_fee_amount: number | null
          late_fee_grace_period_days: number | null
          logo_url: string | null
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          created_at?: string
          due_date_days?: number
          id?: number
          late_fee_amount?: number | null
          late_fee_grace_period_days?: number | null
          logo_url?: string | null
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          created_at?: string
          due_date_days?: number
          id?: number
          late_fee_amount?: number | null
          late_fee_grace_period_days?: number | null
          logo_url?: string | null
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      society_blocks: {
        Row: {
          block_name: string
          created_at: string
          id: string
          society_id: number
          updated_at: string
        }
        Insert: {
          block_name: string
          created_at?: string
          id?: string
          society_id: number
          updated_at?: string
        }
        Update: {
          block_name?: string
          created_at?: string
          id?: string
          society_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_blocks_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          block_id: string | null
          created_at: string
          id: number
          occupancy_status: string | null
          size_sqft: number | null
          society_id: number
          unit_number: string
          updated_at: string
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          id?: number
          occupancy_status?: string | null
          size_sqft?: number | null
          society_id: number
          unit_number: string
          updated_at?: string
        }
        Update: {
          block_id?: string | null
          created_at?: string
          id?: number
          occupancy_status?: string | null
          size_sqft?: number | null
          society_id?: number
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "society_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_expense: {
        Args: {
          p_society_id: number
          p_expense_date: string
          p_category: string
          p_description: string
          p_amount: number
          p_allocation_rule?: string
          p_is_allocated_to_bill?: boolean
        }
        Returns: Json
      }
      create_resident: {
        Args: {
          p_society_id: number
          p_name: string
          p_phone_number: string
          p_email?: string
          p_primary_unit_id?: number
          p_move_in_date?: string
          p_move_out_date?: string
          p_is_active?: boolean
          p_whatsapp_opt_in?: boolean
        }
        Returns: Json
      }
      get_current_user_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_resident: {
        Args: {
          p_resident_id: number
          p_name: string
          p_phone_number: string
          p_email?: string
          p_primary_unit_id?: number
          p_move_in_date?: string
          p_move_out_date?: string
          p_is_active?: boolean
          p_whatsapp_opt_in?: boolean
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
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
