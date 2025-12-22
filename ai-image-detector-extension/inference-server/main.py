"""
AI Image Detector - Inference Server (Demo Version)
FastAPI-based inference server for Chrome Extension

This is a DEMO server using a dummy model for testing.
Replace DummyModel with actual trained model when ready.
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
import io
import time
import hashlib
import json
from typing import Optional
import uvicorn

from models.clip_finetuned import ClipFinetunedModel

# ============================================
# FastAPI App Initialization
# ============================================

app = FastAPI(
    title="AI Image Detector API",
    description="Demo inference server for detecting AI-generated images",
    version="1.0.0",
)

# CORS middleware (allow Chrome Extension)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Model Loading
# ============================================

print("Loading model...")
MODEL_PATH = "models/finetuned_clip7.pth"
model = ClipFinetunedModel(MODEL_PATH)
print("Model loaded successfully!")

# ============================================
# API Endpoints
# ============================================


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "model": "DummyModel (Demo)",
        "version": "1.0.0",
        "message": "AI Image Detector API is running",
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "timestamp": time.time(),
    }


@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    meta: Optional[str] = Form(None),
):
    """
    Predict if an image is AI-generated

    Args:
        image: Image file (jpg, png, webp)
        meta: Optional metadata JSON string

    Returns:
        {
            "ai_generated": bool,
            "confidence": float (0-1),
            "model_hint": str or null,
            "robustness": {
                "compressed": bool,
                "resized": bool
            },
            "processing_time": float,
            "image_info": {
                "size": [width, height],
                "format": str,
                "mode": str
            }
        }
    """
    start_time = time.time()

    try:
        # Parse metadata if provided
        metadata = {}
        if meta:
            try:
                metadata = json.loads(meta)
            except json.JSONDecodeError:
                pass

        # Read image
        image_bytes = await image.read()
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except UnidentifiedImageError:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Invalid image file",
                    "message": "Cannot identify image data",
                },
            )

        # Get image info
        image_info = {
            "size": list(img.size),
            "format": img.format or "Unknown",
            "mode": img.mode,
        }

        # Run inference
        result = model.predict(img, metadata)

        # Add processing time
        processing_time = time.time() - start_time
        result["processing_time"] = round(processing_time, 4)
        result["image_info"] = image_info

        # Log request
        print(f"[PREDICT] {image.filename} -> AI={result['ai_generated']} "
              f"({result['confidence']:.2f}) in {processing_time:.2f}s")

        return JSONResponse(content=result)

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Inference failed",
                "message": str(e),
            },
        )


@app.post("/batch_predict")
async def batch_predict(images: list[UploadFile] = File(...)):
    """
    Batch prediction for multiple images

    Args:
        images: List of image files

    Returns:
        {
            "results": [
                {
                    "filename": str,
                    "ai_generated": bool,
                    "confidence": float,
                    ...
                },
                ...
            ],
            "total_time": float,
            "count": int
        }
    """
    start_time = time.time()
    results = []

    for img_file in images:
        try:
            # Read image
            image_bytes = await img_file.read()
            img = Image.open(io.BytesIO(image_bytes))

            # Run inference
            result = model.predict(img)
            result["filename"] = img_file.filename

            results.append(result)

        except Exception as e:
            results.append({
                "filename": img_file.filename,
                "error": str(e),
            })

    total_time = time.time() - start_time

    return JSONResponse(content={
        "results": results,
        "total_time": round(total_time, 4),
        "count": len(results),
    })


@app.get("/stats")
async def stats():
    """Get model statistics"""
    return model.get_stats()


# ============================================
# Main Entry Point
# ============================================

if __name__ == "__main__":
    print("=" * 50)
    print("AI Image Detector - Inference Server (Demo)")
    print("=" * 50)
    print(f"Model: {model.__class__.__name__}")
    print(f"Server: http://localhost:8000")
    print(f"API Docs: http://localhost:8000/docs")
    print("=" * 50)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Avoid double-loading heavy model
        log_level="info",
    )
