"""
Dummy Model for Demo/Testing
Generates realistic-looking predictions without actual AI inference

Replace this with your actual trained model when ready.
"""

import random
import hashlib
from PIL import Image
from typing import Dict, Any, Optional


class DummyModel:
    """
    Dummy model that generates deterministic but realistic predictions
    based on image characteristics
    """

    def __init__(self):
        """Initialize the dummy model"""
        self.model_name = "DummyModel v1.0 (Demo)"
        self.gen_models = ["DALL-E 3", "Midjourney v6", "Stable Diffusion XL", "Firefly", "Imagen"]
        self.prediction_count = 0
        self.ai_count = 0
        self.real_count = 0

        print(f"Initialized {self.model_name}")

    def predict(self, image: Image.Image, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate a prediction for an image

        Args:
            image: PIL Image object
            metadata: Optional metadata dict

        Returns:
            {
                "ai_generated": bool,
                "confidence": float,
                "model_hint": str or None,
                "robustness": {
                    "compressed": bool,
                    "resized": bool
                }
            }
        """
        # Generate deterministic prediction based on image hash
        img_hash = self._hash_image(image)
        prediction = self._generate_prediction(img_hash, image)

        # Update stats
        self.prediction_count += 1
        if prediction["ai_generated"]:
            self.ai_count += 1
        else:
            self.real_count += 1

        return prediction

    def _hash_image(self, image: Image.Image) -> int:
        """
        Create a deterministic hash from image

        Args:
            image: PIL Image

        Returns:
            Integer hash value
        """
        # Convert image to bytes and hash
        # This ensures same image always gets same prediction
        img_bytes = image.tobytes()
        hash_obj = hashlib.md5(img_bytes)
        hash_int = int(hash_obj.hexdigest(), 16)

        return hash_int

    def _generate_prediction(self, img_hash: int, image: Image.Image) -> Dict[str, Any]:
        """
        Generate realistic prediction based on hash

        Args:
            img_hash: Image hash
            image: PIL Image for size info

        Returns:
            Prediction dictionary
        """
        # Use hash to generate deterministic random prediction
        random.seed(img_hash)

        # Determine if AI-generated (40% chance)
        is_ai = random.random() < 0.4

        if is_ai:
            # AI-generated image
            confidence = random.uniform(0.80, 0.98)  # 더 높은 신뢰도
            model_hint = random.choice(self.gen_models)

            # Check if image characteristics suggest AI
            width, height = image.size

            # Square images are more common in AI generation
            if abs(width - height) < 50:
                confidence = min(0.99, confidence + 0.05)

            # Very large or very small images are less likely AI
            total_pixels = width * height
            if total_pixels < 200 * 200 or total_pixels > 4000 * 4000:
                confidence = max(0.75, confidence - 0.10)  # 최소값 상향

        else:
            # Real image
            confidence = random.uniform(0.75, 0.95)  # 더 높은 신뢰도
            model_hint = None

        # Robustness checks (always true for demo)
        robustness = {
            "compressed": True,
            "resized": True,
        }

        return {
            "ai_generated": is_ai,
            "confidence": round(confidence, 2),
            "model_hint": model_hint,
            "robustness": robustness,
        }

    def get_stats(self) -> Dict[str, Any]:
        """
        Get model statistics

        Returns:
            Statistics dictionary
        """
        return {
            "model": self.model_name,
            "total_predictions": self.prediction_count,
            "ai_detected": self.ai_count,
            "real_detected": self.real_count,
            "ai_ratio": round(self.ai_count / max(1, self.prediction_count), 2),
        }

    def __repr__(self):
        return f"<{self.model_name}>"


# ============================================
# Real Model Template (for future use)
# ============================================

class RealModel:
    """
    Template for integrating actual trained model

    Replace DummyModel with this when model is ready
    """

    def __init__(self, model_path: str):
        """
        Initialize the real model

        Args:
            model_path: Path to model weights (.pt, .pth, .onnx, etc.)
        """
        # TODO: Load actual model
        # Example for PyTorch:
        # import torch
        # self.model = torch.load(model_path)
        # self.model.eval()

        # Example for ONNX:
        # import onnxruntime as ort
        # self.session = ort.InferenceSession(model_path)

        self.model_path = model_path
        self.prediction_count = 0

        print(f"Loaded model from {model_path}")

    def predict(self, image: Image.Image, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Run actual model inference

        Args:
            image: PIL Image
            metadata: Optional metadata

        Returns:
            Prediction dictionary
        """
        # TODO: Implement actual inference
        # 1. Preprocess image
        # preprocessed = self.preprocess(image)

        # 2. Run model
        # output = self.model(preprocessed)

        # 3. Post-process output
        # result = self.postprocess(output)

        # For now, return dummy result
        return {
            "ai_generated": False,
            "confidence": 0.0,
            "model_hint": None,
            "robustness": {
                "compressed": False,
                "resized": False,
            },
        }

    def preprocess(self, image: Image.Image):
        """
        Preprocess image for model input

        Args:
            image: PIL Image

        Returns:
            Preprocessed tensor/array
        """
        # TODO: Implement preprocessing
        # Example:
        # - Resize to 224x224
        # - Normalize with ImageNet stats
        # - Convert to tensor
        # - Add batch dimension
        pass

    def postprocess(self, output):
        """
        Post-process model output

        Args:
            output: Raw model output

        Returns:
            Formatted prediction dictionary
        """
        # TODO: Implement postprocessing
        # Example:
        # - Apply sigmoid/softmax
        # - Extract confidence
        # - Determine model hint
        pass

    def get_stats(self) -> Dict[str, Any]:
        """Get model statistics"""
        return {
            "model": "RealModel",
            "model_path": self.model_path,
            "total_predictions": self.prediction_count,
        }
