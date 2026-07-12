import logging
from typing import Dict

from app.services.fallback.ocr_fallback import OCRFallback
from app.services.merge.merger import MergeEngine
from app.services.result_model import VisionExtractionResult
from app.services.roi.cache import ROICache
from app.services.validation.engine import ValidationResult
from app.services.vision.gemini_client import GeminiVisionClient
from app.services.vision.prompts import PROMPTS

logger = logging.getLogger(__name__)

FIELD_ROI_MAP = {
    "tractor_no": "tractor_no",
    "date": "date",
    "shift": "shift",
    "line_no": "line",
    "defects": "defects",
    "shortages": "shortages",
    "checklist": "checklist",
}


class FallbackCoordinator:
    def __init__(self):
        self._gemini = GeminiVisionClient()
        self._ocr = OCRFallback()
        self._merger = MergeEngine()

    def process(
        self,
        result: VisionExtractionResult,
        validation: ValidationResult,
        roi_cache: ROICache,
    ) -> VisionExtractionResult:
        if validation.passed:
            logger.info("All validations passed, no fallback needed")
            return result

        failed_fields = [f for f in validation.fields if not f.passed]
        logger.info("Fallback triggered for %d fields: %s", len(failed_fields), [f.name for f in failed_fields])

        corrected = {}

        for field in failed_fields:
            corrected_json = self._try_gemini(field.name, roi_cache)
            if corrected_json:
                corrected[FIELD_ROI_MAP.get(field.name, field.name)] = corrected_json
                logger.info("Gemini corrected '%s'", field.name)
                continue

            ocr_text = self._try_ocr(field.name, roi_cache)
            if ocr_text:
                corrected[FIELD_ROI_MAP.get(field.name, field.name)] = {"value": ocr_text, "text": ocr_text}
                logger.info("OCR corrected '%s': %s", field.name, ocr_text[:50])

        if corrected:
            all_results = {}
            for roi_name, val in corrected.items():
                all_results[roi_name] = val
            result = self._merger.merge(all_results, provider="fallback")

        return result

    def _try_gemini(self, field_name: str, roi_cache: ROICache) -> Dict:
        roi_name = FIELD_ROI_MAP.get(field_name)
        if not roi_name:
            return {}
        roi = roi_cache.get(roi_name)
        if not roi:
            logger.warning("No ROI for '%s'", field_name)
            return {}

        prompt = PROMPTS.get(roi_name, "")
        if not prompt:
            return {}

        try:
            data = self._gemini.extract(roi, prompt)
            value = data.get("value")
            if value and str(value).strip():
                return data
        except Exception as e:
            logger.warning("Gemini failed for '%s': %s", field_name, e)

        return {}

    def _try_ocr(self, field_name: str, roi_cache: ROICache) -> str:
        roi_name = FIELD_ROI_MAP.get(field_name)
        if not roi_name:
            return ""
        roi = roi_cache.get(roi_name)
        if not roi:
            return ""

        try:
            return self._ocr.extract_text(roi.image_bytes)
        except Exception as e:
            logger.warning("OCR fallback failed for '%s': %s", field_name, e)
            return ""
