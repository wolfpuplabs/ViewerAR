document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const modelViewer = document.getElementById('model');
        modelViewer.src = url;
    }
});

document.getElementById('share').addEventListener('click', function() {
    if (navigator.share) {
        navigator.share({
            title: 'WebAR Viewer',
            text: 'Check out this AR experience!',
            url: window.location.href
        }).then(() => {
            console.log('Successfully shared');
        }).catch((error) => {
            console.error('Something went wrong sharing the AR experience', error);
        });
    } else {
        alert('Web Share API is not supported in your browser.');
    }
});
