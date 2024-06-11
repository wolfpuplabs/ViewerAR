document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const modelViewer = document.getElementById('model');
        modelViewer.src = url;
    }
});



