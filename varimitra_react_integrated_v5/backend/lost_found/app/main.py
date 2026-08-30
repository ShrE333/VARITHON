import json
from pathlib import Path
import asyncio
from datetime import datetime, timezone

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse

from .config import CANDIDATE_THRESHOLD, DATA_DIR, ALERTS_DIR
from .db import (
    alert_exists,
    get_alert,
    init_db,
    insert_alert,
    list_alerts,
    list_cameras,
    list_sightings,
    review_alert,
    resolve_alerts_for_case,
)
from .face_engine import FaceEngine, cosine_similarity
from .registry import CaseRegistry
from .report_store import FoundReportStore
from .local_reports import LocalReportStore

app = FastAPI(title='VariMitra Lost Person API', version='0.8.0-local-reports')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

init_db()
engine = FaceEngine(False)
registry = CaseRegistry()
found_store = FoundReportStore(DATA_DIR)
local_reports = LocalReportStore(DATA_DIR)
LIVE_DIR = DATA_DIR / 'live'


def _read_image(path: str):
    image = cv2.imread(path)
    if image is None:
        raise HTTPException(400, 'Downloaded report image is not a valid image')
    return image


def _candidate_alert(case, found_report, similarity):
    camera_id = f"FOUND:{found_report['report_id']}"
    if alert_exists(case['case_id'], camera_id):
        return None

    alert = {
        'case_id': case['case_id'],
        'name': case.get('name') or case['case_id'],
        'similarity': float(similarity),
        'confidence_band': 'FOUND_REPORT',
        'camera_id': camera_id,
        'camera_location': 'Found-person report',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'evidence_image': found_report['_image_path'],
        'track_id': -1,
    }
    alert['alert_id'] = insert_alert(alert)
    return alert


def _match_found_against_active_lost(found_report):
    matches = []
    for case in registry.list_active():
        similarity = cosine_similarity(found_report['_embedding'], case['_embedding'])
        if similarity >= CANDIDATE_THRESHOLD:
            alert = _candidate_alert(case, found_report, similarity)
            matches.append({
                'case_id': case['case_id'],
                'name': case.get('name'),
                'similarity': float(similarity),
                'alert_id': alert['alert_id'] if alert else None,
                'already_alerted': alert is None,
            })
    return sorted(matches, key=lambda row: row['similarity'], reverse=True)


def _match_new_lost_against_found(case):
    matches = []
    for found_report in found_store.list_all():
        similarity = cosine_similarity(case['_embedding'], found_report['_embedding'])
        if similarity >= CANDIDATE_THRESHOLD:
            alert = _candidate_alert(case, found_report, similarity)
            matches.append({
                'found_report_id': found_report['report_id'],
                'similarity': float(similarity),
                'alert_id': alert['alert_id'] if alert else None,
                'already_alerted': alert is None,
            })
    return sorted(matches, key=lambda row: row['similarity'], reverse=True)


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'version': '0.8.0-local-reports',
        'storage': 'local-disk',
        'active_cases': len(registry.list_active()),
    }


@app.get('/cases')
def cases():
    return registry.public_cases()


