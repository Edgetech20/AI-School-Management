# Face Recognition System - Quick Reference Guide

## System Architecture Overview

### Single Source of Truth Pattern
```
MATCHING:  face_encodings table (core + adaptive)
AUDIT:     recognition_reviews table (review queue)
ADMIN UI:  Dashboard + Review Queue
```

### Data Flow for Face Recognition
```
Live Scan
    ↓
Detect faces → Query face_encodings → Calculate confidence
    ↓
IF confidence >= 95%
  → Direct attendance (no review)
  → Add adaptive sample
    ↓
ELSE IF confidence >= 80%
  → Pending verification
  → Create review record
  → Wait for admin approval
    ↓
ELSE
  → Unknown/rejected
```

### Approval Workflow
```
Admin approves review
    ↓
Extract & decrypt embedding
    ↓
Validate quality score
    ↓
IF quality OK
  → Insert into face_encodings as adaptive
  → Mark review as approved (audit)
ELSE
  → Mark review as approved (audit)
  → Log quality reason
```

---

## Key Components

### Backend Endpoints

| Endpoint | Method | Purpose | Auth | Data Source |
|----------|--------|---------|------|-------------|
| `/settings/public` | GET | Fetch UI settings | User | DB |
| `/attendance/recognition-metrics` | GET | System metrics | Admin | `face_encodings` only |
| `/attendance/recognition/review-queue` | GET | Pending reviews | Teacher/Admin | `recognition_reviews` |
| `/attendance/recognition/review-queue/{id}/approve` | POST | Approve review | Teacher/Admin | Copies to `face_encodings` |
| `/attendance/recognize/upload` | POST | Process image | Teacher/Admin | Queries `face_encodings` only |

### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| Navigation | Shell.tsx | Shows/hides Review Queue based on hybrid mode |
| Dashboard | DashboardPage.tsx | Shows/hides Adaptive card based on hybrid mode |
| Review Queue | ReviewQueuePage.tsx | Admin interface for approving/rejecting |

---

## Database Tables

### face_encodings (AUTHORITATIVE SOURCE)
```sql
SELECT * FROM face_encodings 
WHERE source = 'core'     -- Initial enrollment samples
   OR source = 'adaptive' -- Samples from approved reviews

-- Used for: ALL face matching operations
-- Updated: On enrollment, on review approval
-- Queried: Every recognition attempt
```

### recognition_reviews (AUDIT ONLY)
```sql
SELECT * FROM recognition_reviews 
WHERE status IN ('pending', 'approved', 'rejected')

-- Used for: Admin review/verification only
-- Updated: On review workflow
-- Queried: NEVER for matching (audit only)
```

---

## Configuration

### Hybrid Learning Mode
- **Location:** Admin → Setup page
- **Field:** "Hybrid Learning Mode enabled"
- **Storage:** `system_settings` table
- **Effect:** 
  - ON: Review queue enabled, adaptive learning active
  - OFF: Direct high-confidence matching, no reviews

### Adaptive Sample Settings
```python
# Location: app/core/config.py
ADAPTIVE_MIN_QUALITY_SCORE = 0.55  # Min quality to accept
ADAPTIVE_MAX_SAMPLES_PER_STUDENT = 20  # Prevent overfit
ADAPTIVE_MIN_DISTANCE = 0.5  # Prevent duplicates

HYBRID_HIGH_CONFIDENCE_THRESHOLD = 0.95  # Auto-accept
HYBRID_MEDIUM_CONFIDENCE_THRESHOLD = 0.80  # Send to review
HYBRID_REVIEW_MIN_MARGIN = 0.05  # Include in review
```

---

## Troubleshooting

### Adaptive Samples Not Inserting After Approval

**Check 1: Hybrid Learning Enabled?**
```
Setup page → Verify "Hybrid Learning Mode enabled" is checked
```

**Check 2: Review Queue Has Items?**
```python
# Backend console
python -c "from app.repositories.recognition_reviews import RecognitionReviewRepository; from app.db.session import SessionLocal; db = SessionLocal(); print(RecognitionReviewRepository(db).list_pending())"
```

**Check 3: Embedding Quality**
- Approval response shows: `"learning_status": "image_quality_too_low"`
- Solution: Ensure image quality is good (well-lit, face clear)

**Check 4: Encryption Key**
- Check stderr for: `"WARNING: face_encoding_encryption_key is not configured"`
- Solution: Set `FACE_ENCODING_ENCRYPTION_KEY` environment variable

