create table if not exists public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  gallery_slug text not null check (gallery_slug in ('projects', 'photography')),
  image_url text not null,
  storage_path text not null,
  caption text,
  file_name text,
  file_size bigint,
  content_type text,
  created_at timestamptz not null default now()
);

alter table public.portfolio_images enable row level security;

alter table public.portfolio_images
drop constraint if exists portfolio_images_gallery_slug_check;

update public.portfolio_images
set gallery_slug = 'projects'
where gallery_slug = 'professional-work';

delete from public.portfolio_images
where gallery_slug = 'safal';

alter table public.portfolio_images
add constraint portfolio_images_gallery_slug_check
check (gallery_slug in ('projects', 'photography'));

grant usage on schema public to anon, authenticated;
grant select on public.portfolio_images to anon, authenticated;
grant insert on public.portfolio_images to authenticated;

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

drop policy if exists "Authenticated admin can remove failed portfolio uploads" on storage.objects;
create policy "Authenticated admin can remove failed portfolio uploads"
on storage.objects
for delete
to authenticated
using (bucket_id = 'portfolio-images');
