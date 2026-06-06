// Inisialisasi Supabase
const supabaseUrl = 'https://ogmtrdzimqlxhzomnnzl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbXRyZHppbXFseGh6b21ubnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjI4ODgsImV4cCI6MjA5NjI5ODg4OH0.fXdfuU7iELLJC2ZJXrQMBq3YxZd2hRQc7Mi2TjZR7N8';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
const modelViewer = document.getElementById('model');
const glbUpload = document.getElementById('glbUpload');
const usdzUpload = document.getElementById('usdzUpload');
const shareBtn = document.getElementById('shareBtn');
const shareLinkInput = document.getElementById('shareLink');
const uploadSection = document.getElementById('uploadSection');

let currentGlbFile = null;
let currentUsdzFile = null;

// 1. Fitur Preview Lokal (Sebelum di-upload)
glbUpload.addEventListener('change', (e) => {
    currentGlbFile = e.target.files[0];
    if (currentGlbFile) {
        const objectURL = URL.createObjectURL(currentGlbFile);
        modelViewer.src = objectURL;
    }
});

usdzUpload.addEventListener('change', (e) => {
    currentUsdzFile = e.target.files[0];
    if (currentUsdzFile) {
        const objectURL = URL.createObjectURL(currentUsdzFile);
        modelViewer.setAttribute('ios-src', objectURL);
    }
});

// 2. Fitur Upload & Generate Link
shareBtn.addEventListener('click', async () => {
    if (!currentGlbFile) {
        alert("Harap upload file GLB terlebih dahulu!");
        return;
    }

    // Ubah status tombol saat loading
    shareBtn.disabled = true;
    shareBtn.textContent = 'Uploading... (Harap tunggu)';

    try {
        // Upload file GLB ke Supabase Storage
        const glbFileName = `${Date.now()}_${currentGlbFile.name}`;
        const { data: glbData, error: glbError } = await supabase.storage
            .from('models')
            .upload(glbFileName, currentGlbFile);
        if (glbError) throw glbError;

        // Dapatkan Public URL GLB
        const glbUrl = supabase.storage.from('models').getPublicUrl(glbFileName).data.publicUrl;

        let usdzUrl = null;
        // Jika ada file USDZ, upload juga
        if (currentUsdzFile) {
            const usdzFileName = `${Date.now()}_${currentUsdzFile.name}`;
            const { data: usdzData, error: usdzError } = await supabase.storage
                .from('models')
                .upload(usdzFileName, currentUsdzFile);
            if (usdzError) throw usdzError;

            // Dapatkan Public URL USDZ
            usdzUrl = supabase.storage.from('models').getPublicUrl(usdzFileName).data.publicUrl;
        }

        // Simpan URL ke Supabase Database
        const { data: dbData, error: dbError } = await supabase
            .from('shared_models')
            .insert([{ glb_url: glbUrl, usdz_url: usdzUrl }])
            .select();

        if (dbError) throw dbError;

        // Generate URL untuk di-share
        const modelId = dbData[0].id;
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${modelId}`;
        
        // Tampilkan link ke user
        shareLinkInput.style.display = 'block';
        shareLinkInput.value = shareUrl;
        shareLinkInput.select();
        
        shareBtn.textContent = 'Link Berhasil Dibuat!';

    } catch (error) {
        console.error("Error:", error);
        alert("Terjadi kesalahan saat mengupload model: " + error.message);
        shareBtn.disabled = false;
        shareBtn.textContent = 'Generate Share Link';
    }
});

// 3. Fitur Load Model dari URL (Saat seseorang membuka link)
window.addEventListener('DOMContentLoaded', async () => {
    // Cek apakah ada parameter ?id= di URL
    const urlParams = new URLSearchParams(window.location.search);
    const modelId = urlParams.get('id');

    if (modelId) {
        // Sembunyikan form upload karena user ini adalah "viewer"
        uploadSection.style.display = 'none';

        // Ambil data dari Supabase berdasarkan ID
        const { data, error } = await supabase
            .from('shared_models')
            .select('*')
            .eq('id', modelId)
            .single();

        if (error || !data) {
            alert("Model 3D tidak ditemukan atau link tidak valid.");
            return;
        }

        // Tampilkan model di <model-viewer>
        modelViewer.src = data.glb_url;
        if (data.usdz_url) {
            modelViewer.setAttribute('ios-src', data.usdz_url);
        }
    }
});
