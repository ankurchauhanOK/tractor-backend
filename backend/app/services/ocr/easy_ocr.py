from typing import List, Tuple

from app.services.ocr.base import OCREngine


class EasyOCREngine(OCREngine):
    def __init__(self):
        import easyocr

        self._reader = easyocr.Reader(["en"])
        self._name = "EasyOCR"

    def extract_text(self, image_path: str) -> str:
        result = self._reader.readtext(image_path)
        lines = [entry[1].strip() for entry in result if entry[1].strip()]
        return "\n".join(lines)

    def extract_words(self, image_path: str) -> List[Tuple[str, float, List[float]]]:
        result = self._reader.readtext(image_path)
        words = []
        for bbox, text, conf in result:
            text = text.strip()
            if not text:
                continue
            flat_bbox = [coord for point in bbox for coord in point]
            words.append((text, float(conf), flat_bbox))
        return words

    def get_name(self) -> str:
        return self._name
