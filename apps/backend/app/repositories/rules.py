from sqlalchemy.orm import Session

from app.models.rule import Rule
from app.schemas.rule import RuleUpdate


class RuleRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create_default(self) -> Rule:
        current = self.db.get(Rule, 1)
        if current:
            return current
        current = Rule(id=1)
        self.db.add(current)
        self.db.commit()
        self.db.refresh(current)
        return current

    def update(self, payload: RuleUpdate) -> Rule:
        current = self.get_or_create_default()
        current.school_start_time = payload.school_start_time
        current.late_threshold_time = payload.late_threshold_time
        current.minimum_hours = payload.minimum_hours
        self.db.add(current)
        self.db.commit()
        self.db.refresh(current)
        return current
