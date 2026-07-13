import type {
  ApprovalStatus,
  AvailabilityStatus,
  BookingStatus,
  CartItemStatus,
  EventStatus,
  ItemType,
  PaymentStatus,
  PricingType,
  QuoteStatus,
  RsvpStatus,
  UserRole,
} from "../types/domain";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type RowWithTimestamps = {
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: RowWithTimestamps & {
          email: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: UserRole;
          user_id: string;
        };
        Insert: {
          email: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: UserRole;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: RowWithTimestamps & {
          address: string | null;
          budget_max: number | null;
          budget_min: number | null;
          city: string | null;
          budget_tier: string | null;
          culture: string | null;
          date: string | null;
          end_time: string | null;
          event_profile: Json | null;
          event_type: string;
          formality: string | null;
          guest_count: number | null;
          id: string;
          indoor_outdoor: string | null;
          latitude: number | null;
          longitude: number | null;
          planner_id: string;
          religion: string | null;
          season: string | null;
          setup_time: string | null;
          start_time: string | null;
          status: EventStatus;
          subtype: string | null;
          teardown_time: string | null;
          time_of_day: string | null;
          timezone: string | null;
          title: string;
          venue_style: string | null;
          venue_needed: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          event_type: string;
          planner_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      vendor_businesses: {
        Row: RowWithTimestamps & {
          approval_status: ApprovalStatus;
          base_address: string | null;
          business_name: string;
          category: string;
          description: string | null;
          email: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          owner_id: string;
          phone: string | null;
          service_area_city: string | null;
          service_radius_miles: number;
          vacation_mode: boolean;
          website_url: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["vendor_businesses"]["Row"]> & {
          business_name: string;
          category: string;
          owner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_businesses"]["Insert"]>;
        Relationships: [];
      };
      vendor_services: {
        Row: {
          active: boolean;
          base_price: number | null;
          category: string;
          description: string | null;
          event_types_supported: string[];
          hourly_rate: number | null;
          id: string;
          minimum_hours: number | null;
          pricing_type: PricingType;
          service_name: string;
          setup_fee: number;
          travel_fee: number;
          vendor_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vendor_services"]["Row"]> & {
          category: string;
          pricing_type: PricingType;
          service_name: string;
          vendor_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_services"]["Insert"]>;
        Relationships: [];
      };
      vendor_photos: {
        Row: {
          id: string;
          image_url: string;
          sort_order: number;
          storage_path: string | null;
          vendor_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vendor_photos"]["Row"]> & {
          image_url: string;
          vendor_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_photos"]["Insert"]>;
        Relationships: [];
      };
      vendor_availability: {
        Row: {
          date: string;
          end_time: string;
          id: string;
          start_time: string;
          status: AvailabilityStatus;
          vendor_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vendor_availability"]["Row"]> & {
          date: string;
          end_time: string;
          start_time: string;
          vendor_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_availability"]["Insert"]>;
        Relationships: [];
      };
      venues: {
        Row: {
          address: string;
          approval_status: ApprovalStatus;
          capacity: number | null;
          city: string;
          cleaning_fee: number;
          description: string | null;
          hourly_rate: number | null;
          id: string;
          indoor_outdoor: string | null;
          latitude: number | null;
          longitude: number | null;
          minimum_hours: number | null;
          name: string;
          owner_id: string | null;
          security_deposit: number;
        };
        Insert: Partial<Database["public"]["Tables"]["venues"]["Row"]> & {
          address: string;
          city: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["venues"]["Insert"]>;
        Relationships: [];
      };
      cart_items: {
        Row: {
          end_time: string | null;
          estimated_price: number | null;
          event_id: string;
          id: string;
          item_type: ItemType;
          quantity: number;
          service_id: string | null;
          start_time: string | null;
          status: CartItemStatus;
          vendor_id: string | null;
          venue_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["cart_items"]["Row"]> & {
          event_id: string;
          item_type: ItemType;
        };
        Update: Partial<Database["public"]["Tables"]["cart_items"]["Insert"]>;
        Relationships: [];
      };
      quote_requests: {
        Row: RowWithTimestamps & {
          estimated_price: number | null;
          event_id: string;
          guest_count: number | null;
          id: string;
          message: string | null;
          planner_id: string;
          requested_end_time: string | null;
          requested_start_time: string | null;
          service_id: string | null;
          status: QuoteStatus;
          vendor_final_price: number | null;
          vendor_id: string | null;
          venue_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["quote_requests"]["Row"]> & {
          event_id: string;
          planner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["quote_requests"]["Insert"]>;
        Relationships: [];
      };
      bookings: {
        Row: RowWithTimestamps & {
          balance_due: number;
          booking_status: BookingStatus;
          booking_timeline: Json | null;
          deposit_amount: number;
          event_id: string;
          final_price: number;
          id: string;
          payment_status: PaymentStatus;
          planner_notes: string | null;
          planner_id: string;
          quote_request_id: string | null;
          service_id: string | null;
          vendor_notes: string | null;
          vendor_id: string | null;
          venue_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["bookings"]["Row"]> & {
          event_id: string;
          final_price: number;
          planner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
      messages: {
        Row: RowWithTimestamps & {
          body: string;
          booking_id: string | null;
          id: string;
          quote_request_id: string | null;
          receiver_id: string;
          sender_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & {
          body: string;
          receiver_id: string;
          sender_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };
      guests: {
        Row: RowWithTimestamps & {
          email: string | null;
          event_id: string;
          id: string;
          name: string;
          phone: string | null;
          plus_ones: number;
          rsvp_status: RsvpStatus;
        };
        Insert: Partial<Database["public"]["Tables"]["guests"]["Row"]> & {
          event_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["guests"]["Insert"]>;
        Relationships: [];
      };
      vendor_tags: {
        Row: RowWithTimestamps & {
          id: string;
          tag: string;
          vendor_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vendor_tags"]["Row"]> & {
          tag: string;
          vendor_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_tags"]["Insert"]>;
        Relationships: [];
      };
      vendor_service_tags: {
        Row: RowWithTimestamps & {
          id: string;
          service_id: string;
          tag: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vendor_service_tags"]["Row"]> & {
          service_id: string;
          tag: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["vendor_service_tags"]["Insert"]
        >;
        Relationships: [];
      };
      event_tags: {
        Row: RowWithTimestamps & {
          event_id: string;
          id: string;
          tag: string;
        };
        Insert: Partial<Database["public"]["Tables"]["event_tags"]["Row"]> & {
          event_id: string;
          tag: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_tags"]["Insert"]>;
        Relationships: [];
      };
      project_inquiries: {
        Row: RowWithTimestamps & {
          email: string;
          full_name: string;
          id: string;
          interest_types: string[];
          message: string;
          organization: string | null;
          preferred_contact_method: string | null;
          source_page: string;
          status: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["project_inquiries"]["Row"]
        > & {
          email: string;
          full_name: string;
          interest_types: string[];
          message: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_inquiries"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      approval_status: ApprovalStatus;
      availability_status: AvailabilityStatus;
      booking_status: BookingStatus;
      cart_item_status: CartItemStatus;
      event_status: EventStatus;
      item_type: ItemType;
      payment_status: PaymentStatus;
      pricing_type: PricingType;
      quote_status: QuoteStatus;
      rsvp_status: RsvpStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type PublicTableName = keyof Database["public"]["Tables"];
export type PublicTableRow<TTable extends PublicTableName> =
  Database["public"]["Tables"][TTable]["Row"];
