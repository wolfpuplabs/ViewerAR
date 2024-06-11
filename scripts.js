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
});
