-- Drillin initial schema.
--
-- This file is the canonical DB artifact: table DDL mirrors src/lib/db/schema.ts,
-- and adds everything an ORM models badly — RLS, generated search vectors, the
-- sorted-pair constraint, and the SECURITY DEFINER functions that form the
-- identity firewall (spec §1/§2/§5).
--
-- The cardinal rule encoded below: endorsement rows are NEVER directly readable
-- by clients. Every number that touches a peer tag is emitted by a definer
-- function that reads endorser identity internally and returns only counts.

create extension if not exists pg_trgm;

-- ── enums ────────────────────────────────────────────────────────────────────
create type availability as enum ('actively_looking', 'open_to_opportunities');
create type intent as enum ('networking', 'synergy', 'mentorship', 'disruption', 'one_on_one_sync');
create type seniority as enum ('intern','associate','mid','senior','staff','principal','director','vp','c_suite');
create type tag_category as enum ('corporate', 'physical', 'behavioral');
create type tag_tier as enum ('self', 'peer');
create type tag_kind as enum ('canon', 'freeform');
create type endorsement_status as enum ('pending', 'active', 'hidden', 'declined');
create type integrity_event_type as enum ('hidden', 'declined', 'approved', 'peer_received', 'peer_lost');
create type swipe_direction as enum ('right', 'left');
create type report_target_kind as enum ('profile', 'endorsement', 'message');
create type report_status as enum ('open', 'actioned', 'dismissed');

-- ── reference tables ─────────────────────────────────────────────────────────
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role_id uuid references roles (id),
  company_id uuid references companies (id),
  campus text,
  location text,
  seniority seniority not null default 'mid',
  headline text not null default '',
  availability availability not null default 'open_to_opportunities',
  intent intent not null default 'synergy',
  intent_line text not null default '',
  avatar_hue integer not null default 210,
  is_age_verified boolean not null default false,
  consents_to_listing boolean not null default false,
  created_at timestamptz not null default now()
);

create table canon_tags (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  category tag_category not null,
  search tsvector generated always as (to_tsvector('simple', label)) stored
);
create index canon_tags_search_idx on canon_tags using gin (search);
create index canon_tags_trgm_idx on canon_tags using gin (label gin_trgm_ops);
create index canon_tags_category_idx on canon_tags (category);

create table endorsements (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references profiles (id) on delete cascade,
  endorser_id uuid not null references profiles (id) on delete cascade,
  tier tag_tier not null,
  kind tag_kind not null,
  canon_tag_id uuid references canon_tags (id),
  freeform_label text,
  status endorsement_status not null default 'active',
  category text not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  -- exactly one of canon_tag_id / freeform_label is set
  constraint endorsements_one_target check (
    (canon_tag_id is not null) <> (freeform_label is not null)
  ),
  -- self-tags are authored by the subject; peer-tags are not
  constraint endorsements_self_consistency check (
    (tier = 'self') = (subject_id = endorser_id)
  )
);
create index endorsements_subject_idx on endorsements (subject_id);
create unique index endorsements_unique_canon
  on endorsements (subject_id, endorser_id, canon_tag_id)
  where canon_tag_id is not null;

create table integrity_events (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references profiles (id) on delete cascade,
  endorsement_id uuid references endorsements (id) on delete set null,
  type integrity_event_type not null,
  occurred_at timestamptz not null default now()
);
create index integrity_events_subject_idx on integrity_events (subject_id, occurred_at);

