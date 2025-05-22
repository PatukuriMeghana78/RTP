// DOM Elements
const uploadInput = document.getElementById('image-upload');
const cameraBtn = document.getElementById('camera-btn');
const downloadBtn = document.getElementById('download-btn');
const cvdTypeSelect = document.getElementById('cvd-type');
const originalCanvas = document.getElementById('original-canvas');
const correctedCanvas = document.getElementById('corrected-canvas');
const loadingIndicator = document.getElementById('loading');

// Canvas Contexts
const originalCtx = originalCanvas.getContext('2d');
const correctedCtx = correctedCanvas.getContext('2d');

// State
let cameraStream = null;

// Helper Functions
function showLoading() {
  loadingIndicator.style.display = 'block';
}

function hideLoading() {
  loadingIndicator.style.display = 'none';
}

function drawImageToCanvas(image, canvas) {
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
}

// Image Processing via Web Worker
function processImageWithWorker(imageData) {
  if (imageData.width === 0 || imageData.height === 0) {
    console.error("Invalid image dimensions");
    return;
  }
  showLoading();
  
  correctedCanvas.width = originalCanvas.width;
  correctedCanvas.height = originalCanvas.height;

  const worker = new Worker('worker.js');
  
  worker.onmessage = (e) => {
  if (e.data.error) {
    console.error('Worker error:', e.data.error);
    hideLoading();
    return;
  }
  correctedCtx.putImageData(e.data, 0, 0);
  hideLoading();
};
  
  worker.onerror = (error) => {
    console.error('Worker error:', error);
    hideLoading();
    worker.terminate();
  };
  
  worker.postMessage({
    imageData: imageData,
    cvdType: cvdTypeSelect.value,
    intensity: document.getElementById('intensity').value / 100 
  }, [imageData.data.buffer]);
}

// Event Listeners
uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      drawImageToCanvas(img, originalCanvas);
      const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
      processImageWithWorker(imageData);
    };
  };
  reader.readAsDataURL(file);
});

cameraBtn.addEventListener('click', async () => {
  try {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraBtn.textContent = 'Enable Camera';
      cameraStream = null;
      return;
    }

    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraBtn.textContent = 'Disable Camera';
    
    const video = document.createElement('video');
    video.srcObject = cameraStream;
    video.play();
    
    video.onplaying = () => {
      const processFrame = () => {
        if (!cameraStream) return;
        
        // Sync canvas sizes
        originalCanvas.width = video.videoWidth;
        originalCanvas.height = video.videoHeight;
        correctedCanvas.width = video.videoWidth;
        correctedCanvas.height = video.videoHeight;
        
        originalCtx.drawImage(video, 0, 0);
        const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
        processImageWithWorker(imageData);
        
        requestAnimationFrame(processFrame);
      };
      requestAnimationFrame(processFrame);
    };
  } catch (error) {
    console.error('Camera error:', error);
    alert('Camera error: ' + error.message);
  }
});

downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'corrected-image.png';
  link.href = correctedCanvas.toDataURL('image/png');
  link.click();
});

video.onplaying = () => {
  const processFrame = () => {
    if (!cameraStream) return;
    
    // Set canvas dimensions to video dimensions
    originalCanvas.width = video.videoWidth;
    originalCanvas.height = video.videoHeight;
    correctedCanvas.width = video.videoWidth;
    correctedCanvas.height = video.videoHeight;
    
    originalCtx.drawImage(video, 0, 0);
    const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    processImageWithWorker(imageData);
    
    requestAnimationFrame(processFrame);
  };
  requestAnimationFrame(processFrame);
};