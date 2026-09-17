import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// Disposable PostgreSQL instance. No environment variables or remote database are used.
export const BASE_SCHEMA = `
    create role anon; create role authenticated; create role service_role bypassrls;
    create table public.test_room_sessions (
      id uuid primary key default gen_random_uuid(), session_date date not null, start_time time not null,
      capacity integer not null default 15, status text not null default 'aberta', created_at timestamptz default now(),
      constraint unique_session_date_time unique(session_date, start_time)
    );
    create table public.bookings (
      id uuid primary key default gen_random_uuid(), session_id uuid references public.test_room_sessions(id) on delete cascade,
      company_name text not null, contact_name text not null, contact_email text not null, contact_phone text,
      candidates_count integer not null check(candidates_count > 0), notes text, status text not null default 'confirmado',
      public_token text not null unique, created_at timestamptz default now(),
      service_company text not null default 'lince' check(service_company in ('lince','psicoespaco','espaco_lince')), assessment_modality text not null default 'presencial'
        check(assessment_modality in ('presencial','online'))
    );
    create table public.booking_candidates (
      id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
      candidate_session_id uuid references public.test_room_sessions(id), candidate_name text not null, desired_role text not null,
      candidate_phone text, candidate_email text, candidate_status text not null default 'confirmado'
        check(candidate_status in ('confirmado','realizado','nao_compareceu','cancelado')),
      admin_notes text, cancelled_at timestamptz, no_show_notified_at timestamptz, rescheduled_at timestamptz,
      resume_url text, created_at timestamptz default now()
    );
    create table public.status_history (
      id uuid primary key default gen_random_uuid(), booking_id uuid references public.bookings(id) on delete cascade,
      old_status text, new_status text not null, changed_by text, note text, created_at timestamptz default now()
    );
    grant all on all tables in schema public to service_role;
    alter table bookings enable row level security;
    alter table booking_candidates enable row level security;
    alter table test_room_sessions enable row level security;
    alter table status_history enable row level security;
    create view test_room_sessions_with_availability as
      select id,session_date,start_time,capacity,status,0::bigint as occupied_spots,capacity::bigint as available_spots
      from test_room_sessions;
    grant select on test_room_sessions_with_availability to anon, authenticated, service_role;
  `;

export async function createTestDatabase() {
  const db = new PGlite();
  await db.exec(BASE_SCHEMA);
  return db;
}

export async function applyMigration(db) {
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202609160001_add_booking_type_demand_requester_archive.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}
