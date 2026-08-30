import sqlite3
from datetime import datetime, timezone
from .config import DATA_DIR

DB_PATH = DATA_DIR / "varimitra.db"


def connect():
    c = sqlite3.connect(DB_PATH, timeout=20)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA busy_timeout=5000")
    return c


def _ensure_column(c, table, column, ddl):
    cols = {r[1] for r in c.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in cols:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")


def init_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS alerts(
            alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT,name TEXT,similarity REAL,confidence_band TEXT,
            camera_id TEXT,camera_location TEXT,timestamp TEXT,
            evidence_image TEXT,track_id INTEGER,status TEXT DEFAULT 'PENDING',
            reviewed_at TEXT)""")
        c.execute("""CREATE TABLE IF NOT EXISTS sightings(
            sighting_id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id INTEGER,case_id TEXT,name TEXT,similarity REAL,
            camera_id TEXT,camera_location TEXT,track_id INTEGER,
            timestamp TEXT,evidence_image TEXT)""")
        c.execute("""CREATE TABLE IF NOT EXISTS camera_status(
            camera_id TEXT PRIMARY KEY,camera_location TEXT,source TEXT,
            online INTEGER DEFAULT 0,fps REAL DEFAULT 0,
            faces INTEGER DEFAULT 0,matched_faces INTEGER DEFAULT 0,
            last_seen TEXT,error TEXT)""")
        _ensure_column(c, 'camera_status', 'matched_faces', 'INTEGER DEFAULT 0')
        c.execute("CREATE INDEX IF NOT EXISTS idx_sightings_case_time ON sightings(case_id,timestamp)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_alerts_status_time ON alerts(status,timestamp)")


def insert_alert(a):
    with connect() as c:
        case_id = a['case_id']
        # Check if there is ALREADY an active/pending alert for this person/case
        existing = c.execute(
            "SELECT alert_id FROM alerts WHERE (case_id=? OR case_id LIKE ?) AND status='PENDING' LIMIT 1",
            (case_id, f"%{case_id}%")
        ).fetchone()

        if existing:
            # Update existing alert with latest detection info (ONE request per person)
            alert_id = existing['alert_id']
            c.execute("""UPDATE alerts SET similarity=?, confidence_band=?, camera_id=?, camera_location=?, timestamp=?, evidence_image=?, track_id=?
                         WHERE alert_id=?""",
                      (a['similarity'], a['confidence_band'], a['camera_id'], a['camera_location'], a['timestamp'], a['evidence_image'], a['track_id'], alert_id))
            c.execute("""INSERT INTO sightings(alert_id,case_id,name,similarity,camera_id,camera_location,
                track_id,timestamp,evidence_image) VALUES(?,?,?,?,?,?,?,?,?)""", (
                alert_id, a['case_id'], a['name'], a['similarity'], a['camera_id'], a['camera_location'],
                a['track_id'], a['timestamp'], a['evidence_image']))
            return alert_id

        # Check if this person/case was ALREADY resolved, confirmed, or rejected
        already = c.execute(
            "SELECT 1 FROM alerts WHERE (case_id=? OR case_id LIKE ?) AND status IN ('RESOLVED', 'CONFIRMED', 'REJECTED') LIMIT 1",
            (case_id, f"%{case_id}%")
        ).fetchone()
        if already:
            return None  # Do not generate new alerts for a person who was already processed/rejected/resolved

        cur = c.execute("""INSERT INTO alerts(case_id,name,similarity,confidence_band,camera_id,
            camera_location,timestamp,evidence_image,track_id,status)
            VALUES(?,?,?,?,?,?,?,?,?,'PENDING')""", (
            a['case_id'], a['name'], a['similarity'], a['confidence_band'], a['camera_id'],
            a['camera_location'], a['timestamp'], a['evidence_image'], a['track_id']))
        alert_id = cur.lastrowid
        c.execute("""INSERT INTO sightings(alert_id,case_id,name,similarity,camera_id,camera_location,
            track_id,timestamp,evidence_image) VALUES(?,?,?,?,?,?,?,?,?)""", (
            alert_id, a['case_id'], a['name'], a['similarity'], a['camera_id'], a['camera_location'],
            a['track_id'], a['timestamp'], a['evidence_image']))
        return alert_id


def list_alerts(status=None, limit=100):
    with connect() as c:
        if status:
            rows = c.execute("SELECT * FROM alerts WHERE status=? ORDER BY timestamp DESC LIMIT ?", (status, limit)).fetchall()
        else:
            rows = c.execute("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]


def get_alert(alert_id):
    with connect() as c:
        r = c.execute("SELECT * FROM alerts WHERE alert_id=?", (alert_id,)).fetchone()
        return dict(r) if r else None


def review_alert(alert_id, status):
    with connect() as c:
        r = c.execute("SELECT * FROM alerts WHERE alert_id=?", (alert_id,)).fetchone()
        if not r:
            return None
        case_id = r['case_id']
        now = datetime.now(timezone.utc).isoformat()
        # Update ALL alerts for this person/case to the new status (CONFIRMED/REJECTED)
        c.execute(
            "UPDATE alerts SET status=?, reviewed_at=? WHERE case_id=? OR case_id LIKE ? OR alert_id=?",
            (status, now, case_id, f"%{case_id}%", alert_id)
        )
        updated = c.execute("SELECT * FROM alerts WHERE alert_id=?", (alert_id,)).fetchone()
        return dict(updated) if updated else dict(r)


def resolve_alerts_for_case(case_id):
    with connect() as c:
        c.execute(
            "UPDATE alerts SET status='RESOLVED', reviewed_at=? WHERE case_id=? OR case_id LIKE ?",
            (datetime.now(timezone.utc).isoformat(), case_id, f"%{case_id}%")
        )




def list_sightings(case_id=None, limit=100):
    with connect() as c:
        if case_id:
            rows=c.execute("SELECT * FROM sightings WHERE case_id=? ORDER BY timestamp DESC LIMIT ?",(case_id,limit)).fetchall()
        else:
            rows=c.execute("SELECT * FROM sightings ORDER BY timestamp DESC LIMIT ?",(limit,)).fetchall()
        return [dict(r) for r in rows]


def update_camera_status(camera_id,camera_location,source,online,fps=0.0,faces=0,matched_faces=0,error=None):
    now=datetime.now(timezone.utc).isoformat()
    with connect() as c:
        c.execute("""INSERT INTO camera_status(camera_id,camera_location,source,online,fps,faces,matched_faces,last_seen,error)
                     VALUES(?,?,?,?,?,?,?,?,?)
                     ON CONFLICT(camera_id) DO UPDATE SET
                     camera_location=excluded.camera_location,source=excluded.source,
                     online=excluded.online,fps=excluded.fps,faces=excluded.faces,
                     matched_faces=excluded.matched_faces,last_seen=excluded.last_seen,error=excluded.error""",
                  (camera_id,camera_location,str(source),1 if online else 0,float(fps),int(faces),int(matched_faces),now,error))


def list_cameras():
    with connect() as c:
        return [dict(r) for r in c.execute("SELECT * FROM camera_status ORDER BY camera_id").fetchall()]


def alert_exists(case_id, camera_id):
    with connect() as c:
        r = c.execute("SELECT 1 FROM alerts WHERE case_id=? AND camera_id=? LIMIT 1", (case_id, camera_id)).fetchone()
        return r is not None
