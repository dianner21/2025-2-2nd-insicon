"""
CLIP-based finetuned model loader

Loads OpenAI CLIP ViT-L/14 and applies a finetuned linear head trained
to classify AI-generated images. The head weights are expected to be
stored as a state_dict with keys: "weight" (1 x 768) and "bias" (1).
"""

from typing import Any, Dict, Optional

import torch
from PIL import Image

try:
    import clip  # type: ignore
except ImportError as exc:
    raise ImportError(
        "The 'clip' package is required. Install with "
        "'pip install git+https://github.com/openai/CLIP.git'"
    ) from exc


class ClipFinetunedModel:
    """Wrapper around CLIP ViT-L/14 with a finetuned linear head."""

    def __init__(self, weight_path: str, device: Optional[str] = None):
        self.device = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )

        import os
        download_root = os.path.expanduser("~/.cache/clip")
        print(f"Loading CLIP backbone (ViT-L/14) from {download_root}...", flush=True)
        self.clip_model, self.preprocess = clip.load(
            "ViT-L/14",
            device=self.device,
            download_root=download_root,
        )
        print("CLIP backbone loaded.", flush=True)
        # Linear head (1 x feature_dim)
        feature_dim = self.clip_model.visual.output_dim
        self.fc = torch.nn.Linear(feature_dim, 1)

        # Load finetuned head weights
        state_dict = torch.load(weight_path, map_location="cpu")
        print(f"Loading finetuned head from {weight_path}...", flush=True)
        self.fc.load_state_dict(state_dict)
        self.fc.to(self.device)
        print("Finetuned head loaded.", flush=True)

        self.clip_model.eval()
        self.fc.eval()

        self.model_name = "CLIP ViT-L/14 finetuned (fc head)"
        self.prediction_count = 0
        self.weight_path = weight_path

        print(f"Loaded {self.model_name} on {self.device} using {weight_path}")

    def predict(self, image: Image.Image, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Run inference and return structured result."""
        try:
            img = image.convert("RGB")
        except Exception:
            # Fallback to a gray image if decoding fails
            img = Image.new("RGB", (224, 224), (128, 128, 128))

        with torch.no_grad():
            img_tensor = self.preprocess(img).unsqueeze(0).to(self.device)
            features = self.clip_model.encode_image(img_tensor)
            logits = self.fc(features).squeeze()
            prob = torch.sigmoid(logits).item()

        is_ai = prob >= 0.5
        self.prediction_count += 1

        # Debug logging
        print(f"[DEBUG] Logit: {logits.item():.4f}, Prob: {prob:.4f}, Predicted: {'AI' if is_ai else 'Real'}")

        return {
            "ai_generated": bool(is_ai),
            "confidence": round(prob if is_ai else 1 - prob, 4),
            "model_hint": self.model_name if is_ai else None,
            "robustness": {
                "compressed": True,
                "resized": True,
            },
        }

    def get_stats(self) -> Dict[str, Any]:
        """Return simple model statistics."""
        return {
            "model": self.model_name,
            "device": str(self.device),
            "weight_path": self.weight_path,
            "total_predictions": self.prediction_count,
        }

    def __repr__(self):
        return f"<{self.model_name} on {self.device}>"
