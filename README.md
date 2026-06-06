# ARable — GLB → USDZ Converter (animasi didukung)

Service kecil yang membungkus **Google `usd_from_gltf`** (mendukung animasi
rigid & skinned) supaya bisa dipanggil dari frontend lewat HTTP.

Browser dan Vercel serverless **tidak bisa** menjalankan konversi USDZ
beranimasi (exporter three.js hanya statis), jadi konversi dijalankan di
container Docker ini, lalu hasilnya di-upload ke Supabase oleh frontend.

## Endpoint

- `GET /` → health check
- `POST /convert` → multipart/form-data, field **`model`** = file `.glb`/`.gltf`.
  Mengembalikan biner `.usdz`.

## Jalankan lokal

```bash
cd converter
docker build -t arable-converter .
docker run --rm -p 3000:3000 arable-converter
# tes:
curl -F "model=@animated.glb" http://localhost:3000/convert -o out.usdz
```

## Deploy (pilih salah satu host Docker)

### Render.com (paling mudah, ada free tier)

1. Push repo ini ke GitHub.
1. Render → New → **Web Service** → pilih repo.
1. Root Directory: `converter`, Environment: **Docker**.
1. Deploy. Catat URL-nya, mis. `https://arable-converter.onrender.com`.

### Google Cloud Run

```bash
cd converter
gcloud run deploy arable-converter --source . --port 3000 --allow-unauthenticated
```

### Fly.io

```bash
cd converter
fly launch --dockerfile Dockerfile --internal-port 3000
```

## Environment variables (set di host)

Converter sekarang juga meng-upload hasil ke Supabase, jadi set:

```
SUPABASE_URL   = https://ogmtrdzimqlxhzomnnzl.supabase.co
SUPABASE_KEY   = <anon key, atau service_role key kalau policy diperketat>
BUCKET         = ar-models   (opsional, default ar-models)
TABLE          = shared_models (opsional)
```

Default-nya sudah memakai anon key project kamu (policy anon-insert dari
`supabase_setup.sql` mengizinkannya). Untuk keamanan lebih ketat, ganti ke
`service_role` key DAN ubah policy agar hanya server yang boleh menulis.

## Hubungkan ke frontend

Buka `scripts.js`, isi URL service tadi:

```js
const CONVERTER_URL = 'https://arable-converter.onrender.com';
```

Saat user upload GLB, frontend mengirimnya ke service ini. Service:

1. mendeteksi animasi,
1. mengonversi GLB → USDZ (animasi dipertahankan),
1. meng-upload GLB + USDZ ke Supabase,
1. membuat baris share & mengembalikan `id` → frontend menyusun link share.

USDZ tidak pernah lewat browser, jadi file besar tidak bolak-balik.

## Catatan

- Binary `usd_from_gltf` sudah ada di image `leon/usd-from-gltf`. Jika auto-deteksi
  path gagal, set absolute path-nya di Dockerfile: `ENV UFG_BIN=/path/ke/usd_from_gltf`.
  Untuk menemukannya: `docker run --rm --entrypoint which leon/usd-from-gltf:latest usd_from_gltf`.
- Limit ukuran upload 100 MB & timeout konversi 120 detik (atur di `server.js`).
- Free tier Render bisa “tidur” — request pertama agak lambat (cold start).