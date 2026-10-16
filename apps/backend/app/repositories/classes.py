from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.classroom import Classroom


class ClassRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self) -> list[Classroom]:
        statement = select(Classroom).order_by(Classroom.name.asc())
        return list(self.db.scalars(statement).all())

    def get(self, class_id: int) -> Classroom | None:
        return self.db.get(Classroom, class_id)

    def get_by_name(self, name: str) -> Classroom | None:
        statement = select(Classroom).where(Classroom.name == name)
        return self.db.scalar(statement)

    def create(self, name: str) -> Classroom:
        model = Classroom(name=name)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def delete(self, model: Classroom) -> None:
        self.db.delete(model)
        self.db.commit()
