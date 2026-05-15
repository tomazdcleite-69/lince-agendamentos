export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export const BOOKING_STATUSES = [
  "solicitado",
  "confirmado",
  "aguardando_informacoes",
  "cancelado",
  "realizado",
  "nao_compareceu",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  aguardando_informacoes: "Aguardando informações",
  cancelado: "Cancelado",
  realizado: "Realizado",
  nao_compareceu: "Não compareceu",
};

export type TestRoomSession = {
  id: string;
  session_date: string;
  start_time: string;
  capacity: number;
  status: string;
  created_at: string;
};

export type TestRoomSessionWithAvailability = {
  id: string;
  session_date: string;
  start_time: string;
  capacity: number;
  status: string;
  occupied_spots: number;
  available_spots: number;
};

export type Booking = {
  id: string;
  session_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  candidates_count: number;
  notes: string | null;
  status: BookingStatus;
  public_token: string;
  created_at: string;
};

export type StatusHistory = {
  id: string;
  booking_id: string;
  old_status: BookingStatus | null;
  new_status: BookingStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
};

export type BookingWithSession = Booking & {
  test_room_sessions: Pick<TestRoomSession, "session_date" | "start_time"> | null;
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      test_room_sessions: TableDefinition<
        TestRoomSession,
        {
          id?: string;
          session_date: string;
          start_time: string;
          capacity?: number;
          status?: string;
          created_at?: string;
        },
        Partial<TestRoomSession>
      >;
      bookings: TableDefinition<
        Booking,
        {
          id?: string;
          session_id: string;
          company_name: string;
          contact_name: string;
          contact_email: string;
          contact_phone?: string | null;
          candidates_count: number;
          notes?: string | null;
          status?: BookingStatus;
          public_token: string;
          created_at?: string;
        },
        Partial<Booking>
      >;
      status_history: TableDefinition<
        StatusHistory,
        {
          id?: string;
          booking_id: string;
          old_status?: BookingStatus | null;
          new_status: BookingStatus;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        },
        Partial<StatusHistory>
      >;
    };
    Views: {
      test_room_sessions_with_availability: {
        Row: TestRoomSessionWithAvailability;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
