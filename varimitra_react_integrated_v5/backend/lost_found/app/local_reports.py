import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2
import numpy as np


class LocalReportStore:
    """Disk-backed storage for external lost/found reports.

    Layout:
      data/lost/images/<REPORT_ID>.jpg
      data/lost/metadata/<REPORT_ID>.json
      data/found/images/<REPORT_ID>.jpg
      data/found/metadata/<REPORT_ID>.json
    """

    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        for report_type in ("lost", "found"):
            (self.data_dir / report_type / "images").mkdir(parents=True, exist_ok=True)
            (self.data_dir / report_type / "metadata").mkdir(parents=True, exist_ok=True)

    def paths(self, report_type: str, report_id: str):
        report_type = report_type.lower().strip()
        report_id = report_id.strip()
        if report_type not in {"lost", "found"}:
            raise ValueError("report_type must be 'lost' or 'found'")
        if not report_id:
            raise ValueError("report_id cannot be empty")
        base = self.data_dir / report_type
        return (
            base / "images" / f"{report_id}.jpg",
            base / "metadata" / f"{report_id}.json",
        )

    def save(self, report_type: str, report_id: str, image_bytes: bytes, metadata: dict[str, Any]):
        image_path, metadata_path = self.paths(report_type, report_id)
        if not image_bytes:
            raise ValueError("Received empty image")

        # Validate bytes as an image before persisting.
        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Uploaded file is not a valid image")

        image_path.write_bytes(image_bytes)
        record = dict(metadata or {})
        record.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        record.update({
            "report_id": report_id,
            "report_type": report_type,
            "image_filename": image_path.name,
        })
        record.setdefault("status", "ACTIVE")
        try:
            metadata_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            try:
                image_path.unlink(missing_ok=True)
            finally:
                raise
        return image, record, image_path, metadata_path

    def resolve_report(self, report_type: str, report_id: str):
        _, metadata_path = self.paths(report_type, report_id)
        if not metadata_path.exists():
            return None
        try:
            record = json.loads(metadata_path.read_text(encoding="utf-8"))
            record["status"] = "RESOLVED"
            record["resolved_at"] = datetime.now(timezone.utc).isoformat()
            metadata_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
            return record
        except Exception:
            return None

    def delete_report(self, report_type: str, report_id: str):
        image_path, metadata_path = self.paths(report_type, report_id)
        deleted = False
        if image_path.exists():
            image_path.unlink(missing_ok=True)
            deleted = True
        if metadata_path.exists():
            metadata_path.unlink(missing_ok=True)
            deleted = True
        return deleted

    def list_reports(self, report_type: str | None = None, include_resolved: bool = True):
        types = [report_type] if report_type in {"lost", "found"} else ["lost", "found"]
        out = []
        for typ in types:
            meta_dir = self.data_dir / typ / "metadata"
            if not meta_dir.exists():
                continue
            for path in meta_dir.glob("*.json"):
                try:
                    row = json.loads(path.read_text(encoding="utf-8"))
                    row.setdefault("status", "ACTIVE")
                    if not include_resolved and row.get("status") == "RESOLVED":
                        continue
                    row["stored_image"] = str(self.data_dir / typ / "images" / f"{path.stem}.jpg")
                    out.append(row)
                except Exception:
                    continue
        return sorted(out, key=lambda r: str(r.get("created_at", "")), reverse=True)

