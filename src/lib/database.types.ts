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
      user_profiles: {
        Row: {
          id: string
          name: string
          contact_number: string
          user_type: 'farmer' | 'worker'
          location: string | null
          date_of_birth: string | null
          weight: number | null
          height: number | null
          profile_picture: string | null
          working_picture: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          contact_number: string
          user_type: 'farmer' | 'worker'
          location?: string | null
          date_of_birth?: string | null
          weight?: number | null
          height?: number | null
          profile_picture?: string | null
          working_picture?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_number?: string
          user_type?: 'farmer' | 'worker'
          location?: string | null
          date_of_birth?: string | null
          weight?: number | null
          height?: number | null
          profile_picture?: string | null
          working_picture?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          farmer_id: string
          title: string
          description: string
          preferred_date: string
          wage: number
          duration: number
          duration_type: 'hours' | 'days'
          location: string
          required_workers: number
          status: 'open' | 'filled' | 'in-progress' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farmer_id: string
          title: string
          description: string
          preferred_date: string
          wage: number
          duration: number
          duration_type: 'hours' | 'days'
          location: string
          required_workers?: number
          status?: 'open' | 'filled' | 'in-progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farmer_id?: string
          title?: string
          description?: string
          preferred_date?: string
          wage?: number
          duration?: number
          duration_type?: 'hours' | 'days'
          location?: string
          required_workers?: number
          status?: 'open' | 'filled' | 'in-progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          job_id: string
          worker_id: string
          message: string | null
          status: 'pending' | 'accepted' | 'rejected'
          applied_at: string
          rejected_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          worker_id: string
          message?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          applied_at?: string
          rejected_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          worker_id?: string
          message?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          applied_at?: string
          rejected_at?: string | null
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
      user_type_enum: 'farmer' | 'worker'
      duration_type_enum: 'hours' | 'days'
      job_status_enum: 'open' | 'filled' | 'in-progress' | 'completed'
      application_status_enum: 'pending' | 'accepted' | 'rejected'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}