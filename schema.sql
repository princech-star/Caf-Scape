-- CaféScape starter schema for Supabase (Postgres)
-- Run in Supabase SQL Editor. Review policies before production launch.
create extension if not exists pgcrypto;

create type public.app_role as enum ('customer','cafe_manager','admin');
create type public.claim_status as enum ('pending','approved','rejected');
create type public.crowd_level as enum ('Quiet','Moderate','Busy','Very Busy');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.cafe_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  address text,
  city text,
  area text,
  sector text,
  pincode text,
  created_at timestamptz not null default now()
);
create table public.cafe_owner_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (business_id,user_id)
);
create table public.cafe_staff_invitations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.cafe_locations(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id),
  permission text not null check(permission in ('manager','staff')),
  accepted_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.cafe_profiles (
  location_id uuid primary key references public.cafe_locations(id) on delete cascade,
  description text,
  phone text,
  email text,
  website text,
  instagram_url text,
  price_range text,
  mood_tags text[] not null default '{}',
  amenities text[] not null default '{}',
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.cafe_photos (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.cafe_locations(id) on delete cascade,
  storage_path text not null,
  category text not null check(category in ('food','drinks','interiors','seating','events','exterior')),
  caption text,
  moderation_status text not null default 'pending' check(moderation_status in ('pending','approved','rejected')),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.cafe_hours (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.cafe_locations(id) on delete cascade,
  weekday smallint not null check(weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  unique(location_id,weekday)
);
create table public.cafe_menus (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.cafe_locations(id) on delete cascade,
  item_name text not null,
  description text,
  price numeric(10,2) not null check(price >= 0),
  available boolean not null default true
);
create table public.cafe_amenities (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.cafe_locations(id) on delete cascade,
  amenity text not null,
  unique(location_id,amenity)
);
create table public.cafe_live_updates (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.cafe_locations(id) on delete cascade,
  crowd public.crowd_level not null,
  vacant_seats integer not null check(vacant_seats >= 0),
  seating_available boolean not null,
  submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table public.cafe_announcements (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.cafe_locations(id) on delete cascade,
  title text not null,
  body text not null,
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  approved boolean not null default false
);
create table public.ownership_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  location_id uuid references public.cafe_locations(id) on delete cascade,
  claimant_id uuid not null references auth.users(id),
  evidence_path text,
  contact_details jsonb not null default '{}',
  status public.claim_status not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (business_id is not null or location_id is not null)
);
create table public.cafe_activity_logs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.cafe_locations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.cafe_locations(id) on delete cascade,
  reporter_id uuid references auth.users(id),
  target_type text not null,
  target_id uuid,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- Reservations and payments: create a payment intent on the server, never from browser-only code.
create table public.seat_bookings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.cafe_locations(id),
  customer_id uuid not null references auth.users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  seat_count integer not null check(seat_count between 1 and 20),
  amount numeric(10,2) not null check(amount >= 0),
  currency text not null default 'INR',
  status text not null default 'pending_payment'
    check(status in ('pending_payment','confirmed','cancelled','refunded')),
  payment_provider text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  check(ends_at > starts_at)
);

-- Helper functions use auth.uid(); roles and memberships are never accepted from the browser.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.role='admin') $$;

create or replace function public.can_manage_location(loc uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select public.is_admin()
  or exists (
    select 1 from public.cafe_locations l
    join public.cafe_owner_memberships o on o.business_id=l.business_id
    where l.id=loc and o.user_id=auth.uid() and o.verified=true
  )
  or exists (
    select 1 from public.cafe_staff_invitations i
    where i.location_id=loc and i.accepted_by=auth.uid() and i.revoked_at is null
  )
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.businesses enable row level security;
alter table public.cafe_locations enable row level security;
alter table public.cafe_owner_memberships enable row level security;
alter table public.cafe_staff_invitations enable row level security;
alter table public.cafe_profiles enable row level security;
alter table public.cafe_photos enable row level security;
alter table public.cafe_hours enable row level security;
alter table public.cafe_menus enable row level security;
alter table public.cafe_amenities enable row level security;
alter table public.cafe_live_updates enable row level security;
alter table public.cafe_announcements enable row level security;
alter table public.ownership_claims enable row level security;
alter table public.cafe_activity_logs enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.seat_bookings enable row level security;

-- Customers can read public café data; only authorized representatives/admins can write.
create policy "public read locations" on public.cafe_locations for select using (true);
create policy "public read approved profiles" on public.cafe_profiles for select using (approved_at is not null or public.can_manage_location(location_id));
create policy "manager write profiles" on public.cafe_profiles for all using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));
create policy "public read approved photos" on public.cafe_photos for select using (moderation_status='approved' or uploaded_by=auth.uid() or public.is_admin());
create policy "manager add photos" on public.cafe_photos for insert with check (public.can_manage_location(location_id) and uploaded_by=auth.uid());
create policy "manager update photos" on public.cafe_photos for update using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));
create policy "manager delete photos" on public.cafe_photos for delete using (public.can_manage_location(location_id));
create policy "public read hours" on public.cafe_hours for select using (true);
create policy "manager manage hours" on public.cafe_hours for all using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));
create policy "public read menu" on public.cafe_menus for select using (true);
create policy "manager manage menu" on public.cafe_menus for all using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));
create policy "public read amenities" on public.cafe_amenities for select using (true);
create policy "manager manage amenities" on public.cafe_amenities for all using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id));
create policy "public read current crowd updates" on public.cafe_live_updates for select using (expires_at > now());
create policy "manager submit crowd updates" on public.cafe_live_updates for insert with check (public.can_manage_location(location_id) and submitted_by=auth.uid());
create policy "manager manage announcements" on public.cafe_announcements for all using (public.can_manage_location(location_id)) with check (public.can_manage_location(location_id) and created_by=auth.uid());
create policy "customer create claims" on public.ownership_claims for insert with check (claimant_id=auth.uid());
create policy "claimant read own claims" on public.ownership_claims for select using (claimant_id=auth.uid() or public.is_admin());
create policy "admin review claims" on public.ownership_claims for update using (public.is_admin()) with check (public.is_admin());
create policy "manager read activity" on public.cafe_activity_logs for select using (public.can_manage_location(location_id));
create policy "manager write activity" on public.cafe_activity_logs for insert with check (public.can_manage_location(location_id) and actor_id=auth.uid());
create policy "customer submit report" on public.moderation_reports for insert with check (reporter_id=auth.uid());
create policy "admin manage reports" on public.moderation_reports for all using (public.is_admin()) with check (public.is_admin());
create policy "customer read own bookings" on public.seat_bookings for select using (customer_id=auth.uid() or public.can_manage_location(location_id));
create policy "customer create own booking" on public.seat_bookings for insert with check (customer_id=auth.uid() and status='pending_payment');
create policy "admin read roles" on public.user_roles for select using (user_id=auth.uid() or public.is_admin());
create policy "user read own profile" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "user update own profile" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());

-- IMPORTANT:
-- 1) Do not allow clients to insert/update user_roles. Assign admin/manager roles only via trusted server code.
-- 2) Add Storage bucket "cafe-media" (private) and policies that validate location ownership via folder naming.
-- 3) Use Supabase Edge Functions for admin invitations, claim approval, booking price calculation,
--    payment-provider order creation/webhooks, and manager assignment.
-- 4) Review/extend every policy for your exact manager-vs-staff permission model before production.
