from collections import defaultdict
import math

class FaceEncodingIndex:
    """In-memory vector index for fast candidate narrowing before detailed matching."""

    def __init__(self, known_vectors: list[tuple[int, list[float]]]) -> None:
        self._known_vectors = known_vectors
        self._matrix: list[list[float]] = []
        self._student_ids: list[int] = []

        if known_vectors:
            self._student_ids = [student_id for student_id, _ in known_vectors]
            self._matrix = [vector for _, vector in known_vectors]

    def top_student_candidates(self, detected_vector: list[float], top_k_students: int = 8) -> set[int]:
        if self._matrix is None or len(self._student_ids) == 0:
            return set()

        if not self._matrix or len(detected_vector) != len(self._matrix[0]):
            return set()

        # Lightweight ANN-style prefilter using nearest sample distances.
        dist = [math.dist(vector, detected_vector) for vector in self._matrix]

        # Keep nearest samples, then collapse to student IDs.
        nearest_idx = sorted(range(len(dist)), key=lambda idx: dist[idx])[: max(top_k_students * 3, top_k_students)]
        grouped: dict[int, float] = defaultdict(lambda: 9999.0)
        for idx in nearest_idx:
            student_id = self._student_ids[idx]
            grouped[student_id] = min(grouped[student_id], float(dist[idx]))

        ranked_students = sorted(grouped.items(), key=lambda item: item[1])[:top_k_students]
        return {student_id for student_id, _ in ranked_students}
