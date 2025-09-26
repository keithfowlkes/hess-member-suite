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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bulk_operations: {
        Row: {
          created_at: string | null
          id: string
          operation_data: Json | null
          operation_type: string
          performed_by: string | null
          registration_ids: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          operation_data?: Json | null
          operation_type: string
          performed_by?: string | null
          registration_ids: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          operation_data?: Json | null
          operation_type?: string
          performed_by?: string | null
          registration_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "bulk_operations_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_software_entries: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          custom_value: string
          field_name: string
          id: string
          organization_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          custom_value: string
          field_name: string
          id?: string
          organization_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          custom_value?: string
          field_name?: string
          id?: string
          organization_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_software_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          layout: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          layout?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          layout?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          id: string
          recipient: string
          result_data: Json | null
          sent_at: string
          subject: string
          success: boolean
        }
        Insert: {
          created_at?: string
          email_type: string
          id?: string
          recipient: string
          result_data?: Json | null
          sent_at?: string
          subject: string
          success?: boolean
        }
        Update: {
          created_at?: string
          email_type?: string
          id?: string
          recipient?: string
          result_data?: Json | null
          sent_at?: string
          subject?: string
          success?: boolean
        }
        Relationships: []
      }
      form_field_configurations: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          field_id: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_custom: boolean | null
          placeholder: string | null
          section: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          field_id: string
          field_label: string
          field_name: string
          field_type: string
          id?: string
          is_custom?: boolean | null
          placeholder?: string | null
          section: string
          updated_at?: string
          visibility: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          field_id?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_custom?: boolean | null
          placeholder?: string | null
          section?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      invoice_templates: {
        Row: {
          created_at: string
          custom_styles: Json | null
          footer_content: string | null
          header_content: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_styles?: Json | null
          footer_content?: string | null
          header_content?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_styles?: Json | null
          footer_content?: string | null
          header_content?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          opened_at: string | null
          organization_id: string
          paid_date: string | null
          period_end_date: string
          period_start_date: string
          prorated_amount: number | null
          sent_date: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          opened_at?: string | null
          organization_id: string
          paid_date?: string | null
          period_end_date: string
          period_start_date: string
          prorated_amount?: number | null
          sent_date?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          opened_at?: string | null
          organization_id?: string
          paid_date?: string | null
          period_end_date?: string
          period_start_date?: string
          prorated_amount?: number | null
          sent_date?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      map_coordinates: {
        Row: {
          created_at: string
          id: string
          state_code: string
          updated_at: string
          updated_by: string | null
          x_coordinate: number
          y_coordinate: number
        }
        Insert: {
          created_at?: string
          id?: string
          state_code: string
          updated_at?: string
          updated_by?: string | null
          x_coordinate: number
          y_coordinate: number
        }
        Update: {
          created_at?: string
          id?: string
          state_code?: string
          updated_at?: string
          updated_by?: string | null
          x_coordinate?: number
          y_coordinate?: number
        }
        Relationships: []
      }
      member_registration_updates: {
        Row: {
          admin_notes: string | null
          approximate_date_joined_hess: string | null
          created_at: string
          existing_organization_id: string | null
          existing_organization_name: string | null
          id: string
          organization_data: Json
          registration_data: Json
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_contact_phone: string | null
          status: string
          submission_type: string
          submitted_at: string
          submitted_email: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approximate_date_joined_hess?: string | null
          created_at?: string
          existing_organization_id?: string | null
          existing_organization_name?: string | null
          id?: string
          organization_data?: Json
          registration_data?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_contact_phone?: string | null
          status?: string
          submission_type?: string
          submitted_at?: string
          submitted_email: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approximate_date_joined_hess?: string | null
          created_at?: string
          existing_organization_id?: string | null
          existing_organization_name?: string | null
          id?: string
          organization_data?: Json
          registration_data?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_contact_phone?: string | null
          status?: string
          submission_type?: string
          submitted_at?: string
          submitted_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          organization_id: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invitation_token: string
          invited_by: string
          organization_id: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          organization_id?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_profile_edit_requests: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          organization_id: string
          original_organization_data: Json
          original_profile_data: Json | null
          requested_by: string
          status: string
          updated_at: string
          updated_organization_data: Json
          updated_profile_data: Json | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          original_organization_data: Json
          original_profile_data?: Json | null
          requested_by: string
          status?: string
          updated_at?: string
          updated_organization_data: Json
          updated_profile_data?: Json | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          original_organization_data?: Json
          original_profile_data?: Json | null
          requested_by?: string
          status?: string
          updated_at?: string
          updated_organization_data?: Json
          updated_profile_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_profile_edit_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_reassignment_requests: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          new_contact_email: string
          new_organization_data: Json
          organization_id: string
          original_organization_data: Json | null
          requested_by: string | null
          status: string
          updated_at: string
          user_registration_data: Json | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          new_contact_email: string
          new_organization_data: Json
          organization_id: string
          original_organization_data?: Json | null
          requested_by?: string | null
          status?: string
          updated_at?: string
          user_registration_data?: Json | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          new_contact_email?: string
          new_organization_data?: Json
          organization_id?: string
          original_organization_data?: Json | null
          requested_by?: string | null
          status?: string
          updated_at?: string
          user_registration_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_reassignment_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_transfer_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          current_contact_id: string | null
          expires_at: string
          id: string
          new_contact_email: string
          new_contact_id: string | null
          organization_id: string
          requested_by: string
          status: string
          transfer_token: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_contact_id?: string | null
          expires_at: string
          id?: string
          new_contact_email: string
          new_contact_id?: string | null
          organization_id: string
          requested_by: string
          status?: string
          transfer_token: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_contact_id?: string | null
          expires_at?: string
          id?: string
          new_contact_email?: string
          new_contact_id?: string | null
          organization_id?: string
          requested_by?: string
          status?: string
          transfer_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_transfer_requests_current_contact_id_fkey"
            columns: ["current_contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_transfer_requests_new_contact_id_fkey"
            columns: ["new_contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_transfer_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          admissions_crm: string | null
          alumni_advancement_crm: string | null
          annual_fee_amount: number | null
          approximate_date_joined_hess: string | null
          city: string | null
          contact_person_id: string | null
          country: string | null
          created_at: string
          document_management: string | null
          door_access: string | null
          email: string | null
          financial_aid: string | null
          financial_system: string | null
          hcm_hr: string | null
          housing_management: string | null
          id: string
          identity_management: string | null
          learning_management: string | null
          meal_plan_management: string | null
          membership_end_date: string | null
          membership_start_date: string | null
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          name: string
          notes: string | null
          organization_type: string | null
          other_software_comments: string | null
          payment_platform: string | null
          payroll_system: string | null
          phone: string | null
          primary_contact_title: string | null
          primary_office_apple: boolean | null
          primary_office_asus: boolean | null
          primary_office_dell: boolean | null
          primary_office_hp: boolean | null
          primary_office_microsoft: boolean | null
          primary_office_other: boolean | null
          primary_office_other_details: string | null
          purchasing_system: string | null
          secondary_contact_email: string | null
          secondary_contact_phone: string | null
          secondary_contact_title: string | null
          secondary_first_name: string | null
          secondary_last_name: string | null
          state: string | null
          student_fte: number | null
          student_information_system: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          admissions_crm?: string | null
          alumni_advancement_crm?: string | null
          annual_fee_amount?: number | null
          approximate_date_joined_hess?: string | null
          city?: string | null
          contact_person_id?: string | null
          country?: string | null
          created_at?: string
          document_management?: string | null
          door_access?: string | null
          email?: string | null
          financial_aid?: string | null
          financial_system?: string | null
          hcm_hr?: string | null
          housing_management?: string | null
          id?: string
          identity_management?: string | null
          learning_management?: string | null
          meal_plan_management?: string | null
          membership_end_date?: string | null
          membership_start_date?: string | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          name: string
          notes?: string | null
          organization_type?: string | null
          other_software_comments?: string | null
          payment_platform?: string | null
          payroll_system?: string | null
          phone?: string | null
          primary_contact_title?: string | null
          primary_office_apple?: boolean | null
          primary_office_asus?: boolean | null
          primary_office_dell?: boolean | null
          primary_office_hp?: boolean | null
          primary_office_microsoft?: boolean | null
          primary_office_other?: boolean | null
          primary_office_other_details?: string | null
          purchasing_system?: string | null
          secondary_contact_email?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_title?: string | null
          secondary_first_name?: string | null
          secondary_last_name?: string | null
          state?: string | null
          student_fte?: number | null
          student_information_system?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          admissions_crm?: string | null
          alumni_advancement_crm?: string | null
          annual_fee_amount?: number | null
          approximate_date_joined_hess?: string | null
          city?: string | null
          contact_person_id?: string | null
          country?: string | null
          created_at?: string
          document_management?: string | null
          door_access?: string | null
          email?: string | null
          financial_aid?: string | null
          financial_system?: string | null
          hcm_hr?: string | null
          housing_management?: string | null
          id?: string
          identity_management?: string | null
          learning_management?: string | null
          meal_plan_management?: string | null
          membership_end_date?: string | null
          membership_start_date?: string | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          name?: string
          notes?: string | null
          organization_type?: string | null
          other_software_comments?: string | null
          payment_platform?: string | null
          payroll_system?: string | null
          phone?: string | null
          primary_contact_title?: string | null
          primary_office_apple?: boolean | null
          primary_office_asus?: boolean | null
          primary_office_dell?: boolean | null
          primary_office_hp?: boolean | null
          primary_office_microsoft?: boolean | null
          primary_office_other?: boolean | null
          primary_office_other_details?: string | null
          purchasing_system?: string | null
          secondary_contact_email?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_title?: string | null
          secondary_first_name?: string | null
          secondary_last_name?: string | null
          state?: string | null
          student_fte?: number | null
          student_information_system?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_contact_person_id_fkey"
            columns: ["contact_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_registrations: {
        Row: {
          address: string | null
          admin_notes: string | null
          admissions_crm: string | null
          alumni_advancement_crm: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          approximate_date_joined_hess: string | null
          city: string | null
          created_at: string
          duplicate_check_status: string | null
          email: string
          financial_aid: string | null
          financial_system: string | null
          first_name: string
          flags: string[] | null
          hcm_hr: string | null
          housing_management: string | null
          id: string
          is_private_nonprofit: boolean | null
          last_name: string
          learning_management: string | null
          login_hint: string | null
          organization_name: string
          original_submission_id: string | null
          other_software_comments: string | null
          password_hash: string
          payroll_system: string | null
          primary_contact_title: string | null
          primary_office_apple: boolean | null
          primary_office_asus: boolean | null
          primary_office_dell: boolean | null
          primary_office_hp: boolean | null
          primary_office_microsoft: boolean | null
          primary_office_other: boolean | null
          primary_office_other_details: string | null
          priority_level: string | null
          purchasing_system: string | null
          rejection_reason: string | null
          rejection_requires_resubmission: boolean | null
          resubmission_count: number | null
          secondary_contact_email: string | null
          secondary_contact_phone: string | null
          secondary_contact_title: string | null
          secondary_first_name: string | null
          secondary_last_name: string | null
          state: string | null
          state_association: string | null
          student_fte: number | null
          student_information_system: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          admissions_crm?: string | null
          alumni_advancement_crm?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approximate_date_joined_hess?: string | null
          city?: string | null
          created_at?: string
          duplicate_check_status?: string | null
          email: string
          financial_aid?: string | null
          financial_system?: string | null
          first_name: string
          flags?: string[] | null
          hcm_hr?: string | null
          housing_management?: string | null
          id?: string
          is_private_nonprofit?: boolean | null
          last_name: string
          learning_management?: string | null
          login_hint?: string | null
          organization_name: string
          original_submission_id?: string | null
          other_software_comments?: string | null
          password_hash: string
          payroll_system?: string | null
          primary_contact_title?: string | null
          primary_office_apple?: boolean | null
          primary_office_asus?: boolean | null
          primary_office_dell?: boolean | null
          primary_office_hp?: boolean | null
          primary_office_microsoft?: boolean | null
          primary_office_other?: boolean | null
          primary_office_other_details?: string | null
          priority_level?: string | null
          purchasing_system?: string | null
          rejection_reason?: string | null
          rejection_requires_resubmission?: boolean | null
          resubmission_count?: number | null
          secondary_contact_email?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_title?: string | null
          secondary_first_name?: string | null
          secondary_last_name?: string | null
          state?: string | null
          state_association?: string | null
          student_fte?: number | null
          student_information_system?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          admissions_crm?: string | null
          alumni_advancement_crm?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approximate_date_joined_hess?: string | null
          city?: string | null
          created_at?: string
          duplicate_check_status?: string | null
          email?: string
          financial_aid?: string | null
          financial_system?: string | null
          first_name?: string
          flags?: string[] | null
          hcm_hr?: string | null
          housing_management?: string | null
          id?: string
          is_private_nonprofit?: boolean | null
          last_name?: string
          learning_management?: string | null
          login_hint?: string | null
          organization_name?: string
          original_submission_id?: string | null
          other_software_comments?: string | null
          password_hash?: string
          payroll_system?: string | null
          primary_contact_title?: string | null
          primary_office_apple?: boolean | null
          primary_office_asus?: boolean | null
          primary_office_dell?: boolean | null
          primary_office_hp?: boolean | null
          primary_office_microsoft?: boolean | null
          primary_office_other?: boolean | null
          primary_office_other_details?: string | null
          priority_level?: string | null
          purchasing_system?: string | null
          rejection_reason?: string | null
          rejection_requires_resubmission?: boolean | null
          resubmission_count?: number | null
          secondary_contact_email?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_title?: string | null
          secondary_first_name?: string | null
          secondary_last_name?: string | null
          state?: string | null
          state_association?: string | null
          student_fte?: number | null
          student_information_system?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_registrations_original_submission_id_fkey"
            columns: ["original_submission_id"]
            isOneToOne: false
            referencedRelation: "pending_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          admissions_crm: string | null
          alumni_advancement_crm: string | null
          city: string | null
          created_at: string
          document_management: string | null
          door_access: string | null
          email: string
          financial_aid: string | null
          financial_system: string | null
          first_name: string
          hcm_hr: string | null
          housing_management: string | null
          id: string
          identity_management: string | null
          is_private_nonprofit: boolean | null
          last_name: string
          learning_management: string | null
          login_hint: string | null
          meal_plan_management: string | null
          organization: string | null
          other_software_comments: string | null
          payment_platform: string | null
          payroll_system: string | null
          phone: string | null
          primary_contact_title: string | null
          primary_office_apple: boolean | null
          primary_office_asus: boolean | null
          primary_office_dell: boolean | null
          primary_office_hp: boolean | null
          primary_office_microsoft: boolean | null
          primary_office_other: boolean | null
          primary_office_other_details: string | null
          purchasing_system: string | null
          secondary_contact_email: string | null
          secondary_contact_phone: string | null
          secondary_contact_title: string | null
          secondary_first_name: string | null
          secondary_last_name: string | null
          state: string | null
          state_association: string | null
          student_fte: number | null
          student_information_system: string | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          admissions_crm?: string | null
          alumni_advancement_crm?: string | null
          city?: string | null
          created_at?: string
          document_management?: string | null
          door_access?: string | null
          email: string
          financial_aid?: string | null
          financial_system?: string | null
          first_name: string
          hcm_hr?: string | null
          housing_management?: string | null
          id?: string
          identity_management?: string | null
          is_private_nonprofit?: boolean | null
          last_name: string
          learning_management?: string | null
          login_hint?: string | null
          meal_plan_management?: string | null
          organization?: string | null
          other_software_comments?: string | null
          payment_platform?: string | null
          payroll_system?: string | null
          phone?: string | null
          primary_contact_title?: string | null
          primary_office_apple?: boolean | null
          primary_office_asus?: boolean | null
          primary_office_dell?: boolean | null
          primary_office_hp?: boolean | null
          primary_office_microsoft?: boolean | null
          primary_office_other?: boolean | null
          primary_office_other_details?: string | null
          purchasing_system?: string | null
          secondary_contact_email?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_title?: string | null
          secondary_first_name?: string | null
          secondary_last_name?: string | null
          state?: string | null
          state_association?: string | null
          student_fte?: number | null
          student_information_system?: string | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          admissions_crm?: string | null
          alumni_advancement_crm?: string | null
          city?: string | null
          created_at?: string
          document_management?: string | null
          door_access?: string | null
          email?: string
          financial_aid?: string | null
          financial_system?: string | null
          first_name?: string
          hcm_hr?: string | null
          housing_management?: string | null
          id?: string
          identity_management?: string | null
          is_private_nonprofit?: boolean | null
          last_name?: string
          learning_management?: string | null
          login_hint?: string | null
          meal_plan_management?: string | null
          organization?: string | null
          other_software_comments?: string | null
          payment_platform?: string | null
          payroll_system?: string | null
          phone?: string | null
          primary_contact_title?: string | null
          primary_office_apple?: boolean | null
          primary_office_asus?: boolean | null
          primary_office_dell?: boolean | null
          primary_office_hp?: boolean | null
          primary_office_microsoft?: boolean | null
          primary_office_other?: boolean | null
          primary_office_other_details?: string | null
          purchasing_system?: string | null
          secondary_contact_email?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_title?: string | null
          secondary_first_name?: string | null
          secondary_last_name?: string | null
          state?: string | null
          state_association?: string | null
          student_fte?: number | null
          student_information_system?: string | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      public_pages: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          meta_description: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      registration_analytics: {
        Row: {
          additional_data: Json | null
          created_at: string | null
          id: string
          metric_date: string
          metric_name: string
          metric_value: number
        }
        Insert: {
          additional_data?: Json | null
          created_at?: string | null
          id?: string
          metric_date?: string
          metric_name: string
          metric_value: number
        }
        Update: {
          additional_data?: Json | null
          created_at?: string | null
          id?: string
          metric_date?: string
          metric_name?: string
          metric_value?: number
        }
        Relationships: []
      }
      system_analytics_datacube: {
        Row: {
          created_at: string | null
          id: string
          institution_count: number
          institution_details: Json | null
          last_updated: string | null
          system_field: string
          system_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_count?: number
          institution_details?: Json | null
          last_updated?: string | null
          system_field: string
          system_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_count?: number
          institution_details?: Json | null
          last_updated?: string | null
          system_field?: string
          system_name?: string
        }
        Relationships: []
      }
      system_field_options: {
        Row: {
          created_at: string
          field_name: string
          id: string
          option_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          option_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          option_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          email_type: string | null
          id: string
          is_active: boolean
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          email_type?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          email_type?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_cohorts: {
        Row: {
          cohort: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          cohort: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cohort?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          message_type: string
          organization: string | null
          updated_at: string
          user_email: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          message_type?: string
          organization?: string | null
          updated_at?: string
          user_email: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          message_type?: string
          organization?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      cleanup_reassignment_placeholders: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleaned_count: number
        }[]
      }
      fix_user_password_from_registration: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_secure_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_organization: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_organization_by_contact: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_password_info: {
        Args: { user_email: string }
        Returns: {
          auth_user_id: string
          stored_password: string
          user_exists: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "member" | "cohort_leader"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      membership_status: "active" | "pending" | "expired" | "cancelled"
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
      app_role: ["admin", "member", "cohort_leader"],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      membership_status: ["active", "pending", "expired", "cancelled"],
    },
  },
} as const
