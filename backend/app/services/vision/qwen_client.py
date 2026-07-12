import base64
import json
import logging
import os
from typing import Dict, Optional

import requests

from app.config import QWEN_API_KEY, QWEN_API_URL, QWEN_MODEL
from app.services.roi.types import ROI
from app.services.vision.client import BaseVisionClient

logger = logging.getLogger(__name__)


class QwenVisionClient(BaseVisionClient):
    def __init__(self):
        self._api_key: Optional[str] = None
        self._real: bool = False
        self._lazy_init()

    def _lazy_init(self):
        key = os.getenv("QWEN_API_KEY", QWEN_API_KEY)
        if key:
            self._api_key = key
            self._real = True
            logger.info("Qwen client initialized with real API")
        else:
            logger.info("Qwen client running in mock mode (no API key)")

    @property
    def provider_name(self) -> str:
        return "qwen" if self._real else "qwen_mock"

    def extract(self, roi: ROI, prompt: str) -> Dict:
        if not self._real:
            return self._mock_extract(roi)
        return self._real_extract(roi, prompt)

    def _mock_extract(self, roi: ROI) -> Dict:
        logger.info("Mock Qwen extraction for '%s' (%d bytes)", roi.name, len(roi.image_bytes))
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

        image_b64 = base64.b64encode(roi.image_bytes).decode("utf-8")
        data_url = f"data:image/png;base64,{image_b64}"

        payload = {
            "model": QWEN_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            "max_tokens": 512,
        }

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        try:
            resp = requests.post(QWEN_API_URL, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return self._parse_json(content)
        except Exception as e:
            logger.error("Qwen API call failed for '%s': %s", roi.name, e)
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
            logger.warning("Qwen returned non-JSON: %s", content[:200])
            return {"value": content}
