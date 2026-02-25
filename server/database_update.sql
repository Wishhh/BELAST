-- Create a table for Solo Match History
create table solo_match_history (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references profiles(id) not null,
  score integer default 0 not null,
  cleared_lines integer default 0 not null,
  ended_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for solo_match_history
alter table solo_match_history enable row level security;

create policy "Users can view their own solo history."
  on solo_match_history for select
  using ( auth.uid() = player_id );

create policy "Users can insert their own solo history."
  on solo_match_history for insert
  with check ( auth.uid() = player_id );

-- Add a Highest Score column to the profiles table
alter table profiles add column highest_solo_score integer default 0 not null;
