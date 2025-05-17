// LMS Color Transformations
function rgbToLms(r, g, b) {
  return [
    0.3904725 * r + 0.54990437 * g + 0.00890159 * b,
    0.07092586 * r + 0.96310739 * g + 0.00135709 * b,
    0.02314268 * r + 0.12801221 * g + 0.93624394 * b
  ];
}

function lmsToRgb(l, m, s) {
  return [
    2.85831110 * l - 1.62870796 * m - 0.02482469 * s,
    -0.21018126 * l + 1.15820096 * m + 0.00032428 * s,
    -0.04181125 * l - 0.11817878 * m + 1.06871126 * s
  ];
}

function simulateCVD(imageData, cvdType) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    let [l, m, s] = rgbToLms(r, g, b);

    // Apply CVD simulation
    switch(cvdType) {
      case 'protanopia':
        // Remove L-cone response (red deficiency)
        l = 0.0 * l + 2.02344 * m - 2.52580 * s;
        break;
      case 'deuteranopia':
        // Remove M-cone response (green deficiency)
        m = 0.494207 * l + 0.0 * m + 1.24827 * s;
        break;
      case 'tritanopia':
        // Remove S-cone response (blue deficiency)
        s = -0.395913 * l + 0.801109 * m + 0.0 * s;
        break;
    }

    [r, g, b] = lmsToRgb(l, m, s);
    
    // Clamp values to 0-255
    data[i] = Math.max(0, Math.min(255, r));
    data[i+1] = Math.max(0, Math.min(255, g));
    data[i+2] = Math.max(0, Math.min(255, b));
  }
  
  return imageData;
}

// Worker Message Handler
self.onmessage = function(e) {
  const { imageData, cvdType } = e.data;
  const result = simulateCVD(imageData, cvdType);
  self.postMessage(result, [result.data.buffer]);
};