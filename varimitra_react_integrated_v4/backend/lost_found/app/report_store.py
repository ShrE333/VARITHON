from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np


class FoundReportStore:
    def __init__(self, data_dir: Path):
        self.root = Path(data_dir) / "found"
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, report_id: str, image_bgr, embedding, metadata: dict | None = None):
        folder = self.root / report_id
        folder.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(folder / "reference.jpg"), image_bgr)
        np.save(folder / "embedding.npy", np.asarray(embedding, dtype=np.float32))
        record = {
            "report_id": report_id,
            "report_type": "found",
            "status": "PENDING_MATCH",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {},
        }
        (folder / "report.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
        return record

    def list_all(self):
        rows = []
        for folder in self.root.iterdir():
            if not folder.is_dir():
                continue
            info = folder / "report.json"
            emb = folder / "embedding.npy"
            if not info.exists() or not emb.exists():
                continue
            row = json.loads(info.read_text(encoding="utf-8"))
            row["_embedding"] = np.load(emb).astype(np.float32)
            row["_image_path"] = str(folder / "reference.jpg")
            rows.append(row)
        return rows
