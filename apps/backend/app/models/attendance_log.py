import datetime as dt

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    __table_args__ = (UniqueConstraint("student_id", "date", name="uq_student_date"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[dt.date] = mapped_column(Date, nullable=False, index=True)
    check_in_time: Mapped[dt.datetime] = mapped_column(DateTime(timezone=False), nullable=True)
    check_out_time: Mapped[dt.datetime] = mapped_column(DateTime(timezone=False), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Absent")
    last_match_confidence: Mapped[float] = mapped_column(Float, nullable=True)

    student = relationship("Student", back_populates="attendance_logs")
