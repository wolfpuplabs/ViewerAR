-- ============================================================
--  WebAR Viewer — Auto-destroy upload setelah 3 hari
--  Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Aktifkan pg_cron.
--    Jika baris ini error, aktifkan manual di:
--    Dashboard > Database > Extensions > cari "pg_cron" > Enable.
create extension if not exists pg_cron;

-- 2) Fungsi pembersih: hapus file di Storage + baris metadata
--    yang umurnya lebih dari 3 hari.
create or replace function public.cleanup_expired_models()
returns void
language plpgsql
security definer
as $$
begin
    -- hapus file fisik di bucket ar-models
    delete from storage.objects
     where bucket_id = 'ar-models'
       and created_at < now() - interval '3 days';

    -- hapus metadata share-nya
    delete from public.shared_models
     where created_at < now() - interval '3 days';
end;
$$;

-- 3) Hapus jadwal lama (kalau ada) agar tidak dobel saat re-run.
do $$
begin
    perform cron.unschedule('cleanup-expired-models');
exception when others then
    null; -- belum ada jadwal, abaikan
end $$;

-- 4) Jadwalkan: jalan tiap jam (cek & bersihkan yang sudah > 3 hari).
select cron.schedule(
    'cleanup-expired-models',
    '0 * * * *',                                   -- setiap awal jam
    $$ select public.cleanup_expired_models(); $$
);

-- (Opsional) jalankan sekali sekarang untuk langsung membersihkan:
-- select public.cleanup_expired_models();

-- (Cek) lihat daftar job terjadwal:
-- select jobname, schedule, active from cron.job;
