import io
import json
import math
from dataclasses import dataclass

from app.models.face_encoding import FaceEncoding

try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False


@dataclass
class MatchResult:
    student_id: int
    confidence: float
    detected_encoding: list[float]
    distance: float
    margin: float


@dataclass
class CandidateDistance:
    student_id: int
    distance: float
    confidence: float


class FaceRecognitionService:
    def __init__(
        self,
        tolerance: float = 0.65,
        min_margin: float = 0.01,
        use_average_encoding: bool = True,
    ) -> None:
        self.tolerance = tolerance
        self.min_margin = min_margin
        self.use_average_encoding = use_average_encoding
        self.face_detector = None
        if OPENCV_AVAILABLE:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_detector = cv2.CascadeClassifier(cascade_path)
            # OpenCV fallback uses a handcrafted embedding with a different distance scale.
            if not FACE_RECOGNITION_AVAILABLE:
                self.tolerance = min(self.tolerance, 0.75)
                self.min_margin = max(self.min_margin, 0.03)

    def is_available(self) -> bool:
        return FACE_RECOGNITION_AVAILABLE or OPENCV_AVAILABLE

    def is_high_accuracy_available(self) -> bool:
        return FACE_RECOGNITION_AVAILABLE

    def detect_face_encodings(self, image_bytes: bytes) -> list[list[float]]:
        if FACE_RECOGNITION_AVAILABLE:
            detected = self._detect_with_face_recognition(image_bytes)
            # HOG can miss faces in low light/angles; fall back to OpenCV detector if available.
            if detected:
                return detected
            if OPENCV_AVAILABLE:
                return self._detect_with_opencv(image_bytes)
            return []
        elif OPENCV_AVAILABLE:
            return self._detect_with_opencv(image_bytes)
        else:
            raise RuntimeError("No face detection library available")

    def _detect_with_face_recognition(self, image_bytes: bytes) -> list[list[float]]:
        import face_recognition as fr

        try:
            image = fr.load_image_file(io.BytesIO(image_bytes))
            locations = fr.face_locations(image, model="hog")
            encodings = fr.face_encodings(image, locations)
        except Exception as exc:
            raise ValueError("Invalid or unsupported image payload") from exc

        # Keep only the largest detected face to avoid matching bystanders/background.
        ordered = sorted(
            zip(locations, encodings),
            key=lambda item: (item[0][2] - item[0][0]) * (item[0][1] - item[0][3]),
            reverse=True,
        )

        normalized: list[list[float]] = []
        for _, encoding in ordered[:1]:
            values = encoding.tolist() if hasattr(encoding, "tolist") else list(encoding)
            normalized.append([float(x) for x in values])
        return normalized

    def _detect_with_opencv(self, image_bytes: bytes) -> list[list[float]]:
        import cv2
        import numpy as np

        if not self.face_detector:
            raise RuntimeError("Face detector not initialized")

        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Invalid or unsupported image payload")

        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_detector.detectMultiScale(gray, 1.3, 5)
        except Exception as exc:
            raise ValueError("Invalid or unsupported image payload") from exc

        if len(faces) == 0:
            return []

        biggest = max(faces, key=lambda face: int(face[2]) * int(face[3]))

        encodings: list[list[float]] = []
        for (x, y, w, h) in [biggest]:
            face_roi = image[y:y+h, x:x+w]
            encoding = self._build_opencv_embedding(face_roi)
            encodings.append(encoding)

        return encodings

    def _build_opencv_embedding(self, face_roi) -> list[float]:
        import cv2
        import numpy as np

        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        normalized = cv2.equalizeHist(gray)
        small = cv2.resize(normalized, (16, 8), interpolation=cv2.INTER_AREA)
        vector = small.astype(np.float32).flatten() / 255.0
        norm = float(np.linalg.norm(vector))
        if norm > 1e-12:
            vector = vector / norm
        return vector.tolist()

    def match_students(
        self,
        detected_encodings: list[list[float]],
        known_encodings: list[tuple[int, list[float]]] | list[FaceEncoding],
    ) -> list[MatchResult]:
        parsed_known: list[tuple[int, list[float]]] = []
        if known_encodings and isinstance(known_encodings[0], tuple):
            parsed_known = [(int(student_id), [float(x) for x in vector]) for student_id, vector in known_encodings]  # type: ignore[arg-type]
        else:
            for item in known_encodings:  # type: ignore[assignment]
                parsed_known.append((item.student_id, [float(x) for x in json.loads(item.encoding)]))

        if not parsed_known:
            return []

        by_student: dict[int, list[list[float]]] = {}
        for student_id, vector in parsed_known:
            by_student.setdefault(student_id, []).append(vector)

        matched: list[MatchResult] = []
        for detected in detected_encodings:
            per_student_distances: dict[int, list[float]] = {}
            for student_id, vectors in by_student.items():
                valid_vectors = [v for v in vectors if len(v) == len(detected)]
                if not valid_vectors:
                    continue

                if FACE_RECOGNITION_AVAILABLE:
                    import face_recognition as fr

                    distances = [
                        float(x)
                        for x in fr.face_distance(valid_vectors, detected)
                    ]
                else:
                    distances = [float(math.dist(detected, known)) for known in valid_vectors]

                if self.use_average_encoding and len(valid_vectors) >= 2:
                    centroid = [sum(values) / len(valid_vectors) for values in zip(*valid_vectors)]
                    centroid_distance = float(math.dist(detected, centroid))
                    distances.append(centroid_distance)

                per_student_distances[student_id] = distances

            if not per_student_distances:
                continue

            ranked: list[tuple[int, float, float]] = []
            for student_id, distances in per_student_distances.items():
                ordered = sorted(distances)
                nearest = ordered[0]
                mean_distance = sum(ordered) / len(ordered)
                ranked.append((student_id, nearest, mean_distance))

            ranked.sort(key=lambda x: (x[1], x[2]))
            best_student_id, best_distance, _ = ranked[0]
            second_best_distance = ranked[1][1] if len(ranked) > 1 else 1.0
            margin = max(0.0, second_best_distance - best_distance)

            if best_distance <= self.tolerance:
                confidence = max(0.0, min(1.0, 1.0 - (best_distance / (self.tolerance + 1e-9))))
                matched.append(
                    MatchResult(
                        student_id=best_student_id,
                        confidence=confidence,
                        detected_encoding=detected,
                        distance=best_distance,
                        margin=margin,
                    )
                )

        unique_by_student: dict[int, MatchResult] = {}
        for result in matched:
            current = unique_by_student.get(result.student_id)
            if current is None or result.confidence > current.confidence:
                unique_by_student[result.student_id] = result

        return list(unique_by_student.values())

    def rank_student_candidates(
        self,
        detected_encoding: list[float],
        known_encodings: list[tuple[int, list[float]]] | list[FaceEncoding],
        top_k: int = 3,
    ) -> list[CandidateDistance]:
        parsed_known: list[tuple[int, list[float]]] = []
        if known_encodings and isinstance(known_encodings[0], tuple):
            parsed_known = [(int(student_id), [float(x) for x in vector]) for student_id, vector in known_encodings]  # type: ignore[arg-type]
        else:
            for item in known_encodings:  # type: ignore[assignment]
                parsed_known.append((item.student_id, [float(x) for x in json.loads(item.encoding)]))

        by_student: dict[int, list[list[float]]] = {}
        for student_id, vector in parsed_known:
            by_student.setdefault(student_id, []).append(vector)

        ranked: list[CandidateDistance] = []
        for student_id, vectors in by_student.items():
            valid_vectors = [v for v in vectors if len(v) == len(detected_encoding)]
            if not valid_vectors:
                continue

            if FACE_RECOGNITION_AVAILABLE:
                import face_recognition as fr

                distances = [float(x) for x in fr.face_distance(valid_vectors, detected_encoding)]
            else:
                distances = [float(math.dist(detected_encoding, known)) for known in valid_vectors]

            if self.use_average_encoding and len(valid_vectors) >= 2:
                centroid = [sum(values) / len(valid_vectors) for values in zip(*valid_vectors)]
                centroid_distance = float(math.dist(detected_encoding, centroid))
                distances.append(centroid_distance)

            best_distance = min(distances)
            confidence = max(0.0, min(1.0, 1.0 - (best_distance / (self.tolerance + 1e-9))))
            ranked.append(CandidateDistance(student_id=student_id, distance=best_distance, confidence=confidence))

        ranked.sort(key=lambda row: row.distance)
        return ranked[: max(1, top_k)]

    def estimate_accuracy(self, known_encodings: list[FaceEncoding] | list[tuple[int, list[float]]]) -> float:
        parsed_known: list[tuple[int, list[float]]] = []
        for item in known_encodings:
            try:
                if isinstance(item, tuple):
                    student_id, vector = item
                    parsed_known.append((int(student_id), [float(x) for x in vector]))
                else:
                    parsed_known.append((int(item.student_id), [float(x) for x in json.loads(item.encoding)]))
            except Exception:
                continue

        if len(parsed_known) < 2:
            return 0.0

        total = 0
        correct = 0

        for i, (target_student_id, target_vec) in enumerate(parsed_known):
            per_student_distances: dict[int, list[float]] = {}
            for j, (candidate_student_id, candidate_vec) in enumerate(parsed_known):
                if i == j or len(target_vec) != len(candidate_vec):
                    continue

                dist = float(math.dist(target_vec, candidate_vec))
                per_student_distances.setdefault(candidate_student_id, []).append(dist)

            if not per_student_distances:
                continue

            ranked: list[tuple[int, float, float]] = []
            for candidate_student_id, distances in per_student_distances.items():
                ordered = sorted(distances)
                nearest = ordered[0]
                mean_distance = sum(ordered) / len(ordered)
                ranked.append((candidate_student_id, nearest, mean_distance))

            ranked.sort(key=lambda x: (x[1], x[2]))
            best_student_id, best_distance, _ = ranked[0]
            accepted = best_distance <= self.tolerance

            total += 1
            if best_student_id == target_student_id and accepted:
                correct += 1

        if total == 0:
            return 0.0

        return correct / total
