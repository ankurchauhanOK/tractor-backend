from celery import Celery

from app.config import REDIS_URL, WORKER_COUNT

celery_app = Celery(
    "tractor_ocr",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    worker_concurrency=WORKER_COUNT,
    task_default_queue="default",
    task_routes={
        "app.tasks.process_page": {"queue": "ocr"},
    },
    task_soft_time_limit=600,
    task_time_limit=900,
)
