Write-Host "Preparing local setup (MySQL via XAMPP)..."
Push-Location ..\..

Write-Host "Backend setup..."
Push-Location apps/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
# Optional: pip install -e ".[ai]"
Write-Host "Ensure MySQL is running in XAMPP and attendance_db exists before running migrations."
alembic -c alembic.ini upgrade head
python scripts/seed_data.py
Pop-Location

Write-Host "Frontend setup..."
Push-Location apps/frontend
npm install
Pop-Location

Pop-Location
Write-Host "Setup complete."
