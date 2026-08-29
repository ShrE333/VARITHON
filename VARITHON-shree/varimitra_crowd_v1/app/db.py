import sqlite3
import time
from .config import DB_PATH, DATA_DIR


def connect():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=30)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    return con


def init_db():
    with connect() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS camera_status (
            camera_id TEXT PRIMARY KEY,
            location TEXT NOT NULL,
            online INTEGER NOT NULL DEFAULT 0,
            fps REAL NOT NULL DEFAULT 0,
            detected_people INTEGER NOT NULL DEFAULT 0,
            latest_frame TEXT,
            updated_at REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS zone_status (
            zone_id TEXT PRIMARY KEY,
            zone_name TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            people_count INTEGER NOT NULL DEFAULT 0,
            occupancy REAL NOT NULL DEFAULT 0,
            level TEXT NOT NULL DEFAULT 'LOW',
            updated_at REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS camera_zone_counts (
            camera_id TEXT NOT NULL,
            zone_id TEXT NOT NULL,
            people_count INTEGER NOT NULL DEFAULT 0,
            updated_at REAL NOT NULL,
            PRIMARY KEY(camera_id, zone_id)
        );
        """)


def upsert_camera(camera_id, location, online, fps, detected_people, latest_frame=None):
    with connect() as con:
        con.execute("""
        INSERT INTO camera_status(camera_id,location,online,fps,detected_people,latest_frame,updated_at)
        VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(camera_id) DO UPDATE SET
          location=excluded.location,
          online=excluded.online,
          fps=excluded.fps,
          detected_people=excluded.detected_people,
          latest_frame=COALESCE(excluded.latest_frame,camera_status.latest_frame),
          updated_at=excluded.updated_at
        """, (camera_id, location, int(online), float(fps), int(detected_people), latest_frame, time.time()))


def upsert_camera_zone(camera_id, zone_id, people_count):
    with connect() as con:
        con.execute("""
        INSERT INTO camera_zone_counts(camera_id,zone_id,people_count,updated_at)
        VALUES(?,?,?,?)
        ON CONFLICT(camera_id,zone_id) DO UPDATE SET
          people_count=excluded.people_count,
          updated_at=excluded.updated_at
        """, (camera_id, zone_id, int(people_count), time.time()))


def set_zone_status(zone_id, zone_name, capacity, count, occupancy, level):
    with connect() as con:
        con.execute("""
        INSERT INTO zone_status(zone_id,zone_name,capacity,people_count,occupancy,level,updated_at)
        VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(zone_id) DO UPDATE SET
          zone_name=excluded.zone_name,
          capacity=excluded.capacity,
          people_count=excluded.people_count,
          occupancy=excluded.occupancy,
          level=excluded.level,
          updated_at=excluded.updated_at
        """, (zone_id, zone_name, int(capacity), int(count), float(occupancy), level, time.time()))
