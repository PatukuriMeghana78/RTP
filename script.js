// DOM Elements
const uploadInput = document.getElementById('image-upload');
const cameraBtn = document.getElementById('camera-btn');
const cvdTypeSelect = document.getElementById('cvd-type');
const intensitySlider = document.getElementById('intensity');
const originalCanvas = document.getElementById('original-canvas');
const correctedCanvas = document.getElementById('corrected-canvas');

// 1. Handle Image Upload
uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      drawImageToCanvas(img, originalCanvas);
      applyCVDCorrection(img); // Apply CVD correction
    };
  };
  reader.readAsDataURL(file);
});

// 2. Draw Image to Canvas
function drawImageToCanvas(img, canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
}

// 3. CVD Correction Logic (LMS Transformations)
function applyCVDCorrection(img) {
  const originalCtx = originalCanvas.getContext('2d');
  const correctedCtx = correctedCanvas.getContext('2d');

  // Copy original image to corrected canvas
  correctedCanvas.width = originalCanvas.width;
  correctedCanvas.height = originalCanvas.height;
  correctedCtx.drawImage(img, 0, 0);

  // Get image data and apply LMS transformation
  const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
  const correctedData = simulateCVD(imageData, cvdTypeSelect.value, intensitySlider.value);
  correctedCtx.putImageData(correctedData, 0, 0);
}

function rgbToLms(r, g, b) {
  const l = 0.3904725 * r + 0.54990437 * g + 0.00890159 * b;
  const m = 0.07092586 * r + 0.96310739 * g + 0.00135709 * b;
  const s = 0.02314268 * r + 0.12801221 * g + 0.93624394 * b;
  return [l, m, s];
}

function lmsToRgb(l, m, s) {
  const r = 2.85831110 * l - 1.62870796 * m - 0.02482469 * s;
  const g = -0.21018126 * l + 1.15820096 * m + 0.00032428 * s;
  const b = -0.04181125 * l - 0.11817878 * m + 1.06871126 * s;
  return [r, g, b];
}


function simulateCVD(imageData, cvdType, intensity) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    let [l, m, s] = rgbToLms(r, g, b);

    // Apply CVD simulation (e.g., Protanopia: L-cones disabled)
    if (cvdType === 'protanopia') l = 0;
    else if (cvdType === 'deuteranopia') m = 0;
    else if (cvdType === 'tritanopia') s = 0;

    [r, g, b] = lmsToRgb(l, m, s);
    data.set([r, g, b, 255], i); // Alpha = 255
  }
  return imageData;
}
cameraBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    
    // Process frames every 100ms
    setInterval(() => {
      originalCanvas.width = video.videoWidth;
      originalCanvas.height = video.videoHeight;
      const ctx = originalCanvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      applyCVDCorrection(video); // Reuse the same function
    }, 100);
  } catch (error) {
    alert("Camera access denied: " + error.message);
  }
});