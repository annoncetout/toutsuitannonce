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
      activity_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          animation_type: string
          button_text: string | null
          clicks: number
          created_at: string
          created_by: string | null
          description: string | null
          discount: number | null
          end_date: string
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          position: number
          redirect_url: string | null
          start_date: string
          subtitle: string | null
          theme_color: string | null
          title: string
          updated_at: string
        }
        Insert: {
          animation_type?: string
          button_text?: string | null
          clicks?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount?: number | null
          end_date?: string
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          position?: number
          redirect_url?: string | null
          start_date?: string
          subtitle?: string | null
          theme_color?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          animation_type?: string
          button_text?: string | null
          clicks?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount?: number | null
          end_date?: string
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          position?: number
          redirect_url?: string | null
          start_date?: string
          subtitle?: string | null
          theme_color?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_phone_clicks: {
        Row: {
          channel: string
          created_at: string
          id: string
          listing_id: string
          session_hash: string | null
          user_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          listing_id: string
          session_hash?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          listing_id?: string
          session_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_phone_clicks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_phone_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_phone_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          archived_at: string | null
          auto_removed: boolean
          category_id: string | null
          created_at: string
          currency: string
          description: string
          expires_at: string
          expiry_notified_0d: boolean
          expiry_notified_30d: boolean
          expiry_notified_7d: boolean
          id: string
          images: string[]
          is_active: boolean
          is_featured: boolean
          is_premium: boolean
          is_urgent: boolean
          last_renewed_at: string | null
          location: string | null
          moderation_status: Database["public"]["Enums"]["listing_status"]
          phone_clicks_count: number
          premium_until: string | null
          price: number | null
          price_type: string | null
          published_at: string
          quarantined_at: string | null
          rejection_reason: string | null
          renewed_count: number
          sold_at: string | null
          title: string
          trust_score: number | null
          updated_at: string
          urgent_until: string | null
          user_id: string
          views_count: number
        }
        Insert: {
          archived_at?: string | null
          auto_removed?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          description: string
          expires_at?: string
          expiry_notified_0d?: boolean
          expiry_notified_30d?: boolean
          expiry_notified_7d?: boolean
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          is_premium?: boolean
          is_urgent?: boolean
          last_renewed_at?: string | null
          location?: string | null
          moderation_status?: Database["public"]["Enums"]["listing_status"]
          phone_clicks_count?: number
          premium_until?: string | null
          price?: number | null
          price_type?: string | null
          published_at?: string
          quarantined_at?: string | null
          rejection_reason?: string | null
          renewed_count?: number
          sold_at?: string | null
          title: string
          trust_score?: number | null
          updated_at?: string
          urgent_until?: string | null
          user_id: string
          views_count?: number
        }
        Update: {
          archived_at?: string | null
          auto_removed?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          expires_at?: string
          expiry_notified_0d?: boolean
          expiry_notified_30d?: boolean
          expiry_notified_7d?: boolean
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          is_premium?: boolean
          is_urgent?: boolean
          last_renewed_at?: string | null
          location?: string | null
          moderation_status?: Database["public"]["Enums"]["listing_status"]
          phone_clicks_count?: number
          premium_until?: string | null
          price?: number | null
          price_type?: string | null
          published_at?: string
          quarantined_at?: string | null
          rejection_reason?: string | null
          renewed_count?: number
          sold_at?: string | null
          title?: string
          trust_score?: number | null
          updated_at?: string
          urgent_until?: string | null
          user_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          listing_id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          listing_id: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          listing_id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      moderation_appeals: {
        Row: {
          admin_note: string | null
          case_id: string
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["appeal_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          case_id: string
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          case_id?: string
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_appeals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "moderation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_cases: {
        Row: {
          ai_verdict: Json
          auto_action: string | null
          created_at: string
          id: string
          listing_id: string
          reports_count: number
          resolved_at: string | null
          resolved_by: string | null
          risk_level:
            | Database["public"]["Enums"]["moderation_risk_level"]
            | null
          status: Database["public"]["Enums"]["moderation_case_status"]
          trust_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_verdict?: Json
          auto_action?: string | null
          created_at?: string
          id?: string
          listing_id: string
          reports_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?:
            | Database["public"]["Enums"]["moderation_risk_level"]
            | null
          status?: Database["public"]["Enums"]["moderation_case_status"]
          trust_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_verdict?: Json
          auto_action?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          reports_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?:
            | Database["public"]["Enums"]["moderation_risk_level"]
            | null
          status?: Database["public"]["Enums"]["moderation_case_status"]
          trust_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderation_decisions: {
        Row: {
          action: string
          admin_id: string | null
          case_id: string | null
          created_at: string
          id: string
          listing_id: string
          metadata: Json
          note: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          listing_id: string
          metadata?: Json
          note?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          metadata?: Json
          note?: string | null
        }
        Relationships: []
      }
      moderation_notifications: {
        Row: {
          body: string | null
          case_id: string | null
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "moderation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          categories: string[]
          city: string | null
          created_at: string
          enabled: boolean
          premium_only: boolean
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          city?: string | null
          created_at?: string
          enabled?: boolean
          premium_only?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          city?: string | null
          created_at?: string
          enabled?: boolean
          premium_only?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          metadata: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          is_top_seller_suspended: boolean
          is_verified: boolean
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          suspended_until: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_top_seller_suspended?: boolean
          is_verified?: boolean
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          suspended_until?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_top_seller_suspended?: boolean
          is_verified?: boolean
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          suspended_until?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      push_events: {
        Row: {
          created_at: string
          endpoint_hash: string | null
          event_type: string
          id: string
          notification_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint_hash?: string | null
          event_type: string
          id?: string
          notification_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint_hash?: string | null
          event_type?: string
          id?: string
          notification_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_events_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
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
          last_used_at: string
          p256dh: string
          platform: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          platform?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          platform?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pwa_install_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          platform: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          platform?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          platform?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      report_rate_limits: {
        Row: {
          count: number
          day: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          is_valid: boolean
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          is_valid?: boolean
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          is_valid?: boolean
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: []
      }
      seller_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_hidden: boolean
          is_verified: boolean
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_verified?: boolean
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_verified?: boolean
          rating?: number
          reviewer_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_score_history: {
        Row: {
          account_age_days: number | null
          avg_rating: number | null
          computed_at: string
          delta: number | null
          id: string
          previous_score: number | null
          quality_score: number | null
          reason: string | null
          response_rate: number | null
          reviews_count: number | null
          sales_count: number | null
          top_score: number
          total_phone_clicks: number | null
          total_views: number | null
          user_id: string
          weights: Json | null
        }
        Insert: {
          account_age_days?: number | null
          avg_rating?: number | null
          computed_at?: string
          delta?: number | null
          id?: string
          previous_score?: number | null
          quality_score?: number | null
          reason?: string | null
          response_rate?: number | null
          reviews_count?: number | null
          sales_count?: number | null
          top_score: number
          total_phone_clicks?: number | null
          total_views?: number | null
          user_id: string
          weights?: Json | null
        }
        Update: {
          account_age_days?: number | null
          avg_rating?: number | null
          computed_at?: string
          delta?: number | null
          id?: string
          previous_score?: number | null
          quality_score?: number | null
          reason?: string | null
          response_rate?: number | null
          reviews_count?: number | null
          sales_count?: number | null
          top_score?: number
          total_phone_clicks?: number | null
          total_views?: number | null
          user_id?: string
          weights?: Json | null
        }
        Relationships: []
      }
      seller_stats: {
        Row: {
          account_age_days: number
          active_listings_count: number
          avatar_url: string | null
          avg_rating: number
          badge: Database["public"]["Enums"]["seller_badge"]
          category_scores: Json
          city: string | null
          created_at: string
          display_name: string | null
          fraud_flags: Json
          is_suspended: boolean
          is_top_of_month: boolean
          last_computed_at: string
          listings_count: number
          positive_reviews_count: number
          publish_frequency: number
          quality_score: number
          rank_category: Json
          rank_global: number | null
          response_rate: number
          reviews_count: number
          sales_count: number
          suspension_reason: string | null
          top_score: number
          total_messages: number
          total_phone_clicks: number
          total_views: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_age_days?: number
          active_listings_count?: number
          avatar_url?: string | null
          avg_rating?: number
          badge?: Database["public"]["Enums"]["seller_badge"]
          category_scores?: Json
          city?: string | null
          created_at?: string
          display_name?: string | null
          fraud_flags?: Json
          is_suspended?: boolean
          is_top_of_month?: boolean
          last_computed_at?: string
          listings_count?: number
          positive_reviews_count?: number
          publish_frequency?: number
          quality_score?: number
          rank_category?: Json
          rank_global?: number | null
          response_rate?: number
          reviews_count?: number
          sales_count?: number
          suspension_reason?: string | null
          top_score?: number
          total_messages?: number
          total_phone_clicks?: number
          total_views?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_age_days?: number
          active_listings_count?: number
          avatar_url?: string | null
          avg_rating?: number
          badge?: Database["public"]["Enums"]["seller_badge"]
          category_scores?: Json
          city?: string | null
          created_at?: string
          display_name?: string | null
          fraud_flags?: Json
          is_suspended?: boolean
          is_top_of_month?: boolean
          last_computed_at?: string
          listings_count?: number
          positive_reviews_count?: number
          publish_frequency?: number
          quality_score?: number
          rank_category?: Json
          rank_global?: number | null
          response_rate?: number
          reviews_count?: number
          sales_count?: number
          suspension_reason?: string | null
          top_score?: number
          total_messages?: number
          total_phone_clicks?: number
          total_views?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_reference: string | null
          id: string
          listing_id: string | null
          metadata: Json | null
          method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
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
      profiles_public: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_verified: boolean | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
        }
        Relationships: []
      }
      seller_score_history_public: {
        Row: {
          avg_rating: number | null
          computed_at: string | null
          delta: number | null
          id: string | null
          previous_score: number | null
          response_rate: number | null
          reviews_count: number | null
          sales_count: number | null
          top_score: number | null
          total_views: number | null
          user_id: string | null
        }
        Insert: {
          avg_rating?: number | null
          computed_at?: string | null
          delta?: number | null
          id?: string | null
          previous_score?: number | null
          response_rate?: number | null
          reviews_count?: number | null
          sales_count?: number | null
          top_score?: number | null
          total_views?: number | null
          user_id?: string | null
        }
        Update: {
          avg_rating?: number | null
          computed_at?: string | null
          delta?: number | null
          id?: string | null
          previous_score?: number | null
          response_rate?: number | null
          reviews_count?: number | null
          sales_count?: number | null
          top_score?: number | null
          total_views?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      seller_stats_public: {
        Row: {
          account_age_days: number | null
          active_listings_count: number | null
          avatar_url: string | null
          avg_rating: number | null
          badge: Database["public"]["Enums"]["seller_badge"] | null
          category_scores: Json | null
          city: string | null
          display_name: string | null
          is_top_of_month: boolean | null
          last_computed_at: string | null
          listings_count: number | null
          positive_reviews_count: number | null
          publish_frequency: number | null
          quality_score: number | null
          rank_category: Json | null
          rank_global: number | null
          response_rate: number | null
          reviews_count: number | null
          sales_count: number | null
          top_score: number | null
          total_views: number | null
          user_id: string | null
        }
        Insert: {
          account_age_days?: number | null
          active_listings_count?: number | null
          avatar_url?: string | null
          avg_rating?: number | null
          badge?: Database["public"]["Enums"]["seller_badge"] | null
          category_scores?: Json | null
          city?: string | null
          display_name?: string | null
          is_top_of_month?: boolean | null
          last_computed_at?: string | null
          listings_count?: number | null
          positive_reviews_count?: number | null
          publish_frequency?: number | null
          quality_score?: number | null
          rank_category?: Json | null
          rank_global?: number | null
          response_rate?: number | null
          reviews_count?: number | null
          sales_count?: number | null
          top_score?: number | null
          total_views?: number | null
          user_id?: string | null
        }
        Update: {
          account_age_days?: number | null
          active_listings_count?: number | null
          avatar_url?: string | null
          avg_rating?: number | null
          badge?: Database["public"]["Enums"]["seller_badge"] | null
          category_scores?: Json | null
          city?: string | null
          display_name?: string | null
          is_top_of_month?: boolean | null
          last_computed_at?: string | null
          listings_count?: number | null
          positive_reviews_count?: number | null
          publish_frequency?: number | null
          quality_score?: number | null
          rank_category?: Json | null
          rank_global?: number | null
          response_rate?: number | null
          reviews_count?: number | null
          sales_count?: number | null
          top_score?: number | null
          total_views?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_top_seller_badges: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_premium_listings: { Args: never; Returns: undefined }
      get_listing_seller_contact: {
        Args: { _listing_id: string }
        Returns: {
          account_type: Database["public"]["Enums"]["account_type"]
          city: string
          display_name: string
          id: string
          is_verified: boolean
          phone: string
          whatsapp: string
        }[]
      }
      get_listings_seller_contacts: {
        Args: { _listing_ids: string[] }
        Returns: {
          display_name: string
          listing_id: string
          phone: string
          seller_id: string
          whatsapp: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ad_metric: {
        Args: { _ad_id: string; _metric: string }
        Returns: undefined
      }
      increment_listing_phone_click: {
        Args: { _channel?: string; _listing_id: string; _session_hash?: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_admins: {
        Args: {
          _body: string
          _link: string
          _metadata: Json
          _title: string
          _type: string
        }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_all_seller_scores: { Args: never; Returns: number }
      recompute_seller_score: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      account_status: "active" | "suspended" | "banned"
      account_type: "particulier" | "professionnel"
      app_role: "admin" | "moderator" | "user"
      appeal_status: "open" | "accepted" | "rejected"
      listing_status: "pending" | "approved" | "rejected"
      moderation_case_status:
        | "pending"
        | "quarantined"
        | "removed"
        | "cleared"
        | "appealed"
      moderation_risk_level: "low" | "medium" | "high" | "critical"
      payment_method:
        | "wave"
        | "orange_money"
        | "mtn"
        | "card"
        | "cash"
        | "other"
      report_status: "open" | "reviewed" | "dismissed" | "actioned"
      report_target: "listing" | "user"
      seller_badge: "none" | "gold" | "silver" | "bronze"
      subscription_plan:
        | "free"
        | "premium"
        | "business"
        | "starter_pro"
        | "business_pro"
        | "elite_pro"
      subscription_status: "active" | "cancelled" | "expired" | "trialing"
      transaction_status: "pending" | "completed" | "failed" | "refunded"
      transaction_type:
        | "listing_boost"
        | "subscription"
        | "commission"
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
      account_status: ["active", "suspended", "banned"],
      account_type: ["particulier", "professionnel"],
      app_role: ["admin", "moderator", "user"],
      appeal_status: ["open", "accepted", "rejected"],
      listing_status: ["pending", "approved", "rejected"],
      moderation_case_status: [
        "pending",
        "quarantined",
        "removed",
        "cleared",
        "appealed",
      ],
      moderation_risk_level: ["low", "medium", "high", "critical"],
      payment_method: ["wave", "orange_money", "mtn", "card", "cash", "other"],
      report_status: ["open", "reviewed", "dismissed", "actioned"],
      report_target: ["listing", "user"],
      seller_badge: ["none", "gold", "silver", "bronze"],
      subscription_plan: [
        "free",
        "premium",
        "business",
        "starter_pro",
        "business_pro",
        "elite_pro",
      ],
      subscription_status: ["active", "cancelled", "expired", "trialing"],
      transaction_status: ["pending", "completed", "failed", "refunded"],
      transaction_type: [
        "listing_boost",
        "subscription",
        "commission",
        "other",
      ],
    },
  },
} as const
