create table if not exists public.booking_candidates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  candidate_name text not null,
  desired_role text not null,
  resume_url text,
  created_at timestamp with time zone default now()
);

create index if not exists booking_candidates_booking_id_idx
  on public.booking_candidates(booking_id);
