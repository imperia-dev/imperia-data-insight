
create table public.trial_customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.trial_customers(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  document text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_trial_customer_contacts_customer on public.trial_customer_contacts(customer_id);

alter table public.trial_customer_contacts enable row level security;

-- Helper: returns the trial_customers.id for the current auth user
create or replace function public.current_trial_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.trial_customers where user_id = auth.uid() limit 1;
$$;

create policy "Trial customer can view own contacts"
on public.trial_customer_contacts for select
to authenticated
using (customer_id = public.current_trial_customer_id());

create policy "Trial customer can insert own contacts"
on public.trial_customer_contacts for insert
to authenticated
with check (customer_id = public.current_trial_customer_id());

create policy "Trial customer can update own contacts"
on public.trial_customer_contacts for update
to authenticated
using (customer_id = public.current_trial_customer_id())
with check (customer_id = public.current_trial_customer_id());

create policy "Trial customer can delete own contacts"
on public.trial_customer_contacts for delete
to authenticated
using (customer_id = public.current_trial_customer_id());

create trigger update_trial_customer_contacts_updated_at
before update on public.trial_customer_contacts
for each row execute function public.update_updated_at_column();
