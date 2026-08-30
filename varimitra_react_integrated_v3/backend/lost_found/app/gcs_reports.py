from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from google.cloud import storage

BUCKET_NAME = "varimitra-lost-found-2026"


def _safe_report_id(report_id: str) -> str:
    value = (report_id or "").strip()
    if not value:
        raise ValueError("report_id is required")
    if any(ch in value for ch in ("/", "\\", "..")):
        raise ValueError("Invalid report_id")
    return value


def find_report(report_id: str, client: Optional[storage.Client] = None) -> dict:
    """Find a report ID under lost/ or found/ without requiring report_type."""
    report_id = _safe_report_id(report_id)
    client = client or storage.Client()
    bucket = client.bucket(BUCKET_NAME)

    for report_type in ("lost", "found"):
        image_path = f"{report_type}/{report_id}/original.jpg"
        image_blob = bucket.blob(image_path)
        if image_blob.exists(client=client):
            metadata_path = f"{report_type}/{report_id}/metadata.json"
            metadata_blob = bucket.blob(metadata_path)
            metadata = {}
            if metadata_blob.exists(client=client):
                try:
                    metadata = json.loads(metadata_blob.download_as_text())
                except Exception:
                    metadata = {}
            return {
                "report_id": report_id,
                "report_type": report_type,
                "gcs_path": image_path,
                "metadata": metadata,
            }

    raise FileNotFoundError(report_id)


def download_report_image(report_id: str, data_dir: Path) -> dict:
    """Auto-detect lost/found, download original.jpg, and return local path + metadata."""
    client = storage.Client()
    found = find_report(report_id, client)
    report_type = found["report_type"]

    local_dir = Path(data_dir) / report_type / report_id
    local_dir.mkdir(parents=True, exist_ok=True)
    local_path = local_dir / "original.jpg"

    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(found["gcs_path"])
    blob.download_to_filename(str(local_path))

    found["local_path"] = str(local_path)
    return found
