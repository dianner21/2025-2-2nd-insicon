// ============================================
// Content Script (Runs on every page)
// Role: Image detection, user events, overlay UI
// ============================================

console.log('AI Image Detector - Content Script Loaded');

// Configuration
const CONFIG = {
  AUTO_DETECT: true,
  MIN_IMAGE_SIZE: 50, // minimum width/height in pixels (더 작은 이미지도 감지)
  LAZY_LOAD_OBSERVER: true,
  DEBOUNCE_DELAY: 1000, // ms
  DEBUG: true, // 디버깅 로그 활성화
  PERIODIC_SCAN_INTERVAL: 3000, // SPA 대응: 주기적 스캔 (ms)
  INITIAL_SCAN_DELAY: 2000, // 초기 스캔 지연 (React 렌더링 대기)
  MAX_PERIODIC_SCANS: 5, // 최대 주기적 스캔 횟수
};

// State
const processedImages = new Set();
const imageDataMap = new Map(); // imageId -> {element, url, result}
let settings = {};
let periodicScanCount = 0;
let periodicScanInterval = null;

// ============================================
// Initialization
// ============================================
function init() {
  console.log('🚀 Initializing AI Image Detector v1.1.0...');
  console.log('📍 Page URL:', window.location.href);

  // Load settings
  loadSettings();

  // Start observing images (with delay for SPA/React rendering)
  if (CONFIG.AUTO_DETECT) {
    // 초기 스캔 (더 긴 지연 - React/SPA 대응)
    setTimeout(() => {
      console.log('⏰ Starting initial scan...');
      scanExistingImages();
      observeNewImages();
      startPeriodicScan(); // 주기적 스캔 시작
    }, CONFIG.INITIAL_SCAN_DELAY);
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener(handleMessage);

  console.log('✅ AI Image Detector initialized successfully');
}

// ============================================
// Periodic Scan (for SPA like Pinterest, React apps)
// ============================================
function startPeriodicScan() {
  console.log('🔄 Starting periodic scan for dynamic content...');

  periodicScanInterval = setInterval(() => {
    periodicScanCount++;
    console.log(`🔄 Periodic scan #${periodicScanCount}/${CONFIG.MAX_PERIODIC_SCANS}`);

    scanExistingImages();

    // 최대 횟수 도달 시 중지
    if (periodicScanCount >= CONFIG.MAX_PERIODIC_SCANS) {
      console.log('✅ Periodic scan completed (max scans reached)');
      clearInterval(periodicScanInterval);
    }
  }, CONFIG.PERIODIC_SCAN_INTERVAL);
}

// ============================================
// Stop Periodic Scan
// ============================================
function stopPeriodicScan() {
  if (periodicScanInterval) {
    clearInterval(periodicScanInterval);
    periodicScanInterval = null;
    console.log('⏹️ Periodic scan stopped');
  }
}

// ============================================
// Settings Management
// ============================================
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response && response.success) {
      settings = response.settings;
      CONFIG.AUTO_DETECT = settings.autoDetect !== false;
      console.log('Settings loaded:', settings);
    }
  });
}

// ============================================
// Image Scanning
// ============================================
function scanExistingImages() {
  console.log('🔍 Scanning existing images...');

  const images = document.querySelectorAll('img');
  console.log(`📸 Found ${images.length} images on page`);

  let processed = 0;
  images.forEach((img, index) => {
    setTimeout(() => {
      processImage(img).then(() => {
        processed++;
        if (processed % 10 === 0 || processed === images.length) {
          console.log(`⏳ Processed ${processed}/${images.length} images`);
        }
      });
    }, index * 50); // Stagger processing to avoid overwhelming
  });
}

