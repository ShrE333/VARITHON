"""Example CLIENT used by your external reporting website/service.
This is NOT run by the admin dashboard.
"""
import json
from pathlib import Path
import requests

API = "http://127.0.0.1:8000/reports"
REPORT_ID = "LF-20260830-EXAMPLE01"
REPORT_TYPE = "lost"
IMAGE = Path(r"C:\Users\acer\Downloads\person.jpg")

metadata = {
    "name": "Rahul Patil",
    "age": 13,
    "last_seen": "North Gate",
    "reporter_contact": "9876543210",
}

with IMAGE.open("rb") as f:
    response = requests.post(
        API,
        data={
            "report_id": REPORT_ID,
            "report_type": REPORT_TYPE,
            "metadata": json.dumps(metadata),
        },
        files={"image": (IMAGE.name, f, "image/jpeg")},
        timeout=120,
    )

print(response.status_code)
print(response.text)
