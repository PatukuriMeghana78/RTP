// Enhanced LMS Color Transformations with Gamma Correction
const gamma = 2.2; // Standard sRGB gamma

function applyGamma(value) {
  return Math.pow(value / 255, gamma);
}

function removeGamma(value) {
  return Math.pow(value, 1/gamma) * 255;
}

function rgbToLms(r, g, b) {
  // Convert to linear RGB first
  const rLinear = applyGamma(r);
  const gLinear = applyGamma(g);
  const bLinear = applyGamma(b);
  
  // Hunt-Pointer-Estevez matrix
  return [
    0.3904725 * rLinear + 0.54990437 * gLinear + 0.00890159 * bLinear,  // L
    0.07092586 * rLinear + 0.96310739 * gLinear + 0.00135709 * bLinear,  // M 
    0.02314268 * rLinear + 0.12801221 * gLinear + 0.93624394 * bLinear   // S
  ];
}

function lmsToRgb(l, m, s) {
  // Inverse HPE matrix
  const rLinear = 2.85831110 * l - 1.62870796 * m - 0.02482469 * s;
  const gLinear = -0.21018126 * l + 1.15820096 * m + 0.00032428 * s;
  const bLinear = -0.04181125 * l - 0.11817878 * m + 1.06871126 * s;
  
  // Convert back to sRGB
  return [
    removeGamma(rLinear),
    removeGamma(gLinear),
    removeGamma(bLinear)
  ];
}

function simulateCVD(imageData, cvdType, intensity = 1.0) {
  const data = imageData.data;
  const originalData = new Uint8ClampedArray(data); // Preserve original
  
  for (let i = 0; i < data.length; i += 4) {
    const r = originalData[i];
    const g = originalData[i+1];
    const b = originalData[i+2];
    
    let [l, m, s] = rgbToLms(r, g, b);
    
    // Brettel et al. matrices (validated)
    switch(cvdType) {
      case 'protanopia':
        l = 0.0 * l + 2.02344 * m - 2.52580 * s;
        break;
      case 'deuteranopia':
        m = 0.494207 * l + 0.0 * m + 1.24827 * s;
        break;
      case 'tritanopia':
        s = -0.395913 * l + 0.801109 * m + 0.0 * s;
        break;
    }
    
    let [newR, newG, newB] = lmsToRgb(l, m, s);
    
    // Apply intensity (blend with original)
    data[i] = Math.round(r * (1-intensity) + newR * intensity);
    data[i+1] = Math.round(g * (1-intensity) + newG * intensity);
    data[i+2] = Math.round(b * (1-intensity) + newB * intensity);
    // Alpha channel (data[i+3]) remains unchanged
  }
  
  return imageData;
}

self.onmessage = function(e) {
  try {
    const { imageData, cvdType, intensity } = e.data;
    const result = simulateCVD(imageData, cvdType, intensity);
    self.postMessage(result, [result.data.buffer]);
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ error: error.message });
  }
};