// ============================================
// Observe New Images (Lazy Loading, Dynamic Content)
// ============================================
function observeNewImages() {
  if (!CONFIG.LAZY_LOAD_OBSERVER) return;

  let mutationCount = 0;

  const observer = new MutationObserver((mutations) => {
    mutationCount++;

    if (CONFIG.DEBUG && mutationCount % 100 === 0) {
      console.log(`👀 Observer: ${mutationCount} mutations detected`);
    }

    mutations.forEach((mutation) => {
      // Check added nodes
      mutation.addedNodes.forEach((node) => {
        if (!node.tagName) return;

        if (node.tagName === 'IMG') {
          if (CONFIG.DEBUG) console.log('👁️ New IMG detected via observer');
          processImage(node);
        } else if (node.querySelectorAll) {
          const images = node.querySelectorAll('img');
          if (images.length > 0) {
            if (CONFIG.DEBUG) console.log(`👁️ ${images.length} new images in added node`);
            images.forEach((img) => processImage(img));
          }
        }
      });

      // Check attribute changes (for lazy-loaded images)
      if (mutation.type === 'attributes' && mutation.target.tagName === 'IMG') {
        const img = mutation.target;
        if (mutation.attributeName === 'src' || mutation.attributeName === 'data-src') {
          if (CONFIG.DEBUG) console.log('👁️ Image src changed via observer');
          processImage(img);
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true, // 속성 변경도 감지 (lazy loading)
    attributeFilter: ['src', 'data-src', 'srcset'], // 이미지 관련 속성만
  });

  console.log('👁️ Image observer started (watching DOM mutations)');
}

// ============================================
// Process Single Image
// ============================================
async function processImage(img) {
  try {
    // Basic validation
    if (!img || !img.tagName || img.tagName !== 'IMG') {
      if (CONFIG.DEBUG) console.log('[Skip] Not an IMG element');
      return;
    }

    // Get unique identifier (with better error handling)
    let imageId;
    try {
      imageId = HashUtils.getImageIdentifier(img);
    } catch (error) {
      console.error('[Error] Failed to generate image ID:', error);
      // Use fallback ID
      imageId = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Skip if already processed
    if (processedImages.has(imageId)) {
      if (CONFIG.DEBUG) console.log('[Skip] Already processed:', imageId);
      return;
    }

    // Wait for image to load
    if (!ImageUtils.isImageLoaded(img)) {
      if (CONFIG.DEBUG) console.log('[Wait] Loading image...');
      try {
        await ImageUtils.waitForImageLoad(img);
      } catch (error) {
        if (CONFIG.DEBUG) console.log('[Skip] Image failed to load:', error.message);
        return;
      }
    }

    // Check if image is large enough
    if (!ImageUtils.isImageLargeEnough(img, CONFIG.MIN_IMAGE_SIZE)) {
      if (CONFIG.DEBUG) {
        console.log(`[Skip] Image too small: ${img.width}x${img.height} (min: ${CONFIG.MIN_IMAGE_SIZE})`);
      }
      return;
    }

    // Get image URL
    const imageUrl = ImageUtils.getImageUrl(img);
    if (!imageUrl) {
      if (CONFIG.DEBUG) console.log('[Skip] No image URL found');
      return;
    }

    // Skip data URLs (base64 images)
    if (imageUrl.startsWith('data:')) {
      if (CONFIG.DEBUG) console.log('[Skip] Data URL (base64 image)');
      return;
    }

    // Validate URL format (more lenient)
    const hasValidExtension = ImageUtils.isValidImageUrl(imageUrl);
    const isHttpUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('//');

    if (!hasValidExtension && !isHttpUrl) {
      if (CONFIG.DEBUG) console.log('[Skip] Invalid URL:', imageUrl.substring(0, 100));
      return;
    }

    // Mark as processed BEFORE sending to prevent duplicates
    processedImages.add(imageId);

    // Store image data
    imageDataMap.set(imageId, {
      element: img,
      url: imageUrl,
      result: null,
    });

    console.log(`✅ [Process] Image detected: ${img.width}x${img.height}`, imageUrl.substring(0, 60));

    // Add loading indicator
    try {
      addLoadingBadge(img, imageId);
    } catch (error) {
      console.error('[Error] Failed to add loading badge:', error);
    }

    // Send to background for analysis
    try {
      chrome.runtime.sendMessage(
        {
          action: 'analyzeImage',
          imageUrl: imageUrl,
          imageId: imageId,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Error] Runtime error:', chrome.runtime.lastError.message);
            removeBadge(imageId);
            return;
          }

          if (response && response.success) {
            console.log('✅ [Result] Image analyzed:', imageId);
          } else {
            console.error('[Error] Analysis failed:', response?.error);
            removeBadge(imageId);
          }
        }
      );
    } catch (error) {
      console.error('[Error] Failed to send message:', error);
      removeBadge(imageId);
    }

  } catch (error) {
    console.error('[Error] processImage failed:', error);
  }
}

// ============================================
// Message Handler (from Background)
// ============================================
function handleMessage(request, sender, sendResponse) {
  if (request.action === 'analysisResult') {
    const { imageId, result } = request;
    console.log('Received analysis result:', imageId, result);

    // Update stored data
    const imageData = imageDataMap.get(imageId);
    if (imageData) {
      imageData.result = result;
    }

    // Remove loading badge and show result
    removeBadge(imageId);
    showResultBadge(imageId, result);

    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'rescan') {
    console.log('🔄 Manual rescan requested');

    // Reset periodic scan counter
    periodicScanCount = 0;
    stopPeriodicScan();

    // Scan immediately
    scanExistingImages();

    // Restart periodic scan
    startPeriodicScan();

    sendResponse({ success: true });
    return true;
  }

  return false;
}

// ============================================
// Badge Management
// ============================================
function addLoadingBadge(img, imageId) {
  // Make image container position: relative if needed
  const container = getOrCreateImageContainer(img);

  const badge = document.createElement('div');
  badge.className = 'ai-detector-badge ai-detector-loading';
  badge.dataset.imageId = imageId;
  badge.innerHTML = `
    <div class="ai-detector-spinner"></div>
    <span>분석 중...</span>
  `;

  container.appendChild(badge);
}

function showResultBadge(imageId, result) {
  const imageData = imageDataMap.get(imageId);
  if (!imageData) return;

  const img = imageData.element;
  const container = getOrCreateImageContainer(img);

  // Check confidence threshold
  if (result.confidence < (settings.confidenceThreshold || 0.7)) {
    console.log('Confidence too low, not showing badge');
    return;
  }

  const badge = document.createElement('div');
  badge.className = 'ai-detector-badge';
  badge.dataset.imageId = imageId;

  if (result.ai_generated) {
    badge.classList.add('ai-detector-ai');
    badge.innerHTML = `
      <div class="ai-detector-icon">🤖</div>
      <div class="ai-detector-content">
        <div class="ai-detector-label">AI Generated</div>
        <div class="ai-detector-confidence">${Math.round(result.confidence * 100)}%</div>
        ${result.model_hint ? `<div class="ai-detector-model">${result.model_hint}</div>` : ''}
      </div>
    `;
  } else {
    badge.classList.add('ai-detector-real');
    badge.innerHTML = `
      <div class="ai-detector-icon">✓</div>
      <div class="ai-detector-content">
        <div class="ai-detector-label">Real Image</div>
        <div class="ai-detector-confidence">${Math.round(result.confidence * 100)}%</div>
      </div>
    `;
  }

  // Add click handler for details
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    showDetailPopup(imageId);
  });

  container.appendChild(badge);
}

function removeBadge(imageId) {
  const badges = document.querySelectorAll(`[data-image-id="${imageId}"]`);
  badges.forEach((badge) => badge.remove());
}

// ============================================
// Image Container Helper
// ============================================
function getOrCreateImageContainer(img) {
  // Check if image already has a wrapper
  let container = img.closest('.ai-detector-container');

  if (!container) {
    // Create wrapper
    container = document.createElement('div');
    container.className = 'ai-detector-container';
    container.style.position = 'relative';
    container.style.display = 'inline-block';

    // Wrap image
    img.parentNode.insertBefore(container, img);
    container.appendChild(img);
  }

  return container;
}

// ============================================
// Detail Popup
// ============================================
function showDetailPopup(imageId) {
  const imageData = imageDataMap.get(imageId);
  if (!imageData || !imageData.result) return;

  const result = imageData.result;

  const popup = document.createElement('div');
  popup.className = 'ai-detector-popup';
  popup.innerHTML = `
    <div class="ai-detector-popup-content">
      <div class="ai-detector-popup-header">
        <h3>AI 이미지 분석 결과</h3>
        <button class="ai-detector-popup-close">×</button>
      </div>
      <div class="ai-detector-popup-body">
        <div class="ai-detector-popup-row">
          <span class="label">판정:</span>
          <span class="value ${result.ai_generated ? 'ai' : 'real'}">
            ${result.ai_generated ? 'AI 생성 이미지' : '실제 이미지'}
          </span>
        </div>
        <div class="ai-detector-popup-row">
          <span class="label">신뢰도:</span>
          <span class="value">${Math.round(result.confidence * 100)}%</span>
        </div>
        ${
          result.model_hint
            ? `
        <div class="ai-detector-popup-row">
          <span class="label">예상 모델:</span>
          <span class="value">${result.model_hint}</span>
        </div>
        `
            : ''
        }
        <div class="ai-detector-popup-row">
          <span class="label">압축 견고성:</span>
          <span class="value">${result.robustness?.compressed ? '✓' : '✗'}</span>
        </div>
        <div class="ai-detector-popup-row">
          <span class="label">크기 변환 견고성:</span>
          <span class="value">${result.robustness?.resized ? '✓' : '✗'}</span>
        </div>
      </div>
    </div>
  `;

  // Close handler
  popup.querySelector('.ai-detector-popup-close').addEventListener('click', () => {
    popup.remove();
  });

  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });

  document.body.appendChild(popup);
}

// ============================================
// Start
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
