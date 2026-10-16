from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    school_start_time: Mapped[str] = mapped_column(String(5), nullable=False, default="09:00")
    late_threshold_time: Mapped[str] = mapped_column(String(5), nullable=False, default="09:15")
    minimum_hours: Mapped[float] = mapped_column(Float, nullable=False, default=6.0)
