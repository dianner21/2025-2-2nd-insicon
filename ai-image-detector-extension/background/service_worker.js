// ============================================
// Background Service Worker (Chrome Extension v3)
// Role: Extension brain, API communication, CORS bypass
// ============================================

// Configuration
const CONFIG = {
  API_ENDPOINT: 'http://localhost:8000/predict',
  CACHE_DURATION: 1000 * 60 * 60, // 1 hour
  RATE_LIMIT_DELAY: 500, // ms between requests
};

// Cache for results (avoid duplicate requests)
const resultCache = new Map();

// Rate limiting queue
let requestQueue = [];
let isProcessing = false;

// Helpers
function getApiEndpoint() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiEndpoint'], (settings) => {
      resolve(settings.apiEndpoint || CONFIG.API_ENDPOINT);
    });
  });
}

// ============================================
// Extension Installation & Setup
// ============================================
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Image Detector Extension installed');

  // Create context menu
  chrome.contextMenus.create({
    id: 'check-ai-image',
    title: 'AI 생성 여부 검사',
    contexts: ['image'],
  });

  // Initialize storage
  chrome.storage.local.set({
    autoDetect: true,
    confidenceThreshold: 0.7,
    apiEndpoint: CONFIG.API_ENDPOINT,
  });
});

// ============================================
// Context Menu Handler
// ============================================
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'check-ai-image') {
    const imageUrl = info.srcUrl;
    console.log('Context menu clicked:', imageUrl);

    // Send image for analysis
    analyzeImage(imageUrl, tab.id);
  }
});

// ============================================
// Message Handler (Communication with Content Script)
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.action);

  if (request.action === 'analyzeImage') {
    // Analyze single image
    analyzeImage(request.imageUrl, sender.tab.id, request.imageId)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'analyzeBatch') {
    // Analyze multiple images
    analyzeBatch(request.images, sender.tab.id)
      .then(results => sendResponse({ success: true, results }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.local.get(['autoDetect', 'confidenceThreshold', 'apiEndpoint'], (settings) => {
      sendResponse({ success: true, settings });
    });
    return true;
  }
});

// ============================================
// Core Analysis Function
// ============================================
async function analyzeImage(imageUrl, tabId, imageId = null) {
  console.log('Analyzing image:', imageUrl);

  // Check cache first
  const cached = checkCache(imageUrl);
  if (cached) {
    console.log('Cache hit:', imageUrl);
    notifyContentScript(tabId, imageId, cached);
    return cached;
  }

  try {
    // Fetch image (CORS bypass via background)
    const imageBlob = await fetchImage(imageUrl);

    // Send to inference API
    const result = await sendToInferenceAPI(imageBlob, imageUrl);

    // Cache result
    cacheResult(imageUrl, result);

    // Notify content script
    notifyContentScript(tabId, imageId, result);

    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

// ============================================
// Batch Analysis
// ============================================
async function analyzeBatch(images, tabId) {
  console.log('Batch analysis:', images.length, 'images');

  const results = [];
  for (const img of images) {
    try {
      const result = await analyzeImage(img.url, tabId, img.id);
      results.push({ imageId: img.id, result });

      // Rate limiting
      await sleep(CONFIG.RATE_LIMIT_DELAY);
    } catch (error) {
      results.push({ imageId: img.id, error: error.message });
    }
  }

  return results;
}

// ============================================
// Image Fetching (CORS Bypass)
// ============================================
async function fetchImage(imageUrl) {
  console.log('Fetching image:', imageUrl);

  const response = await fetch(imageUrl, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  console.log('Image fetched:', blob.size, 'bytes');

  return blob;
}

// ============================================
// Inference API Communication
// ============================================
async function sendToInferenceAPI(imageBlob, imageUrl) {
  console.log('Sending to inference API...');

  const apiEndpoint = await getApiEndpoint();
  const formData = new FormData();
  formData.append('image', imageBlob, 'image.jpg');
  formData.append('meta', JSON.stringify({
    source: 'browser',
    url: imageUrl,
  }));

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();
  return result;
}

// ============================================
// Dummy Response Generator (for testing)
// ============================================
function generateDummyResponse(imageUrl) {
  // Generate deterministic random result based on URL
  const hash = imageUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const isAI = hash % 3 === 0; // ~33% AI-generated
  const confidence = 0.6 + (hash % 40) / 100; // 0.6 ~ 0.99

  return {
    ai_generated: isAI,
    confidence: parseFloat(confidence.toFixed(2)),
    model_hint: isAI ? ['SDXL', 'MidJourney', 'DALL-E'][hash % 3] : null,
    robustness: {
      compressed: true,
      resized: true,
    },
  };
}

// ============================================
// Cache Management
// ============================================
function checkCache(imageUrl) {
  const cached = resultCache.get(imageUrl);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CONFIG.CACHE_DURATION) {
    resultCache.delete(imageUrl);
    return null;
  }

  return cached.result;
}

function cacheResult(imageUrl, result) {
  resultCache.set(imageUrl, {
    result,
    timestamp: Date.now(),
  });

  // Cleanup old cache entries
  if (resultCache.size > 100) {
    const oldestKey = resultCache.keys().next().value;
    resultCache.delete(oldestKey);
  }
}

// ============================================
// Content Script Notification
// ============================================
function notifyContentScript(tabId, imageId, result) {
  chrome.tabs.sendMessage(tabId, {
    action: 'analysisResult',
    imageId: imageId,
    result: result,
  }).catch(error => {
    console.error('Failed to notify content script:', error);
  });
}

// ============================================
// Utility Functions
// ============================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Background service worker loaded');
