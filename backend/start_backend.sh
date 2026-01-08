#!/bin/bash
cd /Users/qiuliang/code/Colafans/Alfred
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
