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
  const aspectRatio = image.width / image.height;
  const maxWidth = window.innerWidth * 0.4;
  const maxHeight = window.innerHeight * 0.7;
  
  let width = image.width;
  let height = image.height;
  
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);
}

function processImageWithWorker(imageData) {
  if (state.isProcessing) return;
  
  showLoading();
  
  const worker = new Worker('worker.js');
  
  worker.onmessage = (e) => {
    if (e.data.error) {
      showError(`Processing failed: ${e.data.error}`);
      hideLoading();
      return;
    }
    
    ctx.corrected.putImageData(e.data, 0, 0);
    hideLoading();
    worker.terminate();
  };
  
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