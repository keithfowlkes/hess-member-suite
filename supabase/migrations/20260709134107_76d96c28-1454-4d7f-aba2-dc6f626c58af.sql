create or replace function public.email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where email = p_email
  );
$$;

grant execute on function public.email_exists(text) to anon;
grant execute on function public.email_exists(text) to authenticated;
grant execute on function public.email_exists(text) to service_role;
