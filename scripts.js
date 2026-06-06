/* ============================================================
   WebAR Viewer — single GLB uploader
   - Always shares the GLB (browser -> Supabase).
   - If CONVERTER_URL is set, also makes an animated USDZ (server-side).
   ============================================================ */

// --- Supabase ---
const SUPABASE_URL = 'https://ogmtrdzimqlxhzomnnzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbXRyZHppbXFseGh6b21ubnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjI4ODgsImV4cCI6MjA5NjI5ODg4OH0.fXdfuU7iELLJC2ZJXrQMBq3YxZd2hRQc7Mi2TjZR7N8';
const BUCKET = 'ar-models';
const TABLE = 'shared_models';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Optional converter service (animated GLB -> USDZ). Leave '' to skip. ---
// Example: 'https://arable-converter.onrender.com'
const CONVERTER_URL = '';

// --- DOM refs ---
const glbUpload = document.getElementById('glbUpload');
const modelViewer = document.getElementById('model');
const statusEl = document.getElementById('status');
const shareResult = document.getElementById('shareResult');
const shareLinkInput = document.getElementById('shareLink');
const copyBtn = document.getElementById('copyBtn');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || '';
  statusEl.style.color = isError ? '#c0392b' : '#555';
}

// Upload a file (browser-side) to Supabase Storage; return its public URL.
async function uploadToStorage(file, ext, contentType) {
  const objPath = `${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(objPath, file, { contentType, upsert: false });
  if (error) throw error;
  return db.storage.from(BUCKET).getPublicUrl(objPath).data.publicUrl;
}

function buildLink(id) {
  return `${location.origin}${location.pathname}?share=${id}`;
}

// --- Upload GLB -> auto share (+ USDZ if converter available) ---
glbUpload.addEventListener('change', async function (event) {
  const file = event.target.files[0];
  if (!file || !/\.(glb|gltf)$/i.test(file.name)) {
    alert('Please upload a .glb file.');
    return;
  }

  modelViewer.setAttribute('src', URL.createObjectURL(file));
  modelViewer.removeAttribute('ios-src');
  shareResult.hidden = true;
  glbUpload.disabled = true;

  try {
    if (CONVERTER_URL) {
      // --- With converter: server converts + uploads + inserts row ---
      setStatus('Mengonversi & mengunggah... animasi dipertahankan, mohon tunggu.');
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
      const data = await resp.json(); // { id, glbUrl, usdzUrl, animated }
      if (data.usdzUrl) modelViewer.setAttribute('ios-src', data.usdzUrl);
      shareLinkInput.value = buildLink(data.id);
      shareResult.hidden = false;
      const animMsg = data.animated ? ' Animasi terdeteksi & dikonversi.' : '';
      setStatus(
        data.usdzUrl
          ? `Berhasil!${animMsg} Link siap dibagikan.`
          : `Berhasil (USDZ gagal, GLB saja).${animMsg} Link siap dibagikan.`
      );
    } else {
      // --- Fallback: upload GLB straight to Supabase (no USDZ) ---
      setStatus('Mengunggah ke Supabase...');
      const glbUrl = await uploadToStorage(file, 'glb', 'model/gltf-binary');
      const id = crypto.randomUUID();
      const { error } = await db.from(TABLE).insert({ id, glb_url: glbUrl, usdz_url: null });
      if (error) throw error;
      shareLinkInput.value = buildLink(id);
      shareResult.hidden = false;
      setStatus('Berhasil! Link siap dibagikan. (AR iOS/USDZ butuh converter aktif.)');
    }
  } catch (err) {
    console.error(err);
    setStatus('Gagal: ' + (err.message || err), true);
  } finally {
    glbUpload.disabled = false;
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

// --- View mode: ?share=<id> loads a shared model ---
async function loadSharedModel() {
  const id = new URLSearchParams(location.search).get('share');
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
    document.querySelectorAll('.upload-container, .hint').forEach((el) => (el.style.display = 'none'));
    setStatus('Model dibagikan dimuat. Tekan ikon AR untuk melihat di ruangmu.');
  } catch (err) {
    console.error(err);
    setStatus('Model tidak ditemukan atau sudah dihapus.', true);
  }
}

loadSharedModel();
