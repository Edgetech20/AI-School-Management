from app.repositories.admin_users import AdminUserRepository
from app.repositories.attendance import AttendanceRepository
from app.repositories.classes import ClassRepository
from app.repositories.face_encodings import FaceEncodingRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.rules import RuleRepository
from app.repositories.students import StudentRepository

__all__ = [
    "AdminUserRepository",
    "ClassRepository",
    "StudentRepository",
    "FaceEncodingRepository",
    "AttendanceRepository",
    "RuleRepository",
    "NotificationRepository",
]
