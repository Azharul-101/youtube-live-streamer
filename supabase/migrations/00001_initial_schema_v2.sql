create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  public_url text not null,
  size bigint not null default 0,
  duration_seconds int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

create table if not exists public.stream_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  youtube_stream_key text not null default '',
  loop_option text not null default '1' check (loop_option in ('1','3','unlimited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stream_configs_owner_id unique (owner_id)
);

alter table public.stream_configs enable row level security;

create table if not exists public.stream_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  video_id uuid references public.videos(id) on delete set null,
  youtube_stream_key text not null,
  loop_option text not null check (loop_option in ('1','3','unlimited')),
  status text not null default 'active' check (status in ('active','completed','stopped','failed')),
  livepeer_stream_id text,
  livepeer_multistream_target_id text,
  error_message text,
  started_at timestamptz not null default now(),
  stopped_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.stream_history enable row level security;

insert into storage.buckets (id, name, public, avif_autodetection)
values ('videos','videos',false,false)
on conflict (id) do nothing;

-- Profiles policies
create policy "profiles_anon_select" on public.profiles
  for select to anon using (false);
create policy "profiles_anon_insert" on public.profiles
  for insert to anon with check (false);
create policy "profiles_anon_update" on public.profiles
  for update to anon using (false) with check (false);
create policy "profiles_anon_delete" on public.profiles
  for delete to anon using (false);

create policy "profiles_auth_select" on public.profiles
  for select to authenticated using (id = auth.uid() or role = 'admin');
create policy "profiles_auth_insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_auth_update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_auth_delete" on public.profiles
  for delete to authenticated using (false);

create policy "profiles_admin_select" on public.profiles
  for select to authenticated using (role = 'admin');
create policy "profiles_admin_insert" on public.profiles
  for insert to authenticated with check (role = 'admin');
create policy "profiles_admin_update" on public.profiles
  for update to authenticated using (role = 'admin') with check (role = 'admin');
create policy "profiles_admin_delete" on public.profiles
  for delete to authenticated using (role = 'admin');

-- Videos policies
create policy "videos_anon_select" on public.videos
  for select to anon using (false);
create policy "videos_anon_insert" on public.videos
  for insert to anon with check (false);
create policy "videos_anon_update" on public.videos
  for update to anon using (false) with check (false);
create policy "videos_anon_delete" on public.videos
  for delete to anon using (false);

create policy "videos_auth_select" on public.videos
  for select to authenticated using (owner_id = auth.uid());
create policy "videos_auth_insert" on public.videos
  for insert to authenticated with check (owner_id = auth.uid());
create policy "videos_auth_update" on public.videos
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "videos_auth_delete" on public.videos
  for delete to authenticated using (owner_id = auth.uid());

create policy "videos_admin_select" on public.videos
  for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "videos_admin_insert" on public.videos
  for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "videos_admin_update" on public.videos
  for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "videos_admin_delete" on public.videos
  for delete to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Stream configs policies
create policy "stream_configs_anon_select" on public.stream_configs
  for select to anon using (false);
create policy "stream_configs_anon_insert" on public.stream_configs
  for insert to anon with check (false);
create policy "stream_configs_anon_update" on public.stream_configs
  for update to anon using (false) with check (false);
create policy "stream_configs_anon_delete" on public.stream_configs
  for delete to anon using (false);

create policy "stream_configs_auth_select" on public.stream_configs
  for select to authenticated using (owner_id = auth.uid());
create policy "stream_configs_auth_insert" on public.stream_configs
  for insert to authenticated with check (owner_id = auth.uid());
create policy "stream_configs_auth_update" on public.stream_configs
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "stream_configs_auth_delete" on public.stream_configs
  for delete to authenticated using (owner_id = auth.uid());

create policy "stream_configs_admin_select" on public.stream_configs
  for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "stream_configs_admin_insert" on public.stream_configs
  for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "stream_configs_admin_update" on public.stream_configs
  for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "stream_configs_admin_delete" on public.stream_configs
  for delete to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Stream history policies
create policy "stream_history_anon_select" on public.stream_history
  for select to anon using (false);
create policy "stream_history_anon_insert" on public.stream_history
  for insert to anon with check (false);
create policy "stream_history_anon_update" on public.stream_history
  for update to anon using (false) with check (false);
create policy "stream_history_anon_delete" on public.stream_history
  for delete to anon using (false);

create policy "stream_history_auth_select" on public.stream_history
  for select to authenticated using (owner_id = auth.uid());
create policy "stream_history_auth_insert" on public.stream_history
  for insert to authenticated with check (owner_id = auth.uid());
create policy "stream_history_auth_update" on public.stream_history
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "stream_history_auth_delete" on public.stream_history
  for delete to authenticated using (owner_id = auth.uid());

create policy "stream_history_admin_select" on public.stream_history
  for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "stream_history_admin_insert" on public.stream_history
  for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "stream_history_admin_update" on public.stream_history
  for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "stream_history_admin_delete" on public.stream_history
  for delete to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Storage bucket policies
create policy "videos_bucket_anon_select" on storage.objects
  for select to anon using (false);
create policy "videos_bucket_anon_insert" on storage.objects
  for insert to anon with check (false);
create policy "videos_bucket_anon_update" on storage.objects
  for update to anon using (false) with check (false);
create policy "videos_bucket_anon_delete" on storage.objects
  for delete to anon using (false);

create policy "videos_bucket_auth_select" on storage.objects
  for select to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "videos_bucket_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "videos_bucket_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "videos_bucket_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos_bucket_admin_select" on storage.objects
  for select to authenticated using (bucket_id = 'videos' and (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "videos_bucket_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'videos' and (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "videos_bucket_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'videos' and (select role from public.profiles where id = auth.uid()) = 'admin') with check (bucket_id = 'videos' and (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "videos_bucket_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'videos' and (select role from public.profiles where id = auth.uid()) = 'admin');

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();