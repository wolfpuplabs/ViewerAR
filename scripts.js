const glbUpload = document.getElementById('glbUpload');
const usdzUpload = document.getElementById('usdzUpload');
const modelViewer = document.getElementById('model');

let glbUrl = null;
let usdzUrl = null;

glbUpload.addEventListener('change', function(event) {
  var file = event.target.files[0];
  if (file && file.name.endsWith('.glb')) {
    glbUrl = URL.createObjectURL(file);
    modelViewer.setAttribute('src', glbUrl);
  } else {
    alert('Please upload a .glb file.');
  }
});

usdzUpload.addEventListener('change', function(event) {
  var file = event.target.files[0];
  if (file && file.name.endsWith('.usdz')) {
    usdzUrl = URL.createObjectURL(file);
    modelViewer.setAttribute('ios-src', usdzUrl);
  } else {
    alert('Please upload a .usdz file.');
  }
  // Ketika user selesai pilih file .glb
async function handleUpload(file) {
  // 1. Upload ke storage (Contoh: Supabase)
  const { data, error } = await supabase.storage
    .from('models')
    .upload(`public/${file.name}`, file);

  // 2. Ambil URL publik dari file yang di-upload
  const fileUrl = supabase.storage.from('models').getPublicUrl(data.path).data.publicUrl;

  // 3. Buat link share
  const shareLink = `https://a-rable.vercel.app/?model=${encodeURIComponent(fileUrl)}`;
  
  // 4. Tampilkan tombol "Salin Link" ke user
  showShareButton(shareLink);
}
window.addEventListener('DOMContentLoaded', () => {
  // Cek apakah ada parameter "?model=" di URL browser
  const urlParams = new URLSearchParams(window.location.search);
  const modelUrl = urlParams.get('model');

  if (modelUrl) {
    // Jika ada, langsung masukkan URL ini ke AR Viewer kamu
    const arViewer = document.querySelector('model-viewer'); // atau setup Three.js kamu
    arViewer.src = modelUrl;
  }
});

});
