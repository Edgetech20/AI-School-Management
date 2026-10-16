import random
from app.db.session import SessionLocal
from app.repositories.face_encodings import FaceEncodingRepository
s = SessionLocal()
try:
    encoding = [random.uniform(-1.0, 1.0) for _ in range(128)]
    repo = FaceEncodingRepository(s)
    res = repo.add_adaptive_sample(student_id=1, encoding=encoding, max_samples=20, min_distance=0.12, min_quality_score=0.55)
    print('add_adaptive_sample result', res)
    rows = s.execute("SELECT COUNT(*) AS adaptive FROM face_encodings WHERE source='adaptive'").mappings().all()
    print(rows)
finally:
    s.close()