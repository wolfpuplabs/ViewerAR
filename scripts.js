document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const modelViewer = document.getElementById('model');
    
        if (file.name.endsWith('.usdz')) {
          modelViewer.src = url;
          modelViewer.iosSrc = url; 
        } else if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
          modelViewer.src = url;
        } else {
          alert('Unsupported file type. Please upload a .glb, .gltf or animated .usdz file.');
        }
     }
});



