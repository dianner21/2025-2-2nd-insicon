# AI Image Detector - Chrome Extension

Chrome Extension v3 기반 AI 생성 이미지 자동 판별 확장 프로그램

## 개요

웹 페이지를 서핑하는 동안 자동으로 이미지가 AI로 생성되었는지 판별하고, 시각적 배지를 통해 사용자에게 알려주는 Chrome Extension입니다.

### 주요 기능

- 🤖 **자동 이미지 분석**: 페이지 로드 시 자동으로 모든 이미지 검사
- 🔍 **수동 검사**: 우클릭 메뉴를 통한 개별 이미지 검사
- 🎯 **시각적 배지**: 이미지 위에 AI 생성 여부를 배지로 표시
- 📊 **상세 정보**: 신뢰도, 예상 생성 모델, 견고성 정보 제공
- ⚙️ **커스터마이징 가능**: 자동 검사 ON/OFF, 신뢰도 임계값 조정
- 💾 **캐싱 시스템**: 중복 검사 방지 및 API 비용 절감

## 시스템 아키텍처

```
[ Web Page ]
     ↓
[ Content Script ]
  - 이미지 감지
  - 사용자 이벤트
     ↓
[ Background Service Worker ]
  - 이미지 수집
  - 서버 통신
     ↓
[ Inference API Server ]
  - AI image detector model
     ↓
[ 결과(JSON) ]
     ↓
[ Overlay UI / Badge 표시 ]
```

## 파일 구조

```
ai-image-detector-extension/
│
├── manifest.json              # Extension 설정 파일 (v3)
│
├── content/
│   ├── content.js            # 페이지 내 실행 스크립트
│   └── overlay.css           # 배지 및 UI 스타일
│
├── background/
│   └── service_worker.js     # Background 처리 및 API 통신
│
├── popup/
│   ├── popup.html            # Extension 팝업 UI
│   ├── popup.js              # 팝업 로직
│   └── popup.css             # 팝업 스타일
│
├── utils/
│   ├── image_utils.js        # 이미지 처리 유틸리티
│   └── hash_utils.js         # Perceptual hashing
│
└── assets/
    └── icons/                # Extension 아이콘 (16, 48, 128px)
```

## 설치 방법

### 1. 프로젝트 준비

```bash
# 이 프로젝트 폴더 확인
cd ai-image-detector-extension
```

### 2. 아이콘 이미지 추가

