from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    class_name: Mapped[str] = mapped_column("class", String(60), nullable=False, index=True)
    roll_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    parent_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    parent_email: Mapped[str] = mapped_column(String(255), nullable=False)

    face_encodings = relationship("FaceEncoding", back_populates="student", cascade="all,delete")
    attendance_logs = relationship("AttendanceLog", back_populates="student", cascade="all,delete")
    notifications = relationship("NotificationLog", back_populates="student", cascade="all,delete")
