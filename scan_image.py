import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.services.enhancement.enhancer import ImageEnhancer
from app.services.ocr.service import OCRService
from app.services.extraction.engine import ExtractionEngine

def scan_image(image_path: str):
    if not os.path.exists(image_path):
        print(f"Error: file not found: {image_path}")
        sys.exit(1)

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print(f"Reading: {image_path} ({len(image_bytes)} bytes)")
    print()

    enhancer = ImageEnhancer()
    enhanced_bytes, enhance_meta = enhancer.enhance(image_bytes)
    print("Image Enhancement:")
    print(f"  Steps: {', '.join(enhance_meta.get('steps', []))}")
    print(f"  Skew angle: {enhance_meta.get('skew_angle', 0)}°")
    print(f"  Size: {enhance_meta.get('original_size', 0)} → {enhance_meta.get('enhanced_size', 0)} bytes")
    print()

    ocr_service = OCRService()
    ocr_result = ocr_service.process_bytes(enhanced_bytes)
    print("OCR Result:")
    print(f"  Engine: {ocr_result.engine}")
    print(f"  Confidence: {ocr_result.confidence:.4f}")
    print(f"  Processing time: {ocr_result.processing_time_ms}ms")
    print(f"  Word count: {len(ocr_result.words)}")
    print()
    print("Raw Text:")
    print("-" * 60)
    print(ocr_result.raw_text)
    print("-" * 60)
    print()

    engine = ExtractionEngine()
    word_dicts = [w.to_dict() for w in ocr_result.words]
    extracted = engine.extract(ocr_result.raw_text, word_dicts, ocr_result.confidence, enhanced_bytes)
    print("Extracted Fields:")
    print(f"  Tractor No:  {extracted.tractor_no or '(not found)'}")
    print(f"  Engine No:   {extracted.engine_no or '(not found)'}")
    print(f"  Chassis No:  {extracted.chassis_no or '(not found)'}")
    print(f"  Inspector:   {extracted.inspector or '(not found)'}")
    date_str = extracted.date.isoformat() if hasattr(extracted.date, 'isoformat') else str(extracted.date) if extracted.date else '(not found)'
    print(f"  Date:        {date_str}")
    print(f"  Shift:       {extracted.shift or '(not found)'}")
    print(f"  Line No:     {extracted.line_no or '(not found)'}")
    print(f"  Defects:     {len(extracted.defects)} found")
    for d in extracted.defects:
        print(f"    - {d['text']}")
    print()
    print(f"  Needs Review: {extracted.needs_review}")
    print(f"  Confidence Scores:")
    for field, score in extracted.confidence_scores.items():
        print(f"    {field}: {score:.4f}")
    print()

    result = {
        "enhancement": enhance_meta,
        "ocr": ocr_result.to_dict(),
        "extracted": extracted.to_dict(),
    }
    output_path = image_path.rsplit(".", 1)[0] + "_result.json"
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2, default=str)
    print(f"Full result saved to: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scan_image.py <image_path>")
        sys.exit(1)
    scan_image(sys.argv[1])
