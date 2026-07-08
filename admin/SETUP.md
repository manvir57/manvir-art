# Admin Setup

This portfolio is hosted on GitHub Pages, so it has no private backend. The admin page uses Supabase for secure login, image storage, and gallery metadata.

## 1. Create Supabase project

Create a free project at Supabase.

In Authentication, create one user for yourself with email/password. That is the login for `/admin/`.

## 2. Create storage bucket

Create a public Storage bucket named:

```text
portfolio-images
```

The bucket is public so the portfolio can display uploaded images without exposing private credentials.

## 3. Run SQL

Open Supabase SQL Editor and run:

```sql
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

create policy "Anyone can read portfolio images"
on public.portfolio_images
for select
using (true);

create policy "Authenticated admin can add portfolio images"
on public.portfolio_images
for insert
to authenticated
with check (true);
```

For Storage policies, run this too:

```sql
create policy "Anyone can view portfolio uploads"
on storage.objects
for select
using (bucket_id = 'portfolio-images');

create policy "Authenticated admin can upload portfolio images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'portfolio-images');

create policy "Authenticated admin can remove failed portfolio uploads"
on storage.objects
for delete
to authenticated
using (bucket_id = 'portfolio-images');
```

## 4. Add config

Copy:

```text
content/admin-config.example.js
```

to:

```text
content/admin-config.js
```

Fill in:

```js
window.PORTFOLIO_ADMIN_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  storageBucket: "portfolio-images",
};
```

The anon key is safe to expose in a browser when Row Level Security policies are enabled. Do not put a Supabase service-role key in this site.

## 5. Use it

Visit:

```text
https://manvir.art/admin/
```

Log in with your Supabase Auth email/password, choose a gallery, and upload photos.

Uploaded photos are saved in Supabase Storage and listed in `portfolio_images`, then the public portfolio automatically loads them into the matching gallery.
