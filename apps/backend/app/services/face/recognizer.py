import io
import json
import math
from dataclasses import dataclass

import numpy as np
import face_recognition as fr

from app.models.face_encoding import FaceEncoding


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

    def is_available(self) -> bool:
        return True

    def detect_face_encodings(self, image_bytes: bytes) -> list[list[float]]:
        try:
            image = fr.load_image_file(io.BytesIO(image_bytes))
            locations = fr.face_locations(image, model="hog")
            encodings = fr.face_encodings(image, locations)
        except Exception as exc:
            raise ValueError("Invalid or unsupported image payload") from exc

        # Keep only the largest face to avoid matching bystanders.
        ordered = sorted(
            zip(locations, encodings),
            key=lambda item: (item[0][2] - item[0][0]) * (item[0][1] - item[0][3]),
            reverse=True,
        )

        return [
            [float(x) for x in (enc.tolist() if hasattr(enc, "tolist") else list(enc))]
            for _, enc in ordered[:1]
        ]

    def match_students(
        self,
        detected_encodings: list[list[float]],
        known_encodings: list[tuple[int, list[float]]] | list[FaceEncoding],
    ) -> list[MatchResult]:
        parsed_known = self._parse_known(known_encodings)
        if not parsed_known:
            return []

        by_student: dict[int, list[list[float]]] = {}
        for student_id, vector in parsed_known:
            by_student.setdefault(student_id, []).append(vector)

        matched: list[MatchResult] = []
        for detected in detected_encodings:
            per_student_distances: dict[int, list[float]] = {}
            for student_id, vectors in by_student.items():
                valid = [v for v in vectors if len(v) == len(detected)]
                if not valid:
                    continue

                distances = [float(x) for x in fr.face_distance(np.array(valid), np.array(detected))]

                if self.use_average_encoding and len(valid) >= 2:
                    centroid = [sum(vals) / len(valid) for vals in zip(*valid)]
                    distances.append(float(math.dist(detected, centroid)))

                per_student_distances[student_id] = distances

            if not per_student_distances:
                continue

            ranked = sorted(
                [
                    (sid, sorted(dists)[0], sum(dists) / len(dists))
                    for sid, dists in per_student_distances.items()
                ],
                key=lambda x: (x[1], x[2]),
            )

            best_id, best_dist, _ = ranked[0]
            second_dist = ranked[1][1] if len(ranked) > 1 else 1.0
            margin = max(0.0, second_dist - best_dist)

            if best_dist <= self.tolerance:
                confidence = max(0.0, min(1.0, 1.0 - (best_dist / (self.tolerance + 1e-9))))
                matched.append(
                    MatchResult(
                        student_id=best_id,
                        confidence=confidence,
                        detected_encoding=detected,
                        distance=best_dist,
                        margin=margin,
                    )
                )

        unique: dict[int, MatchResult] = {}
        for result in matched:
            if result.student_id not in unique or result.confidence > unique[result.student_id].confidence:
                unique[result.student_id] = result

        return list(unique.values())

    def rank_student_candidates(
        self,
        detected_encoding: list[float],
        known_encodings: list[tuple[int, list[float]]] | list[FaceEncoding],
        top_k: int = 3,
    ) -> list[CandidateDistance]:
        parsed_known = self._parse_known(known_encodings)

        by_student: dict[int, list[list[float]]] = {}
        for student_id, vector in parsed_known:
            by_student.setdefault(student_id, []).append(vector)

        ranked: list[CandidateDistance] = []
        for student_id, vectors in by_student.items():
            valid = [v for v in vectors if len(v) == len(detected_encoding)]
            if not valid:
                continue

            distances = [float(x) for x in fr.face_distance(valid, detected_encoding)]

            if self.use_average_encoding and len(valid) >= 2:
                centroid = [sum(vals) / len(valid) for vals in zip(*valid)]
                distances.append(float(math.dist(detected_encoding, centroid)))

            best_dist = min(distances)
            confidence = max(0.0, min(1.0, 1.0 - (best_dist / (self.tolerance + 1e-9))))
            ranked.append(CandidateDistance(student_id=student_id, distance=best_dist, confidence=confidence))

        ranked.sort(key=lambda r: r.distance)
        return ranked[: max(1, top_k)]

    def estimate_accuracy(self, known_encodings: list[FaceEncoding] | list[tuple[int, list[float]]]) -> float:
        parsed_known = self._parse_known(known_encodings)

        if len(parsed_known) < 2:
            return 0.0

        total = correct = 0
        for i, (target_id, target_vec) in enumerate(parsed_known):
            per_student: dict[int, list[float]] = {}
            for j, (cand_id, cand_vec) in enumerate(parsed_known):
                if i == j or len(target_vec) != len(cand_vec):
                    continue
                per_student.setdefault(cand_id, []).append(float(math.dist(target_vec, cand_vec)))

            if not per_student:
                continue

            ranked = sorted(
                [(sid, sorted(dists)[0], sum(dists) / len(dists)) for sid, dists in per_student.items()],
                key=lambda x: (x[1], x[2]),
            )
            best_id, best_dist, _ = ranked[0]
            total += 1
            if best_id == target_id and best_dist <= self.tolerance:
                correct += 1

        return correct / total if total else 0.0

    def _parse_known(
        self,
        known_encodings: list[tuple[int, list[float]]] | list[FaceEncoding],
    ) -> list[tuple[int, list[float]]]:
        if not known_encodings:
            return []
        if isinstance(known_encodings[0], tuple):
            return [(int(sid), [float(x) for x in vec]) for sid, vec in known_encodings]  # type: ignore[index]
        return [(int(item.student_id), [float(x) for x in json.loads(item.encoding)]) for item in known_encodings]  # type: ignore[union-attr]
