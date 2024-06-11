document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate the file type
        const validTypes = ['model/gltf-binary', 'model/vnd.usdz+zip'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid .glb or .usdz file.');
            return;
        }

        const url = URL.createObjectURL(file);
        const modelViewer = document.getElementById('modelViewer');
        modelViewer.src = url;
        modelViewer.alt = `3D model: ${file.name}`;

        // Free the previous object URL
        modelViewer.addEventListener('load', () => {
            URL.revokeObjectURL(url);
        });
    } else {
        alert('No file selected');
    }
});


