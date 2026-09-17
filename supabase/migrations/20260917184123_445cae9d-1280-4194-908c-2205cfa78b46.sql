alter table public.partnership_levels add column if not exists is_highlighted boolean not null default false;

update public.partnership_levels
set is_highlighted = true
where name ilike '%contract%';