#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

echo "Starting local infrastructure..."
echo "Preparing local setup (MySQL via XAMPP)..."

echo "Backend setup..."
cd apps/backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
# Optional: pip install -e '.[ai]'
echo "Ensure MySQL is running in XAMPP and attendance_db exists before running migrations."
alembic -c alembic.ini upgrade head
python scripts/seed_data.py
cd ../..

echo "Frontend setup..."
cd apps/frontend
npm install
cd ../..

echo "Setup complete."
