// ============================================
// Popup Script
// Role: Extension popup UI & settings management
// ============================================

console.log('Popup script loaded');

// DOM Elements
let elements = {};

// Settings
let settings = {
  autoDetect: true,
  confidenceThreshold: 0.7,
  apiEndpoint: 'http://localhost:8000/predict',
};

// Statistics
let stats = {
  totalAnalyzed: 0,
  aiDetected: 0,
  realDetected: 0,
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');
  initElements();
  loadSettings();
  loadStatistics();
  setupEventListeners();
});

// ============================================
// Initialize DOM Elements
// ============================================
function initElements() {
  elements = {
    autoDetect: document.getElementById('autoDetect'),
    confidenceThreshold: document.getElementById('confidenceThreshold'),
    thresholdValue: document.getElementById('thresholdValue'),
    apiEndpoint: document.getElementById('apiEndpoint'),
    statusIndicator: document.getElementById('statusIndicator'),
    totalAnalyzed: document.getElementById('totalAnalyzed'),
    aiDetected: document.getElementById('aiDetected'),
    realDetected: document.getElementById('realDetected'),
    scanCurrentPage: document.getElementById('scanCurrentPage'),
    clearCache: document.getElementById('clearCache'),
    helpLink: document.getElementById('helpLink'),
    aboutLink: document.getElementById('aboutLink'),
  };
}

// ============================================
// Load Settings from Storage
// ============================================
function loadSettings() {
  chrome.storage.local.get(
    ['autoDetect', 'confidenceThreshold', 'apiEndpoint'],
    (result) => {
      console.log('Settings loaded:', result);

      // Update settings object
      if (result.autoDetect !== undefined) {
        settings.autoDetect = result.autoDetect;
      }
      if (result.confidenceThreshold !== undefined) {
        settings.confidenceThreshold = result.confidenceThreshold;
      }
      if (result.apiEndpoint !== undefined) {
        settings.apiEndpoint = result.apiEndpoint;
      }

      // Update UI
      updateUI();
    }
  );
}

// ============================================
// Load Statistics from Storage
// ============================================
function loadStatistics() {
  chrome.storage.local.get(['stats'], (result) => {
    if (result.stats) {
      stats = result.stats;
      updateStatistics();
    }
  });
}

// ============================================
// Update UI with Current Settings
// ============================================
function updateUI() {
  // Auto detect toggle
  if (elements.autoDetect) {
    elements.autoDetect.checked = settings.autoDetect;
  }

  // Confidence threshold slider
  if (elements.confidenceThreshold) {
    elements.confidenceThreshold.value = settings.confidenceThreshold * 100;
    elements.thresholdValue.textContent = Math.round(
      settings.confidenceThreshold * 100
    );
  }

  // API endpoint
  if (elements.apiEndpoint) {
    elements.apiEndpoint.value = settings.apiEndpoint;
  }

  // Status indicator
  updateStatusIndicator();
}

// ============================================
// Update Status Indicator
// ============================================
function updateStatusIndicator() {
  const statusDot = elements.statusIndicator.querySelector('.status-dot');
  const statusText = elements.statusIndicator.querySelector('.status-text');

  if (settings.autoDetect) {
    statusDot.classList.add('active');
    statusText.textContent = '활성화됨';
  } else {
    statusDot.classList.remove('active');
    statusText.textContent = '비활성화됨';
  }
}

// ============================================
// Update Statistics Display
// ============================================
function updateStatistics() {
  elements.totalAnalyzed.textContent = stats.totalAnalyzed || 0;
  elements.aiDetected.textContent = stats.aiDetected || 0;
  elements.realDetected.textContent = stats.realDetected || 0;
}

