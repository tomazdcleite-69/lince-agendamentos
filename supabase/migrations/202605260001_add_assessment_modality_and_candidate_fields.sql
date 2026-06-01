alter table bookings
add column if not exists assessment_modality text not null default 'presencial';

do $$
begin
  alter table bookings
  add constraint bookings_assessment_modality_check
  check (assessment_modality in ('presencial', 'online'));
exception
  when duplicate_object then null;
end $$;

alter table bookings
alter column session_id drop not null;

alter table bookings
alter column status set default 'confirmado';

alter table booking_candidates
add column if not exists candidate_phone text;

alter table booking_candidates
add column if not exists candidate_email text;

alter table booking_candidates
add column if not exists candidate_status text not null default 'confirmado';

alter table booking_candidates
add column if not exists admin_notes text;

alter table booking_candidates
add column if not exists no_show_notified_at timestamp with time zone;

do $$
begin
  alter table booking_candidates
  add constraint booking_candidates_candidate_status_check
  check (candidate_status in ('confirmado', 'realizado', 'nao_compareceu', 'cancelado'));
exception
  when duplicate_object then null;
end $$;
