-- ============================================================
--  WebAR Viewer — Supabase setup
--  Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Tabel untuk menyimpan metadata model yang dibagikan
create table if not exists public.shared_models (
    id          text primary key,
    glb_url     text,
    usdz_url    text,
    created_at  timestamptz default now()
);

alter table public.shared_models enable row level security;

-- Siapa saja (anon) boleh membaca link yang dibagikan
create policy "Public can read shared models"
    on public.shared_models
    for select
    using (true);

-- Siapa saja (anon) boleh membuat share baru
create policy "Public can insert shared models"
    on public.shared_models
    for insert
    with check (true);

-- 2) Storage bucket publik untuk file model (GLB/USDZ)
insert into storage.buckets (id, name, public)
values ('ar-models', 'ar-models', true)
on conflict (id) do nothing;

-- Izinkan anon mengunggah ke bucket ar-models
create policy "Public can upload ar-models"
    on storage.objects
    for insert
    with check (bucket_id = 'ar-models');

-- Izinkan anon membaca file di bucket ar-models
create policy "Public can read ar-models"
    on storage.objects
    for select
    using (bucket_id = 'ar-models');
