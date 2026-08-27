#!/usr/bin/env bash
set -o errexit

python -m pip install -r requirements.txt
npm ci --prefix frontend
npm run build --prefix frontend
python manage.py collectstatic --noinput
python manage.py migrate --noinput
