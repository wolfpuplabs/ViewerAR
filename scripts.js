/* ============================================================
   WebAR Viewer — Supabase Share Integration
   ============================================================ */

// --- Supabase config ---
const SUPABASE_URL = 'https://ogmtrdzimqlxhzomnnzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbXRyZHppbXFseGh6b21ubnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjI4ODgsImV4cCI6MjA5NjI5ODg4OH0.fXdfuU7iELLJC2ZJXrQMBq3YxZd2hRQc7Mi2TjZR7N8';
const BUCKET = 'ar-models';
const TABLE = 'shared_models';

// --- Converter service config ---
// URL of the GLB->USDZ converter microservice (see /converter folder).
// Example: 'https://arable-converter.onrender.com'
// Leave empty ('') to disable auto-convert and use manual USDZ upload only.
const CONVERTER_URL = '';

// supabase-js UMD exposes a global `supabase`; create the client.
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM refs ---
const glbUpload = document.getElementById('glbUpload');
const usdzUpload = document.getElementById('usdzUpload');
const modelViewer = document.getElementById('model');
const shareBtn = document.getElementById('shareBtn');
const statusEl = document.getElementById('status');
const shareResult = document.getElementById('shareResult');
const shareLinkInput = document.getElementById('shareLink');
const copyBtn = document.getElementById('copyBtn');

// Hold selected files until the user chooses to share.
let glbFile = null;
let usdzFile = null;

// --- Helpers ---
function setStatus(msg, isError = false) {
  statusEl.textContent = msg || '';
  statusEl.style.color = isError ? '#c0392b' : '#555';
}

function randomId(len = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

// Send a GLB to the converter service and get back a USDZ File.
async function convertGlbToUsdz(file) {
  if (!CONVERTER_URL) return null;
  const form = new FormData();
  form.append('model', file, file.name);
  const resp = await fetch(`${CONVERTER_URL.replace(/\/$/, '')}/convert`, {
    method: 'POST',
    body: form,
  });
  if (!resp.ok) {
    let detail = resp.statusText;
    try { detail = (await resp.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  const blob = await resp.blob();
  const usdzName = file.name.replace(/\.(glb|gltf)$/i, '.usdz');
  return new File([blob], usdzName, { type: 'model/vnd.usdz+zip' });
}

// Upload one file to Supabase Storage and return its public URL.
async function uploadToStorage(file, ext) {
  const path = `${randomId(8)}-${Date.now()}.${ext}`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: ext === 'glb' ? 'model/gltf-binary' : 'model/vnd.usdz+zip',
      upsert: false,
    });
  if (error) throw error;
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// --- File selection: keep a local preview + remember the file ---
glbUpload.addEventListener('change', async function (event) {
  const file = event.target.files[0];
  if (!file || !file.name.toLowerCase().endsWith('.glb')) {
    alert('Please upload a .glb file.');
    return;
  }
  glbFile = file;
  modelViewer.setAttribute('src', URL.createObjectURL(file));

  // Auto-convert GLB -> USDZ (preserves animation) so iOS Quick Look works.
  if (CONVERTER_URL) {
    setStatus('Mengonversi GLB ke USDZ (termasuk animasi)...');
    try {
      const usdz = await convertGlbToUsdz(file);
      if (usdz) {
        usdzFile = usdz;
        modelViewer.setAttribute('ios-src', URL.createObjectURL(usdz));
        setStatus('GLB + USDZ siap. Klik "Generate Share Link" untuk membagikan.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Konversi USDZ gagal: ' + (err.message || err) + ' — kamu masih bisa upload USDZ manual.', true);
    }
  } else {
    setStatus('GLB siap. Klik "Generate Share Link" untuk membagikan.');
  }
});

usdzUpload.addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (file && file.name.toLowerCase().endsWith('.usdz')) {
    usdzFile = file;
    modelViewer.setAttribute('ios-src', URL.createObjectURL(file));
    setStatus('USDZ siap. Klik "Generate Share Link" untuk membagikan.');
  } else {
    alert('Please upload a .usdz file.');
  }
});

// --- Share: upload to Supabase, save row, build link ---
shareBtn.addEventListener('click', async function () {
  if (!glbFile && !usdzFile) {
    alert('Upload minimal satu model (GLB atau USDZ) terlebih dahulu.');
    return;
  }

  shareBtn.disabled = true;
  shareResult.hidden = true;
  setStatus('Mengunggah ke Supabase...');

  try {
    let glbUrl = null;
    let usdzUrl = null;

    if (glbFile) {
      setStatus('Mengunggah GLB...');
      glbUrl = await uploadToStorage(glbFile, 'glb');
    }
    if (usdzFile) {
      setStatus('Mengunggah USDZ...');
      usdzUrl = await uploadToStorage(usdzFile, 'usdz');
    }

    const id = crypto.randomUUID();
    setStatus('Menyimpan metadata...');
    const { error } = await db
      .from(TABLE)
      .insert({ id, glb_url: glbUrl, usdz_url: usdzUrl });
    if (error) throw error;

    const link = `${location.origin}${location.pathname}?share=${id}`;
    shareLinkInput.value = link;
    shareResult.hidden = false;
    setStatus('Berhasil! Link siap dibagikan.');
  } catch (err) {
    console.error(err);
    setStatus('Gagal: ' + (err.message || err), true);
  } finally {
    shareBtn.disabled = false;
  }
});

// --- Copy link ---
copyBtn.addEventListener('click', async function () {
  try {
    await navigator.clipboard.writeText(shareLinkInput.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
  } catch {
    shareLinkInput.select();
    document.execCommand('copy');
  }
});

// --- On load: if ?share=<id> present, fetch the shared model ---
async function loadSharedModel() {
  const params = new URLSearchParams(location.search);
  const id = params.get('share');
  if (!id) return;

  setStatus('Memuat model yang dibagikan...');
  try {
    const { data, error } = await db
      .from(TABLE)
      .select('glb_url, usdz_url')
      .eq('id', id)
      .single();
    if (error) throw error;

    if (data.glb_url) modelViewer.setAttribute('src', data.glb_url);
    if (data.usdz_url) modelViewer.setAttribute('ios-src', data.usdz_url);

    // In view mode, hide the upload/share controls.
    document.querySelectorAll('.upload-container, #shareBtn').forEach((el) => (el.style.display = 'none'));
    setStatus('Model dibagikan dimuat. Tekan ikon AR untuk melihat di ruangmu.');
  } catch (err) {
    console.error(err);
    setStatus('Model tidak ditemukan atau sudah dihapus.', true);
  }
}

loadSharedModel();
