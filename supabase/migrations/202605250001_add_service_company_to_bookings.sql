alter table bookings
add column if not exists service_company text not null default 'lince';