**Check 5: Decryption Failure**
- Check stderr for: `"WARNING: Failed to decrypt face encoding token"`
- Solution: Verify encryption key hasn't changed

### Review Queue Not Showing in Sidebar

**Check:**
```
Admin → Setup page → Verify "Hybrid Learning Mode enabled" is checked
Browser Console: Check for errors in network requests
```

**Solution:**
1. Enable hybrid learning
2. Refresh page (or wait 5 min for cache)
3. Review Queue should appear

### Accuracy Showing 0%

**Expected:** Only happens if no face_encodings exist

**Solution:**
1. Enroll faces through Students page
2. Wait for face_encodings to populate
3. Run recognition scan
4. Accuracy should update

---

## Performance Notes

### Matching Performance
- O(n) vector similarity search on all face_encodings
- Indexed by student_id for teacher-scoped queries
- Typical: <100ms for 100+ students

### Adaptive Sample Growth
- Limited to `ADAPTIVE_MAX_SAMPLES_PER_STUDENT` per student
- Default: 20 samples per student
- Total: ~20-500 adaptive samples per student pool

### Database Size
- Each encoding: ~1KB (encrypted 128-d vector)
- Each review: ~2KB (with image path)
- Estimate: 10k encodings = ~10MB

---

## Testing

### Quick Smoke Test
```bash
# Test 1: Verify server running
curl http://localhost:8000/health

# Test 2: Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=Admin@123"

# Test 3: Get public settings
curl http://localhost:8000/api/v1/settings/public \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 4: Get metrics
curl http://localhost:8000/api/v1/attendance/recognition-metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Comprehensive Test Suite
```bash
cd apps/backend
python comprehensive_validation_test.py
```

---

## Emergency Commands

### Reset Adaptive Samples (Keep Core)
```sql
-- DANGER: This deletes all adaptive samples
DELETE FROM face_encodings WHERE source = 'adaptive';
```

### Clear Review Queue
```sql
-- DANGER: This deletes all pending/approved reviews
DELETE FROM recognition_reviews;
```

### Check Encryption Key
```bash
# Backend console
from app.core.config import get_settings
settings = get_settings()
print("Key configured:", bool(settings.face_encoding_encryption_key))
```

---

## Common Tasks

### Enable Adaptive Learning
1. Admin login
2. Go to Setup page
3. Check "Hybrid Learning Mode enabled"
4. Save

### Approve a Review
1. Go to Review Queue
2. View pending review
3. Click "Approve" button
4. Adaptive sample created automatically

### Disable Adaptive Learning
1. Admin login
2. Go to Setup page
3. Uncheck "Hybrid Learning Mode enabled"
4. Review Queue disappears from sidebar
5. Existing adaptive samples still used for matching

### Monitor System Health
1. Dashboard shows:
   - Total samples
   - Accuracy percentage
   - Number of adaptive samples
2. Check metrics endpoint in admin console

---

## Security Notes

### Data Protection
- Face encodings: AES encrypted at rest
- Encryption key: Environment variable
- Reviews: Audit trail maintained
- Admin-only: Approval workflow

### Access Control
- Public settings: Requires authentication
- Review queue: Teacher or Admin role
- Metrics: Admin role
- Enrollment: Admin role

### Recommendations
1. Rotate encryption key periodically
2. Backup encrypted data regularly
3. Monitor unauthorized access attempts
4. Review audit logs regularly

---

## FAQ

**Q: Why are adaptive samples separate from core samples?**
A: Allows flexibility - can be separately analyzed, cleaned, or disabled without affecting core enrollment data.

**Q: Can I disable adaptive learning without deleting samples?**
A: Yes - toggle hybrid mode off in Setup. Samples remain but approval flow stops creating new ones.

**Q: What happens if encryption fails?**
A: Approval skips adaptive creation but still marks review as approved. Check logs for reason.

**Q: How many adaptive samples should I expect?**
A: Depends on scanning frequency. Expected: 5-50 per student over time (limited to 20).

**Q: Can I manually add adaptive samples?**
A: Yes - use `create_adaptive_from_embedding()` in face_encodings repo.

**Q: What's the accuracy formula?**
A: Calculated from all face_encodings vectors (core + adaptive combined).

---

## Support Contacts

**Issues:** Check logs in stderr output  
**Debugging:** Run comprehensive_validation_test.py  
**Database:** Check system_settings table for configuration
