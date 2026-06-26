-- Enable Supabase Realtime on messages so the chat updates live. RLS still
-- applies to realtime: a client only receives rows it is allowed to select
-- (messages_read — only the two match participants).
alter publication supabase_realtime add table messages;

-- You can read the profile of anyone you're matched with, even if they've
-- since stopped consenting to be listed — otherwise the chat couldn't show
-- their name.
create policy profiles_read_matched on profiles for select using (
  exists (
    select 1 from matches m
    where (m.user_a = auth.uid() and m.user_b = profiles.id)
       or (m.user_b = auth.uid() and m.user_a = profiles.id)
  )
);