// ============================================
// Setup Event Listeners
// ============================================
function setupEventListeners() {
  // Auto detect toggle
  elements.autoDetect.addEventListener('change', (e) => {
    settings.autoDetect = e.target.checked;
    saveSettings();
    updateStatusIndicator();
    showNotification('자동 검사가 ' + (e.target.checked ? '활성화' : '비활성화') + '되었습니다');
  });

  // Confidence threshold slider
  elements.confidenceThreshold.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    elements.thresholdValue.textContent = value;
    settings.confidenceThreshold = value / 100;
  });

  elements.confidenceThreshold.addEventListener('change', (e) => {
    saveSettings();
    showNotification(`신뢰도 임계값이 ${e.target.value}%로 설정되었습니다`);
  });

  // API endpoint
  elements.apiEndpoint.addEventListener('change', (e) => {
    settings.apiEndpoint = e.target.value;
    saveSettings();
    showNotification('API 엔드포인트가 업데이트되었습니다');
  });

  // Scan current page button
  elements.scanCurrentPage.addEventListener('click', () => {
    scanCurrentPage();
  });

  // Clear cache button
  elements.clearCache.addEventListener('click', () => {
    clearCache();
  });

  // Help link
  elements.helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    showHelp();
  });

  // About link
  elements.aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    showAbout();
  });
}

// ============================================
// Save Settings to Storage
// ============================================
function saveSettings() {
  chrome.storage.local.set(settings, () => {
    console.log('Settings saved:', settings);
  });
}

// ============================================
// Scan Current Page
// ============================================
function scanCurrentPage() {
  console.log('Scanning current page...');

  // Get current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      // Send message to content script to rescan
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'rescan' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            showNotification('페이지 스캔 실패: 페이지를 새로고침해주세요', 'error');
          } else {
            showNotification('페이지 스캔을 시작했습니다');

            // Update button state
            elements.scanCurrentPage.disabled = true;
            elements.scanCurrentPage.innerHTML = '<span class="btn-icon">⏳</span><span>스캔 중...</span>';

            setTimeout(() => {
              elements.scanCurrentPage.disabled = false;
              elements.scanCurrentPage.innerHTML = '<span class="btn-icon">🔍</span><span>현재 페이지 스캔</span>';
            }, 2000);
          }
        }
      );
    }
  });
}

// ============================================
// Clear Cache
// ============================================
function clearCache() {
  console.log('Clearing cache...');

  // Send message to background to clear cache
  chrome.runtime.sendMessage({ action: 'clearCache' }, (response) => {
    if (response && response.success) {
      showNotification('캐시가 삭제되었습니다');

      // Reset statistics
      stats = {
        totalAnalyzed: 0,
        aiDetected: 0,
        realDetected: 0,
      };
      chrome.storage.local.set({ stats }, () => {
        updateStatistics();
      });
    } else {
      showNotification('캐시 삭제 실패', 'error');
    }
  });
}

// ============================================
// Show Help Dialog
// ============================================
function showHelp() {
  const helpText = `
AI Image Detector 사용 방법:

1. 자동 검사 모드
   - 페이지 로드 시 자동으로 이미지를 분석합니다
   - 결과는 이미지 위에 배지로 표시됩니다

2. 수동 검사 모드
   - 이미지에 우클릭 → "AI 생성 여부 검사" 선택

3. 설정
   - 신뢰도 임계값: 배지를 표시할 최소 신뢰도
   - API 엔드포인트: 추론 서버 주소

문의사항이 있으시면 GitHub 이슈를 등록해주세요.
  `.trim();

  alert(helpText);
}

// ============================================
// Show About Dialog
// ============================================
function showAbout() {
  const aboutText = `
AI Image Detector v1.0.0

웹 페이지의 이미지가 AI로 생성되었는지
자동으로 판별하는 Chrome 확장 프로그램입니다.

개발: INSIGHT 14th
기술: Chrome Extension v3, AI Detection API

© 2024 All rights reserved.
  `.trim();

  alert(aboutText);
}

// ============================================
// Show Notification (Toast-like)
// ============================================
function showNotification(message, type = 'success') {
  console.log(`[${type}] ${message}`);

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// ============================================
// Listen for Statistics Updates
// ============================================
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.stats) {
    stats = changes.stats.newValue;
    updateStatistics();
  }
});

console.log('Popup script initialized');
