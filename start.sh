#!/usr/bin/env sh
cd "$(dirname "$0")/server" || exit 1
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
