from typing import List, Tuple

from app.services.ocr.base import OCREngine


class PaddleOCREngine(OCREngine):
    def __init__(self):
        from paddleocr import PaddleOCR

        self._ocr = PaddleOCR(use_textline_orientation=True, lang="en")
        self._name = "PaddleOCR"

    def extract_text(self, image_path: str) -> str:
        result = self._ocr.ocr(image_path)
        lines = []
        if result and len(result) > 0:
            page = result[0]
            if hasattr(page, "json"):
                data = page.json
                rec_texts = data.get("res", {}).get("rec_texts", [])
                lines = [t.strip() for t in rec_texts if t.strip()]
        return "\n".join(lines)

    def extract_words(self, image_path: str) -> List[Tuple[str, float, List[float]]]:
        result = self._ocr.ocr(image_path)
        words = []
        if result and len(result) > 0:
            page = result[0]
            if hasattr(page, "json"):
                data = page.json
                res = data.get("res", {})
                texts = res.get("rec_texts", [])
                scores = res.get("rec_scores", [])
                polys = res.get("rec_polys", [])
                for i in range(len(texts)):
                    text = texts[i].strip() if texts[i] else ""
                    if not text:
                        continue
                    conf = float(scores[i]) if i < len(scores) else 0.0
                    poly = polys[i] if i < len(polys) else []
                    flat_bbox = [coord for point in poly for coord in point] if poly else []
                    words.append((text, conf, flat_bbox))
        return words

    def get_name(self) -> str:
        return self._name
