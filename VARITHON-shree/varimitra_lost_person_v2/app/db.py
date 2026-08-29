from __future__ import annotations
import sqlite3
from contextlib import contextmanager
from .config import DATA_DIR

DB_PATH = DATA_DIR / "varimitra.db"

def init_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            name TEXT NOT NULL,
            similarity REAL NOT NULL,
            confidence_band TEXT NOT NULL,
            camera_id TEXT NOT NULL,
            camera_location TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            evidence_image TEXT,
            track_id INTEGER,
            status TEXT NOT NULL DEFAULT 'PENDING',
            reviewed_at TEXT,
            review_note TEXT
        )
        ''')
        conn.commit()

@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def insert_alert(alert):
    with connect() as conn:
        cur = conn.execute('''
        INSERT INTO alerts
        (case_id, name, similarity, confidence_band, camera_id,
         camera_location, timestamp, evidence_image, track_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        ''', (
            alert["case_id"], alert["name"], float(alert["similarity"]),
            alert["confidence_band"], alert["camera_id"],
            alert["camera_location"], alert["timestamp"],
            alert.get("evidence_image"), alert.get("track_id")
        ))
        return int(cur.lastrowid)

def list_alerts(status=None):
    with connect() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM alerts WHERE status=? ORDER BY timestamp DESC",
                (status,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM alerts ORDER BY timestamp DESC"
            ).fetchall()

        return [dict(r) for r in rows]

def review_alert(alert_id, new_status):
    import datetime
    if new_status not in {"CONFIRMED", "REJECTED"}:
        raise ValueError("Invalid review status")

    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM alerts WHERE alert_id=?",
            (alert_id,)
        ).fetchone()

        if not row:
            return None

        conn.execute(
            "UPDATE alerts SET status=?, reviewed_at=? WHERE alert_id=?",
            (new_status, datetime.datetime.now(datetime.timezone.utc).isoformat(), alert_id)
        )

        updated = conn.execute(
            "SELECT * FROM alerts WHERE alert_id=?",
            (alert_id,)
        ).fetchone()

        return dict(updated)
