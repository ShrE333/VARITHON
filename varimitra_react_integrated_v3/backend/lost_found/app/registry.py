import json
import uuid
from datetime import datetime, timezone

import cv2
import numpy as np

from .config import CASES_DIR


class CaseRegistry:
    def __init__(self):
        CASES_DIR.mkdir(parents=True, exist_ok=True)

    def create_case(self, name, age, last_seen, reporter_contact, embedding, enrollment_info, reference_image_bgr):
        case_id = f'VM-LF-{uuid.uuid4().hex[:8].upper()}'
        return self.create_case_with_id(
            case_id,
            name,
            age,
            last_seen,
            reporter_contact,
            embedding,
            enrollment_info,
            reference_image_bgr,
            source='manual',
        )

    def create_case_with_id(
        self,
        case_id,
        name,
        age,
        last_seen,
        reporter_contact,
        embedding,
        enrollment_info,
        reference_image_bgr,
        source='external',
        extra=None,
    ):
        case_id = str(case_id).strip()
        if not case_id:
            raise ValueError('case_id is required')

        folder = CASES_DIR / case_id
        folder.mkdir(parents=True, exist_ok=True)

        existing = folder / 'case.json'
        if existing.exists() and (folder / 'embedding.npy').exists():
            return json.loads(existing.read_text(encoding='utf-8'))

        np.save(folder / 'embedding.npy', np.asarray(embedding, dtype=np.float32))
        cv2.imwrite(str(folder / 'reference.jpg'), reference_image_bgr)

        record = {
            'case_id': case_id,
            'name': name or case_id,
            'age': age,
            'last_seen': last_seen,
            'reporter_contact': reporter_contact,
            'status': 'ACTIVE',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'enrollment_info': enrollment_info,
            'reference_image': 'reference.jpg',
            'source': source,
        }
        if extra:
            record.update(extra)

        existing.write_text(json.dumps(record, indent=2), encoding='utf-8')
        return record

    def list_active(self):
        out = []
        for folder in CASES_DIR.iterdir():
            if not folder.is_dir():
                continue
            case_json = folder / 'case.json'
            embedding_file = folder / 'embedding.npy'
            if not case_json.exists() or not embedding_file.exists():
                continue
            record = json.loads(case_json.read_text(encoding='utf-8'))
            if record.get('status') != 'ACTIVE':
                continue
            record['_embedding'] = np.load(embedding_file).astype(np.float32)
            out.append(record)
        return out

    def public_cases(self):
        out = []
        for record in self.list_active():
            record = dict(record)
            record.pop('_embedding', None)
            out.append(record)
        return out

    def get_case(self, case_id):
        path = CASES_DIR / case_id / 'case.json'
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding='utf-8'))

    def get_reference_path(self, case_id):
        path = CASES_DIR / case_id / 'reference.jpg'
        return path if path.exists() else None

    def close_case(self, case_id):
        path = CASES_DIR / case_id / 'case.json'
        if not path.exists():
            raise FileNotFoundError(case_id)
        record = json.loads(path.read_text(encoding='utf-8'))
        record['status'] = 'CLOSED'
        record['closed_at'] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(record, indent=2), encoding='utf-8')
        return record