create table swipes (
  swiper_id uuid not null references profiles (id) on delete cascade,
  target_id uuid not null references profiles (id) on delete cascade,
  direction swipe_direction not null,
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles (id) on delete cascade,
  user_b uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint matches_sorted check (user_a < user_b),
  unique (user_a, user_b)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references matches (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

create table blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  subject_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  target_kind report_target_kind not null,
  target_id uuid,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ── row-level security ───────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table canon_tags enable row level security;
alter table endorsements enable row level security;
alter table integrity_events enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;

-- Profiles: listed + consenting profiles are visible; you always see your own.
create policy profiles_read on profiles for select using (
  id = auth.uid() or consents_to_listing = true
);
create policy profiles_update_self on profiles for update using (id = auth.uid());
create policy profiles_insert_self on profiles for insert with check (id = auth.uid());

-- Canon list is public read-only reference data.
create policy canon_read on canon_tags for select using (true);

-- ENDORSEMENTS: deliberately NO select/insert/update/delete policy for the
-- client roles. The table is reachable only through SECURITY DEFINER functions
-- below. This is the identity firewall: endorser_id can never leak.

-- Integrity events: same — derived metrics only via the ledger function.

-- Messages & conversations: only the two match participants.
create policy conversations_member on conversations for select using (
  exists (
    select 1 from matches m
    where m.id = conversations.match_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);
create policy messages_read on messages for select using (
  exists (
    select 1 from conversations c join matches m on m.id = c.match_id
    where c.id = messages.conversation_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);
create policy messages_send on messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from conversations c join matches m on m.id = c.match_id
    where c.id = messages.conversation_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);

create policy matches_self on matches for select using (
  user_a = auth.uid() or user_b = auth.uid()
);

-- Blocks & reports: you manage your own.
create policy blocks_own on blocks for all using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());
create policy reports_insert on reports for insert with check (reporter_id = auth.uid());

-- ── functions: helpers ───────────────────────────────────────────────────────

-- Connections of a user = both sides of every match they are in.
create or replace function connections_of(p_user uuid)
returns table (other uuid)
language sql stable
as $$
  select case when m.user_a = p_user then m.user_b else m.user_a end
  from matches m
  where m.user_a = p_user or m.user_b = p_user;
$$;

-- ── functions: derived reads (the firewall) ──────────────────────────────────

-- Aggregated, identity-free tags for a profile, as seen by a viewer.
-- Peer tags carry count + the mutual-connection leak. Endorser ids never leave
-- this function. Pending free-form tags are visible only to the subject.
create or replace function get_profile_tags(p_subject uuid, p_viewer uuid)
returns table (
  label text,
  tier tag_tier,
  category text,
  count integer,
  mutual integer,
  pending boolean
)
language sql stable security definer set search_path = public
as $$
  with viewer_conns as (
    select other from connections_of(p_viewer)
  ),
  resolved as (
    select
      e.id,
      coalesce(ct.label, e.freeform_label) as label,
      e.tier,
      e.category,
      e.status,
      e.endorser_id
    from endorsements e
    left join canon_tags ct on ct.id = e.canon_tag_id
    where e.subject_id = p_subject
      and (
        e.status = 'active'
        -- subject can preview their own pending free-form tags
        or (e.status = 'pending' and p_subject = p_viewer)
      )
  )
  select
    r.label,
    r.tier,
    r.category,
    count(*)::int as count,
    count(*) filter (
      where r.tier = 'peer' and r.endorser_id in (select other from viewer_conns)
    )::int as mutual,
    bool_or(r.status = 'pending') as pending
  from resolved r
  group by r.label, r.tier, r.category
  order by (r.tier = 'peer') desc, count(*) desc, r.label;
$$;

-- Public Profile Integrity ledger (spec §4). Hides/declines are events over a
-- rolling 30d window — habit framing, not a one-off counter.
create or replace function get_integrity_ledger(p_subject uuid)
returns table (
  hidden_30d integer,
  declined_30d integer,
  self_ratio numeric,
  peer_retention numeric
)
language sql stable security definer set search_path = public
as $$
  with ev as (
    select
      count(*) filter (where type = 'hidden' and occurred_at > now() - interval '30 days')::int as hidden_30d,
      count(*) filter (where type = 'declined' and occurred_at > now() - interval '30 days')::int as declined_30d
    from integrity_events where subject_id = p_subject
  ),
  tags as (
    select
      count(*) filter (where tier = 'self' and status = 'active')::numeric as self_active,
      count(*) filter (where status = 'active')::numeric as total_active,
      count(*) filter (where tier = 'peer' and status = 'active')::numeric as peer_active,
      count(*) filter (where tier = 'peer')::numeric as peer_ever
    from endorsements where subject_id = p_subject
  )
  select
    ev.hidden_30d,
    ev.declined_30d,
    case when tags.total_active = 0 then 0 else tags.self_active / tags.total_active end,
    case when tags.peer_ever = 0 then 1 else tags.peer_active / tags.peer_ever end
  from ev, tags;
$$;

-- ── functions: mutations (rules enforced server-side) ────────────────────────

-- Create an endorsement. Enforces the permanence model's entry rules:
-- self/peer-canon land active; peer free-form lands pending (consent gate).
-- Rate limits guard against pile-ons.
create or replace function endorse(
  p_subject uuid,
  p_canon_tag_id uuid,
  p_freeform_label text
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_endorser uuid := auth.uid();
  v_tier tag_tier;
  v_kind tag_kind;
  v_category text;
  v_status endorsement_status;
  v_id uuid;
  v_recent_total int;
  v_recent_subject int;
begin
  if v_endorser is null then raise exception 'not authenticated'; end if;

  -- block check (either direction)
  if exists (
    select 1 from blocks
    where (blocker_id = v_endorser and blocked_id = p_subject)
       or (blocker_id = p_subject and blocked_id = v_endorser)
  ) then raise exception 'blocked'; end if;

  v_tier := case when p_subject = v_endorser then 'self' else 'peer' end;

  if p_canon_tag_id is not null then
    v_kind := 'canon';
    select category::text into v_category from canon_tags where id = p_canon_tag_id;
    if v_category is null then raise exception 'unknown canon tag'; end if;
  elsif p_freeform_label is not null and length(trim(p_freeform_label)) > 0 then
    v_kind := 'freeform';
    v_category := 'freeform';
  else
    raise exception 'must supply a canon tag or a free-form label';
  end if;

  -- entry status: peer free-form is the only thing that lands pending. The
  -- curated canon list is the safety boundary for physical tags.
  if v_tier = 'peer' and v_kind = 'freeform' then
    v_status := 'pending';
  else
    v_status := 'active';
  end if;

  -- rate limits (peer endorsements only; self-narration is unmetered)
  if v_tier = 'peer' then
    select count(*) into v_recent_total from endorsements
      where endorser_id = v_endorser and created_at > now() - interval '1 day';
    if v_recent_total >= 40 then raise exception 'daily endorsement limit reached'; end if;

    select count(*) into v_recent_subject from endorsements
      where endorser_id = v_endorser and subject_id = p_subject
        and created_at > now() - interval '1 hour';
    if v_recent_subject >= 5 then raise exception 'slow down on this profile'; end if;
  end if;

  insert into endorsements (subject_id, endorser_id, tier, kind, canon_tag_id, freeform_label, status, category)
  values (p_subject, v_endorser, v_tier, v_kind, p_canon_tag_id, p_freeform_label, v_status, v_category)
  returning id into v_id;

  if v_tier = 'peer' and v_status = 'active' then
    insert into integrity_events (subject_id, endorsement_id, type) values (p_subject, v_id, 'peer_received');
  end if;

  return v_id;
end;
$$;

-- Hide a peer canon tag. Only the subject. Leaves a ghost (spec §3).
create or replace function hide_endorsement(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare e endorsements%rowtype;
begin
  select * into e from endorsements where id = p_id;
  if e.id is null then raise exception 'not found'; end if;
  if e.subject_id <> auth.uid() then raise exception 'not your endorsement'; end if;
  if e.tier <> 'peer' then raise exception 'self tags delete, not hide'; end if;
  if e.status <> 'active' then raise exception 'not active'; end if;

  update endorsements set status = 'hidden', decided_at = now() where id = p_id;
  insert into integrity_events (subject_id, endorsement_id, type) values (e.subject_id, p_id, 'hidden');
  if e.tier = 'peer' then
    insert into integrity_events (subject_id, endorsement_id, type) values (e.subject_id, p_id, 'peer_lost');
  end if;
end;
$$;

-- Approve a pending free-form tag → clean, deletable, no ghost.
create or replace function approve_endorsement(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare e endorsements%rowtype;
begin
  select * into e from endorsements where id = p_id;
  if e.id is null or e.subject_id <> auth.uid() then raise exception 'not your endorsement'; end if;
  if e.status <> 'pending' then raise exception 'not pending'; end if;

  update endorsements set status = 'active', decided_at = now() where id = p_id;
  insert into integrity_events (subject_id, endorsement_id, type) values (e.subject_id, p_id, 'approved');
  insert into integrity_events (subject_id, endorsement_id, type) values (e.subject_id, p_id, 'peer_received');
end;
$$;

-- Decline a pending free-form tag → never public, increments declined ledger.
create or replace function decline_endorsement(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare e endorsements%rowtype;
begin
  select * into e from endorsements where id = p_id;
  if e.id is null or e.subject_id <> auth.uid() then raise exception 'not your endorsement'; end if;
  if e.status <> 'pending' then raise exception 'not pending'; end if;

  update endorsements set status = 'declined', decided_at = now() where id = p_id;
  insert into integrity_events (subject_id, endorsement_id, type) values (e.subject_id, p_id, 'declined');
end;
$$;

-- Delete a self tag, or an approved (already-consented) free-form tag. No ghost.
create or replace function delete_endorsement(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare e endorsements%rowtype;
begin
  select * into e from endorsements where id = p_id;
  if e.id is null or e.subject_id <> auth.uid() then raise exception 'not your endorsement'; end if;
  -- total control over self-narration; peer canon can only be hidden.
  if not (e.tier = 'self' or (e.kind = 'freeform' and e.status = 'active')) then
    raise exception 'this tag is on the record — hide it instead';
  end if;
  delete from endorsements where id = p_id;
end;
$$;

-- Record a swipe; create a match (and conversation) on mutual right-swipe.
create or replace function swipe(p_target uuid, p_direction swipe_direction)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_match uuid;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if v_me = p_target then raise exception 'cannot swipe yourself'; end if;

  insert into swipes (swiper_id, target_id, direction)
  values (v_me, p_target, p_direction)
  on conflict (swiper_id, target_id) do update set direction = excluded.direction;

  if p_direction <> 'right' then return null; end if;

  -- mutual?
  if not exists (
    select 1 from swipes where swiper_id = p_target and target_id = v_me and direction = 'right'
  ) then return null; end if;

  v_a := least(v_me, p_target);
  v_b := greatest(v_me, p_target);
  insert into matches (user_a, user_b) values (v_a, v_b)
    on conflict (user_a, user_b) do nothing
    returning id into v_match;
  if v_match is null then
    select id into v_match from matches where user_a = v_a and user_b = v_b;
  end if;
  insert into conversations (match_id) values (v_match) on conflict (match_id) do nothing;
  return v_match;
end;
$$;

grant execute on function
  get_profile_tags(uuid, uuid),
  get_integrity_ledger(uuid),
  endorse(uuid, uuid, text),
  hide_endorsement(uuid),
  approve_endorsement(uuid),
  decline_endorsement(uuid),
  delete_endorsement(uuid),
  swipe(uuid, swipe_direction)
to authenticated;