`assets/icons/` 폴더에 다음 이미지를 추가해야 합니다:
- `icon16.png` (16x16px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

> **Note**: 아이콘이 없는 경우, manifest.json에서 icons 섹션을 임시로 주석 처리할 수 있습니다.

### 3. Chrome에 Extension 로드

1. Chrome 브라우저를 열고 `chrome://extensions/` 접속
2. 우측 상단의 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `ai-image-detector-extension` 폴더 선택

### 4. Inference API 서버 설정

Extension이 작동하려면 AI 모델 추론 서버가 필요합니다.

#### API 명세

**Endpoint**: `POST /predict`

**Request** (multipart/form-data):
```
image: (image file - jpg/png/webp)
meta: {
  "source": "browser",
  "url": "https://example.com/image.jpg"
}
```

**Response** (JSON):
```json
{
  "ai_generated": true,
  "confidence": 0.91,
  "model_hint": "SDXL",
  "robustness": {
    "compressed": true,
    "resized": true
  }
}
```

#### 현재 상태

- 현재는 **더미 응답**을 사용합니다 ([background/service_worker.js:161](background/service_worker.js#L161))
- 실제 API 서버 구현 시 `sendToInferenceAPI` 함수의 주석 처리된 코드를 활성화하세요

## 사용 방법

### 자동 검사 모드

1. Extension을 설치하면 기본적으로 자동 검사가 활성화됩니다
2. 웹 페이지를 방문하면 자동으로 이미지를 분석합니다
3. 분석 결과가 이미지 위에 배지로 표시됩니다:
   - 🤖 **빨간색 배지**: AI 생성 이미지
   - ✓ **초록색 배지**: 실제 이미지

### 수동 검사 모드

1. 이미지에 **우클릭**
2. "AI 생성 여부 검사" 메뉴 선택
3. 분석 결과 대기

### 상세 정보 보기

- 배지를 **클릭**하면 상세 정보 팝업이 표시됩니다
- 신뢰도, 예상 생성 모델, 견고성 정보를 확인할 수 있습니다

### 설정 변경

1. Extension 아이콘 클릭
2. 팝업에서 설정 조정:
   - **자동 검사**: ON/OFF 토글
   - **신뢰도 임계값**: 배지를 표시할 최소 신뢰도 (50-95%)
   - **API 엔드포인트**: 추론 서버 URL (고급 설정)

## 주요 기능 설명

### 1. Perceptual Hashing

- 이미지의 시각적 유사도를 해시값으로 변환
- 중복 이미지 검사 및 캐싱에 활용
- Average Hash (aHash) 및 Difference Hash (dHash) 지원

### 2. Lazy Load 이미지 대응

- MutationObserver를 사용하여 동적으로 로드되는 이미지 감지
- 스크롤 시 나타나는 이미지도 자동으로 분석

### 3. CORS 우회

- Background Service Worker를 통해 이미지 fetch
- Cross-Origin 이미지도 분석 가능

### 4. Rate Limiting

- API 호출 간격 제어 (기본 500ms)
- 서버 부하 방지 및 비용 절감

### 5. 캐싱

- 분석 결과를 1시간 동안 캐싱
- 동일 이미지 재분석 방지

## 개발자 가이드

### 디버깅

1. Content Script 디버깅:
   - 웹 페이지에서 F12 → Console 탭
   - "AI Image Detector" 관련 로그 확인

2. Background Script 디버깅:
   - `chrome://extensions/` → "Service Worker" 링크 클릭
   - DevTools에서 로그 확인

3. Popup 디버깅:
   - Popup 열린 상태에서 우클릭 → "검사"

### API 서버 연동

[background/service_worker.js:161](background/service_worker.js#L161)에서 다음 수정:

```javascript
// 더미 응답 제거
// const dummyResult = generateDummyResponse(imageUrl);
// await sleep(800);
// return dummyResult;

// 실제 API 호출 활성화
const formData = new FormData();
formData.append('image', imageBlob);
formData.append('meta', JSON.stringify({
  source: 'browser',
  url: imageUrl
}));

const response = await fetch(CONFIG.API_ENDPOINT, {
  method: 'POST',
  body: formData,
});

if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}

const result = await response.json();
return result;
```

### 설정 커스터마이징

[background/service_worker.js:10](background/service_worker.js#L10)에서 CONFIG 수정:

```javascript
const CONFIG = {
  API_ENDPOINT: 'http://your-server.com/predict',  // API URL
  CACHE_DURATION: 1000 * 60 * 60,                   // 캐시 유지 시간
  RATE_LIMIT_DELAY: 500,                            // API 호출 간격
};
```

## 제한사항

1. **모델 없음**: Extension 자체에는 AI 판별 모델이 포함되어 있지 않습니다. 별도의 추론 서버가 필요합니다.

2. **CORS 이슈**: 일부 웹사이트의 이미지는 CORS 정책으로 인해 분석이 제한될 수 있습니다.

3. **성능**: 이미지가 많은 페이지에서는 분석 시간이 소요될 수 있습니다.

4. **정확도**: AI 판별 정확도는 백엔드 모델의 성능에 의존합니다.

## 향후 개발 계획

- [ ] 통계 기능 구현 (분석된 이미지 수, AI 비율 등)
- [ ] 배치 분석 최적화
- [ ] WebP, AVIF 등 추가 이미지 포맷 지원
- [ ] 사용자 피드백 기능 (False Positive 신고)
- [ ] 다국어 지원
- [ ] Dark Mode 지원

## 라이선스

© 2024 INSIGHT 14th. All rights reserved.

## 문의

이슈 및 문의사항은 GitHub Issues를 통해 등록해주세요.

---

**Made with ❤️ by INSIGHT 14th Team**
