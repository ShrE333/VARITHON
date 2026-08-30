#!/usr/bin/env bash
set -euo pipefail

python fetch_source.py
python -m pip install --upgrade pip
pip install -r requirements.txt

echo "VARITHON backend build completed."
