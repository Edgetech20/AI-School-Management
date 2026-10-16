import datetime as dt

from fastapi import HTTPException, status

from app.models.attendance_log import AttendanceLog
from app.repositories.attendance import AttendanceRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.rules import RuleRepository
from app.repositories.students import StudentRepository
from app.schemas.attendance import AttendanceEventIn
from app.services.attendance.rule_engine import calculate_status
from app.services.notifications.service import NotificationService
from app.core.timezone import to_ist_naive


class AttendanceService:
    def __init__(
        self,
        attendance_repo: AttendanceRepository,
        student_repo: StudentRepository,
        rule_repo: RuleRepository,
        notification_repo: NotificationRepository,
    ) -> None:
        self.attendance_repo = attendance_repo
        self.student_repo = student_repo
        self.rule_repo = rule_repo
        self.notification_service = NotificationService(notification_repo)

    def process_event(self, payload: AttendanceEventIn, confidence: float | None = None) -> AttendanceLog:
        student = self.student_repo.get(payload.student_id)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        event_time = to_ist_naive(payload.timestamp)

        day = event_time.date()
        record = self.attendance_repo.get_by_student_and_date(payload.student_id, day)

        if not record:
            record = AttendanceLog(student_id=payload.student_id, date=day, status="Absent")

        if payload.event_type == "check_in":
            if not record.check_in_time:
                record.check_in_time = event_time
                if confidence is not None:
                    record.last_match_confidence = confidence
                self.notification_service.send_check_in(
                    student.id,
                    student.parent_phone,
                    student.parent_email,
                    student.name,
                    event_time.strftime("%I:%M %p"),
                )
        elif payload.event_type == "check_out":
            record.check_out_time = event_time
            if confidence is not None:
                record.last_match_confidence = confidence
            self.notification_service.send_check_out(
                student.id,
                student.parent_phone,
                student.parent_email,
                student.name,
                event_time.strftime("%I:%M %p"),
            )
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event_type")

        rules = self.rule_repo.get_or_create_default()
        if payload.event_type == "check_in" and not record.check_out_time and record.check_in_time:
            record.status = "Pending"
        else:
            record.status = calculate_status(
                record.check_in_time,
                record.check_out_time,
                rules.school_start_time,
                rules.late_threshold_time,
                rules.minimum_hours,
            )

        saved = self.attendance_repo.upsert(record)

        if payload.event_type == "check_out" and saved.status in {"Late", "Absent"}:
            self.notification_service.send_status(
                student.id,
                student.parent_phone,
                student.parent_email,
                student.name,
                saved.status,
            )

        return saved

    def mark_absent_students_for_day(self, day: dt.date, student_ids: list[int]) -> list[AttendanceLog]:
        rules = self.rule_repo.get_or_create_default()
        results: list[AttendanceLog] = []

        for student_id in student_ids:
            record = self.attendance_repo.get_by_student_and_date(student_id, day)
            if not record:
                record = AttendanceLog(student_id=student_id, date=day, status="Absent")
            record.status = calculate_status(
                record.check_in_time,
                record.check_out_time,
                rules.school_start_time,
                rules.late_threshold_time,
                rules.minimum_hours,
            )
            results.append(self.attendance_repo.upsert(record))

        return results
