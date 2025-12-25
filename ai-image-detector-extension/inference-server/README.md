# AI Image Detector - Inference Server

FastAPI 기반 AI 이미지 판별 추론 서버 (Demo 버전)

## 개요

Chrome Extension과 연동하여 이미지가 AI로 생성되었는지 판별하는 추론 서버입니다.

**현재 상태**: 더미 모델 사용 중 (테스트용)
**향후 계획**: 실제 학습된 모델로 교체 가능

## 주요 기능

- 🚀 **FastAPI**: 빠르고 현대적인 API 프레임워크
- 📊 **자동 API 문서**: Swagger UI 제공
- 🔄 **CORS 지원**: Chrome Extension과 원활한 통신
- 📦 **배치 처리**: 여러 이미지 동시 분석
- 📈 **통계**: 분석 통계 추적
- 🔌 **확장 가능**: 실제 모델로 쉽게 교체 가능

## 파일 구조

```
inference-server/
│
├── main.py                  # FastAPI 메인 서버
├── requirements.txt         # Python 의존성
├── run_server.bat          # Windows 실행 스크립트
├── run_server.sh           # Linux/Mac 실행 스크립트
│
└── models/
    ├── __init__.py
    └── dummy_model.py      # 더미 모델 (테스트용)
```

## 설치 및 실행

### 방법 1: 자동 실행 스크립트 (권장)

#### Windows

```bash
# inference-server 폴더로 이동
cd inference-server

# 서버 실행 (자동으로 venv 생성 및 패키지 설치)
run_server.bat
```

#### Linux/Mac

```bash
# inference-server 폴더로 이동
cd inference-server

# 실행 권한 부여 (최초 1회)
chmod +x run_server.sh

# 서버 실행
./run_server.sh
```

### 방법 2: 수동 설치

```bash
# 1. 가상환경 생성
python -m venv venv

# 2. 가상환경 활성화
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main.py
```

## 서버 접속

서버가 실행되면 다음 주소로 접속할 수 있습니다:

- **API 서버**: http://localhost:8000
- **API 문서 (Swagger)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API 엔드포인트

### 1. Health Check

```http
GET /
GET /health
```

서버 상태 확인

**응답 예시**:
```json
{
  "status": "running",
  "model": "DummyModel (Demo)",
  "version": "1.0.0"
}
```

### 2. 이미지 분석 (단일)

```http
POST /predict
Content-Type: multipart/form-data

image: (file)
meta: (optional JSON string)
```

**요청 예시** (curl):
```bash
curl -X POST "http://localhost:8000/predict" \
  -F "image=@test_image.jpg" \
  -F 'meta={"source":"browser","url":"https://example.com/img.jpg"}'
```

**응답 예시**:
```json
{
  "ai_generated": true,
  "confidence": 0.87,
  "model_hint": "Stable Diffusion XL",
  "robustness": {
    "compressed": true,
    "resized": true
  },
  "processing_time": 0.0234,
  "image_info": {
    "size": [1024, 1024],
    "format": "JPEG",
    "mode": "RGB"
  }
}
```

### 3. 배치 분석 (여러 이미지)

```http
POST /batch_predict
Content-Type: multipart/form-data

images: (multiple files)
```

**요청 예시** (Python):
```python
import requests

files = [
    ('images', open('img1.jpg', 'rb')),
    ('images', open('img2.jpg', 'rb')),
    ('images', open('img3.jpg', 'rb'))
]

response = requests.post(
    'http://localhost:8000/batch_predict',
    files=files
)

print(response.json())
```

**응답 예시**:
```json
{
  "results": [
    {
      "filename": "img1.jpg",
      "ai_generated": true,
      "confidence": 0.91,
      "model_hint": "DALL-E 3",
      ...
    },
    {
      "filename": "img2.jpg",
      "ai_generated": false,
      "confidence": 0.85,
      "model_hint": null,
      ...
    }
  ],
  "total_time": 0.156,
  "count": 2
}
```

### 4. 통계 조회

```http
GET /stats
```

**응답 예시**:
```json
{
  "model": "DummyModel v1.0 (Demo)",
  "total_predictions": 142,
  "ai_detected": 57,
  "real_detected": 85,
  "ai_ratio": 0.40
}
```

## Chrome Extension과 연동

Extension의 API 엔드포인트를 서버 주소로 설정:

1. Extension 아이콘 클릭
2. "고급 설정" 열기
3. API 엔드포인트를 `http://localhost:8000/predict`로 설정
4. 웹 페이지 방문하여 테스트

