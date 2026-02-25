-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  elo_rating integer default 1000 not null,
  matches_played integer default 0 not null,
  wins integer default 0 not null,
  losses integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for profiles
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for Match History
create table match_history (
  id uuid default gen_random_uuid() primary key,
  player1_id uuid references profiles(id) not null,
  player2_id uuid references profiles(id) not null,
  winner_id uuid references profiles(id), -- nullable (could be a draw or unfinished)
  player1_score integer default 0 not null,
  player2_score integer default 0 not null,
  ended_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for match_history (Only backend should write to it!)
alter table match_history enable row level security;

create policy "Match history is viewable by everyone."
  on match_history for select
  using ( true );

-- Notice: We do NOT create an insert/update policy for authenticated users here.
-- ONLY the Node.js Server (using the Service Role Key) will be allowed to insert match results.
-- This prevents cheating where a client could manually fake a win.

-- Automatically create a profile when a new user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, elo_rating)
  values (new.id, split_part(new.email, '@', 1), 1000);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
