document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const modelViewer = document.getElementById('model');
        modelViewer.src = url;
    }
});

// Load the model from the URL if present
window.addEventListener('load', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const modelUrl = urlParams.get('model');
    if (modelUrl) {
        const modelViewer = document.getElementById('model');
        modelViewer.src = modelUrl;
    }
});
