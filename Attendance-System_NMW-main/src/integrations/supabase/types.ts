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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          attendance_date: string
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          employee_id: string
          hours_worked: number | null
          id: string
          late_hours: number | null
          overtime_hours: number | null
          undertime_hours: number | null
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          biometric_verified: boolean
          biometric_credential_id: string | null
          biometric_verification_time: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
        }
        Insert: {
          attendance_date: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          employee_id: string
          hours_worked?: number | null
          id?: string
          late_hours?: number | null
          overtime_hours?: number | null
          undertime_hours?: number | null
          notes?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          biometric_verified?: boolean
          biometric_credential_id?: string | null
          biometric_verification_time?: string | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
        }
        Update: {
          attendance_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          employee_id?: string
          hours_worked?: number | null
          id?: string
          late_hours?: number | null
          overtime_hours?: number | null
          undertime_hours?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          biometric_verified?: boolean
          biometric_credential_id?: string | null
          biometric_verification_time?: string | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      advances: {
        Row: {
          advance_date: string
          amount: number
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          advance_date: string
          amount: number
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          advance_date?: string
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          base_salary: number
          cnic: string
          contact: string | null
          created_at: string
          department: Database["public"]["Enums"]["department_type"]
          employee_id: string
          id: string
          is_active: boolean
          joining_date: string
          name: string
          overtime_rate: number | null
          overtime_wage: number
          photo_url: string | null
          updated_at: string
          biometric_registered: boolean
          biometric_credential_id: string | null
          biometric_public_key: string | null
          biometric_registered_at: string | null
          biometric_device_info: Json | null
        }
        Insert: {
          base_salary: number
          cnic: string
          contact?: string | null
          created_at?: string
          department: Database["public"]["Enums"]["department_type"]
          employee_id: string
          id?: string
          is_active?: boolean
          joining_date?: string
          name: string
          overtime_rate?: number | null
          overtime_wage?: number
          photo_url?: string | null
          updated_at?: string
          biometric_registered?: boolean
          biometric_credential_id?: string | null
          biometric_public_key?: string | null
          biometric_registered_at?: string | null
          biometric_device_info?: Json | null
        }
        Update: {
          base_salary?: number
          cnic?: string
          contact?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"]
          employee_id?: string
          id?: string
          is_active?: boolean
          joining_date?: string
          name?: string
          overtime_rate?: number | null
          overtime_wage?: number
          photo_url?: string | null
          updated_at?: string
          biometric_registered?: boolean
          biometric_credential_id?: string | null
          biometric_public_key?: string | null
          biometric_registered_at?: string | null
          biometric_device_info?: Json | null
        }
        Relationships: []
      }
      payroll: {
        Row: {
          absence_deduction: number
          absent_days: number
          advance_amount: number | null
          base_salary: number
          created_at: string
          employee_id: string
          final_salary: number
          holiday_days: number
          id: string
          leave_days: number
          month: number
          overtime_hours: number | null
          overtime_pay: number | null
          overtime_rate: number | null
          present_days: number
          status: Database["public"]["Enums"]["payroll_status"]
          total_days: number
          undertime_deduction: number | null
          undertime_hours: number | null
          updated_at: string
          year: number
        }
        Insert: {
          absence_deduction?: number
          absent_days?: number
          advance_amount?: number | null
          base_salary: number
          created_at?: string
          employee_id: string
          final_salary: number
          holiday_days?: number
          id?: string
          leave_days?: number
          month: number
          overtime_hours?: number | null
          overtime_pay?: number | null
          overtime_rate?: number | null
          present_days?: number
          status?: Database["public"]["Enums"]["payroll_status"]
          total_days?: number
          undertime_deduction?: number | null
          undertime_hours?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          absence_deduction?: number
          absent_days?: number
          advance_amount?: number | null
          base_salary?: number
          created_at?: string
          employee_id?: string
          final_salary?: number
          holiday_days?: number
          id?: string
          leave_days?: number
          month?: number
          overtime_hours?: number | null
          overtime_pay?: number | null
          overtime_rate?: number | null
          present_days?: number
          status?: Database["public"]["Enums"]["payroll_status"]
          total_days?: number
          undertime_deduction?: number | null
          undertime_hours?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          id: string
          employee_id: string
          payroll_id: string
          payment_date: string
          amount: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          payroll_id: string
          payment_date: string
          amount: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          payroll_id?: string
          payment_date?: string
          amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_devices: {
        Row: {
          id: string
          employee_id: string
          device_id: string
          device_name: string
          credential_id: string
          public_key: string
          registered_at: string
          last_used: string | null
          is_active: boolean
          device_info: Json | null
        }
        Insert: {
          id?: string
          employee_id: string
          device_id: string
          device_name: string
          credential_id: string
          public_key: string
          registered_at?: string
          last_used?: string | null
          is_active?: boolean
          device_info?: Json | null
        }
        Update: {
          id?: string
          employee_id?: string
          device_id?: string
          device_name?: string
          credential_id?: string
          public_key?: string
          registered_at?: string
          last_used?: string | null
          is_active?: boolean
          device_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "biometric_devices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      department_calculation_rules: {
        Row: {
          id: string
          department: string
          is_exempt_from_deductions: boolean
          is_exempt_from_overtime: boolean
          max_overtime_hours_per_day: number | null
          max_advance_percentage: number | null
          working_days_per_month: number | null
          standard_hours_per_day: number | null
          overtime_multiplier: number | null
          min_hours_full_day: number | null
          half_day_hours: number | null
          day_shift_hours: number | null
          night_shift_hours: number | null
          night_shift_multiplier: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          department: string
          is_exempt_from_deductions?: boolean
          is_exempt_from_overtime?: boolean
          max_overtime_hours_per_day?: number | null
          max_advance_percentage?: number | null
          working_days_per_month?: number | null
          standard_hours_per_day?: number | null
          overtime_multiplier?: number | null
          min_hours_full_day?: number | null
          half_day_hours?: number | null
          day_shift_hours?: number | null
          night_shift_hours?: number | null
          night_shift_multiplier?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          department?: string
          is_exempt_from_deductions?: boolean
          is_exempt_from_overtime?: boolean
          max_overtime_hours_per_day?: number | null
          max_advance_percentage?: number | null
          working_days_per_month?: number | null
          standard_hours_per_day?: number | null
          overtime_multiplier?: number | null
          min_hours_full_day?: number | null
          half_day_hours?: number | null
          day_shift_hours?: number | null
          night_shift_hours?: number | null
          night_shift_multiplier?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payroll_calculation_audit: {
        Row: {
          id: string
          payroll_id: string
          employee_id: string
          calculation_type: string
          old_value: number | null
          new_value: number
          calculation_details: Json | null
          calculated_by: string | null
          calculated_at: string
        }
        Insert: {
          id?: string
          payroll_id: string
          employee_id: string
          calculation_type: string
          old_value?: number | null
          new_value: number
          calculation_details?: Json | null
          calculated_by?: string | null
          calculated_at?: string
        }
        Update: {
          id?: string
          payroll_id?: string
          employee_id?: string
          calculation_type?: string
          old_value?: number | null
          new_value?: number
          calculation_details?: Json | null
          calculated_by?: string | null
          calculated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_calculation_audit_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_calculation_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_business_rules: {
        Row: {
          id: string
          rule_name: string
          rule_description: string
          rule_type: string
          rule_expression: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          rule_name: string
          rule_description: string
          rule_type: string
          rule_expression: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          rule_name?: string
          rule_description?: string
          rule_type?: string
          rule_expression?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_actual_days_in_month: {
        Args: { month_num: number; year_num: number }
        Returns: number
      }
      validate_salary_business_rules: {
        Args: { base_salary: number; overtime_hours: number; overtime_rate: number; advance_amount: number; final_salary: number; max_advance_percentage: number }
        Returns: { rule_name: string; is_valid: boolean; error_message: string | null }[]
      }
    }
    Enums: {
      attendance_status: "present" | "absent" | "leave" | "holiday"
      department_type:
        | "Enamel"
        | "Workshop"
        | "Guards"
        | "Cooks"
        | "Admins"
        | "Directors"
        | "Accounts"
      payroll_status: "pending" | "paid" | "locked"
      shift_type: "day" | "night" | "regular"
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
      attendance_status: ["present", "absent", "leave", "holiday"],
      department_type: [
        "Enamel",
        "Workshop",
        "Guards",
        "Cooks",
        "Admins",
        "Directors",
        "Accounts",
      ],
      payroll_status: ["pending", "paid", "locked"],
      shift_type: ["day", "night", "regular"],
    },
  },
} as const
