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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          images: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          title?: string
        }
        Relationships: []
      }
      activity_photos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          title?: string | null
        }
        Relationships: []
      }
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      alumni: {
        Row: {
          batch: string | null
          company: string | null
          created_at: string
          department: string | null
          id: string
          linkedin: string | null
          name: string
        }
        Insert: {
          batch?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          id?: string
          linkedin?: string | null
          name: string
        }
        Update: {
          batch?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          id?: string
          linkedin?: string | null
          name?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          title?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          created_at: string
          id: string
          published: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          published?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          published?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      course_registrations: {
        Row: {
          completed: boolean
          course_id: string
          id: string
          payment_method: string | null
          payment_status: string
          progress: Json | null
          registered_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          course_id: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          progress?: Json | null
          registered_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          course_id?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          progress?: Json | null
          registered_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          instructor: string | null
          is_paid: boolean
          max_students: number | null
          price: number | null
          status: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          is_paid?: boolean
          max_students?: number | null
          price?: number | null
          status?: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          is_paid?: boolean
          max_students?: number | null
          price?: number | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          approval_status: string
          department: string | null
          email: string | null
          event_id: string
          id: string
          name: string | null
          payment_method: string | null
          payment_status: string
          phone: string | null
          registered_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          approval_status?: string
          department?: string | null
          email?: string | null
          event_id: string
          id?: string
          name?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string | null
          registered_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          approval_status?: string
          department?: string | null
          email?: string | null
          event_id?: string
          id?: string
          name?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string | null
          registered_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          bank_account: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          image_url: string | null
          is_paid: boolean
          max_participants: number | null
          payment_methods: string[] | null
          payment_number: string | null
          registration_fee: number | null
          title: string
          type: string | null
          venue: string | null
        }
        Insert: {
          bank_account?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_paid?: boolean
          max_participants?: number | null
          payment_methods?: string[] | null
          payment_number?: string | null
          registration_fee?: number | null
          title: string
          type?: string | null
          venue?: string | null
        }
        Update: {
          bank_account?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_paid?: boolean
          max_participants?: number | null
          payment_methods?: string[] | null
          payment_number?: string | null
          registration_fee?: number | null
          title?: string
          type?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string
          sort_order: number
          tagline: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
          tagline?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
          tagline?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          id: string
          pdf_file: string | null
          sort_order: number | null
          title: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          pdf_file?: string | null
          sort_order?: number | null
          title: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          pdf_file?: string | null
          sort_order?: number | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          payment_status: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          payment_method: string
          payment_status?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_status?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          areas_of_interest: string | null
          avatar_url: string | null
          batch: string | null
          created_at: string
          department: string | null
          email: string | null
          experience_level: string | null
          facebook_link: string | null
          full_name: string
          github: string | null
          id: string
          linkedin: string | null
          membership_id: string | null
          motivation: string | null
          phone: string | null
          previous_projects: string | null
          resume_url: string | null
          session: string | null
          skills: string | null
          status: string
          student_id: string | null
          time_commitment: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          areas_of_interest?: string | null
          avatar_url?: string | null
          batch?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          experience_level?: string | null
          facebook_link?: string | null
          full_name: string
          github?: string | null
          id?: string
          linkedin?: string | null
          membership_id?: string | null
          motivation?: string | null
          phone?: string | null
          previous_projects?: string | null
          resume_url?: string | null
          session?: string | null
          skills?: string | null
          status?: string
          student_id?: string | null
          time_commitment?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          areas_of_interest?: string | null
          avatar_url?: string | null
          batch?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          experience_level?: string | null
          facebook_link?: string | null
          full_name?: string
          github?: string | null
          id?: string
          linkedin?: string | null
          membership_id?: string | null
          motivation?: string | null
          phone?: string | null
          previous_projects?: string | null
          resume_url?: string | null
          session?: string | null
          skills?: string | null
          status?: string
          student_id?: string | null
          time_commitment?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          github_link: string | null
          id: string
          image_url: string | null
          mentor_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          github_link?: string | null
          id?: string
          image_url?: string | null
          mentor_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          github_link?: string | null
          id?: string
          image_url?: string | null
          mentor_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      research_papers: {
        Row: {
          abstract: string | null
          authors: string
          created_at: string
          created_by: string | null
          doi_link: string | null
          id: string
          pdf_url: string | null
          research_area: string | null
          status: string
          tags: string[] | null
          title: string
        }
        Insert: {
          abstract?: string | null
          authors: string
          created_at?: string
          created_by?: string | null
          doi_link?: string | null
          id?: string
          pdf_url?: string | null
          research_area?: string | null
          status?: string
          tags?: string[] | null
          title: string
        }
        Update: {
          abstract?: string | null
          authors?: string
          created_at?: string
          created_by?: string | null
          doi_link?: string | null
          id?: string
          pdf_url?: string | null
          research_area?: string | null
          status?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          batch: string | null
          bio: string | null
          category: string | null
          created_at: string
          department: string | null
          email: string | null
          github: string | null
          id: string
          image_url: string | null
          linkedin: string | null
          name: string
          phone: string | null
          position: string
          sort_order: number | null
        }
        Insert: {
          batch?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          github?: string | null
          id?: string
          image_url?: string | null
          linkedin?: string | null
          name: string
          phone?: string | null
          position: string
          sort_order?: number | null
        }
        Update: {
          batch?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          github?: string | null
          id?: string
          image_url?: string | null
          linkedin?: string | null
          name?: string
          phone?: string | null
          position?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      generate_certificate_number: { Args: never; Returns: string }
      generate_membership_id: { Args: never; Returns: string }
      get_approved_member_count: { Args: never; Returns: number }
      get_certificate_holder: {
        Args: { _user_id: string }
        Returns: {
          department: string
          full_name: string
        }[]
      }
      get_public_members: {
        Args: never
        Returns: {
          avatar_url: string
          batch: string
          created_at: string
          department: string
          full_name: string
          id: string
          membership_id: string
          session: string
          status: string
          student_id: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "member"
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
      app_role: ["admin", "moderator", "member"],
    },
  },
} as const
