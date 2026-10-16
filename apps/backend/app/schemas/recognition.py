from pydantic import BaseModel


class RecognitionMatch(BaseModel):
    student_id: int
    student_name: str | None = None
    class_name: str | None = None
    confidence: float
    status: str
    pending_verification: bool = False


class RecognitionResponse(BaseModel):
    matched_count: int
    matches: list[RecognitionMatch]
    detected_faces: int = 0
    outcome: str = "matched"
    nearest_candidate: str | None = None
    nearest_distance: float | None = None
    threshold: float | None = None


class RecognitionAccuracyMetrics(BaseModel):
    accuracy_percent: float
    total_samples: int
    total_students: int
    adaptive_samples_count: int = 0


class RecognitionReviewRead(BaseModel):
    id: int
    student_id: int
    event_type: str
    device_id: str
    confidence: float
    margin: float
    status: str
    face_image_path: str | None = None
    image_data: str | None = None  # Base64 encoded image
    expires_at: str
    created_at: str


class RecognitionReviewDecisionIn(BaseModel):
    note: str = ""

