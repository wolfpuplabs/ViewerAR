document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            const modelViewer = document.getElementById('model');
            modelViewer.src = dataUrl;

            // Update shareable link and QR code with the data URL
            const shareLink = document.getElementById('share-link');
            shareLink.href = `${window.location.origin}${window.location.pathname}?model=${encodeURIComponent(dataUrl)}`;

            const qr = new QRious({
                element: document.getElementById('qr-code'),
                value: shareLink.href,
                size: 150
            });
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('share').addEventListener('click', function() {
    const shareLink = document.getElementById('share-link').href;
    if (navigator.share) {
        navigator.share({
            title: 'WebAR Viewer',
            text: 'Check out this AR experience!',
            url: shareLink
        }).then(() => {
            console.log('Successfully shared');
        }).catch((error) => {
            console.error('Something went wrong sharing the AR experience', error);
        });
    } else {
        alert('Web Share API is not supported in your browser.');
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
