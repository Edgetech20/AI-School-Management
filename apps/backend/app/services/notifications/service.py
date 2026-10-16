from app.repositories.notifications import NotificationRepository
from app.repositories.system_settings import SystemSettingsRepository
from app.services.notifications.providers import (
    ConsoleEmailProvider,
    ConsoleSmsProvider,
    SmtpEmailProvider,
    WebhookSmsProvider,
)


class NotificationService:
    def __init__(self, repo: NotificationRepository) -> None:
        self.repo = repo
        settings = SystemSettingsRepository(repo.db).get_settings_dict()
        self.settings = settings
        self.sms = WebhookSmsProvider(settings) if settings["sms_provider"] == "webhook" else ConsoleSmsProvider()
        self.email = SmtpEmailProvider(settings) if settings["smtp_enabled"] and settings["smtp_host"] else ConsoleEmailProvider()

    def send_check_in(self, student_id: int, phone: str, email: str, student_name: str, at: str) -> None:
        message = f"Your child {student_name} checked in at {at}."
        if self.settings["parent_notifications_enabled"]:
            if self.settings["sms_enabled"]:
                self.sms.send(phone, message)
                self.repo.create(student_id, message, "SMS")
            if self.settings["smtp_enabled"]:
                self.email.send(email, "Student Check-In", message)
                self.repo.create(student_id, message, "Email")

    def send_check_out(self, student_id: int, phone: str, email: str, student_name: str, at: str) -> None:
        message = f"Your child {student_name} checked out at {at}."
        if self.settings["parent_notifications_enabled"]:
            if self.settings["sms_enabled"]:
                self.sms.send(phone, message)
                self.repo.create(student_id, message, "SMS")
            if self.settings["smtp_enabled"]:
                self.email.send(email, "Student Check-Out", message)
                self.repo.create(student_id, message, "Email")

    def send_status(self, student_id: int, phone: str, email: str, student_name: str, status: str) -> None:
        message = f"Your child {student_name} is marked {status} today."
        if self.settings["parent_notifications_enabled"]:
            if self.settings["sms_enabled"]:
                self.sms.send(phone, message)
                self.repo.create(student_id, message, "SMS")
            if self.settings["smtp_enabled"]:
                self.email.send(email, "Attendance Status", message)
                self.repo.create(student_id, message, "Email")

    def send_admin_alert(self, message: str) -> None:
        self.repo.create(student_id=None, message=message, channel="AdminAlert")
