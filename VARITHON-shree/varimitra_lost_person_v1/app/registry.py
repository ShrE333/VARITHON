from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from .config import CASES_DIR


class CaseRegistry:
    def __init__(self):
        CASES_DIR.mkdir(parents=True, exist_ok=True)

    def create_case(
        self,
        name: str,
        age: str | None,
        last_seen: str | None,
        reporter_contact: str | None,
        embedding: np.ndarray,
        enrollment_info: dict,
    ) -> dict:
        case_id = f"VM-LF-{uuid.uuid4().hex[:8].upper()}"
        case_dir = CASES_DIR / case_id
        case_dir.mkdir(parents=True, exist_ok=False)

        np.save(case_dir / "embedding.npy", embedding.astype(np.float32))

        record = {
            "case_id": case_id,
            "name": name,
            "age": age,
            "last_seen": last_seen,
            "reporter_contact": reporter_contact,
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "enrollment_info": enrollment_info,
        }
        (case_dir / "case.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
        return record

    def list_active(self) -> list[dict]:
        cases = []
        for path in CASES_DIR.glob("VM-LF-*"):
            meta = path / "case.json"
            emb = path / "embedding.npy"
            if not meta.exists() or not emb.exists():
                continue

            record = json.loads(meta.read_text(encoding="utf-8"))
            if record.get("status") != "ACTIVE":
                continue

            record["_embedding"] = np.load(emb).astype(np.float32)
            cases.append(record)
        return cases

    def public_cases(self) -> list[dict]:
        out = []
        for case in self.list_active():
            case.pop("_embedding", None)
            out.append(case)
        return out

    def close_case(self, case_id: str) -> dict:
        meta = CASES_DIR / case_id / "case.json"
        if not meta.exists():
            raise FileNotFoundError(case_id)

        record = json.loads(meta.read_text(encoding="utf-8"))
        record["status"] = "CLOSED"
        record["closed_at"] = datetime.now(timezone.utc).isoformat()
        meta.write_text(json.dumps(record, indent=2), encoding="utf-8")
        return record
