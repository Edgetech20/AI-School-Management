import datetime as dt

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.core.timezone import now_ist_naive


class NotificationLog(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    sent_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=False), default=now_ist_naive, nullable=False)

    student = relationship("Student", back_populates="notifications")
