/**
 * Hand-maintained mirror of supabase/migrations. Keep in sync with the SQL.
 * Regenerate with `supabase gen types typescript --local > src/lib/types/database.ts`
 * once you are running the local stack; this file follows the same shape.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string };

export type Database = {
  public: {
    Tables: {
      allowed_email_domains: {
        Row: { domain: string; created_at: string };
        Insert: { domain: string; created_at?: string };
        Update: { domain?: string; created_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          school_email: string;
          username: string | null;
          display_name: string | null;
          grade: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: Database["public"]["Enums"]["user_role"];
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          school_email: string;
          username?: string | null;
          display_name?: string | null;
          grade?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_email?: string;
          username?: string | null;
          display_name?: string | null;
          grade?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      committees: {
        Row: {
          id: string;
          slug: string;
          acronym: string;
          name: string;
          category: string;
          description: string | null;
          current_topic: string | null;
          background_guide_url: string | null;
          is_open: boolean;
          submissions_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          acronym: string;
          name: string;
          category: string;
          description?: string | null;
          current_topic?: string | null;
          background_guide_url?: string | null;
          is_open?: boolean;
          submissions_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          acronym?: string;
          name?: string;
          category?: string;
          description?: string | null;
          current_topic?: string | null;
          background_guide_url?: string | null;
          is_open?: boolean;
          submissions_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      committee_memberships: {
        Row: {
          id: string;
          profile_id: string;
          committee_id: string;
          membership_role: Database["public"]["Enums"]["membership_role"];
          delegation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          committee_id: string;
          membership_role?: Database["public"]["Enums"]["membership_role"];
          delegation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          committee_id?: string;
          membership_role?: Database["public"]["Enums"]["membership_role"];
          delegation?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "committee_memberships_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "committee_memberships_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "committee_memberships_committee_id_fkey"; columns: ["committee_id"]; isOneToOne: false; referencedRelation: "committees"; referencedColumns: ["id"] },
        ];
      };
      weekly_sessions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          theme: string | null;
          starts_at: string;
          ends_at: string;
          location: string | null;
          meeting_url: string | null;
          dress_code: string | null;
          general_agenda: string | null;
          status: Database["public"]["Enums"]["session_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          theme?: string | null;
          starts_at: string;
          ends_at: string;
          location?: string | null;
          meeting_url?: string | null;
          dress_code?: string | null;
          general_agenda?: string | null;
          status?: Database["public"]["Enums"]["session_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          theme?: string | null;
          starts_at?: string;
          ends_at?: string;
          location?: string | null;
          meeting_url?: string | null;
          dress_code?: string | null;
          general_agenda?: string | null;
          status?: Database["public"]["Enums"]["session_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "weekly_sessions_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      session_committees: {
        Row: {
          id: string;
          session_id: string;
          committee_id: string;
          topic: string | null;
          agenda: string | null;
          chair_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          committee_id: string;
          topic?: string | null;
          agenda?: string | null;
          chair_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          committee_id?: string;
          topic?: string | null;
          agenda?: string | null;
          chair_notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "session_committees_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "weekly_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "session_committees_committee_id_fkey"; columns: ["committee_id"]; isOneToOne: false; referencedRelation: "committees"; referencedColumns: ["id"] },
        ];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          assigned_to_profile_id: string | null;
          assigned_role: Database["public"]["Enums"]["user_role"] | null;
          assigned_committee_id: string | null;
          session_id: string | null;
          created_by: string;
          due_at: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          status: Database["public"]["Enums"]["task_status"];
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          assigned_to_profile_id?: string | null;
          assigned_role?: Database["public"]["Enums"]["user_role"] | null;
          assigned_committee_id?: string | null;
          session_id?: string | null;
          created_by: string;
          due_at?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          assigned_to_profile_id?: string | null;
          assigned_role?: Database["public"]["Enums"]["user_role"] | null;
          assigned_committee_id?: string | null;
          session_id?: string | null;
          created_by?: string;
          due_at?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "tasks_assigned_to_profile_id_fkey"; columns: ["assigned_to_profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_assigned_to_profile_id_fkey"; columns: ["assigned_to_profile_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_assigned_committee_id_fkey"; columns: ["assigned_committee_id"]; isOneToOne: false; referencedRelation: "committees"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "weekly_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_reviewed_by_fkey"; columns: ["reviewed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_reviewed_by_fkey"; columns: ["reviewed_by"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
        ];
      };
      task_uploads: {
        Row: {
          id: string;
          task_id: string;
          uploaded_by: string;
          title: string;
          notes: string | null;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          uploaded_by: string;
          title: string;
          notes?: string | null;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          uploaded_by?: string;
          title?: string;
          notes?: string | null;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          size_bytes?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "task_uploads_task_id_fkey"; columns: ["task_id"]; isOneToOne: false; referencedRelation: "tasks"; referencedColumns: ["id"] },
          { foreignKeyName: "task_uploads_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "task_uploads_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
        ];
      };
      task_activity: {
        Row: {
          id: string;
          task_id: string;
          actor_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          actor_id?: string | null;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          actor_id?: string | null;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "task_activity_task_id_fkey"; columns: ["task_id"]; isOneToOne: false; referencedRelation: "tasks"; referencedColumns: ["id"] },
          { foreignKeyName: "task_activity_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "task_activity_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
        ];
      };
      task_templates: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          default_due_days: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          default_due_days?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          default_due_days?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: Database["public"]["Enums"]["material_category"];
          committee_id: string | null;
          session_id: string | null;
          uploaded_by: string;
          storage_path: string | null;
          external_url: string | null;
          file_name: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          visibility: Database["public"]["Enums"]["material_visibility"];
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category: Database["public"]["Enums"]["material_category"];
          committee_id?: string | null;
          session_id?: string | null;
          uploaded_by: string;
          storage_path?: string | null;
          external_url?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          visibility?: Database["public"]["Enums"]["material_visibility"];
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: Database["public"]["Enums"]["material_category"];
          committee_id?: string | null;
          session_id?: string | null;
          uploaded_by?: string;
          storage_path?: string | null;
          external_url?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          visibility?: Database["public"]["Enums"]["material_visibility"];
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "materials_committee_id_fkey"; columns: ["committee_id"]; isOneToOne: false; referencedRelation: "committees"; referencedColumns: ["id"] },
          { foreignKeyName: "materials_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "weekly_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "materials_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "materials_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
        ];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          author_id: string | null;
          pinned: boolean;
          target_role: Database["public"]["Enums"]["user_role"] | null;
          target_committee_id: string | null;
          target_session_id: string | null;
          published_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          author_id?: string | null;
          pinned?: boolean;
          target_role?: Database["public"]["Enums"]["user_role"] | null;
          target_committee_id?: string | null;
          target_session_id?: string | null;
          published_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          author_id?: string | null;
          pinned?: boolean;
          target_role?: Database["public"]["Enums"]["user_role"] | null;
          target_committee_id?: string | null;
          target_session_id?: string | null;
          published_at?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "announcements_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "announcements_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "announcements_target_committee_id_fkey"; columns: ["target_committee_id"]; isOneToOne: false; referencedRelation: "committees"; referencedColumns: ["id"] },
          { foreignKeyName: "announcements_target_session_id_fkey"; columns: ["target_session_id"]; isOneToOne: false; referencedRelation: "weekly_sessions"; referencedColumns: ["id"] },
        ];
      };
      announcement_reads: {
        Row: { announcement_id: string; profile_id: string; read_at: string };
        Insert: { announcement_id: string; profile_id: string; read_at?: string };
        Update: { announcement_id?: string; profile_id?: string; read_at?: string };
        Relationships: [
          { foreignKeyName: "announcement_reads_announcement_id_fkey"; columns: ["announcement_id"]; isOneToOne: false; referencedRelation: "announcements"; referencedColumns: ["id"] },
        ];
      };
      attendance_records: {
        Row: {
          id: string;
          session_id: string;
          profile_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          note: string | null;
          recorded_by: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          profile_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          note?: string | null;
          recorded_by?: string | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          profile_id?: string;
          status?: Database["public"]["Enums"]["attendance_status"];
          note?: string | null;
          recorded_by?: string | null;
          recorded_at?: string;
        };
        Relationships: [
          { foreignKeyName: "attendance_records_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "weekly_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "attendance_records_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "attendance_records_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
        ];
      };
      committee_submissions: {
        Row: {
          id: string;
          committee_id: string;
          profile_id: string;
          title: string;
          notes: string | null;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          committee_id: string;
          profile_id: string;
          title: string;
          notes?: string | null;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          committee_id?: string;
          profile_id?: string;
          title?: string;
          notes?: string | null;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          size_bytes?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "committee_submissions_committee_id_fkey"; columns: ["committee_id"]; isOneToOne: false; referencedRelation: "committees"; referencedColumns: ["id"] },
          { foreignKeyName: "committee_submissions_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "committee_submissions_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
        ];
      };
      session_feedback: {
        Row: { id: string; session_id: string; profile_id: string; author_id: string | null; body: string; created_at: string };
        Insert: { id?: string; session_id: string; profile_id: string; author_id?: string | null; body: string; created_at?: string };
        Update: { id?: string; session_id?: string; profile_id?: string; author_id?: string | null; body?: string; created_at?: string };
        Relationships: [
          { foreignKeyName: "session_feedback_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "weekly_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "session_feedback_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "session_feedback_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "session_feedback_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "session_feedback_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
        ];
      };
      resolution_links: {
        Row: {
          id: string;
          committee_id: string;
          profile_id: string;
          title: string;
          url: string;
          kind: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          committee_id: string;
          profile_id: string;
          title: string;
          url: string;
          kind?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          committee_id?: string;
          profile_id?: string;
          title?: string;
          url?: string;
          kind?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "resolution_links_committee_id_fkey"; columns: ["committee_id"]; isOneToOne: false; referencedRelation: "committees"; referencedColumns: ["id"] },
          { foreignKeyName: "resolution_links_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "resolution_links_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "audit_logs_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "audit_logs_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "public_profiles"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          grade: string | null;
          avatar_url: string | null;
          role: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
    };
    Functions: {
      current_profile_role: { Args: Record<string, never>; Returns: Database["public"]["Enums"]["user_role"] | null };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_chair_of: { Args: { c: string }; Returns: boolean };
      is_member_of: { Args: { c: string }; Returns: boolean };
      can_view_task: { Args: { t: string }; Returns: boolean };
      can_manage_task: { Args: { t: string }; Returns: boolean };
      can_view_session: { Args: { s: string }; Returns: boolean };
      username_available: { Args: { p_username: string }; Returns: boolean };
      mark_overdue_tasks: { Args: Record<string, never>; Returns: number };
      session_chair_notes: { Args: { sc: string }; Returns: string | null };
    };
    Enums: {
      user_role: "admin" | "executive" | "chair" | "delegate";
      membership_role: "delegate" | "chair" | "co_chair" | "executive";
      session_status: "draft" | "published" | "completed" | "cancelled";
      task_priority: "low" | "normal" | "high" | "urgent";
      task_status: "not_started" | "in_progress" | "submitted" | "reviewed" | "completed" | "overdue";
      attendance_status: "present" | "late" | "excused" | "absent";
      material_category:
        | "study_guide"
        | "rules_of_procedure"
        | "topic_brief"
        | "research_source"
        | "template"
        | "slide_deck"
        | "recording";
      material_visibility: "everyone" | "committee" | "staff";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

export type Profile = Tables<"profiles">;
export type PublicProfile = Views<"public_profiles">;
export type Committee = Tables<"committees">;
export type CommitteeMembership = Tables<"committee_memberships">;
export type WeeklySession = Tables<"weekly_sessions">;
export type SessionCommittee = Tables<"session_committees">;
export type Task = Tables<"tasks">;
export type TaskUpload = Tables<"task_uploads">;
export type TaskActivity = Tables<"task_activity">;
export type Material = Tables<"materials">;
export type Announcement = Tables<"announcements">;
export type AttendanceRecord = Tables<"attendance_records">;
export type AuditLog = Tables<"audit_logs">;
export type CommitteeSubmission = Tables<"committee_submissions">;
export type TaskTemplate = Tables<"task_templates">;
export type SessionFeedback = Tables<"session_feedback">;
export type ResolutionLink = Tables<"resolution_links">;

// Unused helper kept for parity with generated files.
export type { Timestamps as _Timestamps };
