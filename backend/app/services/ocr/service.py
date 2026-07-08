import logging
import time
import tempfile
import os
from typing import List

from app.services.ocr.factory import create_ocr_engine

logger = logging.getLogger(__name__)


class OCRWord:
    def __init__(self, text: str, confidence: float, bbox: List[float]):
        self.text = text
        self.confidence = confidence
        self.bbox = bbox

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "confidence": round(self.confidence, 4),
            "bbox": self.bbox,
        }


class OCRResult:
    def __init__(
        self,
        raw_text: str,
        words: List[OCRWord],
        confidence: float,
        processing_time_ms: int,
        engine: str,
    ):
        self.raw_text = raw_text
        self.words = words
        self.confidence = confidence
        self.processing_time_ms = processing_time_ms
        self.engine = engine

    def to_dict(self) -> dict:
        return {
            "raw_text": self.raw_text,
            "confidence": round(self.confidence, 4),
            "processing_time_ms": self.processing_time_ms,
            "engine": self.engine,
            "word_count": len(self.words),
            "words": [w.to_dict() for w in self.words],
        }


class OCRService:
    def __init__(self):
        self._engine = create_ocr_engine()

    def process_bytes(self, image_bytes: bytes) -> OCRResult:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            return self._process_path(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    def process_path(self, image_path: str) -> OCRResult:
        return self._process_path(image_path)

    def _process_path(self, image_path: str) -> OCRResult:
        t0 = time.time()

        raw_text = self._engine.extract_text(image_path)
        words = self._extract_words(image_path)
        overall_conf = self._compute_confidence(words)
        elapsed_ms = int((time.time() - t0) * 1000)

        return OCRResult(
            raw_text=raw_text,
            words=words,
            confidence=overall_conf,
            processing_time_ms=elapsed_ms,
            engine=self._engine.get_name(),
        )

    def _extract_words(self, image_path: str) -> List[OCRWord]:
        engine = self._engine
        if hasattr(engine, "extract_words"):
            try:
                raw_words = engine.extract_words(image_path)
                return [OCRWord(text, conf, bbox) for text, conf, bbox in raw_words]
            except Exception:
                return self._fallback_words(engine, image_path)
        else:
            return self._fallback_words(engine, image_path)

    def _fallback_words(self, engine, image_path: str) -> List[OCRWord]:
        raw = engine.extract_text(image_path)
        lines = [l.strip() for l in raw.split("\n") if l.strip()]
        return [OCRWord(line, 0.5, []) for line in lines]

    def _compute_confidence(self, words: List[OCRWord]) -> float:
        if not words:
            return 0.0
        return sum(w.confidence for w in words) / len(words)
