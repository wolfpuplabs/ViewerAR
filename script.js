document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const modelViewer = document.getElementById('modelViewer');
        modelViewer.src = url;

        // Add alt text based on file name (optional enhancement)
        modelViewer.alt = `3D model: ${file.name}`;
        
        // Clear the previous object URL to free up memory
        modelViewer.addEventListener('load', () => {
            URL.revokeObjectURL(url);
        });
    }
});

