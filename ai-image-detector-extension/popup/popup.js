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
  confidenceThreshold: 0.0, // show all by default
  apiEndpoint: 'http://localhost:8000/predict',
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');
  initElements();
  loadSettings();
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

      if (result.autoDetect !== undefined) {
        settings.autoDetect = result.autoDetect;
      }
      if (result.confidenceThreshold !== undefined) {
        settings.confidenceThreshold = result.confidenceThreshold;
      }
      if (result.apiEndpoint !== undefined) {
        settings.apiEndpoint = result.apiEndpoint;
      }

      updateUI();
    }
  );
}

// ============================================
// Update UI with Current Settings
// ============================================
function updateUI() {
  if (elements.autoDetect) {
    elements.autoDetect.checked = settings.autoDetect;
  }

  if (elements.confidenceThreshold) {
    elements.confidenceThreshold.value = settings.confidenceThreshold * 100;
    elements.thresholdValue.textContent = Math.round(
      settings.confidenceThreshold * 100
    );
  }

  if (elements.apiEndpoint) {
    elements.apiEndpoint.value = settings.apiEndpoint;
  }

  updateStatusIndicator();
}

// ============================================
// Update Status Indicator
// ============================================
function updateStatusIndicator() {
  const statusDot = elements.statusIndicator?.querySelector('.status-dot');
  const statusText = elements.statusIndicator?.querySelector('.status-text');

  if (!statusDot || !statusText) return;

  if (settings.autoDetect) {
    statusDot.classList.add('active');
    statusText.textContent = '자동 실행';
  } else {
    statusDot.classList.remove('active');
    statusText.textContent = '비활성화됨';
  }
}

// ============================================
// Setup Event Listeners
// ============================================
function setupEventListeners() {
  elements.autoDetect?.addEventListener('change', (e) => {
    settings.autoDetect = e.target.checked;
    saveSettings();
    updateStatusIndicator();
    showNotification(
      '자동 검사 ' + (e.target.checked ? '활성화' : '비활성화')
    );
  });

  elements.confidenceThreshold?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value, 10);
    elements.thresholdValue.textContent = value;
    settings.confidenceThreshold = value / 100;
  });

  elements.confidenceThreshold?.addEventListener('change', (e) => {
    saveSettings();
    showNotification(`신뢰도 임계값이 ${e.target.value}%로 설정되었습니다`);
  });

  elements.apiEndpoint?.addEventListener('change', (e) => {
    settings.apiEndpoint = e.target.value;
    saveSettings();
    showNotification('API 엔드포인트가 업데이트되었습니다');
  });

  elements.scanCurrentPage?.addEventListener('click', () => {
    scanCurrentPage();
  });

  elements.clearCache?.addEventListener('click', () => {
    clearCache();
  });

  elements.helpLink?.addEventListener('click', (e) => {
    e.preventDefault();
    showHelp();
  });

  elements.aboutLink?.addEventListener('click', (e) => {
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

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'rescan' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            showNotification('페이지에 메시지를 보낼 수 없습니다', 'error');
          } else {
            showNotification('이미지 재검사가 시작되었습니다');

            elements.scanCurrentPage.disabled = true;
            elements.scanCurrentPage.innerHTML =
              '<span class="btn-icon">⏳</span><span>스캔 중...</span>';

            setTimeout(() => {
              elements.scanCurrentPage.disabled = false;
              elements.scanCurrentPage.innerHTML =
                '<span class="btn-icon">🔍</span><span>다시 스캔</span>';
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

  chrome.runtime.sendMessage({ action: 'clearCache' }, (response) => {
    if (response && response.success) {
      showNotification('캐시가 삭제되었습니다');
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
   - 페이지 로드 시 자동으로 이미지를 분석합니다.
   - 결과가 이미지 위에 배지로 표시됩니다.

2. 수동 검사 모드
   - 이미지 우클릭 후 "AI 성능 검사"를 선택합니다.

3. 설정
   - 신뢰도 임계값 슬라이더로 배지 표시 최소 신뢰도를 설정합니다.
   - API 엔드포인트는 필요 시 변경하세요.
`.trim();

  alert(helpText);
}

// ============================================
// Show About Dialog
// ============================================
function showAbout() {
  const aboutText = `
AI Image Detector v1.0.0

이미지가 AI 생성인지 판단하는 Chrome 확장입니다.

© 2024 All rights reserved.
`.trim();

  alert(aboutText);
}

// ============================================
// Show Notification (Toast-like)
// ============================================
function showNotification(message, type = 'success') {
  console.log(`[${type}] ${message}`);

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================
// Listen for storage changes (no-op for now)
// ============================================
chrome.storage.onChanged.addListener(() => {});

console.log('Popup script initialized');
