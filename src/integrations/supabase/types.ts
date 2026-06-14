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
      attendance: {
        Row: {
          admin_remarks: string | null
          created_at: string | null
          date: string
          id: string
          leave_reason: string | null
          punch_in: string | null
          punch_in_loc: string | null
          punch_out: string | null
          punch_out_loc: string | null
          status: string | null
          total_hours: number | null
          user_id: string | null
        }
        Insert: {
          admin_remarks?: string | null
          created_at?: string | null
          date?: string
          id?: string
          leave_reason?: string | null
          punch_in?: string | null
          punch_in_loc?: string | null
          punch_out?: string | null
          punch_out_loc?: string | null
          status?: string | null
          total_hours?: number | null
          user_id?: string | null
        }
        Update: {
          admin_remarks?: string | null
          created_at?: string | null
          date?: string
          id?: string
          leave_reason?: string | null
          punch_in?: string | null
          punch_in_loc?: string | null
          punch_out?: string | null
          punch_out_loc?: string | null
          status?: string | null
          total_hours?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      company_holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          city: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          logo_url: string | null
          name: string
          pan: string | null
          phone: string | null
          pincode: string | null
          signature_url: string | null
          state: string | null
          state_code: string | null
          terms: string | null
          updated_at: string
          upi_id: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          signature_url?: string | null
          state?: string | null
          state_code?: string | null
          terms?: string | null
          updated_at?: string
          upi_id?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          signature_url?: string | null
          state?: string | null
          state_code?: string | null
          terms?: string | null
          updated_at?: string
          upi_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      document_lines: {
        Row: {
          cgst: number
          description: string
          discount_pct: number
          document_id: string
          gst_rate: number
          hsn_code: string | null
          id: string
          igst: number
          item_id: string | null
          position: number
          quantity: number
          rate: number
          sgst: number
          taxable: number
          total: number
          unit: string | null
        }
        Insert: {
          cgst?: number
          description: string
          discount_pct?: number
          document_id: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          igst?: number
          item_id?: string | null
          position?: number
          quantity?: number
          rate?: number
          sgst?: number
          taxable?: number
          total?: number
          unit?: string | null
        }
        Update: {
          cgst?: number
          description?: string
          discount_pct?: number
          document_id?: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          igst?: number
          item_id?: string | null
          position?: number
          quantity?: number
          rate?: number
          sgst?: number
          taxable?: number
          total?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          cgst: number
          created_at: string
          created_by: string | null
          discount: number
          doc_date: string
          doc_number: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          due_date: string | null
          id: string
          igst: number
          is_igst: boolean
          linked_doc_id: string | null
          notes: string | null
          paid: number
          party_id: string
          round_off: number
          sgst: number
          status: Database["public"]["Enums"]["doc_status"]
          subtotal: number
          terms: string | null
          total: number
          updated_at: string
        }
        Insert: {
          cgst?: number
          created_at?: string
          created_by?: string | null
          discount?: number
          doc_date?: string
          doc_number: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          due_date?: string | null
          id?: string
          igst?: number
          is_igst?: boolean
          linked_doc_id?: string | null
          notes?: string | null
          paid?: number
          party_id: string
          round_off?: number
          sgst?: number
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          cgst?: number
          created_at?: string
          created_by?: string | null
          discount?: number
          doc_date?: string
          doc_number?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          due_date?: string | null
          id?: string
          igst?: number
          is_igst?: boolean
          linked_doc_id?: string | null
          notes?: string | null
          paid?: number
          party_id?: string
          round_off?: number
          sgst?: number
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_linked_doc_id_fkey"
            columns: ["linked_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string | null
          expense_date: string
          id: string
          mode: Database["public"]["Enums"]["payment_mode"]
          reference: string | null
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          expense_date?: string
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          reference?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          expense_date?: string
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      items: {
        Row: {
          barcode: string | null
          created_at: string
          created_by: string | null
          current_stock: number
          description: string | null
          gst_rate: number
          hsn_code: string | null
          id: string
          low_stock_threshold: number | null
          name: string
          opening_stock: number
          purchase_price: number
          sale_price: number
          type: Database["public"]["Enums"]["item_type"]
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          created_by?: string | null
          current_stock?: number
          description?: string | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          low_stock_threshold?: number | null
          name: string
          opening_stock?: number
          purchase_price?: number
          sale_price?: number
          type?: Database["public"]["Enums"]["item_type"]
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          created_by?: string | null
          current_stock?: number
          description?: string | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          low_stock_threshold?: number | null
          name?: string
          opening_stock?: number
          purchase_price?: number
          sale_price?: number
          type?: Database["public"]["Enums"]["item_type"]
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      party_machines: {
        Row: {
          amc_expiry_date: string | null
          created_at: string
          id: string
          installation_date: string | null
          model: string | null
          name: string
          party_id: string
          serial_number: string | null
        }
        Insert: {
          amc_expiry_date?: string | null
          created_at?: string
          id?: string
          installation_date?: string | null
          model?: string | null
          name: string
          party_id: string
          serial_number?: string | null
        }
        Update: {
          amc_expiry_date?: string | null
          created_at?: string
          id?: string
          installation_date?: string | null
          model?: string | null
          name?: string
          party_id?: string
          serial_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_machines_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          }
        ]
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          machine_type: string | null
          message: string | null
          name: string
          phone: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          machine_type?: string | null
          message?: string | null
          name: string
          phone: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          machine_type?: string | null
          message?: string | null
          name?: string
          phone?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      number_series: {
        Row: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          fy: string
          id: string
          next_number: number
          padding: number
          prefix: string
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          fy: string
          id?: string
          next_number?: number
          padding?: number
          prefix: string
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["doc_type"]
          fy?: string
          id?: string
          next_number?: number
          padding?: number
          prefix?: string
        }
        Relationships: []
      }
      parties: {
        Row: {
          billing_address: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          email: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          opening_balance: number
          map_url: string | null
          pan: string | null
          phone: string | null
          pincode: string | null
          shipping_address: string | null
          state: string | null
          state_code: string | null
          type: Database["public"]["Enums"]["party_type"]
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          map_url?: string | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          shipping_address?: string | null
          state?: string | null
          state_code?: string | null
          type?: Database["public"]["Enums"]["party_type"]
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          map_url?: string | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          shipping_address?: string | null
          state?: string | null
          state_code?: string | null
          type?: Database["public"]["Enums"]["party_type"]
          updated_at?: string
        }
        Relationships: []
      }
      payment_allocations: {
        Row: {
          amount: number
          document_id: string
          id: string
          payment_id: string
        }
        Insert: {
          amount: number
          document_id: string
          id?: string
          payment_id: string
        }
        Update: {
          amount?: number
          document_id?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["payment_direction"]
          id: string
          mode: Database["public"]["Enums"]["payment_mode"]
          notes: string | null
          party_id: string
          payment_date: string
          payment_number: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          direction: Database["public"]["Enums"]["payment_direction"]
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          notes?: string | null
          party_id: string
          payment_date?: string
          payment_number: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["payment_direction"]
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          notes?: string | null
          party_id?: string
          payment_date?: string
          payment_number?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhar_number: string | null
          created_at: string
          display_name: string | null
          father_name: string | null
          id: string
          monthly_salary: number | null
          pan_number: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhar_number?: string | null
          created_at?: string
          display_name?: string | null
          father_name?: string | null
          id?: string
          monthly_salary?: number | null
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhar_number?: string | null
          created_at?: string
          display_name?: string | null
          father_name?: string | null
          id?: string
          monthly_salary?: number | null
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_visits: {
        Row: {
          charges: number
          created_at: string
          created_by: string | null
          engineer_name: string
          engineer_user_id: string | null
          id: string
          machine_details: string | null
          next_visit_date: string | null
          notes: string | null
          parts_used: string | null
          party_id: string
          signature_url: string | null
          is_verified: boolean
          status: Database["public"]["Enums"]["visit_status"]
          updated_at: string
          visit_date: string
          visit_type: Database["public"]["Enums"]["visit_type"]
          work_description: string
        }
        Insert: {
          charges?: number
          created_at?: string
          created_by?: string | null
          engineer_name: string
          engineer_user_id?: string | null
          id?: string
          machine_details?: string | null
          next_visit_date?: string | null
          notes?: string | null
          parts_used?: string | null
          party_id: string
          signature_url?: string | null
          is_verified?: boolean
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
          visit_date?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
          work_description: string
        }
        Update: {
          charges?: number
          created_at?: string
          created_by?: string | null
          engineer_name?: string
          engineer_user_id?: string | null
          id?: string
          machine_details?: string | null
          next_visit_date?: string | null
          notes?: string | null
          parts_used?: string | null
          party_id?: string
          signature_url?: string | null
          is_verified?: boolean
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
          visit_date?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
          work_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_visits_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          created_at: string
          id: string
          item_id: string
          movement: Database["public"]["Enums"]["stock_movement"]
          notes: string | null
          quantity: number
          reference_doc: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          movement: Database["public"]["Enums"]["stock_movement"]
          notes?: string | null
          quantity: number
          reference_doc?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          movement?: Database["public"]["Enums"]["stock_movement"]
          notes?: string | null
          quantity?: number
          reference_doc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_reference_doc_fkey"
            columns: ["reference_doc"]
            isOneToOne: false
            referencedRelation: "documents"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_biz: { Args: { _user_id: string }; Returns: boolean }
      can_write_biz: { Args: { _user_id: string }; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_doc_number: {
        Args: {
          _doc_type: Database["public"]["Enums"]["doc_type"]
          _fy: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "accountant" | "staff" | "viewer" | "engineer"
      doc_status: "draft" | "sent" | "partial" | "paid" | "cancelled"
      doc_type:
        | "quotation"
        | "proforma"
        | "invoice"
        | "challan"
        | "purchase_order"
        | "purchase_bill"
      item_type: "service" | "product"
      lead_status: "new" | "contacted" | "quoted" | "won" | "lost"
      party_type: "customer" | "vendor" | "both"
      payment_direction: "received" | "made"
      payment_mode: "cash" | "upi" | "bank_transfer" | "cheque" | "card"
      stock_movement: "in" | "out" | "adjust"
      visit_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      visit_type:
        | "installation"
        | "repair"
        | "maintenance"
        | "inspection"
        | "other"
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
      app_role: ["admin", "accountant", "staff", "viewer", "engineer"],
      doc_status: ["draft", "sent", "partial", "paid", "cancelled"],
      doc_type: [
        "quotation",
        "proforma",
        "invoice",
        "challan",
        "purchase_order",
        "purchase_bill",
      ],
      item_type: ["service", "product"],
      lead_status: ["new", "contacted", "quoted", "won", "lost"],
      party_type: ["customer", "vendor", "both"],
      payment_direction: ["received", "made"],
      payment_mode: ["cash", "upi", "bank_transfer", "cheque", "card"],
      stock_movement: ["in", "out", "adjust"],
      visit_status: ["scheduled", "in_progress", "completed", "cancelled"],
      visit_type: [
        "installation",
        "repair",
        "maintenance",
        "inspection",
        "other",
      ],
    },
  },
} as const