또는 [background/service_worker.js](../background/service_worker.js)의 CONFIG 수정:

```javascript
const CONFIG = {
  API_ENDPOINT: 'http://localhost:8000/predict',
  // ...
};
```

## 실제 모델로 교체하기

### 준비물

1. 학습된 모델 가중치 (.pt, .pth, .onnx 등)
2. 전처리/후처리 코드

### 단계

#### 1. 모델 파일 준비

```bash
# 모델 가중치를 models/ 폴더에 복사
cp your_model.pt inference-server/models/
```

#### 2. RealModel 클래스 구현

[models/dummy_model.py](models/dummy_model.py)의 `RealModel` 클래스를 수정:

```python
class RealModel:
    def __init__(self, model_path: str):
        import torch

        # 모델 로드
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = torch.load(model_path, map_location=self.device)
        self.model.eval()

        print(f"Loaded model from {model_path} on {self.device}")

    def predict(self, image: Image.Image, metadata=None):
        import torch
        import torchvision.transforms as T

        # 전처리
        transform = T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406],
                       std=[0.229, 0.224, 0.225])
        ])

        img_tensor = transform(image).unsqueeze(0).to(self.device)

        # 추론
        with torch.no_grad():
            output = self.model(img_tensor)
            prob = torch.sigmoid(output).item()

        # 결과 반환
        is_ai = prob > 0.5

        return {
            "ai_generated": bool(is_ai),
            "confidence": round(prob if is_ai else 1-prob, 2),
            "model_hint": self._guess_model(prob) if is_ai else None,
            "robustness": {
                "compressed": True,
                "resized": True
            }
        }

    def _guess_model(self, prob):
        # Optional: 생성 모델 추정 로직
        if prob > 0.95:
            return "High confidence AI"
        return "Unknown AI model"
```

#### 3. main.py에서 모델 변경

[main.py](main.py)에서 모델 로딩 부분 수정:

```python
# Before:
from models.dummy_model import DummyModel
model = DummyModel()

# After:
from models.dummy_model import RealModel
model = RealModel("models/your_model.pt")
```

#### 4. requirements.txt 업데이트

필요한 의존성 추가:

```txt
# Uncomment for real model:
torch==2.1.2
torchvision==0.16.2
numpy==1.26.3
```

#### 5. 재설치 및 테스트

```bash
pip install -r requirements.txt
python main.py
```

## 테스트

### 1. 웹 브라우저 테스트

http://localhost:8000/docs 접속하여 Swagger UI에서 직접 테스트

### 2. curl 테스트

```bash
# Health check
curl http://localhost:8000/health

# Predict
curl -X POST "http://localhost:8000/predict" \
  -F "image=@test.jpg"
```

### 3. Python 테스트

```python
import requests

# Health check
response = requests.get('http://localhost:8000/health')
print(response.json())

# Predict
with open('test.jpg', 'rb') as f:
    files = {'image': f}
    response = requests.post('http://localhost:8000/predict', files=files)
    print(response.json())
```

## 문제 해결

### 포트 충돌

다른 포트로 서버 실행:

```bash
# main.py 수정
uvicorn.run("main:app", host="0.0.0.0", port=8080)

# 또는 커맨드라인에서
uvicorn main:app --port 8080
```

Extension의 API 엔드포인트도 변경해야 합니다.

### CORS 오류

[main.py](main.py)의 CORS 설정 확인:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 특정 origin 지정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 가상환경 활성화 안됨

수동으로 활성화:

```bash
# Windows
venv\Scripts\activate.bat

# Linux/Mac
source venv/bin/activate
```

## 성능 최적화

### GPU 사용

실제 모델 사용 시 GPU 활용:

```python
import torch

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)
```

### 배치 처리

여러 이미지를 한 번에 처리:

```python
# batch_predict 엔드포인트 사용
files = [
    ('images', open('img1.jpg', 'rb')),
    ('images', open('img2.jpg', 'rb')),
    # ...
]
response = requests.post('http://localhost:8000/batch_predict', files=files)
```

### 캐싱

자주 요청되는 이미지는 Extension에서 캐싱됨 (1시간)

## 다음 단계

- [ ] 실제 학습된 모델 통합
- [ ] GPU 가속 설정
- [ ] 프로덕션 배포 (Docker, AWS 등)
- [ ] 로깅 및 모니터링
- [ ] Rate limiting
- [ ] 인증/보안

## 라이선스

© 2024 INSIGHT 14th. All rights reserved.

---

**Made with ❤️ by INSIGHT 14th Team**
