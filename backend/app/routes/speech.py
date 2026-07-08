import os
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter()

model: object | None = None


def get_model():
    global model
    if model is None:
        from faster_whisper import WhisperModel
        logger.info("Loading Whisper model (base, CPU)...")
        model = WhisperModel("base", device="cpu", compute_type="int8")
        logger.info("Whisper model loaded.")
    return model


@router.post("/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are allowed")

    tmp_dir = "/tmp/whisper_uploads"
    os.makedirs(tmp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    tmp_path = os.path.join(tmp_dir, f"{uuid.uuid4().hex}{ext}")

    try:
        with open(tmp_path, "wb") as f:
            f.write(await file.read())

        whisper = get_model()
        segments, info = whisper.transcribe(tmp_path, language="en")

        text = " ".join(seg.text.strip() for seg in segments)

        if not text.strip():
            return {"text": ""}

        return {"text": text.strip()}

    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
