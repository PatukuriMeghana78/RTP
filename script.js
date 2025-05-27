// DOM Elements
const elements = {
  uploadInput: document.getElementById('image-upload'),
  cameraBtn: document.getElementById('camera-btn'),
  downloadBtn: document.getElementById('download-btn'),
  cvdTypeSelect: document.getElementById('cvd-type'),
  intensitySlider: document.getElementById('intensity'),
  intensityValue: document.getElementById('intensity-value'),
  originalCanvas: document.getElementById('original-canvas'),
  correctedCanvas: document.getElementById('corrected-canvas'),
  loadingIndicator: document.getElementById('loading'),
  errorMessage: document.getElementById('error-message')
};

// Canvas Contexts
const ctx = {
  original: elements.originalCanvas.getContext('2d'),
  corrected: elements.correctedCanvas.getContext('2d')
};

// State
const state = {
  cameraStream: null,
  isProcessing: false
};

// Helper Functions
function showLoading() {
  elements.loadingIndicator.style.display = 'flex';
  state.isProcessing = true;
}

function hideLoading() {
  elements.loadingIndicator.style.display = 'none';
  state.isProcessing = false;
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  setTimeout(() => elements.errorMessage.classList.add('hidden'), 5000);
}

function drawImageToCanvas(image, canvas) {
  // Set display dimensions (CSS)
  const displayWidth = Math.min(image.width, window.innerWidth * 0.45);
  const displayHeight = (displayWidth / image.width) * image.height;
  
  // Set backing store dimensions (actual pixels)
  canvas.width = image.width;
  canvas.height = image.height;
  
  // Scale down for display but maintain full resolution
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, displayWidth, displayHeight);
  
  // Update CSS dimensions
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

// In script.js
function processImageWithWorker(imageData) {
  showLoading();
  
  // Create fresh ImageData to avoid transfer issues
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);
  
  const worker = new Worker('worker.js');
  worker.postMessage({
    width: imageData.width,
    height: imageData.height,
    imageData: tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
  }, [tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data.buffer]);
  // ... rest of worker handling
}
  
  worker.onerror = (error) => {
    showError(`Worker error: ${error.message}`);
    hideLoading();
    worker.terminate();
  };
  
  worker.postMessage({
    imageData: imageData,
    cvdType: elements.cvdTypeSelect.value,
    intensity: elements.intensitySlider.value / 100
  }, [imageData.data.buffer]);
}

// Event Listeners
elements.uploadInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const img = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    drawImageToCanvas(img, elements.originalCanvas);
    const imageData = ctx.original.getImageData(0, 0, elements.originalCanvas.width, elements.originalCanvas.height);
    processImageWithWorker(imageData);
  } catch (error) {
    showError(`Failed to load image: ${error.message}`);
  }
});

elements.cameraBtn.addEventListener('click', async () => {
  try {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop());
      elements.cameraBtn.textContent = 'Enable Camera';
      state.cameraStream = null;
      return;
    }

    state.cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    elements.cameraBtn.textContent = 'Disable Camera';
    
    const video = document.createElement('video');
    video.srcObject = state.cameraStream;
    await video.play();
    
    const processFrame = () => {
      if (!state.cameraStream) return;
      
      elements.originalCanvas.width = video.videoWidth;
      elements.originalCanvas.height = video.videoHeight;
      elements.correctedCanvas.width = video.videoWidth;
      elements.correctedCanvas.height = video.videoHeight;
      
      ctx.original.drawImage(video, 0, 0);
      
      if (!state.isProcessing) {
        const imageData = ctx.original.getImageData(
          0, 0, 
          elements.originalCanvas.width, 
          elements.originalCanvas.height
        );
        processImageWithWorker(imageData);
      }
      
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
  } catch (error) {
    showError(`Camera error: ${error.message}`);
  }
});

elements.downloadBtn.addEventListener('click', () => {
  if (!elements.correctedCanvas.toDataURL().includes('image/png')) {
    showError('No corrected image available');
    return;
  }
  
  const link = document.createElement('a');
  link.download = `corrected-${elements.cvdTypeSelect.value}-${Date.now()}.png`;
  link.href = elements.correctedCanvas.toDataURL('image/png');
  link.click();
});

elements.intensitySlider.addEventListener('input', () => {
  elements.intensityValue.textContent = `${elements.intensitySlider.value}%`;
  
  if (elements.originalCanvas.toDataURL().includes('image/png')) {
    const imageData = ctx.original.getImageData(
      0, 0, 
      elements.originalCanvas.width, 
      elements.originalCanvas.height
    );
    processImageWithWorker(imageData);
  }
});

// Initialize
elements.intensityValue.textContent = `${elements.intensitySlider.value}%`;
// Right after getting imageData in upload/camera handlers:
const imageData = ctx.original.getImageData(0, 0, elements.originalCanvas.width, elements.originalCanvas.height);
console.log('ImageData dimensions:', imageData.width, imageData.height); // Debug

// Emergency dimension sync
elements.correctedCanvas.width = imageData.width;
elements.correctedCanvas.height = imageData.height;
elements.correctedCanvas.style.width = `${elements.originalCanvas.style.width}`;
elements.correctedCanvas.style.height = `${elements.originalCanvas.style.height}`;