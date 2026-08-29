import sqlite3
from datetime import datetime, timezone
from .config import DATA_DIR
DB_PATH=DATA_DIR/'varimitra.db'
def init_db():
    DATA_DIR.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(DB_PATH) as c:
        c.execute('''CREATE TABLE IF NOT EXISTS alerts(alert_id INTEGER PRIMARY KEY AUTOINCREMENT,case_id TEXT,name TEXT,similarity REAL,confidence_band TEXT,camera_id TEXT,camera_location TEXT,timestamp TEXT,evidence_image TEXT,track_id INTEGER,status TEXT DEFAULT 'PENDING',reviewed_at TEXT)''')
def insert_alert(a):
    with sqlite3.connect(DB_PATH) as c:
        cur=c.execute('''INSERT INTO alerts(case_id,name,similarity,confidence_band,camera_id,camera_location,timestamp,evidence_image,track_id,status) VALUES(?,?,?,?,?,?,?,?,?,'PENDING')''',(a['case_id'],a['name'],a['similarity'],a['confidence_band'],a['camera_id'],a['camera_location'],a['timestamp'],a['evidence_image'],a['track_id']))
        return cur.lastrowid
def list_alerts(status=None):
    with sqlite3.connect(DB_PATH) as c:
        c.row_factory=sqlite3.Row
        rows=c.execute('SELECT * FROM alerts WHERE status=? ORDER BY timestamp DESC',(status,)).fetchall() if status else c.execute('SELECT * FROM alerts ORDER BY timestamp DESC').fetchall()
        return [dict(r) for r in rows]
def review_alert(alert_id,status):
    with sqlite3.connect(DB_PATH) as c:
        c.row_factory=sqlite3.Row
        c.execute('UPDATE alerts SET status=?,reviewed_at=? WHERE alert_id=?',(status,datetime.now(timezone.utc).isoformat(),alert_id))
        r=c.execute('SELECT * FROM alerts WHERE alert_id=?',(alert_id,)).fetchone(); return dict(r) if r else None
