create table if not exists public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  gallery_slug text not null check (gallery_slug in ('professional-work', 'safal', 'photography')),
  image_url text not null,
  storage_path text not null,
  caption text,
  file_name text,
  file_size bigint,
  content_type text,
  created_at timestamptz not null default now()
);

alter table public.portfolio_images enable row level security;

drop policy if exists "Anyone can read portfolio images" on public.portfolio_images;
create policy "Anyone can read portfolio images"
on public.portfolio_images
for select
using (true);

drop policy if exists "Authenticated admin can add portfolio images" on public.portfolio_images;
create policy "Authenticated admin can add portfolio images"
on public.portfolio_images
for insert
to authenticated
with check (true);

insert into storage.buckets (id, name, public)
values ('portfolio-images', 'portfolio-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view portfolio uploads" on storage.objects;
create policy "Anyone can view portfolio uploads"
on storage.objects
for select
using (bucket_id = 'portfolio-images');

drop policy if exists "Authenticated admin can upload portfolio images" on storage.objects;
create policy "Authenticated admin can upload portfolio images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'portfolio-images');
