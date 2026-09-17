begin;

alter table public.bookings
  add column if not exists booking_type text default 'principal',
  add column if not exists scheduled_date date,
  add column if not exists scheduled_time time,
  add column if not exists demand text,
  add column if not exists requester_email text,
  add column if not exists archived_at timestamptz;

alter table public.booking_candidates add column if not exists archived_at timestamptz;

alter table public.bookings alter column session_id drop not null;
alter table public.bookings alter column booking_type set default 'principal';
alter table public.bookings alter column demand drop default;

do $$ begin
  alter table public.bookings add constraint bookings_type_check
    check (booking_type is null or booking_type in ('principal', 'avulso'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.bookings add constraint bookings_demand_check
    check (demand is null or demand in ('recrutamento_selecao', 'avaliacao_psicologica'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.bookings add constraint bookings_manual_schedule_check check (
    (coalesce(booking_type, 'principal') = 'principal' and scheduled_date is null and scheduled_time is null)
    or (booking_type = 'avulso' and session_id is null and scheduled_date is not null
      and scheduled_time is not null and assessment_modality = 'presencial')
  );
exception when duplicate_object then null; end $$;

-- Existing nullable demand/requester values are deliberately preserved.
create or replace function public.validate_new_booking_fields() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.demand is null and (tg_op = 'INSERT' or old.demand is not null) then
    raise exception 'Demanda obrigatoria para novos agendamentos.';
  end if;
  if coalesce(new.booking_type, 'principal') = 'principal' and
     ((new.assessment_modality = 'presencial' and new.session_id is null) or
      (new.assessment_modality = 'online' and new.session_id is not null)) then
    raise exception 'Sessao incompativel com a modalidade.';
  end if;
  return new;
end $$;
revoke all on function public.validate_new_booking_fields() from public, anon, authenticated;
drop trigger if exists validate_new_booking_fields on public.bookings;
create trigger validate_new_booking_fields before insert or update of
  booking_type, assessment_modality, session_id, scheduled_date, scheduled_time, demand
on public.bookings
for each row execute function public.validate_new_booking_fields();

create index if not exists bookings_active_type_idx on public.bookings(booking_type, created_at desc)
  where archived_at is null;
create index if not exists bookings_manual_schedule_idx on public.bookings(scheduled_date, scheduled_time)
  where booking_type = 'avulso';
create index if not exists booking_candidates_active_booking_idx on public.booking_candidates(booking_id)
  where archived_at is null;

-- Preserve the existing view signature and open-session rules. Archiving never affects occupancy.
create or replace view public.test_room_sessions_with_availability
with (security_invoker = true) as
with allocations as (
  select bc.id, coalesce(bc.candidate_session_id, b.session_id) as session_id,
    b.booking_type, b.scheduled_date, b.scheduled_time
  from public.booking_candidates bc join public.bookings b on b.id = bc.booking_id
  where coalesce(b.assessment_modality, 'presencial') = 'presencial'
    and coalesce(b.status, 'confirmado') not in ('cancelado', 'cancelled')
    and coalesce(bc.candidate_status, 'confirmado') in ('confirmado', 'realizado', 'nao_compareceu')
)
select s.id, s.session_date, s.start_time, s.capacity, s.status,
  count(a.id) as occupied_spots, s.capacity - count(a.id) as available_spots
from public.test_room_sessions s
left join allocations a on
  (coalesce(a.booking_type, 'principal') = 'principal' and a.session_id = s.id)
  or (a.booking_type = 'avulso' and a.scheduled_date = s.session_date and a.scheduled_time = s.start_time)
where s.status in ('aberta', 'aberto', 'open', 'active', 'available')
group by s.id, s.session_date, s.start_time, s.capacity, s.status;
-- Public pages query on the server through supabaseAdmin. Preserve existing view ACLs.
grant select on public.test_room_sessions_with_availability to service_role;

-- Both creation paths acquire the SAME row lock before the final capacity check.
create or replace function public.lock_booking_session(p_session_id uuid, p_spots integer, p_public boolean)
returns void language plpgsql volatile security invoker set search_path = '' as $$
declare s public.test_room_sessions%rowtype; occupied bigint; available bigint;
begin
  if p_spots is null or p_spots <= 0 then
    raise exception 'Quantidade de candidatos invalida.' using errcode = '22023';
  end if;
  select * into s from public.test_room_sessions where id = p_session_id for update;
  if not found then raise exception 'Sessao nao encontrada.' using errcode = 'P0002'; end if;
  if p_public and s.status not in ('aberta', 'aberto', 'open', 'active', 'available') then
    raise exception 'Sessao nao esta aberta.' using errcode = 'P0003';
  end if;
  if p_public and s.session_date < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Nao e possivel agendar datas anteriores a hoje.' using errcode = 'P0004';
  end if;
  select count(*) into occupied from public.booking_candidates c join public.bookings b on b.id = c.booking_id
  where coalesce(b.assessment_modality, 'presencial') = 'presencial'
    and coalesce(b.status, 'confirmado') not in ('cancelado', 'cancelled')
    and coalesce(c.candidate_status, 'confirmado') in ('confirmado', 'realizado', 'nao_compareceu')
    and ((coalesce(b.booking_type, 'principal') = 'principal' and coalesce(c.candidate_session_id, b.session_id) = s.id)
      or (b.booking_type = 'avulso' and b.scheduled_date = s.session_date and b.scheduled_time = s.start_time));
  available := s.capacity - occupied;
  if available < p_spots then
    raise exception 'A sessao nao possui vagas suficientes.' using errcode = 'P0001', detail = available::text;
  end if;
end $$;
revoke all on function public.lock_booking_session(uuid, integer, boolean) from public, anon, authenticated;
grant execute on function public.lock_booking_session(uuid, integer, boolean) to service_role;

create or replace function public.create_principal_booking(p_booking jsonb, p_candidates jsonb)
returns uuid language plpgsql volatile security invoker set search_path = '' as $$
declare v_id uuid; v_session uuid; v_count integer; v_modality text;
begin
  if jsonb_typeof(p_candidates) is distinct from 'array' then
    raise exception 'Informe os candidatos.' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(p_candidates);
  if v_count = 0 then raise exception 'Informe os candidatos.' using errcode = '22023'; end if;
  v_modality := p_booking->>'assessment_modality';
  v_session := nullif(p_booking->>'session_id', '')::uuid;
  if v_modality = 'presencial' then
    perform public.lock_booking_session(v_session, v_count, true);
  end if;
  insert into public.bookings(booking_type, assessment_modality, session_id, demand, requester_email,
    company_name, contact_name, contact_email, contact_phone, notes, candidates_count, service_company, status, public_token)
  values ('principal', v_modality, v_session, p_booking->>'demand', p_booking->>'requester_email',
    p_booking->>'company_name', p_booking->>'contact_name', p_booking->>'contact_email',
    p_booking->>'contact_phone', p_booking->>'notes', v_count, p_booking->>'service_company', 'confirmado', p_booking->>'public_token')
  returning id into v_id;
  insert into public.booking_candidates(booking_id, candidate_session_id, candidate_name,
    desired_role, candidate_email, candidate_phone, candidate_status)
  select v_id, v_session, c->>'candidate_name', c->>'desired_role',
    c->>'candidate_email', c->>'candidate_phone', 'confirmado'
  from jsonb_array_elements(p_candidates) c;
  insert into public.status_history(booking_id, changed_by, new_status, note)
  values (v_id, 'cliente', 'confirmado', p_booking->>'history_note');
  return v_id;
end $$;
revoke all on function public.create_principal_booking(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_principal_booking(jsonb, jsonb) to service_role;

create or replace function public.create_manual_booking(p_booking jsonb, p_candidate jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_session uuid;
begin
  -- Lock an existing matching session, but never create one.
  select id into v_session from public.test_room_sessions
    where session_date = (p_booking->>'scheduled_date')::date
      and start_time = (p_booking->>'scheduled_time')::time for update;
  if v_session is not null then
    perform public.lock_booking_session(v_session, 1, false);
  end if;
  if p_booking->>'service_company' is null or p_booking->>'service_company' not in ('lince', 'psicoespaco') then
    raise exception 'Empresa do servico obrigatoria.' using errcode = '22023';
  end if;
  insert into public.bookings(booking_type, assessment_modality, session_id, scheduled_date,
    scheduled_time, demand, requester_email, company_name, contact_name, contact_email,
    contact_phone, notes, candidates_count, service_company, status, public_token)
  values ('avulso', 'presencial', null, (p_booking->>'scheduled_date')::date,
    (p_booking->>'scheduled_time')::time, p_booking->>'demand', p_booking->>'requester_email',
    p_booking->>'company_name', p_booking->>'contact_name', p_booking->>'contact_email',
    p_booking->>'contact_phone', p_booking->>'notes', 1, p_booking->>'service_company', 'confirmado', p_booking->>'public_token')
  returning id into v_id;
  insert into public.booking_candidates(booking_id, candidate_session_id, candidate_name, desired_role, candidate_status)
    values (v_id, null, p_candidate->>'candidate_name', p_candidate->>'desired_role', 'confirmado');
  insert into public.status_history(booking_id, changed_by, new_status, note)
    values (v_id, p_booking->>'requester_email', 'confirmado', 'Agendamento avulso criado pela equipe.');
  return v_id;
end $$;
revoke all on function public.create_manual_booking(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_manual_booking(jsonb, jsonb) to service_role;

create or replace view public.admin_booking_report_rows with (security_invoker = true) as
select b.id as booking_id, c.id as candidate_id,
  case when b.booking_type = 'avulso' then b.scheduled_date
    when b.assessment_modality = 'online' then (b.created_at at time zone 'America/Sao_Paulo')::date
    else s.session_date end as operational_date,
  case when b.booking_type = 'avulso' then b.scheduled_time
    when b.assessment_modality = 'online' then null else s.start_time end as operational_time,
  b.company_name, c.candidate_name, c.desired_role, b.notes, c.candidate_status,
  b.demand, b.requester_email, coalesce(b.booking_type, 'principal') as booking_type,
  b.assessment_modality, b.archived_at, c.archived_at as candidate_archived_at
from public.bookings b join public.booking_candidates c on c.booking_id = b.id
left join public.test_room_sessions s on s.id = coalesce(c.candidate_session_id, b.session_id);
revoke all on public.admin_booking_report_rows from public, anon, authenticated;
grant select on public.admin_booking_report_rows to service_role;

-- No sibling candidates or aggregate booking archive state belong in this snapshot.
create or replace function public.admin_candidate_fingerprint(p_candidate_id uuid) returns text
language sql stable security invoker set search_path = '' as $$
  select md5(jsonb_build_object('row', to_jsonb(r) - 'archived_at', 'candidate_session_id', c.candidate_session_id)::text)
  from public.admin_booking_report_rows r join public.booking_candidates c on c.id = r.candidate_id
  where c.id = p_candidate_id;
$$;
revoke all on function public.admin_candidate_fingerprint(uuid) from public, anon, authenticated;
grant execute on function public.admin_candidate_fingerprint(uuid) to service_role;

create or replace function public.admin_week_report(p_start date, p_end date) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with rows as (
    select * from public.admin_booking_report_rows where operational_date between p_start and p_end
  ), snapshot as (
    select r.candidate_id, r.booking_id, public.admin_candidate_fingerprint(r.candidate_id) as fingerprint,
      r.candidate_archived_at is null as archivable from rows r
  ) select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by operational_date, operational_time, candidate_id) from rows r), '[]'::jsonb),
    'candidates', coalesce((select jsonb_agg(to_jsonb(s) order by candidate_id) from snapshot s), '[]'::jsonb)
  );
$$;
revoke all on function public.admin_week_report(date, date) from public, anon, authenticated;
grant execute on function public.admin_week_report(date, date) to service_role;

create or replace function public.archive_exported_candidates(p_start date, p_end date, p_candidates jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare item jsonb; total integer;
begin
  if jsonb_typeof(p_candidates) is distinct from 'array' or p_start is null or p_end is null or p_end < p_start then
    raise exception 'Exportacao invalida.' using errcode = '22023';
  end if;
  if (select count(distinct value->>'candidate_id') from jsonb_array_elements(p_candidates)) <> jsonb_array_length(p_candidates) then
    raise exception 'Exportacao invalida.' using errcode = '22023';
  end if;
  -- Parent locks protect shared report fields and serialize aggregate updates across weeks.
  perform 1 from public.bookings b where b.id in (
    select (value->>'booking_id')::uuid from jsonb_array_elements(p_candidates)
  ) order by b.id for update;
  perform 1 from public.booking_candidates c where c.id in (
    select (value->>'candidate_id')::uuid from jsonb_array_elements(p_candidates)
  ) order by c.id for update;
  perform 1 from public.test_room_sessions s where s.id in (
    select coalesce(c.candidate_session_id, b.session_id) from public.booking_candidates c
    join public.bookings b on b.id = c.booking_id where c.id in (
      select (value->>'candidate_id')::uuid from jsonb_array_elements(p_candidates)
    )
  ) order by s.id for share;
  for item in select value from jsonb_array_elements(p_candidates) loop
    if item->>'fingerprint' is null
      or public.admin_candidate_fingerprint((item->>'candidate_id')::uuid) is distinct from item->>'fingerprint'
      or not exists (select 1 from public.admin_booking_report_rows
        where candidate_id = (item->>'candidate_id')::uuid and booking_id = (item->>'booking_id')::uuid
          and candidate_archived_at is null and operational_date between p_start and p_end) then
      raise exception 'Os dados mudaram. Exporte a semana novamente.';
    end if;
  end loop;
  update public.booking_candidates set archived_at = now() where archived_at is null and id in (
    select (value->>'candidate_id')::uuid from jsonb_array_elements(p_candidates)
  );
  get diagnostics total = row_count;
  update public.bookings b set archived_at = case
    when exists (select 1 from public.booking_candidates c where c.booking_id = b.id and c.archived_at is null)
    then null else coalesce(b.archived_at, now()) end
  where b.id in (select (value->>'booking_id')::uuid from jsonb_array_elements(p_candidates));
  return total;
end $$;
revoke all on function public.archive_exported_candidates(date, date, jsonb) from public, anon, authenticated;
grant execute on function public.archive_exported_candidates(date, date, jsonb) to service_role;

-- Remove obsolete routines only if an earlier draft was installed locally. No rows are removed.
drop function if exists public.archive_exported_bookings(date, date, jsonb);
drop function if exists public.admin_booking_fingerprint(uuid);

commit;
