const glbUpload = document.getElementById('glbUpload');
const usdzUpload = document.getElementById('usdzUpload');
const modelViewer = document.getElementById('model');

let glbUrl = null;
let usdzUrl = null;

glbUpload.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file && file.name.endsWith('.glb')) {
    glbUrl = URL.createObjectURL(file);
    updateModelViewer();
  } else {
    alert('Please upload a .glb file.');
  }
});

usdzUpload.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file && file.name.endsWith('.usdz')) {
    usdzUrl = URL.createObjectURL(file);
    updateModelViewer();
  } else {
    alert('Please upload a .usdz file.');
  }
});

function updateModelViewer() {
  if (glbUrl) {
    modelViewer.src = glbUrl;
  } else if (usdzUrl) {
    modelViewer.setAttribute('ios-src', usdzUrl);
  }
}
