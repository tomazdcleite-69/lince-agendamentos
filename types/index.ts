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

export const ASSESSMENT_MODALITIES = ["presencial", "online"] as const;

export type AssessmentModality = (typeof ASSESSMENT_MODALITIES)[number];

export const ASSESSMENT_MODALITY_LABELS: Record<AssessmentModality, string> = {
  online: "Avaliação Online",
  presencial: "Avaliação Presencial",
};

export const CANDIDATE_STATUSES = [
  "confirmado",
  "realizado",
  "nao_compareceu",
  "cancelado",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  cancelado: "Cancelado",
  confirmado: "Confirmado",
  nao_compareceu: "Não compareceu",
  realizado: "Realizado",
};

export const SERVICE_COMPANIES = ["lince", "psicoespaco"] as const;

export type ServiceCompany = (typeof SERVICE_COMPANIES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  solicitado: "Confirmado",
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
  session_id: string | null;
  assessment_modality: AssessmentModality;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  candidates_count: number;
  notes: string | null;
  service_company: string;
  status: BookingStatus;
  public_token: string;
  created_at: string;
};

export type BookingCandidate = {
  id: string;
  booking_id: string;
  candidate_session_id: string | null;
  candidate_name: string;
  desired_role: string;
  candidate_phone: string | null;
  candidate_email: string | null;
  candidate_status: CandidateStatus;
  admin_notes: string | null;
  cancelled_at: string | null;
  no_show_notified_at: string | null;
  rescheduled_at: string | null;
  resume_url: string | null;
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
  booking_candidates?: BookingCandidate[];
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
          session_id?: string | null;
          assessment_modality?: AssessmentModality;
          company_name: string;
          contact_name: string;
          contact_email: string;
          contact_phone?: string | null;
          candidates_count: number;
          notes?: string | null;
          status?: BookingStatus;
          public_token: string;
          service_company?: string;
          created_at?: string;
        },
        Partial<Booking>
      >;
      booking_candidates: TableDefinition<
        BookingCandidate,
        {
          id?: string;
          booking_id: string;
          candidate_session_id?: string | null;
          candidate_name: string;
          desired_role: string;
          candidate_phone?: string | null;
          candidate_email?: string | null;
          candidate_status?: CandidateStatus;
          admin_notes?: string | null;
          cancelled_at?: string | null;
          no_show_notified_at?: string | null;
          rescheduled_at?: string | null;
          resume_url?: string | null;
          created_at?: string;
        },
        Partial<BookingCandidate>
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
