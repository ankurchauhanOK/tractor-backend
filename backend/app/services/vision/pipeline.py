import logging
from typing import Optional

import cv2
import numpy as np

from app.config import CONFIDENCE_THRESHOLD, VISION_PIPELINE_ENABLED
from app.services.fallback.coordinator import FallbackCoordinator
from app.services.merge.merger import MergeEngine
from app.services.result_model import VisionExtractionResult
from app.services.roi.generator import ROIGenerator
from app.services.scan.validator import ScanValidationService
from app.services.template.detector import TemplateDetector, TemplateType
from app.services.template.registry import get_template
from app.services.validation.engine import ValidationEngine
from app.services.vision.prompts import PROMPTS
from app.services.vision.qwen_client import QwenVisionClient

logger = logging.getLogger(__name__)


class VisionPipeline:
    def __init__(self):
        self._scan_validator = ScanValidationService()
        self._template_detector = TemplateDetector()
        self._roi_generator = ROIGenerator()
        self._qwen = QwenVisionClient()
        self._merger = MergeEngine()
        self._validator = ValidationEngine()
        self._fallback = FallbackCoordinator()

    def is_enabled(self) -> bool:
        return VISION_PIPELINE_ENABLED

    def process(
        self,
        image_bytes: bytes,
        ocr_words: Optional[list] = None,
    ) -> VisionExtractionResult:
        scan_result = self._scan_validator.validate(image_bytes)
        if not scan_result.valid:
            raise ValueError(f"Scan validation failed: {scan_result.error}")

        corrected_bytes = scan_result.corrected_bytes or image_bytes

        img_array = np.frombuffer(corrected_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError("Could not decode image")

        self._template_detector.set_ocr_words(ocr_words or [])
        template_type = self._template_detector.detect(img)
        if template_type == TemplateType.UNKNOWN:
            logger.warning("Unknown template, defaulting to Mahindra V1")
            template_type = TemplateType.MAHINDRA_TRACTOR_V1

        template = get_template(template_type)
        roi_cache = self._roi_generator.generate(corrected_bytes, template)

        roi_results = {}
        sub_rois = template.get_sub_rois()
        for roi_name in sub_rois:
            roi = roi_cache.get(roi_name)
            if roi is None:
                logger.warning("No ROI generated for '%s'", roi_name)
                continue
            prompt = PROMPTS.get(roi_name, "")
            if not prompt:
                continue
            logger.info("Extracting '%s' via Qwen (%d bytes)", roi_name, len(roi.image_bytes))
            data = self._qwen.extract(roi, prompt)
            roi_results[roi_name] = data

        result = self._merger.merge(roi_results, provider="qwen")
        validation = self._validator.validate(result)

        if not validation.passed:
            logger.info("Validation failed, triggering fallback")
            result = self._fallback.process(result, validation, roi_cache)
            validation = self._validator.validate(result)

        result.confidence_scores = validation.confidence_scores
        result.needs_review = validation.needs_review

        logger.info(
            "Vision pipeline complete: review=%s scores=%s",
            result.needs_review, result.confidence_scores,
        )

        return result
