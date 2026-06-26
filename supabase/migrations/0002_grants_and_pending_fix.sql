-- Hardening pass on the function layer.
--
-- 1. Pending free-form tags must be gated on the authenticated user, never on
--    the caller-supplied viewer param (which a client could spoof to peek at
--    someone's unapproved tags). Gate on auth.uid().
-- 2. Postgres grants EXECUTE to PUBLIC by default. Revoke it and re-grant
--    explicitly: read functions to anon+authenticated (anonymous browsing is
--    fine — tags and the ledger are public by design), mutations to
--    authenticated only.

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
        -- subject previews their own pending free-form tags; gated on the
        -- authenticated identity, not the (spoofable) viewer parameter.
        or (e.status = 'pending' and p_subject = auth.uid())
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

-- Lock down execution.
revoke execute on function get_profile_tags(uuid, uuid) from public;
revoke execute on function get_integrity_ledger(uuid) from public;
revoke execute on function endorse(uuid, uuid, text) from public;
revoke execute on function hide_endorsement(uuid) from public;
revoke execute on function approve_endorsement(uuid) from public;
revoke execute on function decline_endorsement(uuid) from public;
revoke execute on function delete_endorsement(uuid) from public;
revoke execute on function swipe(uuid, swipe_direction) from public;
revoke execute on function connections_of(uuid) from public;

-- Public reads (tags + ledger are public per spec §2/§4).
grant execute on function get_profile_tags(uuid, uuid) to anon, authenticated;
grant execute on function get_integrity_ledger(uuid) to anon, authenticated;

-- Mutations require a real session.
grant execute on function
  endorse(uuid, uuid, text),
  hide_endorsement(uuid),
  approve_endorsement(uuid),
  decline_endorsement(uuid),
  delete_endorsement(uuid),
  swipe(uuid, swipe_direction)
to authenticated;
