# VariMitra Lost Person Recognition — V1

This is the first isolated AI service for the VariMitra missing-person workflow.

## What V1 proves

1. Enroll a missing person from a **single photograph**.
2. Detect and align the face with InsightFace.
3. Store a normalized identity embedding for an ACTIVE case.
4. Scan CCTV/video/webcam frames.
5. Compare faces using cosine similarity.
6. Require repeated matches in a time window.
7. Produce an **admin-verification alert**, never an automatic "person found" declaration.

## Important privacy/safety rule

The API response never exposes the stored face embedding. Cases should be deleted/closed according
to a retention policy after the missing-person workflow ends. Production deployments should encrypt
biometric templates, restrict access, log admin actions, obtain appropriate consent/authorization,
and comply with applicable law.

## Model note

The starter uses InsightFace `buffalo_l` because it is convenient for hackathon prototyping.
InsightFace's library code and its pretrained model weights have different licensing terms.
Check the pretrained-model license before any commercial deployment.

## Install (CPU)

```bash
python -m venv .venv

# Linux/macOS
source .venv/bin/activate

# Windows PowerShell
# .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

## Install (NVIDIA GPU)

Use `requirements-gpu.txt` instead of `requirements.txt`, and make sure your installed
ONNX Runtime GPU build is compatible with your CUDA/cuDNN environment.

## Start API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

```text
http://127.0.0.1:8000/docs
```

The first InsightFace run may download the selected model pack.

## Create a missing-person case

The easiest method is Swagger UI:

1. Open `/docs`.
2. Expand `POST /cases`.
3. Upload exactly one clear face photo.
4. Enter name, age, last-seen location, and reporter contact.
5. Execute.

Or:

```bash
curl -X POST http://127.0.0.1:8000/cases \
  -F "photo=@missing_person.jpg" \
  -F "name=Demo Person" \
  -F "age=12" \
  -F "last_seen=Temple North Gate" \
  -F "reporter_contact=demo"
```

## Scan a prerecorded CCTV video

```bash
python scan_video.py \
  --source demo_cctv.mp4 \
  --camera-id CAM-NORTH-01 \
  --location "North Gate"
```

Press `q` to close the display.

## Scan webcam

```bash
python scan_video.py \
  --source 0 \
  --camera-id DEMO-CAM-01 \
  --location "Hackathon Demo Zone"
```

## Output

Confirmed repeated candidates are written to:

```text
data/alerts/alerts.jsonl
data/alerts/<case>_<timestamp>.jpg
```

Every alert contains:

- case id
- similarity
- camera id
- camera location
- timestamp
- evidence image
- `requires_admin_verification: true`

## Critical: threshold calibration

The values in `app/config.py` are placeholders, not universal biometric thresholds.

For the actual Varithon demo we should build a validation set containing:

- same-person CCTV clips
- different-person CCTV clips
- front/side faces
- blur
- different illumination
- partial occlusion
- children and adults if the use case includes both

Then select thresholds based on false-match and false-non-match tradeoffs.

## Next VariMitra integration

After this V1 works on your footage:

WhatsApp report -> `/cases` -> CCTV scanner -> admin dashboard -> admin confirms ->
VariMitra backend -> WhatsApp update.

Do not let a raw model score automatically message a family that a person has been found.
