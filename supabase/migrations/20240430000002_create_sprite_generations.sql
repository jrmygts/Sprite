-- Create generations table for sprite generation tracking
create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  hash text,          -- sha1(prompt|seed)
  kind text,          -- 'concept' | 'sheet'
  url text,
  created_at timestamptz default now()
);

-- Create index for faster lookups
create index if not exists generations_user_id_idx on generations(user_id);
create index if not exists generations_hash_idx on generations(hash);

-- Create view for daily quota tracking
create or replace view v_user_daily_credits as
select user_id, count(*) as used
from generations
where created_at >= date_trunc('day', now())
group by user_id;

-- Add RLS policies
alter table generations enable row level security;

create policy "Users can view their own generations"
  on generations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own generations"
  on generations for insert
  with check (auth.uid() = user_id); 