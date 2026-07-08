# AI Pipeline

## Flow

```
PDF Upload
    ↓
PDF Splitter (PyMuPDF) → Individual page images
    ↓
Image Enhancer (OpenCV)
    ├── Grayscale conversion
    ├── Binarization (OTSU threshold)
    ├── Deskew (Hough transform)
    ├── Denoise (Non-local means)
    ├── Contrast enhancement (CLAHE)
    └── Sharpening (unsharp mask)
    ↓
PaddleOCR Engine (PaddleX API)
    ├── Text detection
    ├── Text recognition
    └── Confidence scores per word
    ↓
Extraction Engine
    ├── Regex pattern matching
    │   ├── Tractor No: MH-\d{2}[A-Z]{2}\d{4}
    │   ├── Engine No: [A-Z0-9]{6,20}
    │   ├── Chassis No: [A-Z0-9]{6,20}
    │   ├── Date patterns (DD/MM/YYYY, etc.)
    │   ├── Shift patterns (1st, 2nd, 3rd, General)
    │   └── Line No patterns
    ├── Zonal OCR (pre-defined coordinate regions)
    └── Fuzzy matching (RapidFuzz) for defect names
    ↓
Confidence Engine
    ├── Per-field confidence from OCR scores
    ├── Overall page confidence (average)
    └── Auto-approve if confidence > threshold (0.85)
    ↓
Duplicate Detection
    ├── SHA256 of raw text
    └── Cosine similarity on extracted fields
    ↓
Storage
    ├── Original PDF
    ├── Enhanced page images
    ├── OCR JSON (raw PaddleX output)
    └── Verified JSON (human-corrected fields)
```

## Performance Targets
- 500 pages: under 8 minutes total
- OCR accuracy: 96%+
- Auto-approval rate: 95%+
- Manual review rate: <5%
