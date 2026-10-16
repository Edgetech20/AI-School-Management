from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


class StudentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self) -> list[Student]:
        return list(self.db.scalars(select(Student).order_by(Student.id)).all())

    def list_by_class(self, class_name: str) -> list[Student]:
        statement = select(Student).where(Student.class_name == class_name).order_by(Student.id)
        return list(self.db.scalars(statement).all())

    def get(self, student_id: int) -> Student | None:
        return self.db.get(Student, student_id)

    def get_by_roll_number(self, roll_number: str) -> Student | None:
        statement = select(Student).where(Student.roll_number == roll_number)
        return self.db.scalar(statement)

    def get_by_roll_number_in_class(self, roll_number: str, class_name: str) -> Student | None:
        statement = select(Student).where(Student.roll_number == roll_number, Student.class_name == class_name)
        return self.db.scalar(statement)

    def create(self, payload: StudentCreate) -> Student:
        student = Student(
            name=payload.name,
            class_name=payload.class_name,
            roll_number=payload.roll_number,
            parent_phone=payload.parent_phone,
            parent_email=payload.parent_email,
        )
        self.db.add(student)
        self.db.commit()
        self.db.refresh(student)
        return student

    def update(self, student: Student, payload: StudentUpdate) -> Student:
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(student, key, value)
        self.db.add(student)
        self.db.commit()
        self.db.refresh(student)
        return student

    def delete(self, student: Student) -> None:
        self.db.delete(student)
        self.db.commit()
