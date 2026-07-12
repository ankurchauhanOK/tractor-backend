# AI Pipeline

## Flow

```
PDF Upload
    ↓
PDF Splitter (PyMuPDF) → Individual page images
    ↓
Image Enhancer (OpenCV)
    ├── Grayscale conversion
    ├── Denoise (Non-local means)
    ├── Deskew (minAreaRect)
    ├── Contrast enhancement (CLAHE)
    └── Binarization (OTSU threshold)
    ↓
OCR Engine
    ├── PaddleOCR (primary)
    └── EasyOCR (fallback if PaddleOCR fails to initialize)
    ↓
Extraction Engine
    ├── Regex pattern matching
    │   ├── Tractor No: MH-\d{2}[A-Z]{2}\d{4}
    │   ├── Engine No: [A-Z0-9]{6,20}
    │   ├── Chassis No: [A-Z0-9]{6,20}
    │   ├── Date patterns (DD/MM/YYYY, etc.)
    │   ├── Shift patterns (1st, 2nd, 3rd, General)
    │   └── Line No patterns
    │   └── Exact field matching for defect names
    ↓
Confidence Engine
    ├── Per-field confidence from OCR scores
    ├── Overall page confidence (average)
    └── Auto-approve if confidence > threshold (0.85)
    ↓
Duplicate Detection
    ├── SHA256 of raw OCR text
    └── Exact field matching (tractor_no, engine_no, chassis_no)
    ↓
Storage
    ├── Original PDF
    ├── Enhanced page images
    ├── OCR JSON (raw PaddleOCR output)
    └── Verified JSON (human-corrected fields)
```

## Notes
- **Sharpening** is not currently applied (documented but unimplemented)
- **Zonal OCR** (pre-defined coordinate regions) is not implemented — extraction relies solely on regex pattern matching against full OCR text
- **RapidFuzz / fuzzy matching** is listed in dependencies but not yet integrated
- **Cosine similarity** for duplicate detection is not implemented — the system uses exact field matching instead

## Performance Targets
- 500 pages: under 8 minutes total
- OCR accuracy: 96%+
- Auto-approval rate: 95%+
- Manual review rate: <5%
