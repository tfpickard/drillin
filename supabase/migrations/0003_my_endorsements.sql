-- Lets the authenticated user read their OWN endorsement rows with ids, so they
-- can manage them (hide / approve / decline / delete). The public get_profile_tags
-- aggregates and is identity-free; this one is scoped to auth.uid() and returns
-- row ids — but only ever for your own profile, never anyone else's.
create or replace function get_my_endorsements()
returns table (
  id uuid,
  label text,
  tier tag_tier,
  kind tag_kind,
  category text,
  status endorsement_status,
  created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    e.id,
    coalesce(ct.label, e.freeform_label) as label,
    e.tier,
    e.kind,
    e.category,
    e.status,
    e.created_at
  from endorsements e
  left join canon_tags ct on ct.id = e.canon_tag_id
  where e.subject_id = auth.uid()
  order by
    case e.status when 'pending' then 0 when 'active' then 1 else 2 end,
    e.created_at desc;
$$;

revoke execute on function get_my_endorsements() from public;
grant execute on function get_my_endorsements() to authenticated;