@app.post('/cases')
async def create_case(
    photo: UploadFile = File(...),
    name: str = Form(...),
    age: str | None = Form(None),
    last_seen: str | None = Form(None),
    reporter_contact: str | None = Form(None),
):
    image = cv2.imdecode(np.frombuffer(await photo.read(), np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(400, 'Invalid image')
    try:
        embedding, info = engine.enrollment_embedding(image)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return registry.create_case(name, age, last_seen, reporter_contact, embedding, info, image)


@app.post('/reports')
async def receive_report(
    report_id: str = Form(...),
    report_type: str = Form(...),
    metadata: str = Form(...),
    image: UploadFile = File(...),
):
    """Single automated Lost & Found intake endpoint.

    External portal/WhatsApp service sends multipart/form-data with:
      report_id, report_type (lost|found), metadata (JSON string), image

    The image + metadata are saved locally. A lost report is enrolled as an
    ACTIVE CCTV case immediately; a found report is compared against all
    active lost cases immediately. CCTV workers run continuously and refresh
    the registry every few seconds, so no restart is required.
    """
    report_id = report_id.strip()
    report_type = report_type.lower().strip()
    if report_type not in {'lost', 'found'}:
        raise HTTPException(400, "report_type must be 'lost' or 'found'")
    if not report_id:
        raise HTTPException(400, 'report_id cannot be empty')

    try:
        metadata_obj = json.loads(metadata)
        if not isinstance(metadata_obj, dict):
            raise ValueError('metadata must be a JSON object')
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(400, f'metadata must be valid JSON object: {exc}')

    try:
        image_bytes = await image.read()
        image_bgr, metadata_obj, image_path, metadata_path = local_reports.save(
            report_type, report_id, image_bytes, metadata_obj
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f'Failed to save report: {exc}')

    try:
        embedding, info = engine.enrollment_embedding(image_bgr)
    except ValueError as exc:
        # Keep the original report on disk, but return an explicit AI error.
        raise HTTPException(422, f'Report stored, but face enrollment failed: {exc}')

    if report_type == 'lost':
        case = registry.create_case_with_id(
            case_id=report_id,
            name=metadata_obj.get('name') or metadata_obj.get('person_name') or report_id,
            age=metadata_obj.get('age'),
            last_seen=metadata_obj.get('last_seen') or metadata_obj.get('last_seen_location'),
            reporter_contact=metadata_obj.get('reporter_contact') or metadata_obj.get('phone'),
            embedding=embedding,
            enrollment_info=info,
            reference_image_bgr=image_bgr,
            source='local-report-api',
            extra={
                'report_type': 'lost',
                'external_report_id': report_id,
                'storage_image': str(image_path),
                'storage_metadata': str(metadata_path),
            },
        )
        active = next((row for row in registry.list_active() if row['case_id'] == report_id), None)
        historical_matches = _match_new_lost_against_found(active) if active else []
        return {
            'success': True,
            'report_id': report_id,
            'report_type': 'lost',
            'image': str(image_path),
            'metadata': str(metadata_path),
            'case': case,
            'cctv_monitoring': 'ACTIVE',
            'camera_restart_required': False,
            'existing_found_matches': historical_matches,
        }

    found_record = found_store.save(report_id, image_bgr, embedding, metadata_obj)
    found_record['_embedding'] = np.asarray(embedding, dtype=np.float32)
    found_record['_image_path'] = str(Path(DATA_DIR) / 'found' / report_id / 'reference.jpg')
    matches = _match_found_against_active_lost(found_record)
    return {
        'success': True,
        'report_id': report_id,
        'report_type': 'found',
        'image': str(image_path),
        'metadata': str(metadata_path),
        'candidate_lost_matches': matches,
    }


@app.get('/reports')
def reports(report_type: str | None = None, include_resolved: bool = True):
    if report_type is not None and report_type not in {'lost', 'found'}:
        raise HTTPException(400, "report_type must be 'lost' or 'found'")
    return local_reports.list_reports(report_type, include_resolved=include_resolved)


@app.post('/reports/{report_type}/{report_id}/resolve')
def resolve_report(report_type: str, report_id: str):
    if report_type not in {'lost', 'found'}:
        raise HTTPException(400, "report_type must be 'lost' or 'found'")
    res = local_reports.resolve_report(report_type, report_id)
    if not res:
        raise HTTPException(404, 'Report not found')
    try:
        registry.close_case(report_id)
    except Exception:
        pass
    resolve_alerts_for_case(report_id)
    return {'success': True, 'report': res}


@app.delete('/reports/{report_type}/{report_id}')
def delete_report(report_type: str, report_id: str):
    if report_type not in {'lost', 'found'}:
        raise HTTPException(400, "report_type must be 'lost' or 'found'")
    ok = local_reports.delete_report(report_type, report_id)
    try:
        registry.close_case(report_id)
    except Exception:
        pass
    resolve_alerts_for_case(report_id)
    return {'success': ok}


@app.post('/cases/{case_id}/close')
def close_case(case_id: str):
    try:
        record = registry.close_case(case_id)
        local_reports.resolve_report('lost', case_id)
        resolve_alerts_for_case(case_id)
        return record
    except FileNotFoundError:
        raise HTTPException(404, 'Case not found')


@app.get('/reports/{report_type}/{report_id}/image')
def report_image(report_type: str, report_id: str):
    if report_type not in {'lost', 'found'}:
        raise HTTPException(400, "report_type must be 'lost' or 'found'")
    try:
        image_path, _ = local_reports.paths(report_type, report_id)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    if not image_path.exists():
        ref = registry.get_reference_path(report_id)
        if ref and ref.exists():
            image_path = ref
        else:
            raise HTTPException(404, 'Report image not found')
    return FileResponse(image_path, media_type='image/jpeg', headers={'Cache-Control': 'no-cache'})


@app.get('/cases/{case_id}/reference')
def reference(case_id: str):
    path = registry.get_reference_path(case_id)
    if not path or not path.exists():
        raise HTTPException(404, 'Reference not found')
    return FileResponse(path, media_type='image/jpeg', headers={'Cache-Control': 'no-cache'})


@app.get('/alerts')
def alerts(status: str | None = None, limit: int = 100):
    return list_alerts(status, limit)


@app.get('/alerts/{alert_id}/evidence')
def evidence(alert_id: int):
    row = get_alert(alert_id)
    if not row:
        raise HTTPException(404, 'Alert not found')
    path = Path(row['evidence_image'])
    if not path.exists():
        fallback = ALERTS_DIR / path.name
        if fallback.exists():
            path = fallback
        else:
            raise HTTPException(404, 'Evidence image not found')
    return FileResponse(path, media_type='image/jpeg', headers={'Cache-Control': 'no-cache'})


@app.post('/alerts/{alert_id}/confirm')
def confirm(alert_id: int):
    row = review_alert(alert_id, 'CONFIRMED')
    if not row:
        raise HTTPException(404, 'Alert not found')
    case_id = row.get('case_id')
    if case_id:
        try:
            registry.close_case(case_id)
        except Exception:
            pass
        local_reports.resolve_report('lost', case_id)
        resolve_alerts_for_case(case_id)
    return row



@app.post('/alerts/{alert_id}/reject')
def reject(alert_id: int):
    row = review_alert(alert_id, 'REJECTED')
    if not row:
        raise HTTPException(404, 'Alert not found')
    return row



@app.get('/cameras')
def cameras():
    return list_cameras()


@app.get('/sightings')
def sightings(case_id: str | None = None, limit: int = 100):
    return list_sightings(case_id, limit)


@app.get('/cameras/{camera_id}/stream')
async def camera_stream(camera_id: str):
    safe = ''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in camera_id)

    async def generate():
        last = None
        while True:
            try:
                frames = sorted(
                    LIVE_DIR.glob(f'{safe}_*.jpg'),
                    key=lambda path: path.stat().st_mtime,
                    reverse=True,
                )
                path = frames[0] if frames else None
                data = path.read_bytes() if path and path.exists() else None
                if data and data != last:
                    last = data
                    yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + data + b'\r\n'
                await asyncio.sleep(0.10)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(0.25)

    return StreamingResponse(generate(), media_type='multipart/x-mixed-replace; boundary=frame')


@app.get('/admin', response_class=HTMLResponse)
def admin():
    return HTMLResponse((Path(__file__).parent / 'admin.html').read_text(encoding='utf-8'))
