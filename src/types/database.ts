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
      profiles: {
        Row: Profile
        Insert: Partial<Profile>
        Update: Partial<Profile>
      }
      shops: {
        Row: Shop
        Insert: Partial<Shop>
        Update: Partial<Shop>
      }
      tickets: {
        Row: Ticket
        Insert: Partial<Ticket>
        Update: Partial<Ticket>
      }
      app_settings: {
        Row: {
          key: string
          value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          description?: string | null
          updated_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          ticket_id: string
          subscription: Json
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          subscription: Json
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          subscription?: Json
          created_at?: string
        }
      }
    }
    Functions: {
      get_next_ticket_number: {
        Args: { p_shop_id: string }
        Returns: number
      }
      process_next_customer: {
        Args: { p_shop_id: string }
        Returns: {
          ticket_id: string
          ticket_number: number
          customer_name: string
          people_count: number
        }[]
      }
      barber_next_ticket: {
        Args: { p_shop_id: string }
        Returns: {
          ticket_id: string
          ticket_number: number
          customer_name: string
          people_count: number
          barber_name: string | null
          barber_id: string | null
        }[]
      }
      get_vapid_public_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
  }
}

export interface Shop {
  id: string
  owner_id: string
  slug: string
  name: string
  logo_url: string | null
  maps_url: string | null
  phone: string | null
  is_open: boolean
  last_reset_at?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface Profile {
  id: string
  shop_id: string
  full_name: string | null
  role: 'admin' | 'barber'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  shop_id: string
  customer_name: string
  phone_number: string
  people_count: number
  ticket_number: number
  user_session_id: string
  barber_name: string | null
  barber_id?: string | null
  status: 'waiting' | 'serving' | 'completed' | 'canceled'
  created_at: string
  updated_at: string
}
