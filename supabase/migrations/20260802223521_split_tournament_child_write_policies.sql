do $$
declare
  child_table text;
  owner_check text := 'exists (select 1 from public.tournaments t where t.id = tournament_id and (t.owner_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = ''admin'')))';
begin
  foreach child_table in array array['tournament_organizers', 'tournament_photos', 'tournament_groups']
  loop
    execute format('drop policy if exists %I on public.%I', 'Owners manage tournament children', child_table);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%s)',
      'Owners insert tournament children', child_table, owner_check
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
      'Owners update tournament children', child_table, owner_check, owner_check
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (%s)',
      'Owners delete tournament children', child_table, owner_check
    );
  end loop;
end $$;
