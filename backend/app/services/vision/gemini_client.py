import json
import logging
import os
from typing import Dict, Optional

import requests

from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.services.roi.types import ROI
from app.services.vision.client import BaseVisionClient

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiVisionClient(BaseVisionClient):
    def __init__(self):
        self._api_key: Optional[str] = None
        self._real: bool = False
        self._lazy_init()

    def _lazy_init(self):
        key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY)
        if key:
            self._api_key = key
            self._real = True
            logger.info("Gemini client initialized with real API")
        else:
            logger.info("Gemini client running in mock mode (no API key)")

    @property
    def provider_name(self) -> str:
        return "gemini" if self._real else "gemini_mock"

    def extract(self, roi: ROI, prompt: str) -> Dict:
        if not self._real:
            return self._mock_extract(roi)
        return self._real_extract(roi, prompt)

    def _mock_extract(self, roi: ROI) -> Dict:
        logger.info("Mock Gemini extraction for '%s' (%d bytes)", roi.name, len(roi.image_bytes))
        mocks = {
            "tractor_no": {"value": "001"},
            "date": {"value": "07/11/07.6076"},
            "shift": {"value": "A"},
            "line": {"value": "mochine"},
            "checklist": {"items": []},
            "defects": {"defects": [{"text": "Front Bonut Dent."}, {"text": "Tank Pipe Beat."}, {"text": "RPM Low"}]},
            "shortages": {"shortages": []},
        }
        return mocks.get(roi.name, {"value": f"mock_{roi.name}"})

    def _real_extract(self, roi: ROI, prompt: str) -> Dict:
        if not self._api_key:
            return self._mock_extract(roi)

        import base64
        image_b64 = base64.b64encode(roi.image_bytes).decode("utf-8")

        url = GEMINI_API_URL.format(model=GEMINI_MODEL) + f"?key={self._api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"inline_data": {"mime_type": "image/png", "data": image_b64}},
                        {"text": prompt},
                    ]
                }
            ],
            "generationConfig": {"maxOutputTokens": 512},
        }

        try:
            resp = requests.post(url, headers={"Content-Type": "application/json"}, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            return self._parse_json(content)
        except Exception as e:
            logger.error("Gemini API call failed for '%s': %s", roi.name, e)
            return {"value": None, "error": str(e)}

    def _parse_json(self, content: str) -> Dict:
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1]
            content = content.rsplit("```", 1)[0]
        content = content.strip()
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.warning("Gemini returned non-JSON: %s", content[:200])
            return {"value": content}
