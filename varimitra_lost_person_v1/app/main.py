from __future__ import annotations

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .face_engine import FaceEngine
from .registry import CaseRegistry

app = FastAPI(
    title="VariMitra Lost Person Recognition API",
    version="0.1.0",
)

engine = FaceEngine(gpu=False)
registry = CaseRegistry()


@app.get("/health")
def health():
    return {"status": "ok", "service": "varimitra-lost-person-v1"}


@app.get("/cases")
def list_cases():
    return registry.public_cases()


@app.post("/cases")
async def create_case(
    photo: UploadFile = File(...),
    name: str = Form(...),
    age: str | None = Form(None),
    last_seen: str | None = Form(None),
    reporter_contact: str | None = Form(None),
):
    raw = await photo.read()
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    try:
        embedding, info = engine.enrollment_embedding(image)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    record = registry.create_case(
        name=name,
        age=age,
        last_seen=last_seen,
        reporter_contact=reporter_contact,
        embedding=embedding,
        enrollment_info=info,
    )

    # Never expose the face embedding in the API response.
    return {
        **record,
        "message": "Case created. CCTV matching can now use this identity template.",
    }


@app.post("/cases/{case_id}/close")
def close_case(case_id: str):
    try:
        return registry.close_case(case_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found.")
