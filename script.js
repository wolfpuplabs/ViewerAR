document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const modelViewer = document.getElementById('modelViewer');
        modelViewer.src = url;

        // Set alt text based on file name (optional enhancement)
        modelViewer.alt = `3D model: ${file.name}`;

        // Add a load event listener to revoke the object URL after loading the model
        modelViewer.addEventListener('load', () => {
            URL.revokeObjectURL(url);
        });
    }
});

